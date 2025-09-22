const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const net = require('net');

// Keep a global reference of the window object
let mainWindow;
let serverProcess;
let PORT = 4001; // Start with 4001 to avoid conflicts with dev server

// Global variable to track the actual port used by the server
let actualServerPort = PORT;

// Function to find an available port
function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use, try next one
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

async function createWindow() {
  // Find an available port
  try {
    PORT = await findAvailablePort(PORT);
    console.log(`Using port ${PORT} for Electron app`);
  } catch (err) {
    console.error('Failed to find available port:', err);
    dialog.showErrorBox('Port Error', 'Could not find an available port to start the server.');
    return;
  }

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    // Use the generated icon
    icon: path.join(__dirname, 'assets', 'icons', 'icon-256.png'),
    titleBarStyle: 'default',
    show: false // Don't show until ready
  });

  // Start the Express server
  startServer();

  // We'll load the app once the server is ready and reports its actual port

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    stopServer();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create application menu
  createMenu();
}

// Embedded server instance
let httpServer = null;

function startServer() {
  if (httpServer) return;
  
  try {
    console.log('Starting embedded server...');
    
    // Import required modules
    const express = require('express');
    const multer = require('multer');
    const mimeTypes = require('mime-types');
    
    const serverApp = express();
    
    // In-memory state to mimic main server behavior
    const queue = [];
    let connectionMode = 'single';
    const connectedDevices = [];
    const connectedClients = new Set(); // SSE clients
    
    // Middleware
    serverApp.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
    
    serverApp.use(express.json({ limit: '1mb' }));
    serverApp.use(express.urlencoded({ extended: true }));
    
    // Set up static file serving
    let publicDir;
    if (app.isPackaged) {
      publicDir = path.join(process.resourcesPath, 'app.asar.unpacked', 'public');
    } else {
      publicDir = path.join(__dirname, '../public');
    }
    
    serverApp.use(express.static(publicDir));
    
    // Basic API endpoints
    serverApp.get('/api/health', (req, res) => {
      res.json({ ok: true, message: 'ColdSend server is running' });
    });
    
    // Status endpoint expected by the renderer
    serverApp.get('/api/status', (req, res) => {
      res.json({
        ok: true,
        adapter: 'embedded',
        connectionMode,
        connectedDevices,
        queue
      });
    });
    
    serverApp.get('/api/scan-devices', (req, res) => {
      res.json({ devices: [], adapter: 'wifi-direct' });
    });
    
    serverApp.post('/api/scan-devices', (req, res) => {
      res.json({ success: true, devices: [], adapter: 'embedded' });
    });
    
    serverApp.get('/api/connected-devices', (req, res) => {
      res.json({ devices: [] });
    });
    
    serverApp.post('/api/connect-device', (req, res) => {
      res.json({ success: false, error: 'Device connection not implemented in embedded mode' });
    });
    
    // Simulate text send by adding to queue and marking sent
    serverApp.post('/api/send-text', (req, res) => {
      const job = {
        id: 'job_' + Date.now() + '_' + Math.round(Math.random() * 1e6),
        kind: 'text',
        status: 'sent',
        receivedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      };
      queue.push(job);
      res.json({ success: true, jobId: job.id });
    });
    
    // File upload setup
    const upload = multer({ dest: path.join(app.getPath('temp'), 'coldsend-uploads') });
    
    // Simulate file send by adding to queue and marking sent
    serverApp.post('/api/send-file', upload.single('file'), (req, res) => {
      const { originalname = 'file', size = 0 } = req.file || {};
      const job = {
        id: 'job_' + Date.now() + '_' + Math.round(Math.random() * 1e6),
        kind: 'file',
        status: 'sent',
        receivedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        filename: originalname,
        size
      };
      queue.push(job);
      res.json({ ok: true, id: job.id, status: job.status, filename: originalname, size });
    });

    // SSE endpoint for broadcast messages
    serverApp.get('/api/events', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      const clientId = Date.now() + '_' + Math.random();
      const client = { id: clientId, res };
      connectedClients.add(client);
      res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);
      req.on('close', () => {
        connectedClients.delete(client);
      });
    });

    function broadcastToClients(message) {
      const data = `data: ${JSON.stringify(message)}\n\n`;
      connectedClients.forEach(client => {
        try { client.res.write(data); } catch (_) { connectedClients.delete(client); }
      });
    }

    // Broadcast text endpoint used by chat UI
    serverApp.post('/api/broadcast-text', (req, res) => {
      const message = {
        type: 'text',
        content: (req.body && req.body.text) || '',
        timestamp: new Date().toISOString(),
        from: 'host'
      };
      broadcastToClients(message);
      res.json({ success: true, clientCount: connectedClients.size });
    });
    
    // Fallback to serve index.html
    serverApp.get('*', (req, res) => {
      res.sendFile(path.join(publicDir, 'index.html'));
    });
    
    // Start the server
    httpServer = serverApp.listen(PORT, '0.0.0.0', () => {
      console.log(`ColdSend embedded server listening at http://0.0.0.0:${PORT}`);
      actualServerPort = PORT;
      
      // Load the UI
      if (mainWindow) {
        mainWindow.loadURL(`http://localhost:${PORT}`);
      }
    });
    
    httpServer.on('error', (err) => {
      console.error('Server error:', err);
      if (err.code === 'EADDRINUSE') {
        // Try next port
        PORT += 1;
        actualServerPort = PORT;
        setTimeout(() => startServer(), 100);
      } else {
        dialog.showErrorBox('Server Error', `Failed to start server: ${err.message}`);
      }
    });
    
  } catch (err) {
    console.error('Error starting embedded server:', err);
    dialog.showErrorBox('Server Error', `Failed to start ColdSend server: ${err.message}`);
  }
}

function stopServer() {
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
}

function createMenu() {
  const template = [
    {
      label: 'ColdSend',
      submenu: [
        {
          label: 'About ColdSend',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About ColdSend',
              message: 'ColdSend',
              detail: 'Secure local file transfer via Wi-Fi to Bluetooth\n\nVersion: 0.1.0\nMIT License'
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            // Focus on settings tab
            mainWindow.webContents.executeJavaScript(`
              if (typeof switchTab === 'function') {
                switchTab('settings');
              }
            `);
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Toggle Developer Tools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Close', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: () => {
            shell.openExternal('https://github.com/ivaavimusic/ColdSend');
          }
        },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('https://github.com/ivaavimusic/ColdSend/issues');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createMenu();
}).catch(err => {
  console.error('Failed to start app:', err);
  app.quit();
});

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopServer();
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (navigationEvent, navigationURL) => {
    navigationEvent.preventDefault();
    shell.openExternal(navigationURL);
  });
});
