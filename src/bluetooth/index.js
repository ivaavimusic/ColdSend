'use strict';

const { MockAdapter } = require('./mock');
const WiFiDirectAdapter = require('../adapters/wifi-direct');

let NobleAdapter;
let nobleAvailable = false;

try {
  // Lazy require to avoid install issues if noble isn't present
  NobleAdapter = require('./noble');
  // Test if noble is actually functional
  const noble = require('@abandonware/noble');
  if (noble && typeof noble.on === 'function') {
    nobleAvailable = true;
  }
} catch (e) {
  console.warn('[bluetooth] Noble not available:', e.message);
  NobleAdapter = null;
  nobleAvailable = false;
}

function getBluetoothAdapter(options = {}) {
  const type = (options.type || 'wifi-direct').toLowerCase(); // Default to Wi-Fi Direct
  
  if (type === 'wifi-direct' || type === 'wifi') {
    return new WiFiDirectAdapter(options);
  }
  
  if (type === 'noble' || type === 'bluetooth') {
    if (!NobleAdapter || !nobleAvailable) {
      console.warn('[adapter] Bluetooth adapter requested but not available; falling back to Wi-Fi Direct');
      console.warn('[adapter] To use Bluetooth: npm install @abandonware/noble');
      return new WiFiDirectAdapter(options);
    }
    return new NobleAdapter(options);
  }
  
  if (type === 'mock') {
    return new MockAdapter(options);
  }
  
  // Default fallback
  return new WiFiDirectAdapter(options);
}

module.exports = { getBluetoothAdapter };
