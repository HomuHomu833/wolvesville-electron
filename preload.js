import { contextBridge, ipcRenderer } from 'electron';

process.once('loaded', () => {
  contextBridge.exposeInMainWorld('steam', true); // required so Wolvesville will think it's launched through Steam Client.
  contextBridge.exposeInMainWorld('sendSteamIpc', ({ action, payload }) => {
    if (action === 'EXIT_GAME') {
      ipcRenderer.send('EXIT_GAME');
    }
  });
});

