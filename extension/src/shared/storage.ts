import { ENABLED_KEY, type StorageArea } from './contracts';

export async function getEnabled(storage: StorageArea): Promise<boolean> {
  const result = await storage.get(ENABLED_KEY);
  return result[ENABLED_KEY] === true;
}

export async function setEnabled(storage: StorageArea, enabled: boolean): Promise<void> {
  await storage.set({ [ENABLED_KEY]: enabled });
}

export async function toggleEnabled(storage: StorageArea): Promise<boolean> {
  const enabled = !(await getEnabled(storage));
  await setEnabled(storage, enabled);
  return enabled;
}
