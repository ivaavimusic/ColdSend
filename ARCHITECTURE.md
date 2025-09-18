# ColdSend Architecture (Current)

ColdSend is a local-first transfer hub with a modular adapter layer and a lightweight real‑time channel for broadcasting messages/files to all connected browsers.

## High‑Level Diagram

```
┌─────────────────┐     SSE       ┌──────────────────┐
│  Client (Web)   │◄──────────────│  ColdSend Server │
│  Chat / Send    │──────────────►│  Express + SSE   │
└─────────────────┘   HTTP POST    └──────┬──────────┘
        ▲                                   │ Adapter API
        │                                   │
        │                          ┌────────▼──────────┐
        │                          │  Adapters Layer   │
        │                          │  (pluggable)      │
        │                          ├───────────────────┤
        │                          │ wifi-direct (LAN) │
        │                          │ bluetooth (BLE)   │
        │                          └───────────────────┘
```

## Components

- Web UI (`public/`)
  - Tabs: `Devices`, `Chat`, `Send`, `Queue`, `Settings`
  - `Chat` uses Server‑Sent Events (SSE) to receive broadcast messages/files in real time. Enter sends; Shift+Enter adds a newline. Attachment button queues files before sending.

- Server (`src/server.js`)
  - Express API for status, scan/connect, send text/file
  - SSE endpoint `/api/events` maintains a set of connected clients and pushes broadcasts
  - Broadcast endpoints:
    - `POST /api/broadcast-text`
    - `POST /api/send-file` with `broadcast=true` (file meta is broadcast)
  - Adapter factory chooses transport via `TRANSFER_ADAPTER` (`wifi-direct` default, or `bluetooth`)

- Adapters (`src/adapters/`, `src/bluetooth/`)
  - `wifi-direct.js`: LAN discovery/transfer
  - `bluetooth/noble.js`: BLE implementation for scans and transfers
  - `bluetooth/mock.js`: development fallback

## Data Flows

1) Chat Broadcast (Text)
```
UI → POST /api/broadcast-text → Server → push via SSE → All connected UIs render 📢 message
```

2) Chat File Broadcast (Meta)
```
UI → POST /api/send-file (broadcast=true) → Server broadcasts file meta via SSE → All UIs render 📢 📎 entry
```

3) Classic Send (Host Queue)
```
UI → POST /api/send-text|send-file → Server enqueues job → Adapter.forward()
```

## Environment

```
TRANSFER_ADAPTER=wifi-direct   # wifi-direct | bluetooth
BLE_SERVICE_UUID=...
BLE_CHARACTERISTIC_UUID=...
```

## Notes

- The SSE broadcast is one‑way (server → clients). Client chat input posts to server.
- Wi‑Fi Direct is the default adapter and is used for LAN discovery/transfer. Bluetooth is optional.
- Broadcast endpoints must be registered before the `/api` 404 handler.
