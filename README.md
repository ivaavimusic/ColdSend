# ColdSend 🚀

**Secure local file transfer over Wi‑Fi with optional Bluetooth forwarding**

A beautiful, local-first app that lets you safely transfer text and files from any device on your network to a Bluetooth-connected device. Perfect for air-gapped systems, crypto hardware, and secure transfers.

![ColdSend Interface](https://img.shields.io/badge/UI-Neumorphism-blue) ![Theme](https://img.shields.io/badge/Theme-Light%20%2F%20Dark-green) ![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

- 🎨 **Beautiful Neumorphism UI** with light/dark themes
- 🔒 **Local-first & Secure** - no cloud, no external calls
- 📱 **Cross-platform** - works on any device with a browser
- 🔗 **Device Discovery**
  - Wi‑Fi Direct host discovery (LAN)
  - Bluetooth LE scanning (when in BT mode)
- 📊 **Real-time Queue** - monitor transfer progress
- 💬 **Chat Tab** - real‑time chat between connected clients
- 📢 **Broadcast Mode** - host can broadcast text/files to all listeners
- 🎯 **Connection Modes** - single device or broadcast to multiple
- ⚡ **Fast & Lightweight** - minimal dependencies

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** 
- **Bluetooth support** on your system (for real transfers)
- **Network access** between devices

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ivaavimusic/ColdSend.git
   cd ColdSend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm run dev
   ```

4. **Open the app**
   - **Local**: http://localhost:4000
   - **Network**: http://YOUR_IP:4000 (e.g., http://192.168.1.50:4000)

## 🔧 How It Works

### Connection Workflow

ColdSend uses a **host-client model**:

1. **Host Device** (runs ColdSend server):
   - Your main computer/laptop with Bluetooth
   - Runs the Node.js server
   - Connects to target Bluetooth devices

2. **Client Devices** (send files):
   - Any device with a web browser
   - Phones, tablets, other computers
   - Connect via Wi-Fi to the host's IP

### Step-by-Step Usage

#### 1. **Setup Host Device**
```bash
# On your main computer (with Bluetooth)
npm run dev
# Server starts at http://localhost:4000
```

#### 2. **Connect Client Devices**
- Connect client devices to the same Wi-Fi network
- Open `http://HOST_IP:4000` in their browsers
- Find your host IP with: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

#### 3. **Pair Bluetooth Devices (optional)**
- Go to **Devices** tab on the host
- Click **Scan** to discover nearby Bluetooth devices
- Click **Connect** on your target device
- Device appears in "Connected Devices"

#### 4. **Send Files/Text**
- From any device, open **Chat** to live‑message other connected clients
- Toggle **Broadcast** to send to all listeners in real time (via SSE)
- Use **Send** tab for classic text/file sending to host (and optionally BT)
- Monitor progress in **Queue** tab

### Network Setup Options

#### Option A: Existing Wi-Fi Network
```
[Host Computer] ←→ [Wi-Fi Router] ←→ [Client Devices]
      ↓
[Bluetooth Device]
```

#### Option B: Personal Hotspot
```
[Host Computer with Hotspot] ←→ [Client Devices]
      ↓
[Bluetooth Device]
```

**To create a hotspot:**
- **Windows**: Settings → Network & Internet → Mobile hotspot
- **macOS**: System Preferences → Sharing → Internet Sharing
- **Linux**: Network settings → Wi-Fi Hotspot

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
# Server Configuration
PORT=4000                    # Server port
HOST=0.0.0.0                # Bind to all interfaces
MAX_UPLOAD_BYTES=52428800   # 50MB upload limit

# Transfer Adapter (default Wi‑Fi Direct)
TRANSFER_ADAPTER=wifi-direct  # wifi-direct | bluetooth

# Bluetooth Configuration (when BT is selected)
BLUETOOTH_ADAPTER=noble

# BLE Settings (optional)
BLE_TARGET_NAME=MyDevice     # Device name to auto-connect
BLE_SERVICE_UUID=ffe0        # Service UUID
BLE_CHARACTERISTIC_UUID=ffe1 # Characteristic UUID
BLE_SCAN_TIMEOUT_MS=10000   # Scan timeout
```

### Bluetooth Setup

#### For Development/Testing
- Uses mock adapter by default
- Logs transfers to console
- No real Bluetooth required

#### For Production Use
1. **Enable Bluetooth** on host system
2. **Grant permissions** when prompted
3. **Pair devices** at OS level (recommended)
4. **Configure UUIDs** in `.env` if needed

## 🎨 UI Features

### Neumorphism Design
- **Soft shadows** and raised elements
- **Smooth animations** and transitions
- **Theme switching** (light/dark)
- **Responsive design** for all screen sizes

### Key Components
- **Device Discovery**: Scan for LAN/BT devices and connect
- **Chat**: Real‑time chat with Broadcast toggle
- **File Upload**: Drag & drop or click to select
- **Transfer Queue**: Real-time progress monitoring
- **Connection Status**: Live connection indicators

## 🔒 Security & Privacy

### Security Features
- **Local-only operation** - no external network calls
- **Temporary file storage** - uploads cleaned after transfer
- **Network isolation** - works on private networks/hotspots
- **No user tracking** - completely private

### Security Considerations
- Anyone on your network can access the web interface
- Use dedicated hotspot for maximum security
- Consider firewall rules for additional protection
- Files are temporarily stored in `uploads/` directory

## 📁 Project Structure

```
ColdSend/
├── src/
│   ├── server.js             # Express server, SSE broadcast, API
│   ├── adapters/
│   │   └── wifi-direct.js    # LAN discovery/transfer adapter
│   └── bluetooth/
│       ├── index.js          # Adapter factory
│       ├── noble.js          # BLE implementation
│       └── mock.js           # Development mock
├── public/                 # Web UI
│   ├── index.html         # Main interface
│   ├── styles.css         # Neumorphism styling
│   └── app.js             # Frontend logic
├── electron/               # Desktop wrapper entrypoint & assets
├── uploads/               # Temporary file storage
└── package.json           # Dependencies
```

## 🛠️ API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/status` | Get adapter and queue status |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/scan-devices` | Discover Bluetooth devices |
| `POST` | `/api/connect-device` | Connect to a device |
| `POST` | `/api/disconnect-device` | Disconnect from device |
| `POST` | `/api/send-text` | Queue text for transfer (host → device) |
| `POST` | `/api/send-file` | Queue file for transfer (host → device) |
| `POST` | `/api/broadcast-text` | Broadcast text to all connected listeners |
| `GET`  | `/api/events` | Server‑Sent Events stream for broadcasts |

### Example Usage

```javascript
// Send text
fetch('/api/send-text', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Hello World!' })
});

