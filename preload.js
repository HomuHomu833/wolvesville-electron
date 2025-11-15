const { contextBridge, ipcRenderer } = require('electron');

process.once('loaded', () => {
  // expose a flag so Wolvesville thinks we're in Steam build.
  contextBridge.exposeInMainWorld('steam', true);
  contextBridge.exposeInMainWorld('sendSteamIpc', ({ action, payload }) => {
    if (action === 'EXIT_GAME') {
      ipcRenderer.send('EXIT_GAME');
    }
  });
});

