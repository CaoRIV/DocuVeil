import { describe, expect, it, vi } from 'vitest';
import type { StorageArea } from '../../src/shared/contracts';
import { registerAction, type ExtensionChrome } from '../../src/background/registerAction';

function harness(url = 'https://chatgpt.com/c/example') {
  let click: (() => void) | undefined;
  const values: Record<string, unknown> = {};
  const storage: StorageArea = {
    async get(key) { return { [key]: values[key] }; },
    async set(items) { Object.assign(values, items); },
  };
  const sendMessage = vi.fn().mockResolvedValue(undefined);
  const chromeApi: ExtensionChrome = {
    action: { onClicked: { addListener(listener) { click = listener; } } },
    storage: { local: storage },
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42, url }]),
      sendMessage,
    },
  };
  return { chromeApi, sendMessage, click: () => click?.() };
}

describe('registerAction', () => {
  it('toggles state and notifies the active ChatGPT tab', async () => {
    const test = harness();
    registerAction(test.chromeApi);
    test.click();
    await vi.waitFor(() => {
      expect(test.sendMessage).toHaveBeenCalledWith(42, {
        type: 'DOCUVEIL_STATE',
        enabled: true,
      });
    });
  });

  it('persists state but does not message an unrelated site', async () => {
    const test = harness('https://example.com/');
    registerAction(test.chromeApi);
    test.click();
    await vi.waitFor(() => expect(test.chromeApi.tabs.query).toHaveBeenCalled());
    expect(test.sendMessage).not.toHaveBeenCalled();
  });
});
