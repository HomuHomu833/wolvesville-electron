import { app, ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { platform } from 'os';

// fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('disable-direct-composition');

app.allowRendererProcessReuse = false;

const isWindows = platform() === 'win32';

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'Wolvesville',
    fullscreen: true,
    icon: path.join(__dirname, 'src', 'icons', isWindows ? 'icon.ico' : 'icon.ics'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  // win.loadURL('http://localhost:3002');
  win.loadURL('https://www.wolvesville.com');

  // added by Homura Akemi (HomuHomu833)
  win.webContents.setWindowOpenHandler(({}) => ({
    action: 'allow',
    overrideBrowserWindowOptions: {
      width: 800,
      height: 600,
      autoHideMenuBar: true,
    },
  }));

  return win;
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  ipcMain.on('EXIT_GAME', () => {
    app.exit();
  });

});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
