'use strict';

const dgram = require('dgram');
const { EventEmitter } = require('events');

class WiFiDirectAdapter extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.id = 'wifi-direct';
    this.opts = opts;
    this.discoveryPort = opts.discoveryPort || 8888;
    this.transferPort = opts.transferPort || 8889;
    this.discoveredDevices = new Map();
    this.connectedDevices = new Map();
    this.discoverySocket = null;
    this.isScanning = false;
  }

  async scanDevices(timeoutMs = 10000) {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    this.isScanning = true;
    this.discoveredDevices.clear();

    return new Promise((resolve, reject) => {
      // Create UDP socket for device discovery
      this.discoverySocket = dgram.createSocket('udp4');
      
      const cleanup = () => {
        this.isScanning = false;
        if (this.discoverySocket) {
          this.discoverySocket.close();
          this.discoverySocket = null;
        }
      };

      const timer = setTimeout(() => {
        cleanup();
        resolve(Array.from(this.discoveredDevices.values()));
      }, timeoutMs);

      // Handle socket errors
      this.discoverySocket.on('error', (err) => {
        console.error('Discovery socket error:', err.message);
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${this.discoveryPort} in use, trying ${this.discoveryPort + 1}`);
          this.discoveryPort += 1;
          cleanup();
          // Retry with new port
          setTimeout(() => this.scanDevices(timeoutMs).then(resolve).catch(reject), 100);
          return;
        }
        cleanup();
        reject(err);
      });

      // Listen for device announcements
      this.discoverySocket.on('message', (msg, rinfo) => {
        try {
          const announcement = JSON.parse(msg.toString());
          if (announcement.type === 'coldsend-device') {
            const device = {
              id: announcement.deviceId,
              name: announcement.deviceName || `Device-${rinfo.address}`,
              address: rinfo.address,
              port: announcement.port || this.transferPort,
              rssi: -30, // Simulate good signal for Wi-Fi
              signalStrength: 'strong',
              services: ['file-transfer'],
              lastSeen: Date.now()
            };
            
            this.discoveredDevices.set(device.id, device);
          }
        } catch (err) {
          // Ignore invalid messages
        }
      });

      this.discoverySocket.on('error', (err) => {
        clearTimeout(timer);
        cleanup();
        reject(err);
      });

      // Bind and start broadcasting discovery
      this.discoverySocket.bind(this.discoveryPort, () => {
        this.discoverySocket.setBroadcast(true);
        
        // Broadcast discovery request
        const discoveryMsg = JSON.stringify({
          type: 'coldsend-discovery',
          timestamp: Date.now()
        });
        
        this.discoverySocket.send(
          discoveryMsg, 
          this.discoveryPort, 
          '255.255.255.255'
        );
      });
    });
  }

  async connectDevice(device) {
    try {
      // For Wi-Fi Direct, "connection" is just network reachability
      const isReachable = await this.pingDevice(device.address, device.port);
      
      if (isReachable) {
        device.status = 'connected';
        device.connectedAt = new Date().toISOString();
        this.connectedDevices.set(device.id, device);
        return true;
      } else {
        throw new Error('Device not reachable');
      }
    } catch (err) {
      console.error('Failed to connect to device:', err);
      return false;
    }
  }

  async disconnectDevice(device) {
    try {
      this.connectedDevices.delete(device.id);
      return true;
    } catch (err) {
      console.error('Failed to disconnect device:', err);
      return false;
    }
  }

  async sendText(text, meta = {}) {
    const devices = meta.target ? 
      [this.connectedDevices.get(meta.target)] : 
      Array.from(this.connectedDevices.values());

    for (const device of devices.filter(Boolean)) {
      await this.sendToDevice(device, {
        type: 'text',
        content: text,
        timestamp: Date.now()
      });
    }
  }

  async sendFile(filePath, meta = {}) {
    const fs = require('fs');
    const path = require('path');
    
    const fileData = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    const devices = meta.target ? 
      [this.connectedDevices.get(meta.target)] : 
      Array.from(this.connectedDevices.values());

    for (const device of devices.filter(Boolean)) {
      await this.sendToDevice(device, {
        type: 'file',
        filename: fileName,
        content: fileData.toString('base64'),
        size: fileData.length,
        timestamp: Date.now()
      });
    }
  }

  async sendToDevice(device, payload) {
    return new Promise((resolve, reject) => {
      const client = dgram.createSocket('udp4');
      const message = JSON.stringify(payload);
      
      client.send(message, device.port, device.address, (err) => {
        client.close();
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async pingDevice(address, port) {
    return new Promise((resolve) => {
      const client = dgram.createSocket('udp4');
      const timeout = setTimeout(() => {
        client.close();
        resolve(false);
      }, 3000);

      const pingMsg = JSON.stringify({ type: 'ping', timestamp: Date.now() });
      
      client.send(pingMsg, port, address, (err) => {
        if (err) {
          clearTimeout(timeout);
          client.close();
          resolve(false);
        }
      });

      client.on('message', () => {
        clearTimeout(timeout);
        client.close();
        resolve(true);
      });
    });
  }

  // Start announcement service (for receiving devices)
  startAnnouncement() {
    const announcementSocket = dgram.createSocket('udp4');
    
    announcementSocket.on('message', (msg, rinfo) => {
      try {
        const request = JSON.parse(msg.toString());
        if (request.type === 'coldsend-discovery') {
          // Respond with our device info
          const response = JSON.stringify({
            type: 'coldsend-device',
            deviceId: require('os').hostname(),
            deviceName: `ColdSend-${require('os').hostname()}`,
            port: this.transferPort,
            timestamp: Date.now()
          });
          
          announcementSocket.send(response, this.discoveryPort, rinfo.address);
        }
      } catch (err) {
        // Ignore invalid messages
      }
    });

    announcementSocket.bind(this.discoveryPort);
    return announcementSocket;
  }
}

module.exports = WiFiDirectAdapter;
