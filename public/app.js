// API helpers
async function postJSON(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function postForm(url, formData) {
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

// Toast notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => container.removeChild(toast), 300);
  }, 3000);
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Tab management
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`${tabName}-tab`).classList.add('active');
  
  // Refresh status when switching to queue tab
  if (tabName === 'queue') {
    refreshStatus();
  }
}

// Connection status
async function updateConnectionStatus() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    const statusDot = document.getElementById('connectionStatus');
    const statusText = document.getElementById('connectionText');
    
    if (data.ok) {
      statusDot.className = 'status-dot';
      statusText.textContent = 'Connected';
    } else {
      statusDot.className = 'status-dot error';
      statusText.textContent = 'Error';
    }
  } catch (e) {
    const statusDot = document.getElementById('connectionStatus');
    const statusText = document.getElementById('connectionText');
    statusDot.className = 'status-dot error';
    statusText.textContent = 'Offline';
  }
}

// Status refresh
async function refreshStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    
    // Update adapter info in settings
    document.getElementById('adapterType').textContent = data.adapter || 'Unknown';
    document.getElementById('adapterStatus').textContent = 'Active';
    
    // Update connected devices
    if (data.connectedDevices) {
      connectedDevices = data.connectedDevices;
      updateConnectedDevicesList();
    }
    
    // Update connection mode
    if (data.connectionMode) {
      const modeRadio = document.querySelector(`input[name="connectionMode"][value="${data.connectionMode}"]`);
      if (modeRadio) modeRadio.checked = true;
    }
    
    // Update queue display
    const statusEl = document.getElementById('status');
    if (!data.queue || data.queue.length === 0) {
      statusEl.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-muted); padding: 60px 20px; min-height: 200px;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="opacity: 0.3; margin-bottom: 16px; color: var(--text-muted);">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2"/>
          </svg>
          <p style="margin: 0; font-size: 16px; font-weight: 500; color: var(--text-secondary);">No transfers in queue</p>
          <small style="margin-top: 8px; opacity: 0.7; color: var(--text-muted);">Send files or text to see them here</small>
        </div>
      `;
    } else {
      const queueHTML = data.queue.map(job => {
        const statusColor = {
          'queued': '#f59e0b',
          'sent': '#10b981',
          'error': '#ef4444'
        }[job.status] || '#6b7280';
        
        const statusIcon = {
          'queued': '⏳',
          'sent': '✅',
          'error': '❌'
        }[job.status] || '⏸️';
        
        return `
          <div style="border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 16px; margin-bottom: 12px; background: rgba(255,255,255,0.02);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">${statusIcon}</span>
                <strong>${job.kind === 'text' ? '📝 Text' : '📄 File'}</strong>
                ${job.filename ? `<span style="color: #a9b3c1;">• ${job.filename}</span>` : ''}
              </div>
              <span style="color: ${statusColor}; font-weight: 500; text-transform: uppercase; font-size: 12px;">${job.status}</span>
            </div>
            ${job.size ? `<div style="color: #6b7280; font-size: 12px;">Size: ${formatFileSize(job.size)}</div>` : ''}
            ${job.meta?.target ? `<div style="color: #6b7280; font-size: 12px;">Target: ${job.meta.target}</div>` : ''}
            ${job.error ? `<div style="color: #ef4444; font-size: 12px; margin-top: 4px;">Error: ${job.error}</div>` : ''}
            <div style="color: #6b7280; font-size: 11px; margin-top: 8px;">
              ${new Date(job.receivedAt).toLocaleString()}
              ${job.finishedAt ? ` → ${new Date(job.finishedAt).toLocaleString()}` : ''}
            </div>
          </div>
        `;
      }).join('');
      
      statusEl.innerHTML = queueHTML;
    }
  } catch (e) {
    document.getElementById('status').innerHTML = `
      <div style="color: #ef4444; text-align: center; padding: 20px;">
        Error fetching status: ${e.message}
      </div>
    `;
  }
}

// Character counter
function updateCharCount() {
  const textInput = document.getElementById('textInput');
  const charCount = document.getElementById('charCount');
  charCount.textContent = textInput.value.length;
}

function updateChatCharCount() {
  const chatInput = document.getElementById('chatInput');
  const chatCharCount = document.getElementById('chatCharCount');
  chatCharCount.textContent = chatInput.value.length;
}

async function handleChatSubmit(e) {
  e.preventDefault();
  
  const chatInput = document.getElementById('chatInput');
  const broadcastMode = document.getElementById('broadcastMode').checked;
  const message = chatInput.value.trim();
  
  if (!message && selectedFiles.length === 0) return;
  
  // Remove welcome message on first send
  removeWelcomeMessage();
  
  try {
    // Send text message if present
    if (message) {
      addChatMessage(message, 'sent');
      
      const endpoint = broadcastMode ? '/api/broadcast-text' : '/api/send-text';
      const res = await postJSON(endpoint, { text: message });
      if (res.error) {
        throw new Error(res.error);
      }
    }
    
    // Send files if present
    if (selectedFiles.length > 0) {
      for (const file of selectedFiles) {
        // Add file to chat UI
        addChatMessage(`📎 ${file.name} (${formatFileSize(file.size)})`, 'sent');
        
        // Upload file
        const formData = new FormData();
        formData.append('file', file);
        if (broadcastMode) {
          formData.append('broadcast', 'true');
        }
        
        const res = await fetch('/api/send-file', {
          method: 'POST',
          body: formData
        });
        
        if (!res.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }
      
      if (broadcastMode) {
        showToast(`Files broadcasted to all listeners`);
      } else {
        showToast(`${selectedFiles.length} file(s) sent successfully`);
      }
      
      // Clear selected files
      clearSelectedFiles();
    }
    
    // Clear text input
    chatInput.value = '';
    updateChatCharCount();
    
    if (message && !selectedFiles.length) {
      if (broadcastMode) {
        showToast(`Broadcasted to listeners`);
      } else {
        showToast('Message sent successfully');
      }
    }
    
  } catch (e) {
    showToast('Failed to send: ' + e.message, 'error');
  }
}

function removeWelcomeMessage() {
  const welcomeMsg = document.querySelector('.chat-message.system');
  if (welcomeMsg) {
    welcomeMsg.remove();
  }
}

function addChatMessage(text, type = 'received') {
  const chatMessages = document.getElementById('chatMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${type}`;
  
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  messageDiv.innerHTML = `
    <div class="message-content">
      <p>${escapeHtml(text)}</p>
      <small style="opacity: 0.7; font-size: 12px;">${timestamp}</small>
    </div>
  `;
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function handleChatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById('chatForm').dispatchEvent(new Event('submit'));
  }
  // Shift+Enter allows new line (default behavior)
}

