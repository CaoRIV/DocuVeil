<div align="center">
  <img src="extension/assets/favicon.svg" alt="DocuVeil logo" width="88" height="88">

  # DocuVeil

  **A focused, document-style workspace for ChatGPT.**

  DocuVeil reshapes the ChatGPT web interface into a calm writing environment while preserving the platform's native conversation flow.

  [![CI](https://github.com/CaoRIV/DocuVeil/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/CaoRIV/DocuVeil/actions/workflows/ci.yml)
  [![Version](https://img.shields.io/badge/version-0.1.0-4f6fea)](extension/manifest.json)
  [![Manifest](https://img.shields.io/badge/Manifest-V3-4285f4)](extension/manifest.json)
  [![Chrome](https://img.shields.io/badge/Chrome-supported-4285f4?logo=googlechrome&logoColor=white)](#browser-support)
  [![Edge](https://img.shields.io/badge/Edge-supported-0c7bdc?logo=microsoftedge&logoColor=white)](#browser-support)
  [![License](https://img.shields.io/badge/license-MIT-2ea44f)](LICENSE)
</div>

> [!NOTE]
> DocuVeil is currently an MVP distributed as a source build. It supports the desktop ChatGPT website on Google Chrome and Microsoft Edge.

## Overview

Chat interfaces are useful for quick exchanges, but long conversations can become visually noisy and difficult to review. DocuVeil presents the same conversation as a continuous document with familiar editor-style chrome, a dedicated history sidebar, and an inline prompt area.

DocuVeil is a presentation layer—not a replacement chat client. It keeps ChatGPT's native composer, message handling, navigation, and response rendering in place.

## Preview

<p align="center">
  <img src="docs/assets/docuveil-demo.png" alt="DocuVeil document workspace showing a ChatGPT conversation" width="900">
</p>

<p align="center"><em>DocuVeil presenting a ChatGPT conversation as a focused document workspace.</em></p>

## Current MVP features

- A document-style reading and writing canvas for ChatGPT conversations.
- A persistent conversation sidebar built from the user's native ChatGPT history.
- An inline prompt area that remains part of the document flow.
- Live UI refreshes while ChatGPT navigates, replaces page elements, or streams responses.
- A one-click toolbar action to enable or disable DocuVeil.
- Local persistence of the enabled state through `chrome.storage.local`.
- A fail-open compatibility mode that leaves native ChatGPT available when the current page structure is unsupported.
- No DocuVeil account, backend, analytics, telemetry, or conversation storage.

## Install and run from source

### Requirements

- [Node.js](https://nodejs.org/) 20 or newer
- npm
- Desktop Google Chrome or Microsoft Edge
- A ChatGPT account

### 1. Clone and build

```bash
git clone https://github.com/CaoRIV/DocuVeil.git
cd DocuVeil
npm ci
npm run build:extension
```

The unpacked browser extension is generated in `dist/extension`.

### 2. Load the extension

#### Google Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `dist/extension` directory from this repository.

#### Microsoft Edge

1. Open `edge://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `dist/extension` directory from this repository.

### 3. Use DocuVeil

1. Open [chatgpt.com](https://chatgpt.com/).
2. Select the DocuVeil icon in the browser toolbar.
3. Continue using ChatGPT normally inside the document-style interface.
4. Select the icon again whenever you want to return to the native interface.

After changing the extension source, rebuild and reload it:

```bash
npm run build:extension
```

Then select **Reload** on the DocuVeil card in `chrome://extensions` or `edge://extensions`, and refresh the ChatGPT tab.

For more detail, see the [installation guide](docs/INSTALL.md).

## Run the website locally

The repository also contains the DocuVeil landing page.

```bash
npm ci
npm run dev
```

Vite prints the local development URL in the terminal. To build and preview the production website:

```bash
npm run build:website
npm run preview
```

## Development

### Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the landing-page development server |
| `npm run build:website` | Build the landing page |
| `npm run build:extension` | Build the unpacked extension into `dist/extension` |
| `npm run build` | Build both the website and extension |
| `npm test` | Run the extension unit and integration tests |
| `npm run test:build` | Validate the generated extension package |
| `npm run lint` | Lint the website and type-check the extension |
| `npm run preview` | Preview the production website build |

Before submitting a change, run:

```bash
npm run lint
npm test
npm run build
npm run test:build
```

### Repository structure

```text
DocuVeil/
├── extension/            # Manifest V3 extension source and tests
│   ├── assets/           # Extension source assets
│   ├── src/
│   │   ├── adapters/     # Platform-specific DOM integration
│   │   ├── background/   # Browser action and persisted state
│   │   ├── content/      # Page lifecycle and presentation controller
│   │   ├── shared/       # Shared contracts and storage helpers
│   │   └── shell/        # DocuVeil workspace chrome
│   ├── styles/           # Document-interface styles
│   └── tests/            # Unit, integration, fixture, and build tests
├── website/              # React and Vite landing page
├── docs/                 # Installation, privacy, security, and contributor docs
└── .github/workflows/    # Continuous integration
```

## How it works

1. The extension toolbar action toggles a locally stored enabled flag.
2. A content script inspects the active ChatGPT page through a platform adapter.
3. When the required native elements are available, DocuVeil applies its document layout and renders its workspace chrome.
4. ChatGPT retains ownership of the composer and conversation DOM, so native input and response behavior continue to work.
5. A scoped observer refreshes DocuVeil when ChatGPT updates its interface.

## Browser support

| Browser | Status |
| --- | --- |
| Google Chrome desktop | Supported for MVP testing |
| Microsoft Edge desktop | Supported for MVP testing |
| Other Chromium browsers | Not currently verified |
| Firefox and Safari | Not currently supported |

## Current limitations

- Only `https://chatgpt.com` is supported.
- The extension is installed from source; no browser-store package is available yet.
- ChatGPT can change its DOM without notice. DocuVeil falls back to the native interface when it cannot safely identify the required elements.
- Claude, Gemini, mobile browsers, and non-Chromium browsers are outside the current MVP scope.

## Privacy

DocuVeil runs locally in the browser and stores only its enabled flag. It does not collect or store prompts, responses, files, cookies, history, or credentials. Conversations remain handled by ChatGPT under OpenAI's terms and privacy policy.

Read the complete [privacy statement](docs/PRIVACY.md).

## Documentation

- [Installation guide](docs/INSTALL.md)
- [Contributing guide](docs/CONTRIBUTING.md)
- [Privacy statement](docs/PRIVACY.md)
- [Security policy](docs/SECURITY.md)
- [Release checklist](docs/RELEASE_CHECKLIST.md)
- [MVP design specification](docs/superpowers/specs/2026-09-06-docuveil-design.md)

## Contributing

Issues and focused pull requests are welcome. Platform-specific selectors belong in `extension/src/adapters/chatgpt/selectors.ts`, and DOM lifecycle changes should include an updated fixture or regression test.

Please read [CONTRIBUTING.md](docs/CONTRIBUTING.md) before opening a pull request.

## Security

Please report vulnerabilities privately through the GitHub security-advisory flow. Do not include credentials, cookies, private conversations, or attachments in reports.

See [SECURITY.md](docs/SECURITY.md) for details.

## Disclaimer

DocuVeil is an independent open-source project. It is not affiliated with, endorsed by, or sponsored by OpenAI, Google, Microsoft, Anthropic, ChatGPT, Chrome, Edge, Claude, or Gemini. Product names are used only to describe compatibility.

## License

DocuVeil is released under the [MIT License](LICENSE).
