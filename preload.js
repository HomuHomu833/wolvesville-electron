const { contextBridge, ipcRenderer } = require('electron');

const Status = { Disconnected: 0, Connecting: 1, Connected: 2, Ready: 3, Reconnecting: 4 };
const Platform = { Desktop: 1, Xbox: 2, Samsung: 4, iOS: 8, Android: 16, Embedded: 32, PS4: 64, PS5: 128 };

process.once('loaded', () => {
  contextBridge.exposeInMainWorld('exitGame', () => ipcRenderer.send('EXIT_GAME'));

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
