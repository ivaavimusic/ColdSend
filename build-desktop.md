# Building ColdSend Desktop App

This app ships a lightweight Electron shell that launches the same local server and loads the UI.

## Prerequisites

- Node.js 18+
- macOS: Xcode CLT for signing/runtime (optional)
- Windows: Visual Studio Build Tools (for native deps)

## Install

```bash
npm install
```

## Development (Electron)

```bash
npm run electron-dev
```

This starts Electron and points it to `electron/main.js`, which spins up the server and opens a window.

## Build Binaries

```bash
# Build for current platform
npm run dist

# Or explicit
npm run dist-mac
npm run dist-win
npm run dist-linux
```

Results are placed in `dist/`:
- macOS: `ColdSend-<version>.dmg`
- Windows: `ColdSend Setup <version>.exe`
- Linux: `ColdSend-<version>.AppImage`

## Icons (Optional)

We bundle an SVG at `electron/assets/icon.svg`. If no platform icons are provided, `electron-builder` will use defaults. If you want custom platform icons, generate them with any tool and place them under `electron/assets/icons/`:

- macOS: `icon.icns`
- Windows: `icon.ico`
- PNG fallbacks as needed

> Note: Previous docs referenced `icon-gen`/`electron-icon-maker`. These are optional, not required. If you see "default Electron icon is used", it’s safe to ignore.

## Code Signing (macOS)

If you don’t have a Developer ID, `electron-builder` will skip signing and still produce a DMG. You can notarize later or run locally without signing.

## Troubleshooting

- **Bluetooth permissions**: macOS will prompt on first run. Allow access for scanning to work.
- **Port conflicts**: If 4000 is busy, set `PORT` in `.env` or free the port.
- **Native rebuilds**: `@abandonware/noble` will be rebuilt for your arch automatically by `electron-builder`.
