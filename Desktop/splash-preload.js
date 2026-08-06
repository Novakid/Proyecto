const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  if (typeof callback !== 'function') return () => {};
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('splashAPI', {
  onProgress: (callback) => subscribe('splash:progress', callback),
  onError: (callback) => subscribe('splash:error', callback),
  quit: () => ipcRenderer.send('splash:quit'),
});
