import { ENABLED_BY_PLATFORM_KEY, isStateMessage, type StorageArea } from '../shared/contracts';
import type { PlatformId } from '../shared/platform';
import { getEnabled } from '../shared/storage';

type MessageListener = (message: unknown) => void;
type StorageListener = (changes: Record<string, { newValue?: unknown }>, areaName: string) => void;

export interface StorageChanges {
  addListener(listener: StorageListener): void;
  removeListener(listener: StorageListener): void;
}

export interface RuntimeMessages {
  onMessage: {
    addListener(listener: MessageListener): void;
    removeListener(listener: MessageListener): void;
  };
}

export interface ControllerLifecycle {
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

export async function bootstrapDocuVeil(dependencies: {
  platform: PlatformId;
  storage: StorageArea;
  storageChanges: StorageChanges;
  runtime: RuntimeMessages;
  controller: ControllerLifecycle;
}): Promise<() => void> {
  const { platform, storage, storageChanges, runtime, controller } = dependencies;
  let changedDuringLoad = false;
  const listener: MessageListener = (message) => {
    if (isStateMessage(message)) {
      changedDuringLoad = true;
      controller.setEnabled(message.enabled);
    }
  };
  const storageListener: StorageListener = (changes, areaName) => {
    if (areaName !== 'local' || !(ENABLED_BY_PLATFORM_KEY in changes)) return;
    const value = changes[ENABLED_BY_PLATFORM_KEY].newValue;
    const enabled = typeof value === 'object' && value !== null && !Array.isArray(value)
      && (value as Record<string, unknown>)[platform] === true;
    changedDuringLoad = true;
    controller.setEnabled(enabled);
  };
  runtime.onMessage.addListener(listener);
  storageChanges.addListener(storageListener);
  const enabled = await getEnabled(storage, platform);
  if (!changedDuringLoad) controller.setEnabled(enabled);
  return () => {
    runtime.onMessage.removeListener(listener);
    storageChanges.removeListener(storageListener);
    controller.destroy();
  };
}
