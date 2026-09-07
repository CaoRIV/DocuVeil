import { describe, expect, it, vi } from 'vitest';
import { STATE_MESSAGE, type StorageArea } from '../../src/shared/contracts';
import { bootstrapDocuVeil, type RuntimeMessages } from '../../src/content/bootstrap';

describe('bootstrapDocuVeil', () => {
  it('applies stored state, accepts valid messages, and cleans up', async () => {
    let listener: ((message: unknown) => void) | undefined;
    const runtime: RuntimeMessages = {
      onMessage: {
        addListener(next) { listener = next; },
        removeListener: vi.fn(),
      },
    };
    const storage: StorageArea = {
      get: vi.fn(async (key: string) => ({
        [key]: key === 'enabledByPlatform' ? { chatgpt: false, claude: true } : undefined,
      })),
      set: vi.fn(),
    };
    const controller = { setEnabled: vi.fn(), destroy: vi.fn() };
    const cleanup = await bootstrapDocuVeil({
      platform: 'claude', storage, runtime, controller,
    });
    expect(controller.setEnabled).toHaveBeenCalledWith(true);
    listener?.({ type: STATE_MESSAGE, enabled: false });
    listener?.({ type: 'UNRELATED', enabled: true });
    expect(controller.setEnabled).toHaveBeenCalledTimes(2);
    expect(controller.setEnabled).toHaveBeenLastCalledWith(false);
    cleanup();
    expect(controller.destroy).toHaveBeenCalledOnce();
    expect(runtime.onMessage.removeListener).toHaveBeenCalledOnce();
  });
});
