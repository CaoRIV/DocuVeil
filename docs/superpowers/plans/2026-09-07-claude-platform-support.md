# Claude Platform Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full DocuVeil support for Claude Free/Pro while keeping ChatGPT and Claude enablement independent.

**Architecture:** Detect the platform from the active hostname, select a dedicated adapter through a small factory, and reuse the existing controller and shell. Keep Claude selectors and CSS isolated, preserve native DOM ownership and Artifacts, and fail open when required Claude elements are unavailable.

**Tech Stack:** TypeScript, Manifest V3, DOM APIs, CSS, Vitest, JSDOM, esbuild

**Spec:** `docs/superpowers/specs/2026-09-07-claude-platform-support-design.md`

## Global Constraints

- Support Claude Free/Pro personal accounts on desktop Chrome and Edge.
- Read only recent standalone chats; Projects and Team/Enterprise layouts are out of scope.
- Declare only `https://claude.ai/*` in addition to the existing ChatGPT host permission.
- Store enablement per platform and migrate the legacy ChatGPT state once.
- Never reparent React-owned message, composer, or Artifact nodes.
- Preserve the native Artifact panel and fail open to the native Claude UI.
- Do not add a popup, custom upload button, remote code, telemetry, or Gemini support.
- Codex does not commit; each task ends with a suggested commit for the user.

---

### Task 1: Platform detection

**Files:**
- Create: `extension/src/shared/platform.ts`
- Create: `extension/tests/shared/platform.test.ts`

**Interfaces:**
- Produces: `PlatformId`, `detectPlatform(hostname)`, and `platformName(platform)`.

- [x] **Step 1: Write the failing hostname tests**

```ts
expect(detectPlatform('chatgpt.com')).toBe('chatgpt');
expect(detectPlatform('claude.ai')).toBe('claude');
expect(detectPlatform('www.claude.ai')).toBeNull();
expect(detectPlatform('example.com')).toBeNull();
expect(platformName('claude')).toBe('Claude');
```

- [x] **Step 2: Verify RED**

Run: `npm test -w @docuveil/extension -- --run tests/shared/platform.test.ts`  
Expected: FAIL because `shared/platform.ts` does not exist.

- [x] **Step 3: Add the minimal platform module**

```ts
export type PlatformId = 'chatgpt' | 'claude';

export function detectPlatform(hostname: string): PlatformId | null {
  if (hostname === 'chatgpt.com') return 'chatgpt';
  if (hostname === 'claude.ai') return 'claude';
  return null;
}

export function platformName(platform: PlatformId): string {
  return platform === 'chatgpt' ? 'ChatGPT' : 'Claude';
}
```

- [x] **Step 4: Verify GREEN**

Run the focused test, then `npm run lint`.  
Expected: both exit successfully.

- [ ] **Step 5: User checkpoint**

Suggested commit: `feat(extension): add supported platform detection`

---

### Task 2: Per-platform storage and toolbar action

**Files:**
- Modify: `extension/src/shared/contracts.ts`
- Modify: `extension/src/shared/storage.ts`
- Modify: `extension/src/background/registerAction.ts`
- Modify: `extension/src/content/bootstrap.ts`
- Modify: `extension/src/content/index.ts`
- Modify: `extension/tests/shared/storage.test.ts`
- Modify: `extension/tests/background/registerAction.test.ts`
- Modify: `extension/tests/content/bootstrap.test.ts`

**Interfaces:**
- Consumes: `PlatformId`, `detectPlatform(hostname)`.
- Produces: `getEnabled(storage, platform)`, `setEnabled(storage, platform, enabled)`, and `toggleEnabled(storage, platform)`.

- [x] **Step 1: Write failing storage and action tests**

Cover these literal cases:

```ts
await expect(getEnabled(memoryStorage({ enabled: true }), 'chatgpt')).resolves.toBe(true);
await expect(getEnabled(memoryStorage({ enabled: true }), 'claude')).resolves.toBe(false);

const storage = memoryStorage();
await setEnabled(storage, 'chatgpt', true);
await setEnabled(storage, 'claude', false);
await expect(getEnabled(storage, 'chatgpt')).resolves.toBe(true);
await expect(getEnabled(storage, 'claude')).resolves.toBe(false);
```

Update background tests to prove a Claude tab toggles only Claude and an unsupported tab performs no storage write or message send. Update bootstrap tests so stored state is read with the supplied platform.

- [x] **Step 2: Verify RED**

Run:

```bash
npm test -w @docuveil/extension -- --run tests/shared/storage.test.ts tests/background/registerAction.test.ts tests/content/bootstrap.test.ts
```

Expected: FAIL because the storage functions do not accept a platform.

