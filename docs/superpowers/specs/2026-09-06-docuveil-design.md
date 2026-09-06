# DocuVeil MVP Design

**Date:** 2026-09-06  
**Status:** Approved in conversation  
**License:** MIT

## 1. Product summary

DocuVeil is an open-source Manifest V3 browser extension that gives supported AI chat websites a document-editor presentation while preserving their native chat behavior. The MVP supports ChatGPT on desktop Chrome and Edge. Claude and Gemini are future adapters, not part of the MVP.

The user installs DocuVeil from a cloned GitHub repository with the browser's **Load unpacked** flow. DocuVeil runs entirely in the browser. It has no backend, account system, analytics, telemetry, or external data transfer.

## 2. Goals

- Replace visible ChatGPT branding with a full-page document-editor shell after the user clicks the extension icon.
- Make the result closely match the layout, colors, spacing, and interaction feel of a familiar document editor without using Google's name, logo, or official brand assets.
- Preserve ChatGPT's native text chat, streaming responses, rich content, conversation navigation, and image/file attachment behavior.
- Present user prompts and assistant responses as continuous document content without chat bubbles, avatars, or speaker labels.
- Persist the enabled state across reloads, new ChatGPT tabs, and browser restarts.
- Make the repository straightforward to clone, build, test, and sideload in Chrome and Edge.
- Keep platform-specific DOM knowledge isolated so Claude and Gemini can be added later.

## 3. Non-goals for the MVP

- Publishing to Chrome Web Store or Microsoft Edge Add-ons.
- Supporting mobile browsers or Firefox.
- Implementing a real document editor or functional formatting toolbar.
- Voice input, model selection, ChatGPT tools, or extension-owned AI features.
- Calling ChatGPT APIs, intercepting network requests, reading cookies, or storing conversation content.
- Supporting Claude or Gemini in the first release.
- Pixel-for-pixel use of Google trademarks or official visual assets.

## 4. Repository layout

The existing landing page and the new extension will live in a small monorepo:

```text
docuveil/
|-- extension/                  # Manifest V3 extension
|   |-- manifest.json
|   |-- src/
|   |   |-- background/         # Action click and state coordination
|   |   |-- content/            # Bootstrap and skin controller
|   |   |-- adapters/chatgpt/   # ChatGPT selectors and native actions
|   |   |-- shell/              # Document header, toolbar, and sidebar
|   |   `-- shared/             # Types, storage, and small utilities
|   |-- styles/
|   `-- tests/
|-- website/                    # Existing React/Vite landing page, renamed
|-- docs/
|   |-- INSTALL.md
|   |-- PRIVACY.md
|   |-- CONTRIBUTING.md
|   `-- SECURITY.md
|-- README.md
|-- LICENSE
`-- package.json
```

The root package scripts coordinate website and extension development. A production build emits the sideloadable extension to `dist/extension`.

## 5. Chosen architecture: hybrid DOM skin

DocuVeil does not reproduce ChatGPT as a separate application. It injects a document-editor shell and restyles selected native ChatGPT elements in place.

This approach preserves native behavior for streaming, Markdown, tables, code blocks, links, images, prompt submission, and attachments. It also avoids copying or persisting conversation content. The cost is that the ChatGPT adapter must be maintained when ChatGPT changes its DOM.

The architecture has four primary units:

### 5.1 Service worker

Responsibilities:

- Handle clicks on the extension toolbar icon.
- Toggle the global enabled state.
- Persist the state in `chrome.storage.local`.
- Notify the active ChatGPT tab when the state changes.

The service worker does not inspect page content.

### 5.2 ChatGPT adapter

Responsibilities:

- Detect whether the current ChatGPT DOM is supported.
- Locate the conversation list, active conversation title, message region, composer, send control, attachment control, and new-chat control.
- Expose conversation metadata and native actions through a small adapter interface.
- Observe ChatGPT SPA navigation and relevant DOM changes.

The adapter is the only unit allowed to contain ChatGPT-specific selectors. The shell and controller depend on adapter methods rather than raw selectors. A future `ClaudeAdapter` or `GeminiAdapter` will implement the same interface.

### 5.3 DocuVeil shell

Responsibilities:

- Render the document-style top bar, decorative menus, decorative formatting toolbar, page background, and document-tab sidebar.
- Render the DocuVeil name and original project assets rather than Google branding.
- Mirror real ChatGPT conversation titles in the document-tab sidebar.
- Delegate tab selection and new-chat actions to the adapter.

Decorative menu and formatting controls are intentionally non-functional in the MVP. They must not be focusable or appear enabled to assistive technology if they perform no action.

### 5.4 Skin controller

Responsibilities:

- Read the persisted enabled state on content-script startup.
- Validate adapter readiness before modifying the page.
- Mount and unmount the shell idempotently.
- Add or remove a single root state class used by the stylesheet.
- Coordinate DOM observers and refresh the shell after relevant changes.
- Restore the native page cleanly when disabled or unsupported.

## 6. Interaction and data flow

### 6.1 Enable and disable

1. The user clicks the DocuVeil toolbar icon.
2. The service worker toggles and persists `enabled`.
3. The active content script receives the new state.
4. When enabling, the controller validates all required ChatGPT elements before changing visibility.
5. If validation succeeds, the shell mounts and the root skin class is applied.
6. When disabling, observers and event listeners are removed, the shell is unmounted, and the root class is removed without reloading ChatGPT.

