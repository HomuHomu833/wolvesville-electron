import { app, session, BrowserWindow } from 'electron';

function createMainWindow() {
  const mainWin = new BrowserWindow({
    width: 1280,
    height: 720,
    maximize: true,
    autoHideMenuBar: true,
    experimentalFeatures: true, // idk honestly maybe req?
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWin.loadURL('https://wolvesville.com');

  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 800,
        height: 600,
        autoHideMenuBar: true,
        experimentalFeatures: true, // idk honestly maybe req?
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        }
      }
    };
  });

  session.defaultSession.setPermissionRequestHandler((permission, callback) => {
    if (permission === 'notifications') callback(true); // does not work...
  });
}

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  app.quit();
});
