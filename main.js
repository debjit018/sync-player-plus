const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Configuration
const APP_CONFIG = {
  width: 1200,
  height: 800,
  minWidth: 800,
  minHeight: 600,
  devTools: !app.isPackaged, // Only enable dev tools in development
};

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window with enhanced security settings
  mainWindow = new BrowserWindow({
    width: APP_CONFIG.width,
    height: APP_CONFIG.height,
    minWidth: APP_CONFIG.minWidth,
    minHeight: APP_CONFIG.minHeight,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // Recommended security setting
      contextIsolation: true, // Recommended security setting
      sandbox: true, // Enable sandbox for additional security
      webSecurity: true, // Enable web security
    },
    show: false, // Don't show until ready
  });
  // Add this to your main.js (after creating the window)
ipcMain.handle('get-room-id', async () => {
  const { dialog } = require('electron');
  return await dialog.showInputBox({
    title: 'Room ID',
    message: 'Enter Room ID to connect with your friend:',
    buttons: ['OK', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    inputPlaceholder: 'Enter a room name or ID',
    validateInput: (text) => {
      return text.trim().length > 0 ? null : 'Please enter a valid room ID';
    }
  });
});

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Show window when ready to avoid visual flash
  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    if (APP_CONFIG.devTools) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Handle window closed event
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links (open in default browser)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('file://')) {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

// Electron app lifecycle management
app.whenReady().then(() => {
  createWindow();

  // macOS-specific behavior
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security warnings in development
if (!app.isPackaged) {
  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
}

// Example IPC communication
ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    isPackaged: app.isPackaged,
  };
});