# DocuVeil MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a sideloadable Manifest V3 extension for desktop Chrome and Edge that gives ChatGPT a document-style presentation while preserving ChatGPT's native behavior.

**Architecture:** Keep the existing React/Vite landing page as a `website` workspace and build the extension as a separate TypeScript workspace. The extension uses a service worker for the persistent enabled flag, a ChatGPT-specific adapter for all selectors and native actions, a platform-neutral shell, and an idempotent skin controller that fails open when the host DOM is unsupported.

**Tech Stack:** npm workspaces, React 19, Vite 8, TypeScript, Manifest V3, esbuild, Vitest, jsdom, ESLint, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-06-docuveil-design.md`

## Global Constraints

- Support only ChatGPT on desktop Chrome and Microsoft Edge in the MVP.
- Activate only after the user clicks the extension icon, then persist the global enabled state across reloads, new tabs, and browser restarts.
- Preserve ChatGPT's native text submission, streaming responses, rich content, conversation navigation, new-chat behavior, and image/file attachments.
- Do not call ChatGPT APIs, intercept network requests, read cookies, or store conversation content.
- Request only `storage` and host access for `https://chatgpt.com/*`; add a legacy ChatGPT host only after compatibility testing proves it is required.
- Run entirely in the browser with no backend, DocuVeil account, analytics, telemetry, remote code, or external scripts.
- Use the DocuVeil name and original project assets; do not use Google or OpenAI logos, names as interface branding, or official visual assets.
- Treat formatting/menu controls as decorative: they must not be focusable or exposed as enabled controls to assistive technology.
- Fail open: if required ChatGPT DOM targets cannot be found, leave or restore the native page and show a small local compatibility notice.
- Every observer and listener must have an explicit cleanup path; mounting and unmounting must be idempotent.
- A production build must emit a sideloadable extension at `dist/extension`.
- Node.js 20 or newer is required.

## Target File Map

```text
docuveil/
|-- extension/
|   |-- assets/favicon.svg                 # Source DocuVeil icon
|   |-- manifest.json                      # MV3 permissions, action, worker, content script
|   |-- package.json                       # Extension test/typecheck/build commands
|   |-- scripts/build.mjs                  # Bundle entries and copy/generate static assets
|   |-- src/background/index.ts            # Register toolbar-click behavior
|   |-- src/background/registerAction.ts   # Testable service-worker coordinator
|   |-- src/content/bootstrap.ts           # Startup storage/message wiring
|   |-- src/content/index.ts               # Content-script entry point
|   |-- src/content/skinController.ts      # Idempotent enable/disable/refresh lifecycle
|   |-- src/adapters/platformAdapter.ts     # Platform-neutral adapter contract
|   |-- src/adapters/chatgpt/selectors.ts  # The only ChatGPT selector definitions
|   |-- src/adapters/chatgpt/adapter.ts     # ChatGPT discovery, native actions, observation
|   |-- src/shell/createShell.ts            # Accessible DocuVeil chrome and sidebar
|   |-- src/shared/contracts.ts             # Runtime message and state types
|   |-- src/shared/storage.ts               # Enabled-state persistence
|   |-- styles/docuveil.css                 # Skin styles scoped by one root class
|   |-- tests/shared/storage.test.ts
|   |-- tests/background/registerAction.test.ts
|   |-- tests/content/bootstrap.test.ts
|   |-- tests/content/skinController.test.ts
|   |-- tests/adapters/chatgpt/adapter.test.ts
|   |-- tests/shell/createShell.test.ts
|   |-- tests/integration/chatgptSkin.test.ts
|   |-- tests/build-output.test.ts
|   |-- tests/fixtures/chatgpt-supported.html
|   |-- tests/fixtures/chatgpt-unsupported.html
|   |-- tsconfig.json
|   `-- vitest.config.ts
|-- website/                               # Existing React/Vite site moved intact
|-- docs/INSTALL.md
|-- docs/PRIVACY.md
|-- docs/CONTRIBUTING.md
|-- docs/SECURITY.md
|-- docs/RELEASE_CHECKLIST.md
|-- .github/workflows/ci.yml
|-- package.json                           # Workspace orchestration
|-- package-lock.json
|-- README.md
`-- LICENSE
```

---

### Task 1: Move the Landing Page into an npm Workspace

**Files:**
- Create: `website/package.json`
- Move: `index.html` to `website/index.html`
- Move: `vite.config.js` to `website/vite.config.js`
- Move: `eslint.config.js` to `website/eslint.config.js`
- Move: `src/**` to `website/src/**`
- Move: `public/**` to `website/public/**`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: the existing landing-page source and Vite configuration.
- Produces: workspace command `npm run build:website` and an unchanged website build in `website/dist`.

- [ ] **Step 1: Verify the current website is a known-good baseline**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands exit `0`. If the workstation still reports a missing global `npm-cli.js`, repair the Node/npm installation before executing this plan; do not encode that machine-specific path into the repository.

- [ ] **Step 2: Move the website files without rewriting their contents**

Run:

```bash
mkdir website
git mv index.html website/index.html
git mv vite.config.js website/vite.config.js
git mv eslint.config.js website/eslint.config.js
git mv src website/src
git mv public website/public
```

Expected: `git status --short` reports only renames plus the new workspace package file added in the next step.

- [ ] **Step 3: Add the website workspace manifest**

Create `website/package.json`:

```json
{
  "name": "@docuveil/website",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "react-icons": "^5.6.0"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^10.3.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.6.0",
    "vite": "^8.0.12"
  }
}
```

- [ ] **Step 4: Replace the root manifest with workspace orchestration**

Replace `package.json` with:

```json
{
  "name": "docuveil",
  "private": true,
  "version": "0.1.0",
  "workspaces": ["website"],
  "scripts": {
    "dev": "npm run dev -w @docuveil/website",
    "build": "npm run build:website",
    "build:website": "npm run build -w @docuveil/website",
    "lint": "npm run lint -w @docuveil/website",
    "preview": "npm run preview -w @docuveil/website"
  }
}
```

- [ ] **Step 5: Refresh the lockfile and verify the moved website**

Run:

```bash
npm install
npm run lint
npm run build:website
```

Expected: npm recognizes `@docuveil/website`, lint exits `0`, and Vite emits `website/dist/index.html`.

- [ ] **Step 6: Commit the independently working workspace move**

```bash
git add package.json package-lock.json website
git commit -m "chore: move landing page into website workspace"
```

---

### Task 2: Add Extension Types, State Storage, and Test Harness

