// Electron main process — wraps the local production build in a native desktop window.
// v1.0.2
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { createServer } = require('http');
const { createReadStream, promises: fs } = require('fs');
const { pathToFileURL } = require('url');

const APP_URL = process.env.APP_URL;
const DIST_CLIENT = path.join(__dirname, '..', 'dist', 'client');
const SERVER_ENTRY = path.join(__dirname, '..', 'dist', 'server', 'index.js');

let mainWindow;
let localServer;

function getMimeType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.ico':
      return 'image/x-icon';
    case '.svg':
      return 'image/svg+xml';
    case '.webmanifest':
      return 'application/manifest+json';
    default:
      return 'application/octet-stream';
  }
}

async function startLocalServer() {
  const imported = await import(pathToFileURL(SERVER_ENTRY).href);
  const serverBuild = imported.default ?? imported;

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      const pathname = decodeURIComponent(url.pathname);
      const staticPath = path.join(DIST_CLIENT, pathname);

      if (staticPath.startsWith(DIST_CLIENT)) {
        try {
          const stats = await fs.stat(staticPath);
          if (stats.isFile()) {
            res.setHeader('Content-Type', getMimeType(staticPath));
            createReadStream(staticPath).pipe(res);
            return;
          }
        } catch {
          // fall through to SSR handler
        }
      }

      const headers = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined) {
          headers[key] = value;
        }
      }

      const request = new Request(url.toString(), {
        method: req.method,
        headers,
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req,
      });

      const response = await serverBuild.fetch(request);

      for (const [name, value] of response.headers) {
        res.setHeader(name, value);
      }
      res.writeHead(response.status, response.statusText);

      if (response.body) {
        const bodyBuffer = Buffer.from(await response.arrayBuffer());
        res.end(bodyBuffer);
      } else {
        res.end();
      }
    } catch (error) {
      console.error(error);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
    }
  });

  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
    server.listen(0, '127.0.0.1');
  });

  return server;
}

async function createWindow() {
  if (!APP_URL) {
    localServer = await startLocalServer();
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'نظام إدارة العيادة',
    icon: path.join(__dirname, '..', 'public', 'icon-512.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      partition: 'persist:clinic-app',
    },
  });

  if (APP_URL) {
    mainWindow.loadURL(APP_URL);
  } else {
    mainWindow.loadURL(`http://127.0.0.1:${localServer.address().port}/`);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (APP_URL) {
      try {
        const u = new URL(url);
        const appHost = new URL(APP_URL).host;
        if (u.host !== appHost) {
          shell.openExternal(url);
          return { action: 'deny' };
        }
      } catch (_) {}
      return { action: 'allow' };
    }

    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }

    return { action: 'allow' };
  });

  Menu.setApplicationMenu(null);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (localServer) {
    localServer.close();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
