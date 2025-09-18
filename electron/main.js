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

function startServer() {
  if (serverProcess) return;
  
  // Use absolute path for production build
  let serverPath;
  if (app.isPackaged) {
    // In packaged app, the path is relative to the app resources
    serverPath = path.join(process.resourcesPath, 'app', 'src', 'server.js');
    console.log('Using packaged server path:', serverPath);
  } else {
    // In development, use relative path
    serverPath = path.join(__dirname, '../src/server.js');
    console.log('Using development server path:', serverPath);
  }
  
  // Create logs directory if it doesn't exist
  const userDataPath = app.getPath('userData');
  const logsPath = path.join(userDataPath, 'logs');
  
  try {
    if (!fs.existsSync(logsPath)) {
      fs.mkdirSync(logsPath, { recursive: true });
    }
    
    // Create log file for debugging
    const logFile = path.join(logsPath, 'server.log');
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    logStream.write(`\n--- Server started at ${new Date().toISOString()} ---\n`);
    logStream.write(`Server path: ${serverPath}\n`);
    
    // Start server process
    let nodeBinary;
    
    if (app.isPackaged) {
      // In packaged app, use the bundled Node executable
      if (process.platform === 'win32') {
        // On Windows, the Node executable is named node.exe
        nodeBinary = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'electron', 'dist', 'resources', 'electron.exe');
      } else if (process.platform === 'darwin') {
        // On macOS, we can use the Electron binary directly
        nodeBinary = process.execPath;
      } else {
        // On Linux, similar to macOS
        nodeBinary = process.execPath;
      }
      
      logStream.write(`Using bundled node: ${nodeBinary}\n`);
    } else {
      // In development, use system Node
      nodeBinary = 'node';
    }
    
    // Set up the working directory and module paths
    let cwd, nodeModulesPath;
    
    if (app.isPackaged) {
      // In packaged app, set working directory to the app root
      cwd = path.join(process.resourcesPath, 'app');
      nodeModulesPath = path.join(cwd, 'node_modules');
    } else {
      // In development, use project root
      cwd = path.join(__dirname, '..');
      nodeModulesPath = path.join(cwd, 'node_modules');
    }
    
    logStream.write(`Working directory: ${cwd}\n`);
    logStream.write(`Node modules path: ${nodeModulesPath}\n`);
    
    serverProcess = spawn(nodeBinary, [serverPath], {
      stdio: 'pipe',
      cwd: cwd, // Set working directory
      env: { 
        ...process.env, 
        NODE_ENV: 'production',
        COLDSEND_USER_DATA: userDataPath,
        PORT: PORT.toString(), // Pass the desired port to the server
        ELECTRON_RUN_AS_NODE: '1', // This tells Electron to behave like Node.js
        NODE_PATH: nodeModulesPath // Help Node find modules
      }
    });
    
    serverProcess.stdout.on('data', (data) => {
      const output = `Server: ${data}`;
      console.log(output);
      logStream.write(`${output}\n`);
      
      // Check if the server output contains the port information
      const dataStr = data.toString();
      const portMatch = dataStr.match(/listening at http:\/\/[^:]+:(\d+)/);
      if (portMatch && portMatch[1]) {
        actualServerPort = parseInt(portMatch[1], 10);
        console.log(`Detected server running on port: ${actualServerPort}`);
        
        // Now that we know the actual port, load the app
        if (mainWindow) {
          mainWindow.loadURL(`http://localhost:${actualServerPort}`);
        }
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const error = `Server Error: ${data}`;
      console.error(error);
      logStream.write(`${error}\n`);
      
      // Don't crash the app on server errors, just log them
      if (mainWindow) {
        mainWindow.webContents.send('server-error', error);
      }
    });
    
    serverProcess.on('error', (err) => {
      const error = `Failed to start server process: ${err.message}`;
      console.error(error);
      logStream.write(`${error}\n`);
      
      // Show user-friendly error dialog
      if (mainWindow) {
        dialog.showErrorBox(
          'Server Error',
          'Failed to start ColdSend server. Please restart the app.'
        );
      }
    });
    
    serverProcess.on('close', (code) => {
      const message = `Server process exited with code ${code}`;
      console.log(message);
      logStream.write(`${message}\n`);
      
      serverProcess = null;
      if (code !== 0 && code !== null && mainWindow) {
        dialog.showErrorBox(
          'Server Stopped',
          'ColdSend server stopped unexpectedly. Please restart the app.'
        );
      }
    });
  } catch (err) {
    console.error('Error setting up server:', err);
    dialog.showErrorBox(
      'Startup Error',
      `Failed to initialize ColdSend: ${err.message}`
    );
  }
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
