const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');

// Keep a global reference of the window object
let mainWindow;
let serverProcess;
let PORT = 4001; // Start with 4001 to avoid conflicts with dev server

// Function to find an available port
function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, (err) => {
      if (err) {
        // Port is in use, try next one
        server.close();
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        // Port is available
        const port = server.address().port;
        server.close();
        resolve(port);
      }
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

  // Load the app after server starts
  setTimeout(() => {
    mainWindow.loadURL(`http://localhost:${PORT}`);
  }, 3000); // Give more time for server to start

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

function startServer() {
  if (serverProcess) return;
  
  const serverPath = path.join(__dirname, '../src/server.js');
  serverProcess = spawn('node', [serverPath], {
    stdio: 'pipe',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
    // Don't crash the app on server errors, just log them
  });
  
  serverProcess.on('error', (err) => {
    console.error('Failed to start server process:', err);
    // Show user-friendly error dialog
    if (mainWindow) {
      mainWindow.webContents.executeJavaScript(`
        alert('Failed to start ColdSend server. Please restart the app.');
      `);
    }
  });
  
  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    serverProcess = null;
    if (code !== 0 && mainWindow) {
      mainWindow.webContents.executeJavaScript(`
        alert('ColdSend server stopped unexpectedly. Please restart the app.');
      `);
    }
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
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
