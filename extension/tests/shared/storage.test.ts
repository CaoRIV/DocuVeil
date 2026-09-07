import { describe, expect, it } from 'vitest';
import type { StorageArea } from '../../src/shared/contracts';
import { getEnabled, setEnabled, toggleEnabled } from '../../src/shared/storage';

function memoryStorage(initial: Record<string, unknown> = {}): StorageArea {
  const values = { ...initial };
  return {
    async get(key) {
      return { [key]: values[key] };
    },
    async set(items) {
      Object.assign(values, items);
    },
  };
}

describe('enabled state', () => {
  it('defaults each platform to false', async () => {
    const storage = memoryStorage();
    await expect(getEnabled(storage, 'chatgpt')).resolves.toBe(false);
    await expect(getEnabled(storage, 'claude')).resolves.toBe(false);
  });

  it('migrates the legacy value to ChatGPT without enabling Claude', async () => {
    const storage = memoryStorage({ enabled: true });
    await expect(getEnabled(storage, 'chatgpt')).resolves.toBe(true);
    await setEnabled(storage, 'claude', false);
    await expect(getEnabled(storage, 'chatgpt')).resolves.toBe(true);
    await expect(getEnabled(storage, 'claude')).resolves.toBe(false);
  });

  it('preserves legacy ChatGPT state when Claude is changed first', async () => {
    const storage = memoryStorage({ enabled: true });
    await setEnabled(storage, 'claude', true);
    await expect(getEnabled(storage, 'chatgpt')).resolves.toBe(true);
    await expect(getEnabled(storage, 'claude')).resolves.toBe(true);
  });

  it('persists platform values independently', async () => {
    const storage = memoryStorage();
    await setEnabled(storage, 'chatgpt', true);
    await setEnabled(storage, 'claude', false);
    await expect(getEnabled(storage, 'chatgpt')).resolves.toBe(true);
    await expect(getEnabled(storage, 'claude')).resolves.toBe(false);
  });

  it('toggles one platform without changing the other', async () => {
    const storage = memoryStorage({ enabledByPlatform: { chatgpt: true, claude: false } });
    await expect(toggleEnabled(storage, 'claude')).resolves.toBe(true);
    await expect(getEnabled(storage, 'chatgpt')).resolves.toBe(true);
    await expect(getEnabled(storage, 'claude')).resolves.toBe(true);
  });
});
