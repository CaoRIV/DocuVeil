import { STATE_MESSAGE, type StateMessage, type StorageArea } from '../shared/contracts';
import { detectPlatform } from '../shared/platform';
import { toggleEnabled } from '../shared/storage';

type ListenerEvent = { addListener(listener: () => void): void };

export interface ExtensionChrome {
  action: { onClicked: ListenerEvent };
  storage: { local: StorageArea };
  tabs: {
    query(query: { active: true; currentWindow: true }): Promise<Array<{ id?: number; url?: string }>>;
    sendMessage(tabId: number, message: StateMessage): Promise<unknown>;
  };
}

export function registerAction(chromeApi: ExtensionChrome): void {
  chromeApi.action.onClicked.addListener(() => {
    void (async () => {
      const [tab] = await chromeApi.tabs.query({ active: true, currentWindow: true });
      const platform = tab?.url ? detectPlatform(new URL(tab.url).hostname) : null;
      if (!platform || tab?.id === undefined) return;
      const enabled = await toggleEnabled(chromeApi.storage.local, platform);
      await chromeApi.tabs.sendMessage(tab.id, { type: STATE_MESSAGE, enabled });
    })().catch(() => {
      // Fail open: a closed or reloading tab must not break future action clicks.
    });
  });
}
