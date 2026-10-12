const { app, BrowserWindow, dialog } = require('electron');
const { fork } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

let apiProcess = null;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function waitForServer(port, timeoutMs = 15000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(`http://127.0.0.1:${port}/`, response => {
        response.resume();
        resolve();
      });
      request.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error('本地服务启动超时'));
        } else {
          setTimeout(check, 150);
        }
      });
    };
    check();
  });
}

async function startLocalApi() {
  const port = await getFreePort();
  const serverPath = path.join(process.resourcesPath, 'dist-electron', 'server.cjs');
  apiProcess = fork(serverPath, [], {
    cwd: process.resourcesPath,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      APP_PORT: String(port),
    },
    stdio: 'ignore',
  });
  await waitForServer(port);
  return `http://127.0.0.1:${port}`;
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#FFFDF8',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  try {
    const appUrl = await startLocalApi();
    await window.loadURL(appUrl);
    window.once('ready-to-show', () => window.show());
  } catch (error) {
    dialog.showErrorBox('每日30词启动失败', error instanceof Error ? error.message : String(error));
    app.quit();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (apiProcess && !apiProcess.killed) apiProcess.kill();
});