let selectedFiles = [];

function handleChatFileSelect(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;
  
  selectedFiles = [...selectedFiles, ...files];
  updateFilePreview();
  
  showToast(`${files.length} file(s) selected`);
}

function updateFilePreview() {
  const selectedFilesDiv = document.getElementById('selectedFiles');
  const selectedFilesList = document.getElementById('selectedFilesList');
  
  if (selectedFiles.length === 0) {
    selectedFilesDiv.style.display = 'none';
    return;
  }
  
  selectedFilesDiv.style.display = 'block';
  selectedFilesList.innerHTML = '';
  
  selectedFiles.forEach((file, index) => {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'file-preview';
    fileDiv.innerHTML = `
      <div class="file-preview-icon">📄</div>
      <div class="file-preview-info">
        <div class="file-preview-name">${file.name}</div>
        <div class="file-preview-size">${formatFileSize(file.size)}</div>
      </div>
    `;
    selectedFilesList.appendChild(fileDiv);
  });
}

function clearSelectedFiles() {
  selectedFiles = [];
  updateFilePreview();
  document.getElementById('chatFileInput').value = '';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// File input handling
function setupFileInput() {
  const fileInput = document.getElementById('fileInput');
  const fileDisplay = document.querySelector('.file-input-display');
  const filePlaceholder = document.querySelector('.file-placeholder');
  const fileInfo = document.querySelector('.file-info');
  const fileName = document.querySelector('.file-name');
  const fileSize = document.querySelector('.file-size');
  
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      filePlaceholder.style.display = 'none';
      fileInfo.style.display = 'block';
      fileName.textContent = file.name;
      fileSize.textContent = formatFileSize(file.size);
      fileDisplay.style.borderColor = '#10b981';
      fileDisplay.style.background = 'rgba(16, 185, 129, 0.05)';
    } else {
      filePlaceholder.style.display = 'flex';
      fileInfo.style.display = 'none';
      fileDisplay.style.borderColor = 'rgba(255,255,255,0.2)';
      fileDisplay.style.background = 'rgba(255,255,255,0.02)';
    }
  });
  
  // Drag and drop
  fileDisplay.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDisplay.style.borderColor = '#3a5fff';
    fileDisplay.style.background = 'rgba(58, 95, 255, 0.05)';
  });
  
  fileDisplay.addEventListener('dragleave', (e) => {
    e.preventDefault();
    if (!fileInput.files[0]) {
      fileDisplay.style.borderColor = 'rgba(255,255,255,0.2)';
      fileDisplay.style.background = 'rgba(255,255,255,0.02)';
    }
  });
  
  fileDisplay.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });
}