- [x] **Step 3: Implement the state map and migration**

Use these contracts:

```ts
export const ENABLED_KEY = 'enabled' as const;
export const ENABLED_BY_PLATFORM_KEY = 'enabledByPlatform' as const;
export type EnabledByPlatform = Partial<Record<PlatformId, boolean>>;
```

`getEnabled` first reads `enabledByPlatform`. When the map is absent and the platform is ChatGPT, read legacy `enabled`, persist `{ chatgpt: legacy === true }`, and return that value. Claude defaults to `false`. `setEnabled` merges one platform into the existing map; `toggleEnabled` uses the two functions.

In `registerAction`, query the active tab before changing storage:

```ts
const platform = tab?.url ? detectPlatform(new URL(tab.url).hostname) : null;
if (!platform || tab?.id === undefined) return;
const enabled = await toggleEnabled(chromeApi.storage.local, platform);
await chromeApi.tabs.sendMessage(tab.id, { type: STATE_MESSAGE, enabled });
```

Add `platform: PlatformId` to `bootstrapDocuVeil` dependencies and call `getEnabled(storage, platform)`. Pass `'chatgpt'` from the content entry temporarily; Task 5 replaces it with adapter detection before Claude is added to the manifest.

- [x] **Step 4: Verify GREEN**

Run the three focused files, the complete `npm test`, and `npm run lint`.  
Expected: all pass.

- [ ] **Step 5: User checkpoint**

Suggested commit: `feat(extension): persist enablement per platform`

---

### Task 3: Platform-aware controller and auxiliary roots

**Files:**
- Modify: `extension/src/adapters/platformAdapter.ts`
- Modify: `extension/src/adapters/chatgpt/adapter.ts`
- Modify: `extension/src/content/skinController.ts`
- Modify: `extension/tests/adapters/chatgpt/adapter.test.ts`
- Modify: `extension/tests/content/skinController.test.ts`
- Modify: `extension/tests/integration/chatgptSkin.test.ts`
- Modify: `extension/tests/shell/createShell.test.ts`

**Interfaces:**
- Consumes: `PlatformId`, `platformName(platform)`.
- Produces: `PlatformAdapter.id` and `AdapterSnapshot.auxiliaryRoots`.

- [ ] **Step 1: Write failing controller tests**

Add `id: 'chatgpt'` to adapter fakes and `auxiliaryRoots: []` to snapshots. Then test a Claude fake with one auxiliary node:

```ts
controller.setEnabled(true);
expect(document.documentElement.dataset.docuveilPlatform).toBe('claude');
expect(auxiliary.getAttribute('data-docuveil-native')).toBe('auxiliary');
controller.setEnabled(false);
expect(document.documentElement.hasAttribute('data-docuveil-platform')).toBe(false);
expect(auxiliary.hasAttribute('data-docuveil-native')).toBe(false);
```

Also assert that an unsupported Claude snapshot reports `this Claude interface is not supported`.

- [ ] **Step 2: Verify RED**

Run: `npm test -w @docuveil/extension -- --run tests/content/skinController.test.ts`  
Expected: FAIL because platform metadata and auxiliary roots are absent.

- [ ] **Step 3: Extend the adapter contract and controller**

```ts
export type AdapterSnapshot = {
  // existing fields remain unchanged
  auxiliaryRoots: HTMLElement[];
};

export interface PlatformAdapter {
  readonly id: PlatformId;
  // existing methods remain unchanged
}
```

Set `ChatGptAdapter.id = 'chatgpt'` and return `auxiliaryRoots: []`. In `SkinController`, set `data-docuveil-platform` when mounting, mark every auxiliary root, use `platformName(this.adapter.id)` in the compatibility notice, and remove all attributes during cleanup.

- [ ] **Step 4: Verify GREEN**

Run the focused controller and ChatGPT adapter tests, then `npm test`.  
Expected: the existing ChatGPT behavior remains green.

- [ ] **Step 5: User checkpoint**

Suggested commit: `refactor(extension): make the skin controller platform aware`

---

### Task 4: Claude DOM fixture and adapter

**Files:**
- Create: `extension/src/adapters/claude/selectors.ts`
- Create: `extension/src/adapters/claude/adapter.ts`
- Create: `extension/tests/fixtures/claude-supported.html`
- Create: `extension/tests/fixtures/claude-unsupported.html`
- Create: `extension/tests/adapters/claude/adapter.test.ts`

**Interfaces:**
- Implements: `PlatformAdapter` with `id = 'claude'`.
- Produces: normalized recent chats and an optional Artifact root in `auxiliaryRoots`.

- [ ] **Step 1: Capture stable DOM attributes from live Claude**

