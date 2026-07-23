const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let minerProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 420,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (minerProcess) minerProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('start-mining', (event, data) => {
  if (minerProcess) return;
  const address = data.address;
  const threads = data.threads;
  const minerPath = app.isPackaged
    ? path.join(process.resourcesPath, 'miner', 'cpuminer.exe')
    : path.join(__dirname, 'miner', 'cpuminer.exe');
  const args = [
    '-a', 'civiclight',
    '-o', 'stratum+tcp://stratum.civiclight.xyz:3032',
    '-u', address,
    '-p', 'x'
  ];
  if (threads && threads !== 'max') {
    args.push('-t', String(threads));
  }
  minerProcess = spawn(minerPath, args);

  minerProcess.stdout.on('data', (data) => {
    mainWindow.webContents.send('miner-log', data.toString());
  });
  minerProcess.stderr.on('data', (data) => {
    mainWindow.webContents.send('miner-log', data.toString());
  });
  minerProcess.on('close', () => {
    minerProcess = null;
    mainWindow.webContents.send('miner-stopped');
  });
});

ipcMain.on('stop-mining', () => {
  if (minerProcess) {
    minerProcess.kill();
    minerProcess = null;
  }
});