**Files:**
- Create: `extension/package.json`
- Create: `extension/tsconfig.json`
- Create: `extension/vitest.config.ts`
- Create: `extension/src/shared/contracts.ts`
- Create: `extension/src/shared/storage.ts`
- Create: `extension/tests/shared/storage.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `chrome.storage.local` through the structural `StorageArea` interface.
- Produces: `getEnabled(storage): Promise<boolean>`, `setEnabled(storage, enabled): Promise<void>`, `toggleEnabled(storage): Promise<boolean>`, and `StateMessage`.

- [ ] **Step 1: Add the extension workspace and its dependencies**

Create `extension/package.json`:

```json
{
  "name": "@docuveil/extension",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

Update the root manifest fields to:

```json
{
  "workspaces": ["website", "extension"],
  "scripts": {
    "dev": "npm run dev -w @docuveil/website",
    "build": "npm run build:website",
    "build:website": "npm run build -w @docuveil/website",
    "lint": "npm run lint -w @docuveil/website && npm run typecheck -w @docuveil/extension",
    "test": "npm run test -w @docuveil/extension",
    "preview": "npm run preview -w @docuveil/website"
  }
}
```

Install the test and TypeScript toolchain:

```bash
npm install
npm install --save-dev --workspace=extension typescript vitest jsdom @types/chrome @types/node
```

- [ ] **Step 2: Configure strict TypeScript and jsdom tests**

Create `extension/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["chrome", "node", "vite/client", "vitest/globals"],
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true
  },
  "include": ["src", "tests", "vitest.config.ts"]
}
```

Create `extension/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    clearMocks: true,
    restoreMocks: true,
  },
});
```

- [ ] **Step 3: Define the runtime contracts**

Create `extension/src/shared/contracts.ts`:

```ts
export const ENABLED_KEY = 'enabled' as const;
export const STATE_MESSAGE = 'DOCUVEIL_STATE' as const;

export type StateMessage = {
  type: typeof STATE_MESSAGE;
  enabled: boolean;
};

export function isStateMessage(value: unknown): value is StateMessage {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<StateMessage>;
  return candidate.type === STATE_MESSAGE && typeof candidate.enabled === 'boolean';
}

export interface StorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}
```

- [ ] **Step 4: Write the failing enabled-state tests**

Create `extension/tests/shared/storage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { StorageArea } from '../../src/shared/contracts';
import { getEnabled, setEnabled, toggleEnabled } from '../../src/shared/storage';

function memoryStorage(initial: Record<string, unknown> = {}): StorageArea {
  const values = { ...initial };
  return {
    async get(key) {
      return { [key]: values[key] };
    },
    async set(items) {
      Object.assign(values, items);
    },
  };
}

describe('enabled state', () => {
  it('defaults to false', async () => {
    await expect(getEnabled(memoryStorage())).resolves.toBe(false);
  });

  it('persists an explicit value', async () => {
    const storage = memoryStorage();
    await setEnabled(storage, true);
    await expect(getEnabled(storage)).resolves.toBe(true);
  });

  it('toggles and returns the persisted value', async () => {
    const storage = memoryStorage({ enabled: true });
    await expect(toggleEnabled(storage)).resolves.toBe(false);
    await expect(getEnabled(storage)).resolves.toBe(false);
  });
});
```

- [ ] **Step 5: Run the test to verify the missing module failure**

Run:

```bash
npm test -w @docuveil/extension -- --run tests/shared/storage.test.ts
```

Expected: FAIL because `src/shared/storage.ts` does not exist.

- [ ] **Step 6: Implement minimal persistent state behavior**

Create `extension/src/shared/storage.ts`:

```ts
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
```

- [ ] **Step 7: Verify state behavior and type safety**

Run:

```bash
npm test -w @docuveil/extension -- --run tests/shared/storage.test.ts
npm run typecheck -w @docuveil/extension
```

Expected: 3 tests pass and TypeScript exits `0`.

- [ ] **Step 8: Commit the extension foundation**

```bash
git add package.json package-lock.json extension
git commit -m "test: add extension state foundation"
```

---

### Task 3: Coordinate Toolbar Clicks in the Service Worker

**Files:**
- Create: `extension/src/background/registerAction.ts`
- Create: `extension/src/background/index.ts`
- Create: `extension/tests/background/registerAction.test.ts`

**Interfaces:**
- Consumes: `toggleEnabled(storage)` and the minimal `ExtensionChrome` interface.
- Produces: `registerAction(chromeApi): void`; sends `{ type: 'DOCUVEIL_STATE', enabled }` only to an active `https://chatgpt.com/*` tab.

- [ ] **Step 1: Write the failing toolbar-click tests**

Create `extension/tests/background/registerAction.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
npm test -w @docuveil/extension -- --run tests/background/registerAction.test.ts
```

Expected: FAIL because `registerAction.ts` does not exist.

- [ ] **Step 3: Implement the testable service-worker coordinator**

Create `extension/src/background/registerAction.ts`:

```ts
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
```

Create `extension/src/background/index.ts`:

```ts
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
```

- [ ] **Step 4: Verify toolbar coordination**

Run:

```bash
npm test -w @docuveil/extension -- --run tests/background/registerAction.test.ts
npm run typecheck -w @docuveil/extension
```

Expected: 2 tests pass and TypeScript exits `0`.

- [ ] **Step 5: Commit the service-worker behavior**

```bash
git add extension/src/background extension/tests/background
git commit -m "feat: toggle DocuVeil from extension action"
```

---

### Task 4: Implement the Platform Contract and ChatGPT Adapter

**Files:**
- Create: `extension/src/adapters/platformAdapter.ts`
- Create: `extension/src/adapters/chatgpt/selectors.ts`
- Create: `extension/src/adapters/chatgpt/adapter.ts`
- Create: `extension/tests/fixtures/chatgpt-supported.html`
- Create: `extension/tests/fixtures/chatgpt-unsupported.html`
- Create: `extension/tests/adapters/chatgpt/adapter.test.ts`

**Interfaces:**
- Consumes: the live ChatGPT document and window.
- Produces: `PlatformAdapter.inspect(): AdapterSnapshot`, `openConversation(href)`, `createConversation()`, `attachFile()`, and `observe(onChange): () => void`.

- [ ] **Step 1: Define the platform-neutral adapter contract**

Create `extension/src/adapters/platformAdapter.ts`:

```ts
export type Conversation = {
  id: string;
  title: string;
  href: string;
  active: boolean;
};

export type AdapterSnapshot = {
  ready: boolean;
  navRoot: HTMLElement | null;
  conversationRoot: HTMLElement | null;
  composerRoot: HTMLElement | null;
  composer: HTMLElement | null;
  sendButton: HTMLElement | null;
  newChatButton: HTMLElement | null;
  attachmentButton: HTMLElement | null;
  activeTitle: string;
  conversations: Conversation[];
};

export interface PlatformAdapter {
  inspect(): AdapterSnapshot;
  openConversation(href: string): void;
  createConversation(): void;
  attachFile(): void;
  observe(onChange: () => void): () => void;
}
```

- [ ] **Step 2: Create representative supported and unsupported DOM fixtures**

Create `extension/tests/fixtures/chatgpt-supported.html`:

```html
<nav aria-label="Chat history">
  <a href="/">New chat</a>
  <a href="/c/alpha">Alpha brief</a>
  <a href="/c/beta" aria-current="page">Beta report</a>
</nav>
<main>
  <article data-testid="conversation-turn-1">
    <h2>Summary</h2>
    <p>First response with a <a href="https://example.com">reference</a>.</p>
    <ul><li>One item</li></ul>
    <table><tbody><tr><td>Cell</td></tr></tbody></table>
    <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="Fixture pixel">
  </article>
  <article data-testid="conversation-turn-2"><pre><code>const safe = true;</code></pre></article>
</main>
<form data-testid="composer-form">
  <div id="prompt-textarea" contenteditable="true"></div>
  <button type="button" aria-label="Attach files">+</button>
  <button type="submit" data-testid="send-button">Send</button>
</form>
```

Create `extension/tests/fixtures/chatgpt-unsupported.html`:

```html
<main><p>The host page remains usable.</p></main>
```

- [ ] **Step 3: Centralize every ChatGPT-specific selector**

Create `extension/src/adapters/chatgpt/selectors.ts`:

```ts
export const chatGptSelectors = {
  navRoot: 'nav[aria-label="Chat history"]',
  conversationRoot: 'main',
  composer: '#prompt-textarea',
  composerRoot: 'form[data-testid="composer-form"]',
  sendButton: '[data-testid="send-button"]',
  newChatButton: 'nav[aria-label="Chat history"] a[href="/"]',
  attachmentButton: '[aria-label="Attach files"], [data-testid="composer-plus-btn"]',
  conversationLinks: 'nav[aria-label="Chat history"] a[href^="/c/"]',
} as const;
```

- [ ] **Step 4: Write failing discovery, delegation, and cleanup tests**

Create `extension/tests/adapters/chatgpt/adapter.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import supportedHtml from '../../fixtures/chatgpt-supported.html?raw';
import unsupportedHtml from '../../fixtures/chatgpt-unsupported.html?raw';
import { ChatGptAdapter } from '../../../src/adapters/chatgpt/adapter';

describe('ChatGptAdapter', () => {
  beforeEach(() => history.replaceState({}, '', '/c/beta'));

  it('returns a normalized supported snapshot', () => {
    document.body.innerHTML = supportedHtml;
    const snapshot = new ChatGptAdapter(document, window).inspect();
    expect(snapshot.ready).toBe(true);
    expect(snapshot.activeTitle).toBe('Beta report');
    expect(snapshot.conversations).toEqual([
      { id: 'alpha', title: 'Alpha brief', href: '/c/alpha', active: false },
      { id: 'beta', title: 'Beta report', href: '/c/beta', active: true },
    ]);
  });

  it('fails readiness when required targets are absent', () => {
    document.body.innerHTML = unsupportedHtml;
    expect(new ChatGptAdapter(document, window).inspect().ready).toBe(false);
  });

  it('delegates native actions to host controls', () => {
    document.body.innerHTML = supportedHtml;
    const adapter = new ChatGptAdapter(document, window);
    const newChat = vi.spyOn(document.querySelector<HTMLAnchorElement>('a[href="/"]')!, 'click')
      .mockImplementation(() => undefined);
    const attach = vi.spyOn(document.querySelector<HTMLButtonElement>('[aria-label="Attach files"]')!, 'click')
      .mockImplementation(() => undefined);
    adapter.createConversation();
    adapter.attachFile();
    expect(newChat).toHaveBeenCalledOnce();
    expect(attach).toHaveBeenCalledOnce();
  });

  it('returns cleanup that disconnects observation', () => {
    document.body.innerHTML = supportedHtml;
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const cleanup = new ChatGptAdapter(document, window).observe(vi.fn());
    cleanup();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('batches streaming mutations and reacts to SPA navigation', async () => {
    document.body.innerHTML = supportedHtml;
    const onChange = vi.fn();
    const cleanup = new ChatGptAdapter(document, window).observe(onChange);
    document.querySelector('main')?.append(document.createElement('article'));
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    window.dispatchEvent(new PopStateEvent('popstate'));
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(2));
    cleanup();
  });
});
```

- [ ] **Step 5: Run the focused tests and confirm they fail**

Run:

```bash
npm test -w @docuveil/extension -- --run tests/adapters/chatgpt/adapter.test.ts
```

Expected: FAIL because `ChatGptAdapter` does not exist.

- [ ] **Step 6: Implement ChatGPT discovery, native delegation, and batched observation**

Create `extension/src/adapters/chatgpt/adapter.ts`:

```ts
import type { AdapterSnapshot, Conversation, PlatformAdapter } from '../platformAdapter';
import { chatGptSelectors as selectors } from './selectors';

function element<T extends HTMLElement>(doc: Document, selector: string): T | null {
  return doc.querySelector<T>(selector);
}

export class ChatGptAdapter implements PlatformAdapter {
  constructor(
    private readonly doc: Document,
    private readonly win: Window,
  ) {}

  inspect(): AdapterSnapshot {
    const navRoot = element<HTMLElement>(this.doc, selectors.navRoot);
    const conversationRoot = element<HTMLElement>(this.doc, selectors.conversationRoot);
    const composer = element<HTMLElement>(this.doc, selectors.composer);
    const composerRoot = element<HTMLElement>(this.doc, selectors.composerRoot);
    const sendButton = element<HTMLElement>(this.doc, selectors.sendButton);
    const newChatButton = element<HTMLElement>(this.doc, selectors.newChatButton);
    const attachmentButton = element<HTMLElement>(this.doc, selectors.attachmentButton);
    const links = [...this.doc.querySelectorAll<HTMLAnchorElement>(selectors.conversationLinks)];
    const conversations: Conversation[] = links.map((link) => {
      const href = link.getAttribute('href') ?? '';
      return {
        id: href.slice('/c/'.length),
        title: link.textContent?.trim() || 'Untitled conversation',
        href,
        active: link.getAttribute('aria-current') === 'page' || this.win.location.pathname === href,
      };
    });
    const activeTitle = conversations.find((item) => item.active)?.title ?? 'Untitled document';
    return {
      ready: Boolean(navRoot && conversationRoot && composerRoot && composer && sendButton && newChatButton),
      navRoot,
      conversationRoot,
      composerRoot,
      composer,
      sendButton,
      newChatButton,
      attachmentButton,
      activeTitle,
      conversations,
    };
  }

  openConversation(href: string): void {
    const link = [...this.doc.querySelectorAll<HTMLAnchorElement>(selectors.conversationLinks)]
      .find((candidate) => candidate.getAttribute('href') === href);
    link?.click();
  }

  createConversation(): void {
    element<HTMLElement>(this.doc, selectors.newChatButton)?.click();
  }

  attachFile(): void {
    element<HTMLElement>(this.doc, selectors.attachmentButton)?.click();
  }

  observe(onChange: () => void): () => void {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = this.win.requestAnimationFrame(() => {
        frame = 0;
        onChange();
      });
    };
    const isDocuVeilNode = (node: Node) => node instanceof Element && Boolean(
      node.closest('[data-docuveil-shell], [data-docuveil-compatibility]'),
    );
    const observer = new MutationObserver((records) => {
      const hasNativeMutation = records.some((record) =>
        [...record.addedNodes, ...record.removedNodes].some((node) => !isDocuVeilNode(node)),
      );
      if (hasNativeMutation) schedule();
    });
    const snapshot = this.inspect();
    const targets = [snapshot.navRoot, snapshot.conversationRoot]
      .filter((target): target is HTMLElement => target !== null);
    if (targets.length === 2) {
      observer.observe(this.doc.body, { childList: true });
      for (const target of targets) observer.observe(target, { childList: true, subtree: true });
    } else {
      observer.observe(this.doc.body, { childList: true, subtree: true });
    }
    this.win.addEventListener('popstate', schedule);
    return () => {
      observer.disconnect();
      this.win.removeEventListener('popstate', schedule);
      if (frame) this.win.cancelAnimationFrame(frame);
    };
  }
}
```

- [ ] **Step 7: Verify adapter behavior and contract consistency**

Run:

```bash
npm test -w @docuveil/extension -- --run tests/adapters/chatgpt/adapter.test.ts
npm run typecheck -w @docuveil/extension
```

Expected: 5 tests pass and TypeScript exits `0`.

- [ ] **Step 8: Commit the isolated ChatGPT adapter**

```bash
git add extension/src/adapters extension/tests/adapters extension/tests/fixtures
git commit -m "feat: add ChatGPT DOM adapter"
```

---

### Task 5: Render the Accessible DocuVeil Shell

**Files:**
- Create: `extension/src/shell/createShell.ts`
- Create: `extension/tests/shell/createShell.test.ts`

**Interfaces:**
- Consumes: `AdapterSnapshot` and `ShellActions` callbacks.
- Produces: `createShell(document, snapshot, actions): ShellView` with `root`, `update(snapshot)`, and `destroy()`.

- [ ] **Step 1: Write failing shell rendering and behavior tests**

Create `extension/tests/shell/createShell.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { AdapterSnapshot } from '../../src/adapters/platformAdapter';
import { createShell } from '../../src/shell/createShell';

function snapshot(): AdapterSnapshot {
  const node = document.createElement('div');
  return {
    ready: true,
    navRoot: node,
    conversationRoot: node,
    composerRoot: node,
    composer: node,
    sendButton: node,
    newChatButton: node,
    attachmentButton: node,
    activeTitle: 'Beta report',
    conversations: [
      { id: 'alpha', title: 'Alpha brief', href: '/c/alpha', active: false },
      { id: 'beta', title: 'Beta report', href: '/c/beta', active: true },
    ],
  };
}

describe('createShell', () => {
  it('renders branded chrome, current title, and real conversations', () => {
    const view = createShell(document, snapshot(), {
      openConversation: vi.fn(), createConversation: vi.fn(), attachFile: vi.fn(),
    });
    expect(view.root.getAttribute('data-docuveil-shell')).toBe('true');
    expect(view.root.textContent).toContain('DocuVeil');
    expect(view.root.textContent).toContain('Beta report');
    expect(view.root.querySelectorAll('[data-conversation-href]')).toHaveLength(2);
    view.destroy();
  });

  it('keeps decorative formatting controls out of the tab order', () => {
    const view = createShell(document, snapshot(), {
      openConversation: vi.fn(), createConversation: vi.fn(), attachFile: vi.fn(),
    });
    const decorative = [...view.root.querySelectorAll('[data-decorative]')];
    expect(decorative.length).toBeGreaterThan(0);
    expect(decorative.every((item) => item.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(decorative.every((item) => !item.hasAttribute('tabindex'))).toBe(true);
    view.destroy();
  });

  it('delegates conversation, new-chat, and attachment actions', () => {
    const actions = { openConversation: vi.fn(), createConversation: vi.fn(), attachFile: vi.fn() };
    const view = createShell(document, snapshot(), actions);
    view.root.querySelector<HTMLElement>('[data-conversation-href="/c/alpha"]')?.click();
    view.root.querySelector<HTMLElement>('[data-docuveil-new]')?.click();
    view.root.querySelector<HTMLElement>('[data-docuveil-attach]')?.click();
    expect(actions.openConversation).toHaveBeenCalledWith('/c/alpha');
    expect(actions.createConversation).toHaveBeenCalledOnce();
    expect(actions.attachFile).toHaveBeenCalledOnce();
    view.destroy();
  });
});
```

- [ ] **Step 2: Run the shell tests and confirm they fail**

Run:

```bash
npm test -w @docuveil/extension -- --run tests/shell/createShell.test.ts
```

Expected: FAIL because `createShell.ts` does not exist.

- [ ] **Step 3: Implement the shell and its update lifecycle**

Create `extension/src/shell/createShell.ts`:

```ts
import type { AdapterSnapshot } from '../adapters/platformAdapter';

export type ShellActions = {
  openConversation(href: string): void;
  createConversation(): void;
  attachFile(): void;
};

export type ShellView = {
  root: HTMLElement;
  update(snapshot: AdapterSnapshot): void;
  destroy(): void;
};

function button(doc: Document, label: string, attribute: string, onClick: () => void): HTMLButtonElement {
  const control = doc.createElement('button');
  control.type = 'button';
  control.textContent = label;
  control.setAttribute(attribute, 'true');
  control.addEventListener('click', onClick);
  return control;
}

export function createShell(
  doc: Document,
  initial: AdapterSnapshot,
  actions: ShellActions,
): ShellView {
  const root = doc.createElement('section');
  root.setAttribute('data-docuveil-shell', 'true');
  root.setAttribute('aria-label', 'DocuVeil document workspace');

  const topbar = doc.createElement('header');
  topbar.className = 'docuveil-topbar';
  const brand = doc.createElement('strong');
  brand.textContent = 'DocuVeil';
  const title = doc.createElement('span');
  title.className = 'docuveil-title';
  topbar.append(brand, title);

  const toolbar = doc.createElement('div');
  toolbar.className = 'docuveil-toolbar';
  toolbar.setAttribute('aria-hidden', 'true');
  for (const label of ['File', 'Edit', 'View', 'B', 'I', 'U']) {
    const item = doc.createElement('span');
    item.textContent = label;
    item.setAttribute('data-decorative', 'true');
    item.setAttribute('aria-hidden', 'true');
    toolbar.append(item);
  }

  const sidebar = doc.createElement('aside');
  sidebar.className = 'docuveil-sidebar';
  const sidebarHeading = doc.createElement('h2');
  sidebarHeading.textContent = 'Documents';
  const newButton = button(doc, '+ New', 'data-docuveil-new', actions.createConversation);
  const list = doc.createElement('div');
  list.className = 'docuveil-document-list';
  sidebar.append(sidebarHeading, newButton, list);

  const attach = button(doc, '+', 'data-docuveil-attach', actions.attachFile);
  attach.setAttribute('aria-label', 'Attach a file using ChatGPT');
  root.append(topbar, toolbar, sidebar, attach);

  const update = (snapshot: AdapterSnapshot) => {
    title.textContent = snapshot.activeTitle;
    attach.hidden = snapshot.attachmentButton === null;
    list.replaceChildren(...snapshot.conversations.map((conversation) => {
      const item = button(doc, conversation.title, 'data-docuveil-document', () => {
        actions.openConversation(conversation.href);
      });
      item.setAttribute('data-conversation-href', conversation.href);
      if (conversation.active) item.setAttribute('aria-current', 'page');
      return item;
    }));
  };

  update(initial);
  doc.body.append(root);
  return { root, update, destroy: () => root.remove() };
}
```

- [ ] **Step 4: Verify the shell**

Run:

```bash
npm test -w @docuveil/extension -- --run tests/shell/createShell.test.ts
npm run typecheck -w @docuveil/extension
```

Expected: 3 tests pass and TypeScript exits `0`.

- [ ] **Step 5: Commit the shell**

```bash
git add extension/src/shell extension/tests/shell
git commit -m "feat: render accessible DocuVeil shell"
```

---

### Task 6: Add the Idempotent, Fail-Open Skin Controller

**Files:**
- Create: `extension/src/content/skinController.ts`
- Create: `extension/tests/content/skinController.test.ts`

**Interfaces:**
- Consumes: `PlatformAdapter`, `Document`, and `createShell`.
- Produces: `SkinController.setEnabled(enabled)`, `refresh()`, and `destroy()`; applies only `docuveil-enabled` plus explicit `data-docuveil-*` markers after validation.

- [ ] **Step 1: Write failing lifecycle tests**

Create `extension/tests/content/skinController.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { AdapterSnapshot, PlatformAdapter } from '../../src/adapters/platformAdapter';
import { SkinController } from '../../src/content/skinController';

function snapshot(ready = true): AdapterSnapshot {
  const create = () => document.createElement('div');
  return {
    ready,
    navRoot: ready ? create() : null,
    conversationRoot: ready ? create() : null,
    composerRoot: ready ? create() : null,
    composer: ready ? create() : null,
    sendButton: ready ? create() : null,
    newChatButton: ready ? create() : null,
    attachmentButton: null,
    activeTitle: 'Document',
    conversations: [],
  };
}

function adapter(current: AdapterSnapshot): PlatformAdapter {
  return {
    inspect: vi.fn(() => current),
    openConversation: vi.fn(),
    createConversation: vi.fn(),
    attachFile: vi.fn(),
    observe: vi.fn(() => vi.fn()),
  };
}

describe('SkinController', () => {
  it('mounts once and unmounts cleanly', () => {
    const platform = adapter(snapshot());
    const controller = new SkinController(document, platform);
    controller.setEnabled(true);
    controller.setEnabled(true);
    expect(document.querySelectorAll('[data-docuveil-shell]')).toHaveLength(1);
    expect(platform.observe).toHaveBeenCalledOnce();
    expect(document.documentElement.classList.contains('docuveil-enabled')).toBe(true);
    controller.setEnabled(false);
    expect(document.querySelector('[data-docuveil-shell]')).toBeNull();
    expect(document.documentElement.classList.contains('docuveil-enabled')).toBe(false);
  });

  it('leaves native UI visible and reports incompatibility', () => {
    const controller = new SkinController(document, adapter(snapshot(false)));
    controller.setEnabled(true);
    expect(document.documentElement.classList.contains('docuveil-enabled')).toBe(false);
    expect(document.querySelector('[data-docuveil-compatibility]')?.textContent)
      .toContain('ChatGPT interface is not supported');
    controller.destroy();
  });

  it('recovers when a delayed host DOM becomes ready', () => {
    let current = snapshot(false);
    let refresh: (() => void) | undefined;
    const platform: PlatformAdapter = {
      inspect: () => current,
      openConversation: vi.fn(),
      createConversation: vi.fn(),
      attachFile: vi.fn(),
      observe: (onChange) => {
        refresh = onChange;
        return vi.fn();
      },
    };
    const controller = new SkinController(document, platform);
    controller.setEnabled(true);
    current = snapshot(true);
    refresh?.();
    expect(document.documentElement.classList.contains('docuveil-enabled')).toBe(true);
    expect(document.querySelector('[data-docuveil-compatibility]')).toBeNull();
    controller.destroy();
  });

  it('removes every marker and observer on destroy', () => {
    const platform = adapter(snapshot());
    const stopObserving = vi.fn();
    vi.mocked(platform.observe).mockReturnValue(stopObserving);
    const controller = new SkinController(document, platform);
    controller.setEnabled(true);
    controller.destroy();
    expect(document.querySelector('[data-docuveil-shell]')).toBeNull();
    expect(document.documentElement.classList.contains('docuveil-enabled')).toBe(false);
    expect(platform.observe).toHaveBeenCalledOnce();
    expect(stopObserving).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the lifecycle tests and confirm they fail**

Run:

```bash
npm test -w @docuveil/extension -- --run tests/content/skinController.test.ts
```

Expected: FAIL because `SkinController` does not exist.

- [ ] **Step 3: Implement validation, markers, idempotency, and cleanup**

Create `extension/src/content/skinController.ts`:

```ts
import type { AdapterSnapshot, PlatformAdapter } from '../adapters/platformAdapter';
import { createShell, type ShellView } from '../shell/createShell';

const ROOT_CLASS = 'docuveil-enabled';

export class SkinController {
  private enabled = false;
  private shell: ShellView | null = null;
  private stopObserving: (() => void) | null = null;
  private marked: HTMLElement[] = [];
  private notice: HTMLElement | null = null;

  constructor(
    private readonly doc: Document,
    private readonly adapter: PlatformAdapter,
  ) {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
      return;
    }
    if (!this.stopObserving) {
      this.stopObserving = this.adapter.observe(() => this.refresh());
    }
    this.mountOrRefresh();
  }

  refresh(): void {
    if (this.enabled) this.mountOrRefresh();
  }

  destroy(): void {
    this.enabled = false;
    this.stop();
  }

  private mountOrRefresh(): void {
    const snapshot = this.adapter.inspect();
    if (!snapshot.ready) {
      this.clearPresentation();
      this.showCompatibilityNotice();
      return;
    }
    this.notice?.remove();
    this.notice = null;
    if (this.shell) {
      this.shell.update(snapshot);
      return;
    }
    this.applyMarkers(snapshot);
    this.shell = createShell(this.doc, snapshot, {
      openConversation: (href) => this.adapter.openConversation(href),
      createConversation: () => this.adapter.createConversation(),
      attachFile: () => this.adapter.attachFile(),
    });
    this.doc.documentElement.classList.add(ROOT_CLASS);
  }

  private applyMarkers(snapshot: AdapterSnapshot): void {
    const pairs: Array<[HTMLElement | null, string]> = [
      [snapshot.navRoot, 'navigation'],
      [snapshot.conversationRoot, 'conversation'],
      [snapshot.composerRoot, 'composer'],
    ];
    this.marked = pairs.flatMap(([node, value]) => {
      if (!node) return [];
      node.setAttribute('data-docuveil-native', value);
      return [node];
    });
  }

  private showCompatibilityNotice(): void {
    if (this.notice) return;
    this.notice = this.doc.createElement('div');
    this.notice.setAttribute('data-docuveil-compatibility', 'true');
    this.notice.setAttribute('role', 'status');
    this.notice.textContent = 'DocuVeil: this ChatGPT interface is not supported yet. Native ChatGPT remains available.';
    this.doc.body.append(this.notice);
  }

  private stop(): void {
    this.stopObserving?.();
    this.stopObserving = null;
    this.clearPresentation();
  }

  private clearPresentation(): void {
    this.shell?.destroy();
    this.shell = null;
    this.notice?.remove();
    this.notice = null;
    for (const node of this.marked) node.removeAttribute('data-docuveil-native');
    this.marked = [];
    this.doc.documentElement.classList.remove(ROOT_CLASS);
  }
}
```

- [ ] **Step 4: Verify lifecycle behavior**

Run:

```bash
npm test -w @docuveil/extension -- --run tests/content/skinController.test.ts
npm run typecheck -w @docuveil/extension
```

Expected: 4 tests pass and TypeScript exits `0`.

- [ ] **Step 5: Commit the controller**

```bash
git add extension/src/content extension/tests/content
git commit -m "feat: add fail-open skin controller"
```

---

### Task 7: Bootstrap Persisted State in the Content Script

**Files:**
- Create: `extension/src/content/bootstrap.ts`
- Create: `extension/src/content/index.ts`
- Create: `extension/tests/content/bootstrap.test.ts`

**Interfaces:**
- Consumes: `StorageArea`, `RuntimeMessages`, `SkinController`, and `ChatGptAdapter`.
- Produces: `bootstrapDocuVeil(dependencies): Promise<() => void>`; applies initial persisted state and later `StateMessage` updates.

- [ ] **Step 1: Write failing startup and message tests**

Create `extension/tests/content/bootstrap.test.ts`:

```ts
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
      get: vi.fn().mockResolvedValue({ enabled: true }),
      set: vi.fn(),
    };
    const controller = { setEnabled: vi.fn(), destroy: vi.fn() };
    const cleanup = await bootstrapDocuVeil({ storage, runtime, controller });
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
```

- [ ] **Step 2: Run the startup test and confirm it fails**

Run:

```bash
npm test -w @docuveil/extension -- --run tests/content/bootstrap.test.ts
```

Expected: FAIL because `bootstrap.ts` does not exist.

- [ ] **Step 3: Implement state startup and message wiring**

Create `extension/src/content/bootstrap.ts`:

```ts
import { isStateMessage, type StorageArea } from '../shared/contracts';
import { getEnabled } from '../shared/storage';

