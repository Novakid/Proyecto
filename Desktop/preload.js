const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onProgress: (callback) => ipcRenderer.on('progress', (_, value) => callback(value))
});