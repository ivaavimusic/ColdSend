'use strict';

// This is a minimal BLE adapter using @abandonware/noble.
// It expects you to provide either a target device name or UUID via env or meta.
// For security and portability, this implementation is conservative and will
// only connect and write to a primary characteristic when provided.

const noble = require('@abandonware/noble');

class NobleAdapter {
  constructor(opts = {}) {
    this.id = 'noble';
    this.opts = opts;
    this.stateReady = false;
    this.connectedDevices = new Map();
    this.discoveredDevices = new Map();
    
    noble.on('stateChange', (state) => {
      this.stateReady = state === 'poweredOn';
      if (!this.stateReady) noble.stopScanning().catch(() => {});
    });
  }

  async ensureReady() {
    if (!this.stateReady) {
      await new Promise((resolve) => noble.once('stateChange', resolve));
      if (!this.stateReady) throw new Error('Bluetooth not powered on');
    }
  }

  async scanDevices(timeoutMs = 10000) {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      const devices = [];
      const deviceMap = new Map();
      
      const cleanup = () => {
        noble.removeAllListeners('discover');
        try {
          if (noble.stopScanning) {
            const result = noble.stopScanning();
            if (result && typeof result.catch === 'function') {
              result.catch(() => {}); // Ignore stop scanning errors
            }
          }
        } catch (err) {
          // Ignore stop scanning errors
        }
      };
      
      const timer = setTimeout(() => {
        cleanup();
        resolve(devices);
      }, timeoutMs);

      noble.on('discover', (peripheral) => {
        const adv = peripheral.advertisement || {};
        const name = adv.localName || peripheral.id;
        const rssi = peripheral.rssi || -100;
        
        // Calculate signal strength
        let signalStrength = 'weak';
        if (rssi > -50) signalStrength = 'strong';
        else if (rssi > -70) signalStrength = 'medium';
        
        const device = {
          id: peripheral.id,
          name: name,
          address: peripheral.address || peripheral.id,
          rssi: rssi,
          signalStrength: signalStrength,
          services: adv.serviceUuids || [],
          manufacturerData: adv.manufacturerData ? Buffer.from(adv.manufacturerData).toString('hex') : null,
          // Store minimal peripheral info to avoid circular references
          _peripheralId: peripheral.id
        };
        
        if (!deviceMap.has(peripheral.id)) {
          deviceMap.set(peripheral.id, device);
          devices.push(device);
          this.discoveredDevices.set(peripheral.id, device);
        }
      });

      try {
        if (noble.startScanning) {
          const result = noble.startScanning([], false);
          if (result && typeof result.catch === 'function') {
            result.catch((err) => {
              clearTimeout(timer);
              cleanup();
              reject(err);
            });
          }
        } else {
          throw new Error('Bluetooth scanning not available');
        }
      } catch (err) {
        clearTimeout(timer);
        cleanup();
        reject(err);
      }
    });
  }

  async connectDevice(device) {
    try {
      // Find peripheral by ID from noble's internal list
      const peripheralId = device._peripheralId || device.id;
      const peripheral = noble._peripherals[peripheralId];
      if (!peripheral) {
        throw new Error('Device peripheral not found - try scanning again');
      }

      await connect(peripheral);
      
      // Try to discover services and characteristics
      try {
        const { characteristic } = await getWritableCharacteristic(
          peripheral, 
          process.env.BLE_SERVICE_UUID, 
          process.env.BLE_CHARACTERISTIC_UUID
        );
        
        device.characteristic = characteristic;
        device.peripheral = peripheral;
        this.connectedDevices.set(device.id, device);
        
        return true;
      } catch (err) {
        // If we can't find writable characteristics, still mark as connected
        // but note the limitation
        device.peripheral = peripheral;
        device.limitedConnection = true;
        this.connectedDevices.set(device.id, device);
        return true;
      }
    } catch (err) {
      console.error('Failed to connect to device:', err);
      return false;
    }
  }

  async disconnectDevice(device) {
    try {
      const connectedDevice = this.connectedDevices.get(device.id);
      if (connectedDevice && connectedDevice.peripheral) {
        await disconnect(connectedDevice.peripheral);
      }
      this.connectedDevices.delete(device.id);
      return true;
    } catch (err) {
      console.error('Failed to disconnect device:', err);
      return false;
    }
  }

  async sendText(text, meta = {}) {
    const buffer = Buffer.from(String(text), 'utf8');
    return this._sendBuffer(buffer, meta);
  }

  async sendFile(filePath, meta = {}) {
    const fs = require('fs');
    const data = fs.readFileSync(filePath);
    return this._sendBuffer(data, meta);
  }

  async _sendBuffer(buffer, meta) {
    const targetName = meta.target || process.env.BLE_TARGET_NAME || null;
    const targetService = process.env.BLE_SERVICE_UUID || null; // e.g., 'ffe0'
    const targetChar = process.env.BLE_CHARACTERISTIC_UUID || null; // e.g., 'ffe1'
    if (!targetName && !(targetService && targetChar)) {
      throw new Error('Provide target (device name) or service/characteristic UUIDs to use noble adapter');
    }

    await this.ensureReady();

    const peripheral = await scanForPeripheral({ targetName });
    if (!peripheral) throw new Error('Target device not found');

    await connect(peripheral);

    try {
      const { characteristic } = await getWritableCharacteristic(peripheral, targetService, targetChar);
      // Chunk writes to handle MTU limits
      const MTU = Number(process.env.BLE_MTU || 180);
      for (let i = 0; i < buffer.length; i += MTU) {
        const chunk = buffer.slice(i, i + MTU);
        await writeCharacteristic(characteristic, chunk);
        await sleep(10);
      }
    } finally {
      await disconnect(peripheral);
    }
  }
}