// Copy server address
function copyServerAddress() {
  const address = document.getElementById('serverAddress').textContent;
  navigator.clipboard.writeText(address).then(() => {
    showToast('Address copied to clipboard!');
  }).catch(() => {
    showToast('Failed to copy address', 'error');
  });
}

// Update server address
function updateServerAddress() {
  const address = `${window.location.protocol}//${window.location.host}`;
  document.getElementById('serverAddress').textContent = address;
}

// Form submissions
async function handleTextSubmit(e) {
  e.preventDefault();
  const text = document.getElementById('textInput').value.trim();
  const target = document.getElementById('textTarget').value.trim();
  
  if (!text) {
    showToast('Please enter some text', 'error');
    return;
  }
  
  try {
    const res = await postJSON('/api/send-text', { text, target });
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast(`Text queued successfully! (${res.id})`);
      document.getElementById('textInput').value = '';
      document.getElementById('textTarget').value = '';
      updateCharCount();
      
      // Switch to queue tab to show progress
      setTimeout(() => switchTab('queue'), 1000);
    }
  } catch (e) {
    showToast('Failed to send text: ' + e.message, 'error');
  }
}

async function handleFileSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('fileInput');
  const target = document.getElementById('fileTarget').value.trim();
  
  if (!input.files || input.files.length === 0) {
    showToast('Please select a file', 'error');
    return;
  }
  
  const file = input.files[0];
  const formData = new FormData();
  formData.append('file', file);
  if (target) formData.append('target', target);
  
  try {
    const res = await postForm('/api/send-file', formData);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast(`File queued successfully! (${res.filename})`);
      input.value = '';
      document.getElementById('fileTarget').value = '';
      
      // Reset file display
      const filePlaceholder = document.querySelector('.file-placeholder');
      const fileInfo = document.querySelector('.file-info');
      const fileDisplay = document.querySelector('.file-input-display');
      filePlaceholder.style.display = 'flex';
      fileInfo.style.display = 'none';
      fileDisplay.style.borderColor = 'rgba(255,255,255,0.2)';
      fileDisplay.style.background = 'rgba(255,255,255,0.02)';
      
      // Switch to queue tab to show progress
      setTimeout(() => switchTab('queue'), 1000);
    }
  } catch (e) {
    showToast('Failed to send file: ' + e.message, 'error');
  }
}

// Device management
let isScanning = false;
let discoveredDevices = [];
let connectedDevices = [];

