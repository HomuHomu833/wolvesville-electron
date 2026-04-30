const { contextBridge } = require('electron');

// expose a flag so Wolvesville treats this as a Steam build of Wolvesville.
contextBridge.exposeInMainWorld('steam', true);