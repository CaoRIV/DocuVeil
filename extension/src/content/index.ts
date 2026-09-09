import { createPlatformAdapter } from '../adapters/createPlatformAdapter';
import { detectPlatform } from '../shared/platform';
import { bootstrapDocuVeil } from './bootstrap';
import { SkinController } from './skinController';

const platform = detectPlatform(window.location.hostname);

if (platform) {
  const adapter = createPlatformAdapter(platform, document, window);
  const controller = new SkinController(document, adapter);

  void bootstrapDocuVeil({
    platform,
    storage: chrome.storage.local,
    storageChanges: chrome.storage.onChanged,
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
}
