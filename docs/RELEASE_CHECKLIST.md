# DocuVeil MVP Release Checklist

## Automated verification — 2026-09-09

Tester: Codex. Operating system: Windows. Local source build.

- [x] Website lint and extension TypeScript checks.
- [x] 50 unit/integration tests, including multi-tab storage updates and stale initial reads.
- [x] Fresh website and extension build in default output directories.
- [x] Built extension package validation (1 test).
- [x] Chrome 152.0.7977.83: local fixture browser smoke tests.
- [x] Edge 152.0.4191.66: local fixture browser smoke tests.

Browser smoke coverage: two open ChatGPT tabs update together; Claude remains independent;
new content-script instances read saved state; transcript DOM updates preserve one shell,
composer identity and draft text; disabling restores native composer visibility; unsupported
fixtures remain native with a compatibility notice; no page errors occur.

These runs execute the built content script and CSS in real headless browser engines against
local fixtures. Chrome storage events are simulated. They do **not** verify extension
installation, the toolbar action, actual cross-tab Chrome storage delivery, authenticated
ChatGPT/Claude behavior, network streaming, uploads or Artifact interactivity.

To repeat, build the extension and run `node extension/scripts/browser-smoke.mjs`.
The script requires Playwright available to Node and a browser installed by Playwright, or
`DOCUVEIL_PLAYWRIGHT_PATH` pointing to a Playwright package and
`DOCUVEIL_BROWSER_PATH` pointing to a Chrome/Edge executable. It makes no service requests.

## Required authenticated browser runs

Complete every column separately. An unchecked cell means **not verified**, not passed.
Use a disposable personal conversation. Record date, browser version, OS and tester below.
Do not use private documents for attachment checks.

| Check | Chrome / ChatGPT | Chrome / Claude | Edge / ChatGPT | Edge / Claude |
| --- | --- | --- | --- | --- |
| Load unpacked extension without manifest or service-worker errors | [ ] | [ ] | [ ] | [ ] |
| Toolbar enables/disables without reloading | [ ] | [ ] | [ ] | [ ] |
| Two existing same-platform tabs update together | [ ] | [ ] | [ ] | [ ] |
| Toggling this platform leaves the other platform unchanged | [ ] | [ ] | [ ] | [ ] |
| State survives reload, new tab and browser restart | [ ] | [ ] | [ ] | [ ] |
| Switch an existing conversation and create a new one | [ ] | [ ] | [ ] | [ ] |
| Enter submits text; Shift+Enter inserts a line break | [ ] | [ ] | [ ] | [ ] |
| Long streamed response renders without duplicate shell or visible jank | [ ] | [ ] | [ ] | [ ] |
| Long transcript scrolls to earlier and newest messages | [ ] | [ ] | [ ] | [ ] |
| Headings, lists, tables, links, code and images remain readable | [ ] | [ ] | [ ] | [ ] |
| Native attachment flow accepts an image and a non-image file | [ ] | [ ] | [ ] | [ ] |
| Disable restores native layout, draft and interactions | [ ] | [ ] | [ ] | [ ] |
| Missing composer produces native fallback and notice | [ ] | [ ] | [ ] | [ ] |

Claude-specific checks, required on both Chrome and Edge:

- [ ] Chrome: personal Free/Pro chat uses the native transcript and composer layout.
- [ ] Edge: personal Free/Pro chat uses the native transcript and composer layout.
- [ ] Chrome: open, interact with, resize and close an existing Artifact panel.
- [ ] Edge: open, interact with, resize and close an existing Artifact panel.
- [ ] Chrome: confirm unsupported Projects/Team layouts fail open rather than obscure controls.
- [ ] Edge: confirm unsupported Projects/Team layouts fail open rather than obscure controls.

For the missing-composer check, remove `#prompt-textarea` (ChatGPT) or
`[data-testid="chat-input"]` (Claude) in a disposable tab, enable DocuVeil, inspect the
fallback, then reload. This deliberately modifies only that test page's DOM.

| Run | Date | Browser version | OS | Tester | Evidence / failures |
| --- | --- | --- | --- | --- | --- |
| Chrome / ChatGPT | Pending | Pending | Pending | Pending | Authenticated session needed |
| Chrome / Claude | Pending | Pending | Pending | Pending | Authenticated session needed |
| Edge / ChatGPT | Pending | Pending | Pending | Pending | Authenticated session needed |
| Edge / Claude | Pending | Pending | Pending | Pending | Authenticated session needed |

Release status: automated checks pass; authenticated smoke-test gate remains open.
