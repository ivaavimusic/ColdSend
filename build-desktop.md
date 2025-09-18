# Building ColdSend Desktop App

## Quick Setup

1. **Install Electron dependencies**:
   ```bash
   npm install
   ```

2. **Run in development mode**:
   ```bash
   npm run electron-dev
   ```

3. **Build desktop app**:
   ```bash
   # For your current platform
   npm run dist
   
   # For specific platforms
   npm run dist-mac    # macOS
   npm run dist-win    # Windows
   npm run dist-linux  # Linux
   ```

## Icon Setup (Optional)

To create proper app icons from the SVG:

1. **Install icon conversion tool**:
   ```bash
   npm install -g electron-icon-maker
   ```

2. **Generate icons**:
   ```bash
   electron-icon-maker --input=electron/assets/icon.svg --output=electron/assets/
   ```

This will create:
- `icon.icns` (macOS)
- `icon.ico` (Windows)  
- `icon.png` (Linux)

## Distribution

The built apps will be in the `dist/` folder:
- **macOS**: `ColdSend-0.1.0.dmg`
- **Windows**: `ColdSend Setup 0.1.0.exe`
- **Linux**: `ColdSend-0.1.0.AppImage`

## Features

The desktop app includes:
- ✅ **Native window** with proper menus
- ✅ **Auto-starts server** on app launch
- ✅ **Security hardened** (localhost-only binding)
- ✅ **System integration** (proper app icon, etc.)
- ✅ **Cross-platform** (macOS, Windows, Linux)

## Troubleshooting

**Bluetooth permissions**: The app may prompt for Bluetooth access on first run. Grant permissions for device scanning to work.

**Port conflicts**: If port 4000 is in use, the app will show an error. Close other applications using that port.

**Build errors**: Ensure you have the required build tools for your platform (Xcode on macOS, Visual Studio on Windows, etc.).