// Upload file
const formData = new FormData();
formData.append('file', fileInput.files[0]);
fetch('/api/send-file', {
  method: 'POST',
  body: formData
});
```

## 🚀 Distribution & Deployment

### For End Users

#### Option 1: Direct Download
See Desktop builds in [`build-desktop.md`](build-desktop.md) or run from source:

```bash
git clone https://github.com/ivaavimusic/ColdSend.git
cd ColdSend
npm install
npm run start
```

#### Option 2: NPX (Coming Soon)
```bash
npx coldsend
```

#### Option 3: Desktop App
- Electron‑based desktop application via `electron-builder`
- DMG/EXE/AppImage builds in `dist/`
- See [`build-desktop.md`](build-desktop.md)

### For Developers

#### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

#### Building from Source
```bash
git clone https://github.com/yourusername/coldsend.git
cd coldsend
npm install
npm run build  # Production build
npm start      # Start server
```

## 🗺️ Roadmap

### Short Term
- [ ] **Desktop app packaging** (Electron/Tauri)
- [ ] **Auto-discovery** of host devices
- [ ] **Simple authentication** (PIN/password)
- [ ] **File encryption** at rest

### Medium Term
- [ ] **Mobile apps** (React Native/Flutter)
- [ ] **Classic Bluetooth** support (RFCOMM)
- [ ] **Batch transfers** and compression
- [ ] **Transfer history** and logging

### Long Term
- [ ] **P2P networking** (no central host)
- [ ] **End-to-end encryption**
- [ ] **Plugin system** for custom adapters
- [ ] **Cloud sync** (optional)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
git clone https://github.com/ivaavimusic/ColdSend.git
cd ColdSend
npm install
npm run dev  # Start with auto-reload
```

### Code Style
- Use ESLint configuration
- Follow existing patterns
- Add JSDoc comments
- Test your changes

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Noble** - Bluetooth Low Energy library
- **Express** - Web framework
- **Inter Font** - Typography
- **Feather Icons** - UI icons

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/coldsend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/coldsend/discussions)
- **Email**: support@coldsend.dev

---

**Made with ❤️ for secure, local-first file transfers**
