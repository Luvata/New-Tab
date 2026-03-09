# New Tab

`New Tab` is a browser extension that replaces the new tab page with a calm, local-first focus workspace built with Vite, React, and TypeScript.

## Requirements

- Node.js 20+
- npm
- Chrome or Edge for loading the unpacked extension

## Install

```bash
npm install
```

## Run the UI in development

```bash
npm run dev
```

This starts the Vite dev server so you can preview the interface in a regular browser tab.

## Build the extension

```bash
npm run build
```

After the build finishes, the `dist/` directory contains the production bundle ready to load as an extension, including `manifest.json`.

## Run the extension in Chrome or Edge

1. Run `npm run build`.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select the `dist/` directory.
6. Open a new tab to test the extension.

## Project structure

- `src/`: app UI, hooks, state, and storage logic
- `public/manifest.json`: Manifest V3 configuration
- `vite.config.ts`: build output configuration for `dist/`

## Scripts

- `npm run dev`: start the Vite dev server
- `npm run build`: compile TypeScript and build the extension
- `npm run preview`: preview the production build locally
