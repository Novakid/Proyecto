const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  onProgress: (callback) => ipcRenderer.on('progress', (_, value) => callback(value)),
  imprimirEtiquetas: (data) => ipcRenderer.invoke('print-labels', data),
  previewEtiquetas: (data) => ipcRenderer.invoke('preview-etiquetas', data)
});
