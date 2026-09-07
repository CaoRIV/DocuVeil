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