Run this read-only snippet in Claude DevTools on an existing chat, a new chat, and an open Artifact:

```js
const describe = (node) => node && ({
  tag: node.tagName.toLowerCase(),
  id: node.id || undefined,
  role: node.getAttribute('role') || undefined,
  ariaLabel: node.getAttribute('aria-label') || undefined,
  testId: node.getAttribute('data-testid') || undefined,
  href: node.getAttribute('href') || undefined,
});
const editor = document.querySelector('[contenteditable="true"][role="textbox"]');
const chatLinks = [...document.querySelectorAll('a[href^="/chat/"]')];
console.log(JSON.stringify({
  pathname: location.pathname,
  main: describe(document.querySelector('main')),
  editor: describe(editor),
  form: describe(editor?.closest('form')),
  newChatCandidates: [...document.querySelectorAll('a[href="/new"], button[aria-label]')].map(describe),
  recentLink: describe(chatLinks[0]),
  recentLinkAncestors: chatLinks[0] ? [...function* () { for (let n = chatLinks[0]; n && n !== document.body; n = n.parentElement) yield describe(n); }()] : [],
  artifactCandidates: [...document.querySelectorAll('[data-testid], [aria-label], [role]')]
    .filter((node) => /artifact/i.test(`${node.getAttribute('data-testid')} ${node.getAttribute('aria-label')}`))
    .map(describe),
}, null, 2));
```

Reject generated class names and verify the captured attributes are unchanged after sending one message.

- [ ] **Step 2: Create fixtures and failing adapter tests**

The supported fixture must contain two `a[href^="/chat/"]` links, `main`, a native `form`, `[contenteditable="true"][role="textbox"]`, a submit button, a `/new` link, and a captured Artifact marker. Test:

```ts
expect(snapshot.ready).toBe(true);
expect(snapshot.activeTitle).toBe('Beta conversation');
expect(snapshot.conversations).toEqual([
  { id: 'alpha', title: 'Alpha conversation', href: '/chat/alpha', active: false },
  { id: 'beta', title: 'Beta conversation', href: '/chat/beta', active: true },
]);
expect(snapshot.auxiliaryRoots).toEqual([document.querySelector('[data-testid="artifact-panel"]')]);
```

Use the stable Artifact attribute found in Step 1 if Claude names it differently. Add readiness, native action, observer batching, and cleanup tests matching the existing ChatGPT adapter contract.

- [ ] **Step 3: Verify RED**

Run: `npm test -w @docuveil/extension -- --run tests/adapters/claude/adapter.test.ts`  
Expected: FAIL because `ClaudeAdapter` does not exist.

- [ ] **Step 4: Implement the minimal Claude adapter**

Start with semantic selectors and retain only those confirmed in Step 1:

```ts
export const claudeSelectors = {
  conversationRoot: 'main',
  composer: '[contenteditable="true"][role="textbox"]',
  sendButton: 'form button[type="submit"]',
  newChatButton: 'a[href="/new"]',
  conversationLinks: 'nav a[href^="/chat/"]',
  artifactRoot: '[data-testid="artifact-panel"]',
} as const;
```

Mirror `ChatGptAdapter` only where the `PlatformAdapter` contract requires it: inspect nodes, derive the active route from `location.pathname`, click native links/controls, batch native mutations with `requestAnimationFrame`, ignore DocuVeil nodes, and return complete cleanup. `attachFile()` is a no-op because this scope adds no upload control.

- [ ] **Step 5: Verify GREEN**

Run the Claude adapter tests, then all adapter tests.  
Expected: all pass without changing ChatGPT selectors.

- [ ] **Step 6: User checkpoint**

Suggested commit: `feat(extension): add Claude platform adapter`

---

### Task 5: Adapter factory and Claude manifest entry

**Files:**
- Create: `extension/src/adapters/createPlatformAdapter.ts`
- Create: `extension/tests/adapters/createPlatformAdapter.test.ts`
- Modify: `extension/src/content/index.ts`
- Modify: `extension/manifest.json`
- Modify: `extension/tests/build-output.test.ts`

**Interfaces:**
- Consumes: `detectPlatform`, `ChatGptAdapter`, `ClaudeAdapter`.
- Produces: `createPlatformAdapter(platform, document, window): PlatformAdapter`.

- [ ] **Step 1: Write failing factory and manifest tests**

```ts
expect(createPlatformAdapter('chatgpt', document, window)).toBeInstanceOf(ChatGptAdapter);
expect(createPlatformAdapter('claude', document, window)).toBeInstanceOf(ClaudeAdapter);
```

Update the build assertion to expect exactly:

```ts
['https://chatgpt.com/*', 'https://claude.ai/*']
```

- [ ] **Step 2: Verify RED**

