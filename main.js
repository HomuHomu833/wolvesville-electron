const { app, ipcMain, BrowserWindow, shell, Menu } = require('electron');
const { join } = require('path');
const os = require('os');
const config = require('./config.js');

// Quit if launched by the Squirrel installer (avoids stray windows on setup).
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Single instance: a second launch just focuses the existing window.
const gotTheLock = app.requestSingleInstanceLock();

const isWindows = os.platform() === 'win32';

if (isWindows) {
  app.commandLine.appendSwitch('in-process-gpu');
  app.commandLine.appendSwitch('disable-direct-composition');
}

const discord = require('./native/discord');

let discordInitialized = false;
let callbacksInterval = null;
let mainWindow = null;

const initDiscord = () => {
  try {
    discord.initialize(config.discordAppId);
    discord.connect();
    discordInitialized = true;
  } catch (e) {
    console.error('Discord initialization failed:', e.message);
    discordInitialized = false;
  }
  return discordInitialized;
};

const sendToWindow = (channel, ...args) => {
  const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) win.webContents.send(channel, ...args);
};

const focusMainWindow = () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
};

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'Wolvesville',
    fullscreen: true,
    show: false, // shown on ready-to-show, avoids white flash
    backgroundColor: '#111111',
    icon: join(__dirname, 'src', 'icons', isWindows ? 'icon.ico' : 'icon.icns'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      backgroundThrottling: true,
    },
  });

  win.loadURL('https://www.wolvesville.com');

  win.once('ready-to-show', () => win.show());

  // added by Homura Akemi (HomuHomu833)
  // External links open in the system browser; only wolvesville.com popups get a
  // parented in-app window (so they can't pile up in Alt+Tab).
  win.webContents.setWindowOpenHandler(({ url }) => {
    let host = '';
    try {
      host = new URL(url).hostname;
    } catch {
      return { action: 'deny' };
    }

    const isWolvesville = host === 'wolvesville.com' || host.endsWith('.wolvesville.com');
    if (!isWolvesville) {
      shell.openExternal(url);
      return { action: 'deny' };
    }

    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 800,
        height: 600,
        parent: win,
        autoHideMenuBar: true,
        backgroundColor: '#111111',
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          spellcheck: false,
        },
      },
    };
  });

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });
  mainWindow = win;
  return win;
};

const registerDiscordCallback = (setter, channel) => {
  try {
    discord[setter]((data) => sendToWindow(channel, data));
  } catch (e) {
    console.error(`Discord ${setter} registration failed:`, e.message);
  }
};

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', focusMainWindow);

  initDiscord();

  callbacksInterval = setInterval(() => {
    if (!discordInitialized) return;
    try {
      discord.runCallbacks();
    } catch (e) {
      console.error('Discord runCallbacks failed:', e.message);
    }
  }, 1000 / 30);

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    if (discordInitialized) {
      registerDiscordCallback('setActivityJoinCallback', 'DISCORD_ACTIVITY_JOIN');
      registerDiscordCallback('setStatusChangedCallback', 'DISCORD_STATUS_CHANGED');
      try {
        discord.setTokenExpirationCallback(() => sendToWindow('DISCORD_TOKEN_EXPIRED'));
      } catch (e) {
        console.error('Discord setTokenExpirationCallback registration failed:', e.message);
      }
    }

    ipcMain.on('EXIT_GAME', () => {
      app.exit();
    });

    // invoke handlers reject with a stable error when Discord isn't initialized.
    const NOT_INITIALIZED = () => Promise.reject(new Error('DISCORD_NOT_INITIALIZED'));

    ipcMain.on('UPDATE_DISCORD_PRESENCE', (event, presence) => {
      if (!discordInitialized) return;
      try {
        discord.updatePresence(presence);
      } catch (e) {
        console.error('Discord updatePresence failed:', e.message);
      }
    });

    ipcMain.handle('DISCORD_SEND_INVITE', (event, { userId, message }) => {
      if (!discordInitialized) return NOT_INITIALIZED();
      try {
        return discord.sendInvite(userId, message);
      } catch (e) {
        console.error('Discord sendInvite failed:', e.message);
        throw e;
      }
    });

    ipcMain.handle('DISCORD_IS_AUTHENTICATED', () => {
      if (!discordInitialized) return NOT_INITIALIZED();
      return discord.isAuthenticated();
    });

    ipcMain.handle('DISCORD_GET_STATUS', () => {
      if (!discordInitialized) return NOT_INITIALIZED();
      return discord.getStatus();
    });

    ipcMain.handle('DISCORD_GET_RELATIONSHIPS', () => {
      if (!discordInitialized) return NOT_INITIALIZED();
      return discord.getRelationships();
    });

    ipcMain.handle('DISCORD_UPDATE_TOKEN', (event, token) => {
      if (!discordInitialized) return NOT_INITIALIZED();
      return new Promise((resolve, reject) => {
        discord.updateToken(token, (err) => {
          if (err) reject(new Error(err));
          else resolve();
        });
      });
    });

    ipcMain.handle('DISCORD_CONNECT', () => {
      if (discordInitialized) {
        try {
          discord.connect();
          return true;
        } catch (e) {
          console.error('Discord: reconnect failed:', e.message);
          return false;
        }
      }
      return initDiscord(); // retry init if it failed at startup
    });
  });
}

app.on('window-all-closed', () => {
  if (callbacksInterval) {
    clearInterval(callbacksInterval);
    callbacksInterval = null;
  }
  if (discordInitialized) {
    try {
      discord.shutdown();
    } catch (e) {
      console.error('Discord shutdown failed:', e.message);
    }
    discordInitialized = false;
  }
  if (process.platform !== 'darwin') app.quit();
});
