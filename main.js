import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { platform } from 'os';

// fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = platform() === 'win32';
const isMac = platform() === 'darwin';

app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('disable-direct-composition');

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'Wolvesville',
    fullscreen: true,
    icon: path.join(__dirname, 'src', 'icons', isWindows ? 'icon.ico' : 'icon.icns'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  // win.loadURL('http://localhost:3002');
  win.loadURL('https://www.wolvesville.com');

  // added by Homura Akemi (HomuHomu833)
  win.webContents.setWindowOpenHandler(({ url }) => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 800,
        height: 600,
        autoHideMenuBar: true,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      },
    };
  });

  return win;
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