Run the factory test. Build the extension and run `npm run test:build`; both new expectations must fail before implementation.

- [ ] **Step 3: Add the factory and wire the content entry**

```ts
const platform = detectPlatform(window.location.hostname);
if (platform) {
  const adapter = createPlatformAdapter(platform, document, window);
  const controller = new SkinController(document, adapter);
  void bootstrapDocuVeil({ platform, storage: chrome.storage.local, runtime, controller });
}
```

Keep the runtime wrapper currently used by `content/index.ts`. Add both hosts to `host_permissions` and `content_scripts[0].matches`; add no other permission.

- [ ] **Step 4: Verify GREEN**

Run the factory test, `npm run build:extension`, and `npm run test:build`.  
Expected: the package contains the same artifacts and exactly the two approved host permissions.

- [ ] **Step 5: User checkpoint**

Suggested commit: `feat(extension): activate DocuVeil on Claude`

---

### Task 6: Claude presentation, Artifact preservation, and release checks

**Files:**
- Modify: `extension/styles/docuveil.css`
- Create: `extension/tests/integration/claudeSkin.test.ts`
- Modify: `README.md`
- Modify: `docs/INSTALL.md`
- Modify: `docs/CONTRIBUTING.md`

**Interfaces:**
- Consumes: Claude markers from `SkinController` and `ClaudeAdapter`.
- Produces: stable Claude document presentation without changing native DOM ownership.

- [ ] **Step 1: Write failing Claude skin tests**

Mount the real Claude adapter/controller against the supported fixture and assert:

```ts
expect(document.documentElement.dataset.docuveilPlatform).toBe('claude');
expect(document.querySelectorAll('[data-docuveil-shell]')).toHaveLength(1);
expect(composer.parentElement).toBe(originalComposerParent);
expect(artifact.parentElement).toBe(originalArtifactParent);
expect(artifact.getAttribute('data-docuveil-native')).toBe('auxiliary');
```

Append streamed text, replace the native `main`, and verify the controller re-marks the new nodes without rebuilding the sidebar. Disable DocuVeil and assert that the platform attribute, auxiliary marker, shell, and native markers are gone.

- [ ] **Step 2: Verify RED**

Run: `npm test -w @docuveil/extension -- --run tests/integration/claudeSkin.test.ts`  
Expected: FAIL where ChatGPT-specific editor selectors and Artifact stacking are not yet supported.

- [ ] **Step 3: Generalize only the required CSS selectors**

Replace `#prompt-textarea`-only composer rules with the bounded editor selector:

```css
.docuveil-enabled [data-docuveil-native="composer"]
  :is(#prompt-textarea, [contenteditable="true"][role="textbox"])
```

Exclude `[data-docuveil-native="auxiliary"]` and its descendants from background/text flattening. Add Claude-only text and wrapper corrections beneath:

```css
html[data-docuveil-platform="claude"].docuveil-enabled
  [data-docuveil-native="conversation"] :is(p, li, h1, h2, h3, code) {
  color: var(--docuveil-ink) !important;
  -webkit-text-fill-color: var(--docuveil-ink) !important;
}
```

Do not add a Claude rule unless the fixture or live smoke test demonstrates the need.

- [ ] **Step 4: Verify automated behavior**

Run:

```bash
npm test
npm run lint
npm run build:extension
npm run test:build
git diff --check
```

Expected: every command exits successfully.

- [ ] **Step 5: Perform the live Claude checklist**

On Chrome or Edge with a Claude Free/Pro account, verify:

- ChatGPT and Claude toggle independently;
- new and existing chats mount once;
- recent-chat switching and New chat use native navigation;
- Enter, Shift+Enter, send, stop, and long streaming responses work;
- rich text, lists, links, and code remain readable;
- an open Artifact remains visible and interactive;
- reload, SPA navigation, disable, and re-enable restore cleanly;
- an intentionally invalid required selector produces the Claude compatibility notice and leaves Claude native UI usable.

Convert every observed defect into a focused fixture regression before adjusting selectors or CSS.

- [ ] **Step 6: Update user documentation**

Add Claude to the README support table and source-install usage steps. Update `docs/INSTALL.md` to tell users to open either `chatgpt.com` or `claude.ai`. Update `docs/CONTRIBUTING.md` so each platform keeps selectors in its own adapter directory and host-DOM changes require fixtures and Chrome/Edge smoke tests.

- [ ] **Step 7: Final verification and user checkpoint**

Repeat the five commands from Step 4 after documentation changes. Review `git status --short` to ensure only planned files changed.

Suggested commit: `feat(extension): deliver Claude document mode`

Do not begin Gemini work until this checkpoint is accepted.
