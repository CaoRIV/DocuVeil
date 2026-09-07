import {
  ENABLED_BY_PLATFORM_KEY,
  ENABLED_KEY,
  type EnabledByPlatform,
  type StorageArea,
} from './contracts';
import type { PlatformId } from './platform';

function enabledMap(value: unknown): EnabledByPlatform | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const result: EnabledByPlatform = {};
  if (typeof candidate.chatgpt === 'boolean') result.chatgpt = candidate.chatgpt;
  if (typeof candidate.claude === 'boolean') result.claude = candidate.claude;
  return result;
}

async function getEnabledMap(storage: StorageArea): Promise<EnabledByPlatform> {
  const result = await storage.get(ENABLED_BY_PLATFORM_KEY);
  const stored = enabledMap(result[ENABLED_BY_PLATFORM_KEY]);
  if (stored) return stored;

  const legacy = await storage.get(ENABLED_KEY);
  const migrated: EnabledByPlatform = { chatgpt: legacy[ENABLED_KEY] === true };
  await storage.set({ [ENABLED_BY_PLATFORM_KEY]: migrated });
  return migrated;
}

export async function getEnabled(storage: StorageArea, platform: PlatformId): Promise<boolean> {
  const state = await getEnabledMap(storage);
  return state[platform] === true;
}

export async function setEnabled(
  storage: StorageArea,
  platform: PlatformId,
  enabled: boolean,
): Promise<void> {
  const state = await getEnabledMap(storage);
  await storage.set({ [ENABLED_BY_PLATFORM_KEY]: { ...state, [platform]: enabled } });
}

export async function toggleEnabled(storage: StorageArea, platform: PlatformId): Promise<boolean> {
  const enabled = !(await getEnabled(storage, platform));
  await setEnabled(storage, platform, enabled);
  return enabled;
}
