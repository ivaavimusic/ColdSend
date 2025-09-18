'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const mimeTypes = require('mime-types');
require('dotenv').config();

const { getBluetoothAdapter } = require('./bluetooth');

const app = express();

// CORS middleware for cross-origin requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Static UI
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// File uploads - use user data directory in Electron, local uploads otherwise
let uploadsDir;
if (process.versions.electron) {
  // In Electron, use user data directory
  const { app: electronApp } = require('electron');
  const userDataPath = electronApp.getPath('userData');
  uploadsDir = path.join(userDataPath, 'uploads');
} else {
  // In regular Node.js, use local uploads directory
  uploadsDir = path.join(__dirname, '..', 'uploads');
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const detectedExt = mimeTypes.extension(file.mimetype);
    const ext = path.extname(file.originalname) || (detectedExt ? `.${detectedExt}` : '.bin');
    const base = path.basename(file.originalname, path.extname(file.originalname)) || 'upload';
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${base}-${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_BYTES || 50 * 1024 * 1024), // 50MB default
  },
});

// Simple queue to serialize Bluetooth sends (some stacks prefer sequential ops)
const queue = [];
let processing = false;

let adapter = getBluetoothAdapter({
  type: process.env.TRANSFER_ADAPTER || 'wifi-direct', // Wi-Fi Direct is now default
  discoveryPort: process.env.WIFI_DISCOVERY_PORT || 8888,
  transferPort: process.env.WIFI_TRANSFER_PORT || 8889,
});

// Start Wi-Fi Direct announcer so this host is discoverable to others
let wifiAnnouncer = null;
function ensureWifiAnnouncer() {
  if (adapter && adapter.id === 'wifi-direct' && !wifiAnnouncer && typeof adapter.startAnnouncement === 'function') {
    try {
      wifiAnnouncer = adapter.startAnnouncement();
      console.log('[WiFiDirect] Announcement service started');
    } catch (e) {
      console.warn('[WiFiDirect] Failed to start announcer:', e?.message || e);
    }
  }
}
ensureWifiAnnouncer();

async function processQueue() {
  if (processing) return;
  processing = true;
  while (queue.length) {
    const job = queue[0];
    try {
      if (job.kind === 'text') {
        await adapter.sendText(job.payload, job.meta);
      } else if (job.kind === 'file') {
        await adapter.sendFile(job.payloadPath, job.meta);
      }
      job.status = 'sent';
      job.finishedAt = new Date().toISOString();
    } catch (err) {
      job.status = 'error';
      job.error = err?.message || String(err);
      job.finishedAt = new Date().toISOString();
    } finally {
      // Remove processed job
      queue.shift();
    }
  }
  processing = false;
}

// Device management
let connectedDevices = new Map();
let discoveredDevices = new Map();
let connectionMode = 'single'; // 'single' | 'broadcast'

// Routes
app.get('/api/status', (req, res) => {
  // Safely serialize discovered devices without circular references
  const safeDiscoveredDevices = Array.from(discoveredDevices.values()).map(device => ({
    id: device.id,
    name: device.name,
    address: device.address,
    rssi: device.rssi,
    signalStrength: device.signalStrength,
    services: device.services,
    manufacturerData: device.manufacturerData,
    lastSeen: device.lastSeen
  }));

  const safeConnectedDevices = Array.from(connectedDevices.values()).map(device => ({
    id: device.id,
    name: device.name,
    address: device.address,
    status: device.status,
    connectedAt: device.connectedAt
  }));

  res.json({
    ok: true,
    adapter: adapter.id,
    discoveredDevices: safeDiscoveredDevices,
    connectedDevices: safeConnectedDevices,
    queueLength: queue.length
  });
});

