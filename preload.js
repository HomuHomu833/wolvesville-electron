const { contextBridge, ipcRenderer } = require('electron');

const Status = { Disconnected: 0, Connecting: 1, Connected: 2, Ready: 3, Reconnecting: 4 };
const Platform = { Desktop: 1, Xbox: 2, Samsung: 4, iOS: 8, Android: 16, Embedded: 32, PS4: 64, PS5: 128 };

process.once('loaded', () => {
  // Enables the web app's desktop mode: exit button, Discord.
  contextBridge.exposeInMainWorld('steam', true);

  contextBridge.exposeInMainWorld('sendSteamIpc', ({ action, payload }) => {
    if (action === 'EXIT_GAME') {
      ipcRenderer.send('EXIT_GAME');
    } else if (action === 'OPEN_URL' && typeof payload === 'string') {
      ipcRenderer.send('OPEN_URL', payload);
    }
  });

  // Temporary debug: log to the renderer console (F12) when the site drives Discord.
  const dbg = (...a) => console.log('[wv-discord]', ...a);

  contextBridge.exposeInMainWorld('discord', {
    Platform,
    Status,

    updatePresence: (presence) => { dbg('updatePresence', presence); return ipcRenderer.send('UPDATE_DISCORD_PRESENCE', presence); },
    sendInvite: (userId, message) => { dbg('sendInvite', userId); return ipcRenderer.invoke('DISCORD_SEND_INVITE', { userId, message }); },

    onActivityJoin: (cb) => { const h = (e, data) => cb(data); ipcRenderer.on('DISCORD_ACTIVITY_JOIN', h); return () => ipcRenderer.removeListener('DISCORD_ACTIVITY_JOIN', h); },
    onStatusChanged: (cb) => { const h = (e, data) => cb(data); ipcRenderer.on('DISCORD_STATUS_CHANGED', h); return () => ipcRenderer.removeListener('DISCORD_STATUS_CHANGED', h); },
    onTokenExpired: (cb) => { const h = () => cb(); ipcRenderer.on('DISCORD_TOKEN_EXPIRED', h); return () => ipcRenderer.removeListener('DISCORD_TOKEN_EXPIRED', h); },

    isAuthenticated: () => ipcRenderer.invoke('DISCORD_IS_AUTHENTICATED'),
    getStatus: () => ipcRenderer.invoke('DISCORD_GET_STATUS'),
    getRelationships: () => ipcRenderer.invoke('DISCORD_GET_RELATIONSHIPS'),

    connect: () => { dbg('connect'); return ipcRenderer.invoke('DISCORD_CONNECT'); },
    updateToken: (token) => { dbg('updateToken', typeof token === 'string' ? '(token len ' + token.length + ')' : token); return ipcRenderer.invoke('DISCORD_UPDATE_TOKEN', token); },
  });

  dbg('bridge ready; window.steam =', true);
})