async function scanForDevices() {
  if (isScanning) return;
  
  isScanning = true;
  const scanBtn = document.getElementById('scanDevices');
  const scanStatus = document.getElementById('scanStatus');
  const discoveredList = document.getElementById('discoveredDevices');
  
  // Update UI to show scanning
  scanBtn.disabled = true;
  scanBtn.innerHTML = `
    <div class="scan-spinner"></div>
    Scanning...
  `;
  
  const protocolName = currentProtocol === 'wifi-direct' ? 'Wi-Fi Direct' : 'Bluetooth';
  scanStatus.innerHTML = `
    <div class="scan-active">
      <div class="scan-spinner"></div>
      <p>Scanning for ${protocolName} devices...</p>
    </div>
  `;
  
  try {
    const res = await postJSON('/api/scan-devices', {});
    if (res.error) {
      throw new Error(res.error);
    }
    
    discoveredDevices = res.devices || [];
    updateDiscoveredDevicesList();
    
    if (discoveredDevices.length === 0) {
      scanStatus.innerHTML = `
        <div style="text-align: center; color: #6b7280; padding: 32px;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="opacity: 0.3; margin-bottom: 16px;">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="currentColor" stroke-width="2"/>
          </svg>
          <p>No devices found</p>
          <small>Make sure target devices are discoverable</small>
        </div>
      `;
    } else {
      scanStatus.style.display = 'none';
    }
    
    showToast(`Found ${discoveredDevices.length} device(s)`);
  } catch (e) {
    showToast('Scan failed: ' + e.message, 'error');
    scanStatus.innerHTML = `
      <div style="text-align: center; color: #ef4444; padding: 32px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="opacity: 0.3; margin-bottom: 16px;">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
          <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
        </svg>
        <p>Scan failed</p>
        <small>${e.message}</small>
      </div>
    `;
  } finally {
    isScanning = false;
    scanBtn.disabled = false;
    scanBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="2" fill="none"/>
      </svg>
      Scan
    `;
  }
}

function updateDiscoveredDevicesList() {
  const container = document.getElementById('discoveredDevices');
  if (discoveredDevices.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = discoveredDevices.map(device => `
    <div class="device-item" data-device-id="${device.id}">
      <div class="device-info">
        <div class="device-avatar">${device.name.charAt(0).toUpperCase()}</div>
        <div class="device-details">
          <h4>${device.name}</h4>
          <p>${device.address} • RSSI: ${device.rssi}dBm</p>
        </div>
      </div>
      <div class="device-actions">
        <div class="signal-strength ${device.signalStrength}">
          <div class="signal-bar"></div>
          <div class="signal-bar"></div>
          <div class="signal-bar"></div>
          <div class="signal-bar"></div>
        </div>
        <div class="device-status ${device.status}">${device.status}</div>
        <button class="btn-device primary" onclick="connectToDevice('${device.id}')">
          Connect
        </button>
      </div>
    </div>
  `).join('');
}

async function connectToDevice(deviceId) {
  const device = discoveredDevices.find(d => d.id === deviceId);
  if (!device) return;
  
  try {
    // Update UI to show connecting
    const deviceItem = document.querySelector(`[data-device-id="${deviceId}"]`);
    const statusEl = deviceItem.querySelector('.device-status');
    const btnEl = deviceItem.querySelector('.btn-device');
    
    statusEl.className = 'device-status pairing';
    statusEl.textContent = 'pairing';
    btnEl.disabled = true;
    btnEl.textContent = 'Connecting...';
    
    const res = await postJSON('/api/connect-device', { deviceId });
    if (res.error) {
      throw new Error(res.error);
    }
    
    // Remove from discovered and add to connected
    discoveredDevices = discoveredDevices.filter(d => d.id !== deviceId);
    connectedDevices.push(res.device);
    
    updateDiscoveredDevicesList();
    updateConnectedDevicesList();
    
    showToast(`Connected to ${device.name}`);
  } catch (e) {
    showToast('Connection failed: ' + e.message, 'error');
    
    // Reset UI
    const deviceItem = document.querySelector(`[data-device-id="${deviceId}"]`);
    if (deviceItem) {
      const statusEl = deviceItem.querySelector('.device-status');
      const btnEl = deviceItem.querySelector('.btn-device');
      
      statusEl.className = 'device-status error';
      statusEl.textContent = 'error';
      btnEl.disabled = false;
      btnEl.textContent = 'Retry';
    }
  }
}

async function disconnectDevice(deviceId) {
  try {
    const res = await postJSON('/api/disconnect-device', { deviceId });
    if (res.error) {
      throw new Error(res.error);
    }
    
    connectedDevices = connectedDevices.filter(d => d.id !== deviceId);
    updateConnectedDevicesList();
    
    showToast('Device disconnected');
  } catch (e) {
    showToast('Disconnect failed: ' + e.message, 'error');
  }
}

function updateConnectedDevicesList() {
  const container = document.getElementById('connectedDevices');
  
  if (connectedDevices.length === 0) {
    container.innerHTML = `
      <div class="no-devices">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
          <path d="M8 12l2 2 4-4" stroke="currentColor" stroke-width="2" opacity="0.3"/>
        </svg>
        <p>No devices connected</p>
        <small>Discover and pair devices to start transferring</small>
      </div>
    `;
    return;
  }
  
  container.innerHTML = connectedDevices.map(device => `
    <div class="device-item" data-device-id="${device.id}">
      <div class="device-info">
        <div class="device-avatar">${device.name.charAt(0).toUpperCase()}</div>
        <div class="device-details">
          <h4>${device.name}</h4>
          <p>Connected ${new Date(device.connectedAt).toLocaleTimeString()}</p>
        </div>
      </div>
      <div class="device-actions">
        <div class="device-status connected">connected</div>
        <button class="btn-device danger" onclick="disconnectDevice('${device.id}')">
          Disconnect
        </button>
      </div>
    </div>
  `).join('');
}

async function setConnectionMode(mode) {
  try {
    const res = await postJSON('/api/set-connection-mode', { mode });
    if (res.error) {
      throw new Error(res.error);
    }
    showToast(`Connection mode set to ${mode}`);
  } catch (e) {
    showToast('Failed to set connection mode: ' + e.message, 'error');
  }
}

// Theme management
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  showToast(`Switched to ${newTheme} theme`);
}

// Protocol management
let currentProtocol = 'wifi-direct';

async function initProtocol() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    const serverAdapter = (data.adapter || '').toLowerCase();
    const current = serverAdapter === 'noble' || serverAdapter === 'bluetooth' ? 'bluetooth' : (serverAdapter || 'wifi-direct');

    currentProtocol = current;
    localStorage.setItem('protocol', current);

    // Reflect UI state only
    document.querySelectorAll('.protocol-option').forEach(btn => btn.classList.remove('active'));
    const btn = document.querySelector(`[data-protocol="${current}"]`);
    if (btn) btn.classList.add('active');

    const subtitle = document.querySelector('.subtitle');
    const scanIdleText = document.getElementById('scanIdleText');
    
    if (current === 'wifi-direct') {
      subtitle.textContent = 'Secure local transfer via Wi‑Fi Direct';
      if (scanIdleText) scanIdleText.textContent = 'Click scan to discover nearby Wi-Fi Direct devices';
    } else {
      subtitle.textContent = 'Secure local transfer via Wi‑Fi to Bluetooth';
      if (scanIdleText) scanIdleText.textContent = 'Click scan to discover nearby Bluetooth devices';
    }
  } catch (e) {
    // Fall back to saved preference without contacting server
    const saved = localStorage.getItem('protocol') || 'wifi-direct';
    currentProtocol = saved;
    document.querySelectorAll('.protocol-option').forEach(btn => btn.classList.remove('active'));
    const btn = document.querySelector(`[data-protocol="${saved}"]`);
    if (btn) btn.classList.add('active');
  }
}

async function setProtocol(protocol) {
  try {
    const res = await postJSON('/api/set-protocol', { protocol });
    if (res.error) {
      throw new Error(res.error);
    }
    
    currentProtocol = protocol;
    localStorage.setItem('protocol', protocol);
    
    // Update UI
    document.querySelectorAll('.protocol-option').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-protocol="${protocol}"]`).classList.add('active');
    
    // Update subtitle and scan text
    const subtitle = document.querySelector('.subtitle');
    const scanIdleText = document.getElementById('scanIdleText');
    
    if (protocol === 'wifi-direct') {
      subtitle.textContent = 'Secure local transfer via Wi-Fi Direct';
      if (scanIdleText) scanIdleText.textContent = 'Click scan to discover nearby Wi-Fi Direct devices';
      showToast('Switched to Wi-Fi Direct - Fast & long range');
    } else if (protocol === 'bluetooth') {
      subtitle.textContent = 'Secure local transfer via Wi-Fi to Bluetooth';
      if (scanIdleText) scanIdleText.textContent = 'Click scan to discover nearby Bluetooth devices';
      showToast('Switched to Bluetooth - Universal compatibility');
    }
    
    // Clear any existing device connections when switching protocols
    discoveredDevices = [];
    connectedDevices = [];
    updateDiscoveredDevicesList();
    updateConnectedDevicesList();
    
  } catch (e) {
    // If server doesn't support endpoint yet, avoid noisy toast
    const msg = String(e.message || '').toLowerCase().includes('not found') ? 'Protocol switch not available on server version' : e.message;
    showToast('Failed to switch protocol: ' + msg, 'error');
  }
}