app.post('/api/scan-devices', async (req, res) => {
  try {
    if (!adapter.scanDevices) {
      return res.status(400).json({ error: 'Device scanning not supported by current adapter' });
    }
    
    discoveredDevices.clear();
    const devices = await adapter.scanDevices(10000);
    devices.forEach(device => discoveredDevices.set(device.id, device));
    
    // Safely serialize devices without circular references
    const safeDevices = Array.from(discoveredDevices.values()).map(device => ({
      id: device.id,
      name: device.name,
      address: device.address,
      rssi: device.rssi,
      signalStrength: device.signalStrength,
      services: device.services,
      manufacturerData: device.manufacturerData,
      lastSeen: device.lastSeen
    }));
    
    res.json({ 
      success: true, 
      devices: safeDevices 
    });
  } catch (err) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

app.get('/api/discovered-devices', (req, res) => {
  const safeDevices = Array.from(discoveredDevices.values()).map(device => ({
    id: device.id,
    name: device.name,
    address: device.address,
    rssi: device.rssi,
    signalStrength: device.signalStrength,
    services: device.services,
    manufacturerData: device.manufacturerData,
    lastSeen: device.lastSeen
  }));
  res.json({ devices: safeDevices });
});

app.post('/api/connect-device', async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID required' });
    }
    
    const device = discoveredDevices.get(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    if (!adapter.connectDevice) {
      return res.status(400).json({ error: 'Device connection not supported by current adapter' });
    }
    
    // Update device status to pairing
    device.status = 'pairing';
    discoveredDevices.set(deviceId, device);
    
    // Attempt connection
    const connected = await adapter.connectDevice(device);
    
    if (connected) {
      device.status = 'connected';
      device.connectedAt = new Date().toISOString();
      connectedDevices.set(deviceId, device);
      discoveredDevices.delete(deviceId);
      
      res.json({ success: true, device });
    } else {
      device.status = 'error';
      discoveredDevices.set(deviceId, device);
      res.status(500).json({ error: 'Failed to connect to device' });
    }
  } catch (err) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

app.post('/api/disconnect-device', async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID required' });
    }
    
    const device = connectedDevices.get(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not connected' });
    }
    
    if (adapter.disconnectDevice) {
      await adapter.disconnectDevice(device);
    }
    
    connectedDevices.delete(deviceId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

app.post('/api/set-connection-mode', (req, res) => {
  const { mode } = req.body;
  if (!mode || !['single', 'broadcast'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid connection mode' });
  }
  
  connectionMode = mode;
  res.json({ success: true, mode: connectionMode });
});

app.post('/api/set-protocol', (req, res) => {
  const { protocol } = req.body;
  if (!protocol || !['wifi-direct', 'bluetooth', 'mock'].includes(protocol)) {
    return res.status(400).json({ error: 'Invalid protocol' });
  }
  
  try {
    // Create new adapter with the selected protocol
    const newAdapter = getBluetoothAdapter({
      type: protocol,
      discoveryPort: process.env.WIFI_DISCOVERY_PORT || 8888,
      transferPort: process.env.WIFI_TRANSFER_PORT || 8889,
    });
    
    // Replace the adapter
    adapter = newAdapter;
    
    // Manage Wi‑Fi Direct announcer lifecycle
    if (wifiAnnouncer && typeof wifiAnnouncer.close === 'function') {
      try { wifiAnnouncer.close(); } catch (_) {}
      wifiAnnouncer = null;
    }
    ensureWifiAnnouncer();
    
    // Clear existing connections when switching protocols
    connectedDevices.clear();
    discoveredDevices.clear();
    
    res.json({ 
      success: true, 
      protocol: protocol,
      adapterId: newAdapter.id 
    });
  } catch (err) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

app.post('/api/send-text', async (req, res) => {
  const { text, target } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing text' });
  }
  const job = {
    id: 'job_' + Date.now() + '_' + Math.round(Math.random() * 1e6),
    kind: 'text',
    status: 'queued',
    receivedAt: new Date().toISOString(),
    payload: text,
    meta: { target },
  };
  queue.push(job);
  processQueue();
  res.json({ success: true, jobId: job.id });
});

app.post('/api/send-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    const { originalname, filename, size, path: filePath } = req.file;
    const { target, broadcast } = req.body || {};
    
    // Handle broadcast mode
    if (broadcast === 'true') {
      // Check file size limit for broadcast (10MB max for SSE)
      const maxBroadcastSize = 10 * 1024 * 1024; // 10MB
      if (size > maxBroadcastSize) {
        return res.status(400).json({ 
          error: `File too large for broadcast. Max size: ${Math.round(maxBroadcastSize / 1024 / 1024)}MB` 
        });
      }
      
      // Read file content and encode as base64 for broadcast
      const fileContent = fs.readFileSync(filePath);
      const base64Content = fileContent.toString('base64');
      
      console.log(`Broadcasting file: ${originalname} (${size} bytes, base64: ${base64Content.length} chars)`);
      
      const message = {
        type: 'file',
        filename: originalname,
        size: size,
        content: base64Content,
        mimeType: mimeTypes.lookup(originalname) || 'application/octet-stream',
        timestamp: new Date().toISOString(),
        from: 'host'
      };
      
      broadcastToClients(message);
      
      // Clean up uploaded file after broadcast
      fs.unlinkSync(filePath);
      
      res.json({ 
        success: true, 
        clientCount: connectedClients.size,
        filename: originalname,
        size: size,
        broadcast: true
      });
      return;
    }
    
    // Regular file sending
    const job = {
      id: 'job_' + Date.now() + '_' + Math.round(Math.random() * 1e6),
      kind: 'file',
      status: 'queued',
      receivedAt: new Date().toISOString(),
      payloadPath: filePath,
      filename: originalname,
      size,
      meta: { target: target || null },
    };
    queue.push(job);
    processQueue().catch(() => {});
    res.json({ ok: true, id: job.id, status: job.status, filename: originalname, size });
  } catch (err) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

// Broadcast endpoints - send to all connected clients
const connectedClients = new Set();

app.post('/api/broadcast-text', async (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing text' });
  }
  
  // Broadcast to all connected clients via SSE
  const message = {
    type: 'text',
    content: text,
    timestamp: new Date().toISOString(),
    from: 'host'
  };
  
  broadcastToClients(message);
  
  res.json({ success: true, clientCount: connectedClients.size });
});

// Server-Sent Events for real-time broadcasting
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  const clientId = Date.now() + '_' + Math.random();
  const client = { id: clientId, res };
  connectedClients.add(client);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);
  
  // Handle client disconnect
  req.on('close', () => {
    connectedClients.delete(client);
  });
});

function broadcastToClients(message) {
  const data = `data: ${JSON.stringify(message)}\n\n`;
  
  connectedClients.forEach(client => {
    try {
      client.res.write(data);
    } catch (err) {
      // Remove disconnected clients
      connectedClients.delete(client);
    }
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// JSON 404 for unknown API routes (must be before static UI fallback)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl, method: req.method });
});

// Fallback to UI
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  /* eslint-disable no-console */
  console.log(`ColdSend server listening at http://${HOST}:${PORT}`);
  console.log('UI available on the same URL.');
  console.log(`Adapter: ${adapter.id}`);
});
