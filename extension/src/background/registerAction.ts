import { STATE_MESSAGE, type StateMessage, type StorageArea } from '../shared/contracts';
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
      const enabled = await toggleEnabled(chromeApi.storage.local);
      const [tab] = await chromeApi.tabs.query({ active: true, currentWindow: true });
      if (tab?.id === undefined || !tab.url?.startsWith('https://chatgpt.com/')) return;
      await chromeApi.tabs.sendMessage(tab.id, { type: STATE_MESSAGE, enabled });
    })().catch(() => {
      // Fail open: a closed or reloading tab must not break future action clicks.
    });
  });
}