type MessageListener = (message: unknown) => void;

export interface RuntimeMessages {
  onMessage: {
    addListener(listener: MessageListener): void;
    removeListener(listener: MessageListener): void;
  };
}

export interface ControllerLifecycle {
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

export async function bootstrapDocuVeil(dependencies: {
  storage: StorageArea;
  runtime: RuntimeMessages;
  controller: ControllerLifecycle;
}): Promise<() => void> {
  const { storage, runtime, controller } = dependencies;
  const listener: MessageListener = (message) => {
    if (isStateMessage(message)) controller.setEnabled(message.enabled);
  };
  runtime.onMessage.addListener(listener);
  controller.setEnabled(await getEnabled(storage));
  return () => {
    runtime.onMessage.removeListener(listener);
    controller.destroy();
  };
}
```

Create `extension/src/content/index.ts`:

```ts
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
```

- [ ] **Step 4: Verify persisted startup and runtime updates**

Run:

```bash
npm test -w @docuveil/extension -- --run tests/content/bootstrap.test.ts
npm run typecheck -w @docuveil/extension
```

Expected: 1 test passes and TypeScript exits `0`.

- [ ] **Step 5: Commit the content entry point**

```bash
git add extension/src/content extension/tests/content/bootstrap.test.ts
git commit -m "feat: bootstrap persisted DocuVeil state"
```

---

### Task 8: Apply the Document Skin and Preserve Native Rich Content

**Files:**
- Create: `extension/styles/docuveil.css`
- Create: `extension/tests/integration/chatgptSkin.test.ts`

**Interfaces:**
- Consumes: `docuveil-enabled`, `[data-docuveil-shell]`, and `[data-docuveil-native]` markers from the controller.
- Produces: a scoped document-editor layout; native messages, composer, code, lists, tables, links, and images remain in the host DOM.

- [ ] **Step 1: Write the failing fixture-level integration test**

Create `extension/tests/integration/chatgptSkin.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import supportedHtml from '../fixtures/chatgpt-supported.html?raw';
import { ChatGptAdapter } from '../../src/adapters/chatgpt/adapter';
import { SkinController } from '../../src/content/skinController';
import skinCss from '../../styles/docuveil.css?raw';

describe('ChatGPT skin integration', () => {
  it('mounts around native rich content and restores the page', () => {
    document.body.innerHTML = supportedHtml;
    const code = document.querySelector('code');
    const heading = document.querySelector('h2');
    const table = document.querySelector('table');
    const image = document.querySelector('img');
    const composer = document.querySelector('#prompt-textarea');
    const nativeKeydown = vi.fn();
    composer?.addEventListener('keydown', nativeKeydown);
    const controller = new SkinController(document, new ChatGptAdapter(document, window));
    controller.setEnabled(true);
    expect(document.documentElement.classList.contains('docuveil-enabled')).toBe(true);
    expect(document.querySelector('code')).toBe(code);
    expect(document.querySelector('h2')).toBe(heading);
    expect(document.querySelector('table')).toBe(table);
    expect(document.querySelector('img')).toBe(image);
    expect(document.querySelector('#prompt-textarea')).toBe(composer);
    expect(document.querySelector('[data-docuveil-native="conversation"]')).not.toBeNull();
    composer?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(nativeKeydown).toHaveBeenCalledOnce();
    controller.setEnabled(false);
    expect(document.querySelector('[data-docuveil-shell]')).toBeNull();
    expect(document.querySelector('code')).toBe(code);
    expect(document.querySelector('#prompt-textarea')).toBe(composer);
  });

  it('scopes all host-page styling behind the enabled root class', () => {
    expect(skinCss).toContain(':root.docuveil-enabled');
    expect(skinCss).toContain('.docuveil-enabled [data-docuveil-native="conversation"]');
    expect(skinCss).not.toMatch(/(^|\n)body\s*\{/);
  });
});
```

- [ ] **Step 2: Run the integration test before adding the stylesheet**

Run:

```bash
npm test -w @docuveil/extension -- --run tests/integration/chatgptSkin.test.ts
```

Expected: FAIL because `extension/styles/docuveil.css` does not exist. The DOM-preservation assertion itself establishes that styling may change presentation but must not replace host content.

- [ ] **Step 3: Add strictly scoped production styles**

Create `extension/styles/docuveil.css`:

```css
:root.docuveil-enabled {
  --docuveil-ink: #202124;
  --docuveil-muted: #5f6368;
  --docuveil-border: #d9dee8;
  --docuveil-blue: #4f6fdd;
  --docuveil-workspace: #e9edf3;
  color-scheme: light;
}

.docuveil-enabled body {
  background: var(--docuveil-workspace) !important;
  color: var(--docuveil-ink) !important;
}

.docuveil-enabled [data-docuveil-native="navigation"] {
  display: none !important;
}

.docuveil-enabled [data-docuveil-native="conversation"] {
  width: min(816px, calc(100vw - 320px)) !important;
  min-height: calc(100vh - 152px) !important;
  margin: 128px auto 120px calc(50% - 248px) !important;
  padding: 72px 88px 160px !important;
  background: #fff !important;
  border: 1px solid var(--docuveil-border) !important;
  border-radius: 3px !important;
  box-shadow: 0 2px 8px rgb(30 42 64 / 10%) !important;
}

.docuveil-enabled [data-docuveil-native="conversation"] article {
  max-width: none !important;
  margin: 0 0 1.4em !important;
  padding: 0 !important;
  background: transparent !important;
  color: var(--docuveil-ink) !important;
}

.docuveil-enabled [data-docuveil-native="conversation"] pre {
  overflow: auto;
  border: 1px solid var(--docuveil-border);
  border-radius: 8px;
}

.docuveil-enabled [data-docuveil-native="conversation"] table {
  width: 100%;
  border-collapse: collapse;
}

.docuveil-enabled [data-docuveil-native="conversation"] th,
.docuveil-enabled [data-docuveil-native="conversation"] td {
  padding: 8px 10px;
  border: 1px solid var(--docuveil-border);
}

.docuveil-enabled [data-docuveil-native="conversation"] img {
  max-width: 100%;
  height: auto;
}

.docuveil-enabled [data-docuveil-native="composer"] {
  position: fixed !important;
  z-index: 2147483642 !important;
  left: calc(50% - 248px) !important;
  bottom: 24px !important;
  width: min(760px, calc(100vw - 376px)) !important;
  border: 1px solid var(--docuveil-border) !important;
  border-radius: 14px !important;
  background: #fff !important;
  box-shadow: 0 10px 28px rgb(30 42 64 / 16%) !important;
}

[data-docuveil-shell="true"] {
  position: fixed;
  inset: 0;
  z-index: 2147483640;
  pointer-events: none;
  font: 14px/1.4 Arial, sans-serif;
  color: var(--docuveil-ink);
}

.docuveil-topbar,
.docuveil-toolbar,
.docuveil-sidebar,
[data-docuveil-attach] {
  pointer-events: auto;
}

.docuveil-topbar {
  position: fixed;
  inset: 0 0 auto 0;
  height: 58px;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid var(--docuveil-border);
}

.docuveil-title {
  color: var(--docuveil-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.docuveil-toolbar {
  position: fixed;
  inset: 58px 0 auto 0;
  height: 44px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 24px;
  background: #f8faff;
  border-bottom: 1px solid var(--docuveil-border);
}

.docuveil-sidebar {
  position: fixed;
  inset: 102px auto 0 0;
  width: 248px;
  padding: 24px 16px;
  overflow: auto;
  background: #f8faff;
  border-right: 1px solid var(--docuveil-border);
}

.docuveil-sidebar h2 {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--docuveil-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.docuveil-sidebar button {
  width: 100%;
  margin: 0 0 6px;
  padding: 9px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.docuveil-sidebar button:hover,
.docuveil-sidebar button[aria-current="page"] {
  background: #e2e8fb;
}

[data-docuveil-attach] {
  position: fixed;
  z-index: 2147483643;
  left: calc(50% - 292px);
  bottom: 42px;
  width: 32px;
  height: 32px;
  border: 1px solid var(--docuveil-border);
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
}

[data-docuveil-compatibility="true"] {
  position: fixed;
  z-index: 2147483647;
  right: 16px;
  bottom: 16px;
  max-width: 360px;
  padding: 12px 14px;
  border: 1px solid #e0b95c;
  border-radius: 8px;
  background: #fff8df;
  color: #4b3a12;
  box-shadow: 0 8px 24px rgb(30 42 64 / 18%);
  font: 14px/1.4 Arial, sans-serif;
}

@media (max-width: 900px) {
  .docuveil-enabled [data-docuveil-native="conversation"] {
    width: calc(100vw - 64px) !important;
    margin-left: 32px !important;
    padding-inline: 40px !important;
  }

  .docuveil-sidebar {
    display: none;
  }

  .docuveil-enabled [data-docuveil-native="composer"] {
    left: 32px !important;
    width: calc(100vw - 64px) !important;
  }
}
```

- [ ] **Step 4: Verify full DOM behavior after adding styles**

Run:

```bash
npm test -w @docuveil/extension -- --run tests/integration/chatgptSkin.test.ts
npm test
npm run typecheck -w @docuveil/extension
```

Expected: the integration test and all earlier tests pass; TypeScript exits `0`.

- [ ] **Step 5: Commit the document skin**

```bash
git add extension/styles extension/tests/integration
git commit -m "feat: apply scoped document workspace skin"
```

---

### Task 9: Build a Sideloadable Manifest V3 Extension

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/assets/favicon.svg`
- Create: `extension/scripts/build.mjs`
- Create: `extension/tests/build-output.test.ts`
- Modify: `extension/package.json`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: background/content TypeScript entries, scoped CSS, manifest, and source favicon.
- Produces: `dist/extension/{manifest.json,background.js,content.js,styles/docuveil.css,icons/*.png}`.

- [ ] **Step 1: Add the exact MV3 manifest**

Create `extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "DocuVeil",
  "version": "0.1.0",
  "description": "A focused document-style interface for supported AI chats.",
  "permissions": ["storage"],
  "host_permissions": ["https://chatgpt.com/*"],
  "action": {
    "default_title": "Toggle DocuVeil",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://chatgpt.com/*"],
      "js": ["content.js"],
      "css": ["styles/docuveil.css"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

Copy the existing original project mark without changing its artwork:

```bash
mkdir extension/assets
cp website/public/favicon.svg extension/assets/favicon.svg
```

- [ ] **Step 2: Write a failing build-output test**

Create `extension/tests/build-output.test.ts`:

```ts
// @vitest-environment node
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const output = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist/extension');

describe('extension build output', () => {
  it('contains every sideloading artifact and minimum permissions', async () => {
    for (const file of [
      'manifest.json', 'background.js', 'content.js', 'styles/docuveil.css',
      'icons/icon-16.png', 'icons/icon-32.png', 'icons/icon-48.png', 'icons/icon-128.png',
    ]) {
      await expect(access(resolve(output, file))).resolves.toBeUndefined();
    }
    const manifest = JSON.parse(await readFile(resolve(output, 'manifest.json'), 'utf8'));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest.host_permissions).toEqual(['https://chatgpt.com/*']);
  });
});
```

Replace the scripts in `extension/package.json` so the artifact assertion is separate from the normal unit suite:

```json
{
  "scripts": {
    "build": "node scripts/build.mjs",
    "test": "vitest run --exclude tests/build-output.test.ts",
    "test:build": "vitest run tests/build-output.test.ts",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 3: Run the build-output test and confirm it fails**

Run:

```bash
npm run test:build -w @docuveil/extension
```

Expected: FAIL because `dist/extension` does not exist.

- [ ] **Step 4: Add the deterministic build script**

Install build dependencies:

```bash
npm install --save-dev --workspace=extension esbuild sharp
```

Create `extension/scripts/build.mjs`:

```js
import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const extensionRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(extensionRoot, '../dist/extension');

await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, 'styles'), { recursive: true });
await mkdir(resolve(output, 'icons'), { recursive: true });

await build({
  entryPoints: {
    background: resolve(extensionRoot, 'src/background/index.ts'),
    content: resolve(extensionRoot, 'src/content/index.ts'),
  },
  bundle: true,
  entryNames: '[name]',
  format: 'iife',
  outdir: output,
  platform: 'browser',
  target: ['chrome120'],
  minify: true,
  sourcemap: false,
});

await cp(resolve(extensionRoot, 'manifest.json'), resolve(output, 'manifest.json'));
await cp(resolve(extensionRoot, 'styles/docuveil.css'), resolve(output, 'styles/docuveil.css'));

const iconSource = resolve(extensionRoot, 'assets/favicon.svg');
await Promise.all([16, 32, 48, 128].map((size) =>
  sharp(iconSource)
    .resize(size, size)
    .png()
    .toFile(resolve(output, `icons/icon-${size}.png`)),
));
```

Replace the root build scripts with:

```json
{
  "scripts": {
    "dev": "npm run dev -w @docuveil/website",
    "build": "npm run build:website && npm run build:extension",
    "build:website": "npm run build -w @docuveil/website",
    "build:extension": "npm run build -w @docuveil/extension",
    "lint": "npm run lint -w @docuveil/website && npm run typecheck -w @docuveil/extension",
    "test": "npm run test -w @docuveil/extension",
    "test:build": "npm run test:build -w @docuveil/extension",
    "preview": "npm run preview -w @docuveil/website"
  }
}
```

Add `/website/dist` and `/dist` as separate ignored build outputs in `.gitignore`.

- [ ] **Step 5: Build, inspect, and test the unpacked output**

Run:

```bash
npm run build:extension
npm run test:build
npm run lint
```

Expected: `dist/extension` contains all eight asserted artifacts, the build-output test passes, and lint/typecheck exits `0`.

- [ ] **Step 6: Commit the build pipeline**

```bash
git add .gitignore package.json package-lock.json extension
git commit -m "build: emit sideloadable MV3 extension"
```

---

### Task 10: Add CI, User Documentation, and the Installation CTA

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `docs/INSTALL.md`
- Create: `docs/PRIVACY.md`
- Create: `docs/CONTRIBUTING.md`
- Create: `docs/SECURITY.md`
- Modify: `README.md`
- Modify: `website/src/components/Home.jsx`
- Modify: `website/src/App.css`

**Interfaces:**
- Consumes: root `lint`, `test`, and `build` scripts plus `dist/extension`.
- Produces: pull-request CI, exact Chrome/Edge sideloading steps, public privacy/security commitments, and a website link to the GitHub installation path.

- [ ] **Step 1: Add CI with one reproducible quality gate**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
      - run: npm run test:build
```

- [ ] **Step 2: Write exact sideloading instructions**

Create `docs/INSTALL.md`:

````markdown
# Install DocuVeil from Source

## Requirements

- Node.js 20 or newer
- npm
- Desktop Google Chrome or Microsoft Edge

## Build

```bash
git clone https://github.com/CaoRIV/DocuVeil.git
cd DocuVeil
npm ci
npm run build:extension
```

The unpacked extension is generated at `dist/extension`.

## Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the repository's `dist/extension` directory.
5. Open `https://chatgpt.com`, then select the DocuVeil toolbar icon.

## Microsoft Edge

1. Open `edge://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the repository's `dist/extension` directory.
5. Open `https://chatgpt.com`, then select the DocuVeil toolbar icon.

Re-run `npm run build:extension`, then select **Reload** on the browser's extension card after every source change.
````

- [ ] **Step 3: Add concise privacy, contribution, and security policies**

Create `docs/PRIVACY.md`:

```markdown
# Privacy

DocuVeil runs locally in the browser. It stores only the global enabled flag in `chrome.storage.local`.

DocuVeil has no backend, account, analytics, telemetry, or external data transfer. It does not store conversation content, attachments, cookies, history, or credentials. Messages and files continue to be handled by ChatGPT under OpenAI's terms and privacy policy.
```

Create `docs/CONTRIBUTING.md`:

````markdown
# Contributing

Keep ChatGPT selectors inside `extension/src/adapters/chatgpt/selectors.ts`. Add or update a DOM fixture and test for every selector or lifecycle change.

Before opening a pull request, run:

```bash
npm run lint
npm test
npm run build
```

Manually smoke-test `dist/extension` in current desktop Chrome and Edge when host-DOM behavior changes.
````

Create `docs/SECURITY.md`:

```markdown
# Security

Report vulnerabilities privately through GitHub's security-advisory flow for `CaoRIV/DocuVeil`.

Do not include credentials, cookies, private conversations, or attachments in a report. DocuVeil does not accept remote code, broad host permissions, network interception, or storage of conversation content.
```

- [ ] **Step 4: Update the README to match the real repository state**

Replace the early-development warning and installation sections so they state:

````markdown
> Project status: MVP development. The repository contains the landing page, the Manifest V3 extension source, automated fixture tests, and source-installation documentation.

## Install the extension from source

```bash
git clone https://github.com/CaoRIV/DocuVeil.git
cd DocuVeil
npm ci
npm run build:extension
```

Load `dist/extension` as an unpacked extension in Chrome or Edge. See [the complete installation guide](docs/INSTALL.md).
````

Keep the existing product direction, privacy, disclaimer, MIT license, and link to the design specification.

- [ ] **Step 5: Add a real installation CTA to the existing landing page**

Add this element below `.demo-features` in `website/src/components/Home.jsx`:

```jsx
<a
  className="install-link"
  href="https://github.com/CaoRIV/DocuVeil#install-the-extension-from-source"
>
  Install from GitHub
</a>
```

Add this rule to `website/src/App.css`:

```css
.install-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0.7rem 1.15rem;
  border-radius: 999px;
  background: #4f6fdd;
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 10px 28px rgba(79, 111, 221, 0.24);
}

.install-link:focus-visible {
  outline: 3px solid #202124;
  outline-offset: 3px;
}
```

- [ ] **Step 6: Verify docs, website, extension, and CI commands locally**

Run:

```bash
npm ci
npm run lint
npm test
npm run build
npm run test:build
```

Expected: dependency installation succeeds from the lockfile; lint/typecheck exits `0`; all unit, DOM fixture, and build-output tests pass; website and extension builds both succeed.

- [ ] **Step 7: Commit the distribution surface**

```bash
git add .github README.md docs website/src/components/Home.jsx website/src/App.css
git commit -m "docs: add source installation and CI"
```

---

### Task 11: Run Chrome and Edge Release Smoke Tests

**Files:**
- Create: `docs/RELEASE_CHECKLIST.md`
- Modify only if a failure is found: the smallest source/test file responsible for that failure.

**Interfaces:**
- Consumes: `dist/extension` loaded into current desktop Chrome and Edge against live `https://chatgpt.com`.
- Produces: recorded release evidence for every MVP interaction and fail-open behavior.

- [ ] **Step 1: Create the release checklist before testing**

Create `docs/RELEASE_CHECKLIST.md`:

```markdown
# DocuVeil MVP Release Checklist

Record the date, browser version, operating system, and tester for each browser run.

## Chrome

- [ ] Load `dist/extension` without manifest errors.
- [ ] Enable and disable without reloading ChatGPT.
- [ ] Confirm the enabled view uses DocuVeil branding, hides visible ChatGPT branding, and resembles the approved document workspace.
- [ ] Preserve enabled state after reload, a new ChatGPT tab, and browser restart.
- [ ] Switch an existing conversation and create a new conversation.
- [ ] Send a text prompt with Enter and insert a line break with Shift+Enter.
- [ ] Observe a long streaming response without duplicate shell elements or visible jank.
- [ ] Verify headings, lists, tables, links, code blocks, images, and scroll behavior.
- [ ] Attach one image and one non-image file through ChatGPT's native flow.
- [ ] Disable DocuVeil and confirm the original page is restored without reload.
- [ ] In a disposable ChatGPT tab, run `document.querySelector('#prompt-textarea')?.remove()` in DevTools, enable DocuVeil, and confirm the native page remains visible with the compatibility notice; reload the tab afterward.

## Microsoft Edge

- [ ] Load `dist/extension` without manifest errors.
- [ ] Enable and disable without reloading ChatGPT.
- [ ] Confirm the enabled view uses DocuVeil branding, hides visible ChatGPT branding, and resembles the approved document workspace.
- [ ] Preserve enabled state after reload, a new ChatGPT tab, and browser restart.
- [ ] Switch an existing conversation and create a new conversation.
- [ ] Send a text prompt with Enter and insert a line break with Shift+Enter.
- [ ] Observe a long streaming response without duplicate shell elements or visible jank.
- [ ] Verify headings, lists, tables, links, code blocks, images, and scroll behavior.
- [ ] Attach one image and one non-image file through ChatGPT's native flow.
- [ ] Disable DocuVeil and confirm the original page is restored without reload.
- [ ] In a disposable ChatGPT tab, run `document.querySelector('#prompt-textarea')?.remove()` in DevTools, enable DocuVeil, and confirm the native page remains visible with the compatibility notice; reload the tab afterward.
```

- [ ] **Step 2: Build from a clean dependency install**

Run:

```bash
npm ci
npm run lint
npm test
npm run build
```

Expected: all automated checks pass and `dist/extension` is recreated.

- [ ] **Step 3: Complete the Chrome checklist on live ChatGPT**

Load `dist/extension` through `chrome://extensions`, perform each Chrome item, and record browser/OS/tester details in the checklist. If a selector fails, add the smallest sanitized fixture reproducing the live structure, make that fixture test fail, then update only `selectors.ts` or `adapter.ts` until it passes.

- [ ] **Step 4: Complete the Edge checklist on live ChatGPT**

Load the same `dist/extension` through `edge://extensions` and repeat every Edge item. Treat browser-specific failures with the same fixture-first regression workflow.

- [ ] **Step 5: Re-run the complete automated gate after any smoke-test fix**

Run:

```bash
npm run lint
npm test
npm run build
npm run test:build
```

Expected: every command exits `0`; no test is skipped; the final `dist/extension` is the artifact just tested.

- [ ] **Step 6: Commit release evidence**

```bash
git add docs/RELEASE_CHECKLIST.md extension
git commit -m "test: record Chrome and Edge MVP smoke tests"
```

## Spec Traceability

| Design section | Implemented and verified by |
|---|---|
| 1–3. Product summary, goals, and non-goals | Global Constraints; Tasks 3–11 |
| 4. Repository layout | Tasks 1, 2, and 9 |
| 5.1 Service worker | Task 3 |
| 5.2 ChatGPT adapter | Task 4 |
| 5.3 DocuVeil shell | Task 5 |
| 5.4 Skin controller | Tasks 6 and 7 |
| 6.1 Enable and disable | Tasks 2, 3, 6, and 7 |
| 6.2 Conversation navigation | Tasks 4 and 5 |
| 6.3 Conversation presentation | Task 8 |
| 6.4 Prompt and attachments | Tasks 4, 5, and 8 |
| 7. Resilience and error handling | Tasks 4 and 6 |
| 8. Permissions, privacy, and security | Tasks 9 and 10 |
| 9. Testing strategy | Tasks 2–9 and 11 |
| 10. Open-source distribution | Tasks 9 and 10 |
| 11. MVP acceptance criteria | Task 11 and Completion Criteria |
| 12. Future work | Explicitly excluded by Global Constraints |

## Completion Criteria

The implementation is complete only when all eleven tasks and both browser checklists are complete, the root Git working tree is clean, and these commands all exit `0` from a fresh clone:

```bash
npm ci
npm run lint
npm test
npm run build
npm run test:build
```

The final artifact must be loadable from `dist/extension`, request only the permissions in the manifest above, retain native ChatGPT content and actions, and fail open when the adapter cannot validate the host DOM.