function handleProtocolToggle(e) {
  const protocol = e.currentTarget.dataset.protocol;
  if (protocol !== currentProtocol) {
    setProtocol(protocol);
  }
}

// Real-time event listening for broadcasts
function initEventSource() {
  const eventSource = new EventSource('/api/events');
  
  eventSource.onmessage = function(event) {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'text' && data.from === 'host') {
        // Add received broadcast message to chat
        addChatMessage(`📢 ${data.content}`, 'received');
        showToast('New broadcast message received');
      } else if (data.type === 'file' && data.from === 'host') {
        // Add received broadcast file to chat
        addChatMessage(`📢 📎 ${data.filename} (${formatFileSize(data.size)})`, 'received');
        showToast(`New broadcast file: ${data.filename}`);
      } else if (data.type === 'connected') {
        console.log('Connected to broadcast events');
      }
    } catch (e) {
      console.error('Error parsing event data:', e);
    }
  };
  
  eventSource.onerror = function(event) {
    console.log('EventSource error:', event);
    // Reconnect after 5 seconds
    setTimeout(() => {
      initEventSource();
    }, 5000);
  };
}

// Global functions for HTML onclick handlers
window.clearSelectedFiles = function() {
  selectedFiles = [];
  updateFilePreview();
  document.getElementById('chatFileInput').value = '';
};

