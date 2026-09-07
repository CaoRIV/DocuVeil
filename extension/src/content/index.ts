import { ChatGptAdapter } from '../adapters/chatgpt/adapter';
import { bootstrapDocuVeil } from './bootstrap';
import { SkinController } from './skinController';

const adapter = new ChatGptAdapter(document, window);
const controller = new SkinController(document, adapter);

void bootstrapDocuVeil({
  storage: chrome.storage.local,
  runtime: {
    onMessage: {
      addListener(listener) {
        chrome.runtime.onMessage.addListener(listener);
      },
      removeListener(listener) {
        chrome.runtime.onMessage.removeListener(listener);
      },
    },
  },
  controller,
});
