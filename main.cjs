const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let viteProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#09090b',
    title: 'UltimateVC - RTX Realtime Voice Changer',
    autoHideMenuBar: true,
    webPreferences: {
      backgroundThrottling: false, // Prevents audio stutter when window is in background during gaming
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Automatic microphone and audio device permissions (No browser prompt)
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'media') return true;
    return false;
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') return callback(true);
    return callback(false);
  });

  // Start Vite local dev server in background
  const isWindows = process.platform === 'win32';
  const npxCmd = isWindows ? 'npx.cmd' : 'npx';
  viteProcess = spawn(npxCmd, ['vite', '--port', '3000'], {
    shell: true,
    stdio: 'ignore',
  });

  // Poll until Vite is ready, then load URL directly in the native window
  function checkServerReady() {
    http.get('http://localhost:3000', (res) => {
      if (mainWindow) {
        mainWindow.loadURL('http://localhost:3000');
      }
    }).on('error', () => {
      setTimeout(checkServerReady, 200);
    });
  }

  checkServerReady();

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (viteProcess) {
      try {
        if (isWindows) {
          spawn('taskkill', ['/pid', viteProcess.pid, '/f', '/t']);
        } else {
          viteProcess.kill();
        }
      } catch (e) {}
    }
    app.quit();
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
