# DocuVeil

DocuVeil is an open-source browser-extension project that gives supported AI chats a focused, document-style interface. It is designed to reuse each platform's native message composer, attachments, sending flow, and responses while changing only the presentation layer.

> Project status: early development. This repository currently contains the React/Vite landing page and the approved product design. The installable browser extension is not included yet.

## Product direction

The first release is planned for ChatGPT on desktop Chrome and Microsoft Edge. It will:

- activate only after the user clicks the extension icon;
- render a neutral document-editor-inspired workspace without copying official branding or assets;
- keep the conversation as one continuous document;
- support text input and the platform's native image/file attachments;
- preserve the platform's original send and response behavior;
- store settings locally, with no DocuVeil account, backend, analytics, or telemetry.

Claude and Gemini support may follow after the ChatGPT integration is stable.

The full product and technical decisions are documented in [the DocuVeil design specification](docs/superpowers/specs/2026-09-06-docuveil-design.md).

## Run the current website

Requirements:

- Node.js 20 or newer
- npm

Clone your repository and install the dependencies:

```bash
git clone <your-repository-url>
cd DocuVeil
npm install
npm run dev
```

Vite will print the local development URL in the terminal. To create and preview a production build:

```bash
npm run build
npm run preview
```

You can also run the code-quality check with:

```bash
npm run lint
```

## Browser extension installation

There is no unpacked extension to load yet. Once the Manifest V3 implementation is added, this section will include exact instructions for loading DocuVeil from source in both Chrome and Edge. No browser-store purchase or publication will be required for local installation.

## Privacy

DocuVeil is intended to run locally in the browser. The planned extension will not operate a separate backend or collect analytics and telemetry. Messages and attachments will continue to be handled by the AI platform the user is visiting, under that platform's own terms and privacy policy.

## Contributing

Issues and pull requests are welcome once the repository is public. Please keep changes focused, document platform-specific DOM assumptions, and verify behavior in both Chrome and Edge when extension code is introduced.

## Disclaimer

DocuVeil is an independent project. It is not affiliated with, endorsed by, or sponsored by Google, OpenAI, Anthropic, Microsoft, Chrome, Edge, ChatGPT, Claude, or Gemini. Product names are used only to describe compatibility.

## License

Released under the [MIT License](LICENSE).
