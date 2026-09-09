// Run against the built bundle and local fixtures; no accounts or network requests.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.DOCUVEIL_PLAYWRIGHT_PATH || 'playwright');
const file = (relative) => fileURLToPath(new URL(relative, import.meta.url));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.DOCUVEIL_BROWSER_PATH ? { executablePath: process.env.DOCUVEIL_BROWSER_PATH } : {}),
});
const context = await browser.newContext();
const errors = [];
const pages = [];
let values = { chatgpt: false, claude: false };

async function setState(next) {
  values = next;
  await Promise.all(pages.map(page => page.evaluate(value => {
    window.testState = value;
    for (const listener of window.testStorageListeners) {
      listener({ enabledByPlatform: { newValue: value } }, 'local');
    }
  }, values)));
}

async function open(platform, supported = true) {
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const host = platform === 'chatgpt' ? 'chatgpt.com' : 'claude.ai';
  const html = await readFile(file(`../tests/fixtures/${platform}-${supported ? 'supported' : 'unsupported'}.html`), 'utf8');
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: html }));
  await page.goto(`https://${host}/`);
  await page.evaluate(state => {
    window.testState = state;
    window.testStorageListeners = [];
    // Simulate only the extension API boundary; execute the production content bundle.
    window.chrome = {
      storage: {
        local: { get: async () => ({ enabledByPlatform: window.testState }), set: async () => {} },
        onChanged: {
          addListener: fn => window.testStorageListeners.push(fn),
          removeListener: fn => { window.testStorageListeners = window.testStorageListeners.filter(item => item !== fn); },
        },
      },
      runtime: { onMessage: { addListener() {}, removeListener() {} } },
    };
  }, values);
  await page.addStyleTag({ path: file('../../dist/extension/styles/docuveil.css') });
  await page.addScriptTag({ path: file('../../dist/extension/content.js') });
  pages.push(page);
  return page;
}

try {
  const chatA = await open('chatgpt');
  const chatB = await open('chatgpt');
  const claude = await open('claude');
  await setState({ chatgpt: true, claude: false });
  for (const page of [chatA, chatB]) assert.equal(await page.locator('[data-docuveil-shell]').count(), 1);
  assert.equal(await claude.locator('[data-docuveil-shell]').count(), 0);
  await setState({ chatgpt: true, claude: true });
  for (const page of [chatA, claude]) {
    const input = page.locator('[contenteditable="true"]');
    await input.fill('Draft preserved while streaming');
    await page.evaluate(() => {
      window.originalComposer = document.querySelector('[contenteditable="true"]');
      document.querySelector('main').append(Object.assign(document.createElement('p'), { textContent: 'Streamed response' }));
    });
    await page.waitForTimeout(100);
    assert.equal(await page.locator('[data-docuveil-shell]').count(), 1);
    assert.equal(await input.textContent(), 'Draft preserved while streaming');
    assert.ok(await page.evaluate(() => window.originalComposer === document.querySelector('[contenteditable="true"]')));
  }
  await setState({ chatgpt: false, claude: false });
  for (const page of pages) {
    assert.equal(await page.locator('[data-docuveil-shell]').count(), 0);
    assert.equal(await page.locator('.docuveil-enabled').count(), 0);
    assert.ok(await page.locator('[contenteditable="true"]').isVisible());
  }
  await setState({ chatgpt: true, claude: true });
  for (const platform of ['chatgpt', 'claude']) {
    const page = await open(platform, false);
    assert.equal(await page.locator('[data-docuveil-shell]').count(), 0);
    assert.ok(await page.locator('[data-docuveil-compatibility]').isVisible());
  }
  assert.deepEqual(errors, []);
  console.log(`PASS ${browser.version()}: two-tab sync, platform isolation, initial state, streamed DOM updates, composer identity/draft, disable restoration, unsupported fallback, no page errors.`);
  console.log('Scope: local fixtures and simulated Chrome storage events; not authenticated host-platform smoke tests or actual extension installation.');
} finally {
  await browser.close();
}
