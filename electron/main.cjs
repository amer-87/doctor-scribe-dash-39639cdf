// Electron main process — wraps the published web app in a native desktop window.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

// URL of the deployed app. Change to your custom domain if you have one.
const APP_URL = process.env.APP_URL || 'https://doctor-scribe-dash.lovable.app';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'نظام إدارة العيادة',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // Persistent session so Supabase auth/localStorage survives restarts
      partition: 'persist:clinic-app',
    },
  });

  mainWindow.loadURL(APP_URL);

  // Open external links (mailto, http to other domains) in the user's browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const u = new URL(url);
      const appHost = new URL(APP_URL).host;
      if (u.host !== appHost) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    } catch (_) {}
    return { action: 'allow' };
  });

  // Hide the default menu bar (keep Ctrl+R, F11, devtools shortcut working)
  Menu.setApplicationMenu(null);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
