import { registerAction } from './registerAction';

registerAction({
  action: {
    onClicked: {
      addListener(listener) {
        chrome.action.onClicked.addListener(listener);
      },
    },
  },
  storage: { local: chrome.storage.local },
  tabs: {
    query: (query) => chrome.tabs.query(query),
    sendMessage: (tabId, message) => chrome.tabs.sendMessage(tabId, message),
  },
});
