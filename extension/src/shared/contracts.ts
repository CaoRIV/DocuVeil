import type { PlatformId } from './platform';

export const ENABLED_KEY = 'enabled' as const;
export const ENABLED_BY_PLATFORM_KEY = 'enabledByPlatform' as const;
export const STATE_MESSAGE = 'DOCUVEIL_STATE' as const;

export type EnabledByPlatform = Partial<Record<PlatformId, boolean>>;

export type StateMessage = {
  type: typeof STATE_MESSAGE;
  enabled: boolean;
};

export function isStateMessage(value: unknown): value is StateMessage {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<StateMessage>;
  return candidate.type === STATE_MESSAGE && typeof candidate.enabled === 'boolean';
}

export interface StorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}
