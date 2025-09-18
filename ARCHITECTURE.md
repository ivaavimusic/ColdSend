# ColdSend Architecture v2.0

## Multi-Protocol Transfer System

### Current Issues
- Wi-Fi → Bluetooth is unnecessarily complex
- Bluetooth has range/speed limitations  
- Requires both Wi-Fi AND Bluetooth hardware
- Pairing is often problematic

### Proposed Solution: Protocol Options

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client Device │    │   ColdSend Host  │    │  Target Device  │
│   (Send Files)  │    │   (Web Server)   │    │  (Receive Files)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. Upload via Wi-Fi   │                       │
         ├──────────────────────►│                       │
         │                       │ 2. Forward via:       │
         │                       │                       │
         │                       ├─ A) Wi-Fi Direct ────►│
         │                       ├─ B) Bluetooth LE ────►│
         │                       ├─ C) USB/Serial ──────►│
         │                       ├─ D) Network Share ───►│
         │                       └─ E) QR Code/Display ─►│
```

## Transfer Protocols

### 1. Wi-Fi Direct Mode
**Best for**: Modern devices, fast transfers
- **Range**: 50m+
- **Speed**: 10-250 Mbps
- **Setup**: Auto-discovery or manual IP
- **Use Case**: Phone to laptop, laptop to laptop

### 2. Bluetooth Mode  
**Best for**: Legacy devices, low power
- **Range**: 10m
- **Speed**: 1-3 Mbps
- **Setup**: Pairing required
- **Use Case**: Embedded devices, IoT

### 3. USB/Serial Mode
**Best for**: Air-gapped systems, crypto hardware
- **Range**: Cable length
- **Speed**: Very fast
- **Setup**: Plug and play
- **Use Case**: Hardware wallets, secure systems

### 4. Network Share Mode
**Best for**: Same network transfers
- **Range**: Network range
- **Speed**: Network speed
- **Setup**: Shared folder
- **Use Case**: Office networks, home networks

### 5. Display/QR Mode
**Best for**: Text, small files, air-gapped
- **Range**: Visual
- **Speed**: Manual
- **Setup**: None
- **Use Case**: Crypto seeds, passwords, small data

## Implementation Plan

### Phase 1: Wi-Fi Direct (Immediate)
- Replace Bluetooth with Wi-Fi Direct
- Auto-discovery of nearby devices
- Direct device-to-device transfer
- No internet required

### Phase 2: Protocol Selection (Next)
- UI to choose transfer method
- Multiple adapter support
- Protocol-specific settings

### Phase 3: Advanced Features (Future)
- Encryption for all protocols
- Batch transfers
- Resume capability
- Transfer history
