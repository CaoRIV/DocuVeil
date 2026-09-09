import { describe, expect, it, vi } from 'vitest';
import { bootstrapDocuVeil } from '../../src/content/bootstrap';

function events() {
  const listeners = new Set<(changes: Record<string, { newValue?: unknown }>, area: string) => void>();
  return {
    addListener: (listener: Parameters<typeof listeners.add>[0]) => { listeners.add(listener); },
    removeListener: (listener: Parameters<typeof listeners.add>[0]) => { listeners.delete(listener); },
    emit(value: unknown, area = 'local') {
      for (const listener of listeners) listener({ enabledByPlatform: { newValue: value } }, area);
    },
    listeners,
  };
}

describe('cross-tab storage synchronization', () => {
  it('updates open tabs independently by platform and removes subscriptions', async () => {
    const storageChanges = events();
    const storage = { get: async () => ({ enabledByPlatform: {} }), set: vi.fn() };
    const runtime = { onMessage: { addListener: vi.fn(), removeListener: vi.fn() } };
    const controllers = Array.from({ length: 3 }, () => ({ setEnabled: vi.fn(), destroy: vi.fn() }));
    const cleanup = await Promise.all(controllers.map((controller, i) => bootstrapDocuVeil({
      platform: i === 2 ? 'claude' : 'chatgpt', storage, storageChanges, runtime, controller,
    })));
    storageChanges.emit({ chatgpt: true, claude: false });
    expect(controllers[0].setEnabled).toHaveBeenLastCalledWith(true);
    expect(controllers[1].setEnabled).toHaveBeenLastCalledWith(true);
    expect(controllers[2].setEnabled).toHaveBeenLastCalledWith(false);
    storageChanges.emit({ chatgpt: false }, 'sync');
    expect(controllers[0].setEnabled).toHaveBeenLastCalledWith(true);
    storageChanges.emit(undefined);
    expect(controllers[0].setEnabled).toHaveBeenLastCalledWith(false);
    cleanup.forEach(stop => stop());
    expect(storageChanges.listeners.size).toBe(0);
  });

  it('does not overwrite a new event with a stale initial read', async () => {
    const storageChanges = events();
    let resolveRead!: (value: Record<string, unknown>) => void;
    const controller = { setEnabled: vi.fn(), destroy: vi.fn() };
    const boot = bootstrapDocuVeil({
      platform: 'chatgpt', storageChanges, controller,
      storage: { get: () => new Promise(resolve => { resolveRead = resolve; }), set: vi.fn() },
      runtime: { onMessage: { addListener: vi.fn(), removeListener: vi.fn() } },
    });
    storageChanges.emit({ chatgpt: true });
    resolveRead({ enabledByPlatform: { chatgpt: false } });
    const cleanup = await boot;
    expect(controller.setEnabled).toHaveBeenLastCalledWith(true);
    cleanup();
  });
});