Because the enabled state is global and persistent, a new or reloaded ChatGPT tab applies DocuVeil automatically after its content script initializes.

### 6.2 Conversation navigation

- The shell reads real conversation titles and URLs through the adapter.
- Each conversation appears as a document tab.
- Selecting a document tab uses ChatGPT's native link/navigation behavior.
- The sidebar's add control invokes ChatGPT's native new-chat behavior.
- SPA navigation triggers a shell refresh without a full page reload.

### 6.3 Conversation presentation

- Native message content remains in ChatGPT's DOM.
- CSS removes chat-specific chrome such as avatars, speaker labels, bubble backgrounds, action clutter, and excessive gaps.
- User prompts and assistant responses flow vertically as continuous document content.
- Headings, lists, tables, links, code blocks, images, and streaming updates retain their native semantic structure.
- The layout uses a centered white page on a light workspace background, matching the approved visual references.

### 6.4 Prompt and attachments

- ChatGPT's native composer is visually restyled and positioned at the end of the document content so typing feels like editing the last line of the page.
- Native keyboard behavior is preserved: Enter submits and Shift+Enter inserts a line break.
- A visible `+` control beside the composer triggers ChatGPT's native attachment control.
- Selected files and images are handled only by ChatGPT. DocuVeil does not read, copy, upload, or persist them.
- Voice, model, and tool controls are hidden in the MVP.

## 7. Resilience and error handling

DocuVeil follows a fail-open rule: a compatibility problem must leave ChatGPT usable.

- Required adapter targets are validated before any native UI is hidden.
- If validation fails, DocuVeil keeps or restores the native ChatGPT interface and shows a small local compatibility notice.
- Mounting and unmounting are idempotent so repeated state messages cannot duplicate the shell or listeners.
- Mutation observation is scoped to relevant containers and updates are batched to avoid excessive work during streaming.
- Every observer and listener has an explicit cleanup path.
- Development builds may log selector failures to the console. Production builds do not transmit or retain diagnostics.
- If an optional target such as the attachment control is absent, the rest of the skin can remain active while that optional feature is omitted.

## 8. Permissions, privacy, and security

The extension requests only:

- `storage` for the enabled state.
- Host access for `https://chatgpt.com/*` and, only if compatibility testing requires it, the legacy ChatGPT domain.

DocuVeil does not request cookie, history, web request, downloads, clipboard, or broad all-sites permissions. It has no remote code, external scripts, backend calls, analytics, user account, or telemetry. Content is processed only as transient page DOM and is never saved by DocuVeil.

The public documentation states that DocuVeil is independent from Google and OpenAI. The interface may be inspired by document editors but must use the DocuVeil name and original or permissively licensed icons.

## 9. Testing strategy

### 9.1 Unit tests

- Persistent state read/write and toggle behavior.
- Controller enable, disable, idempotency, and cleanup.
- Adapter result normalization and conversation mapping.
- Failure behavior when required targets are missing.

### 9.2 DOM fixture tests

Versioned HTML fixtures model the ChatGPT structures required by the adapter. Tests cover:

- Initial mounting and restoration.
- Conversation list rendering and navigation delegation.
- New-chat delegation.
- Prompt entry and submission.
- Attachment delegation.
- Streaming message mutations.
- Rich content preservation.
- SPA route changes.

### 9.3 Manual smoke tests

Before a release, test the unpacked production build on desktop Chrome and Edge against live ChatGPT:

- Enable, disable, reload, browser restart, and multiple tabs.
- Existing and new conversations.
- Text prompts and multiline input.
- Long streaming responses.
- Headings, lists, tables, links, code blocks, and images.
- Image and file attachment.
- Unsupported-DOM fallback.

Live ChatGPT authentication is not placed in CI. CI uses fixtures and runs lint, tests, and production builds on each pull request.

## 10. Open-source distribution

The root README provides the shortest installation path:

```bash
git clone <repository-url>
cd docuveil
npm install
npm run build
```

Users then enable Developer mode and load `dist/extension` from `chrome://extensions` or `edge://extensions`.

The repository includes installation, privacy, contribution, and security documentation; an MIT license; screenshots; a clear support matrix; and a compatibility issue template. GitHub releases may later attach a prebuilt ZIP, but cloning and building remains the canonical MVP workflow.

The existing landing page moves to `website/`, adopts the DocuVeil identity, and replaces the store CTA with GitHub installation instructions.

## 11. MVP acceptance criteria

The MVP is complete when:

1. A new user can clone, install dependencies, build, and load DocuVeil in current desktop Chrome and Edge using the documentation.
2. Clicking the toolbar icon enables and disables the document interface without reloading or breaking ChatGPT.
3. The enabled state survives reloads, new tabs, and browser restarts.
4. All visible ChatGPT branding is hidden while enabled, and the page resembles the approved document-editor references without official Google branding.
5. Real conversation history appears as document tabs and supports conversation switching and new-chat creation.
6. Prompts and responses appear as continuous document content while rich formatting and streaming remain usable.
7. Text submission, multiline input, and image/file attachment use native ChatGPT behavior.
8. Missing required DOM targets fail open to a usable native ChatGPT page.
9. The extension performs no external data transfer and requests only documented minimum permissions.
10. Lint, unit tests, DOM fixture tests, and production builds pass in CI.

## 12. Future work

After the ChatGPT MVP is stable, add Claude and Gemini as separate adapters behind the same platform interface. Store publication, additional browsers, real toolbar formatting, themes, and optional accessibility preferences require separate designs and are not implied by this specification.