// Initialize app
window.addEventListener('DOMContentLoaded', () => {
  // Initialize theme and protocol
  initTheme();
  initProtocol();
  
  // Initialize real-time events
  initEventSource();
  
  // Setup event listeners
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  document.getElementById('textForm').addEventListener('submit', handleTextSubmit);
  document.getElementById('fileForm').addEventListener('submit', handleFileSubmit);
  document.getElementById('refresh').addEventListener('click', refreshStatus);
  document.getElementById('copyAddress').addEventListener('click', copyServerAddress);
  document.getElementById('textInput').addEventListener('input', updateCharCount);
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  
  // Chat functionality
  document.getElementById('chatForm').addEventListener('submit', handleChatSubmit);
  document.getElementById('chatInput').addEventListener('input', updateChatCharCount);
  document.getElementById('chatInput').addEventListener('keydown', handleChatKeydown);
  document.getElementById('chatFileInput').addEventListener('change', handleChatFileSelect);
  
  // Protocol toggle
  document.querySelectorAll('.protocol-option').forEach(btn => {
    btn.addEventListener('click', handleProtocolToggle);
  });
  
  // Device management
  document.getElementById('scanDevices').addEventListener('click', scanForDevices);
  document.querySelectorAll('input[name="connectionMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        setConnectionMode(e.target.value);
      }
    });
  });
  
  // Setup file input
  setupFileInput();
  
  // Initial setup
  updateServerAddress();
  updateConnectionStatus();
  updateCharCount();
  refreshStatus();
  
  // Periodic updates
  setInterval(updateConnectionStatus, 5000);
  setInterval(refreshStatus, 3000);
  
  // About and help links
  document.getElementById('aboutLink').addEventListener('click', (e) => {
    e.preventDefault();
    showToast('ColdSend - Secure local file transfer via Wi-Fi to Bluetooth');
  });
  
  document.getElementById('helpLink').addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Check the README.md file for setup instructions');
  });
});