function scanForPeripheral({ targetName }) {
  return new Promise((resolve, reject) => {
    const timeoutMs = Number(process.env.BLE_SCAN_TIMEOUT_MS || 10000);
    const timer = setTimeout(() => {
      noble.removeAllListeners('discover');
      noble.stopScanning().finally(() => resolve(null));
    }, timeoutMs);

    noble.on('discover', (peripheral) => {
      const adv = peripheral.advertisement || {};
      const name = adv.localName || '';
      if (targetName && name && name.includes(targetName)) {
        clearTimeout(timer);
        noble.removeAllListeners('discover');
        noble.stopScanning().finally(() => resolve(peripheral));
      }
    });

    noble.startScanning([], false).catch((err) => {
      clearTimeout(timer);
      noble.removeAllListeners('discover');
      reject(err);
    });
  });
}

function connect(peripheral) {
  return new Promise((resolve, reject) => {
    peripheral.connect((err) => (err ? reject(err) : resolve()));
  });
}

function disconnect(peripheral) {
  return new Promise((resolve) => {
    peripheral.disconnect(() => resolve());
  });
}

function getWritableCharacteristic(peripheral, serviceUuid, charUuid) {
  return new Promise((resolve, reject) => {
    const serviceFilter = serviceUuid ? [normalizeUuid(serviceUuid)] : [];
    peripheral.discoverSomeServicesAndCharacteristics(serviceFilter, charUuid ? [normalizeUuid(charUuid)] : [], (err, services, characteristics) => {
      if (err) return reject(err);
      const characteristic = characteristics.find((c) => typeof c.write === 'function' || c.properties?.includes('write') || c.properties?.includes('writeWithoutResponse'));
      if (!characteristic) return reject(new Error('No writable characteristic found'));
      resolve({ characteristic });
    });
  });
}

function normalizeUuid(u) {
  return String(u).replace(/-/g, '').toLowerCase();
}

function writeCharacteristic(characteristic, data) {
  return new Promise((resolve, reject) => {
    const withoutResponse = characteristic.properties?.includes('writeWithoutResponse');
    characteristic.write(data, !withoutResponse, (err) => (err ? reject(err) : resolve()));
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = NobleAdapter;
