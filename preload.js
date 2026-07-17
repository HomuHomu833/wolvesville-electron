const { contextBridge, ipcRenderer } = require('electron');

// Patch injected into the page's MAIN world at document-start. window.steam reads
// true everywhere (desktop mode: exit button + Discord) EXCEPT the purchase
// handler, which does `const {Paddle, steam} = window` — reading window.Paddle
// first flips a one-shot flag so the very next window.steam read returns false.
// That sends purchases down the Paddle web-checkout path instead of the Steam one
// (which needs a real steamId we don't have), without disturbing Discord/exit.
const STEAM_PATCH = `(() => {
  if (window.__wvSteamPatched) return;
  window.__wvSteamPatched = true;
  try {
    let paddleRead = false, realPaddle = window.Paddle;
    Object.defineProperty(window, 'Paddle', {
      configurable: true,
      get() { paddleRead = true; queueMicrotask(() => { paddleRead = false; }); return realPaddle; },
      set(v) { realPaddle = v; },
    });
    Object.defineProperty(window, 'steam', {
      configurable: true,
      get() { if (paddleRead) { paddleRead = false; return false; } return true; },
    });
  } catch (e) {}
})();`;

// Run it as early as possible (before the site's scripts) via a main-world script.
try {
  const s = document.createElement('script');
  s.textContent = STEAM_PATCH;
  (document.documentElement || document.head || document.body).appendChild(s);
  s.remove();
} catch (e) {}

const Status = { Disconnected: 0, Connecting: 1, Connected: 2, Ready: 3, Reconnecting: 4 };
const Platform = { Desktop: 1, Xbox: 2, Samsung: 4, iOS: 8, Android: 16, Embedded: 32, PS4: 64, PS5: 128 };

process.once('loaded', () => {
  contextBridge.exposeInMainWorld('sendSteamIpc', ({ action, payload }) => {
    if (action === 'EXIT_GAME') {
      ipcRenderer.send('EXIT_GAME');
    } else if (action === 'OPEN_URL' && typeof payload === 'string') {
      ipcRenderer.send('OPEN_URL', payload);
    }
  });

  contextBridge.exposeInMainWorld('discord', {
    Platform,
    Status,

    updatePresence: (presence) => ipcRenderer.send('UPDATE_DISCORD_PRESENCE', presence),
    sendInvite: (userId, message) => ipcRenderer.invoke('DISCORD_SEND_INVITE', { userId, message }),

    onActivityJoin: (cb) => { const h = (e, data) => cb(data); ipcRenderer.on('DISCORD_ACTIVITY_JOIN', h); return () => ipcRenderer.removeListener('DISCORD_ACTIVITY_JOIN', h); },
    onStatusChanged: (cb) => { const h = (e, data) => cb(data); ipcRenderer.on('DISCORD_STATUS_CHANGED', h); return () => ipcRenderer.removeListener('DISCORD_STATUS_CHANGED', h); },
    onTokenExpired: (cb) => { const h = () => cb(); ipcRenderer.on('DISCORD_TOKEN_EXPIRED', h); return () => ipcRenderer.removeListener('DISCORD_TOKEN_EXPIRED', h); },

    isAuthenticated: () => ipcRenderer.invoke('DISCORD_IS_AUTHENTICATED'),
    getStatus: () => ipcRenderer.invoke('DISCORD_GET_STATUS'),
    getRelationships: () => ipcRenderer.invoke('DISCORD_GET_RELATIONSHIPS'),

    connect: () => ipcRenderer.invoke('DISCORD_CONNECT'),
    updateToken: (token) => ipcRenderer.invoke('DISCORD_UPDATE_TOKEN', token),
  });
})
