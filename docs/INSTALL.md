# Install DocuVeil from Source

## Requirements

- Node.js 20 or newer
- npm
- Desktop Google Chrome or Microsoft Edge
- A ChatGPT account or Claude Free/Pro personal account

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
5. Open `https://chatgpt.com` or `https://claude.ai`, then select the DocuVeil toolbar icon.

## Microsoft Edge

1. Open `edge://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the repository's `dist/extension` directory.
5. Open `https://chatgpt.com` or `https://claude.ai`, then select the DocuVeil toolbar icon.

## Usage

Select the toolbar icon to enable or disable the document interface for the current platform. ChatGPT and Claude store their enabled states independently.

Re-run `npm run build:extension`, then select **Reload** on the browser's extension card and refresh open ChatGPT or Claude tabs after every source change.
