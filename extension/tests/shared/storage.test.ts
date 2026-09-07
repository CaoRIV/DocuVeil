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
  it('defaults to false', async () => {
    await expect(getEnabled(memoryStorage())).resolves.toBe(false);
  });

  it('persists an explicit value', async () => {
    const storage = memoryStorage();
    await setEnabled(storage, true);
    await expect(getEnabled(storage)).resolves.toBe(true);
  });

  it('toggles and returns the persisted value', async () => {
    const storage = memoryStorage({ enabled: true });
    await expect(toggleEnabled(storage)).resolves.toBe(false);
    await expect(getEnabled(storage)).resolves.toBe(false);
  });
});
