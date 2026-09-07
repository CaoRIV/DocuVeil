import { isStateMessage, type StorageArea } from '../shared/contracts';
import { getEnabled } from '../shared/storage';

type MessageListener = (message: unknown) => void;

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
  storage: StorageArea;
  runtime: RuntimeMessages;
  controller: ControllerLifecycle;
}): Promise<() => void> {
  const { storage, runtime, controller } = dependencies;
  const listener: MessageListener = (message) => {
    if (isStateMessage(message)) controller.setEnabled(message.enabled);
  };
  runtime.onMessage.addListener(listener);
  controller.setEnabled(await getEnabled(storage));
  return () => {
    runtime.onMessage.removeListener(listener);
    controller.destroy();
  };
}
