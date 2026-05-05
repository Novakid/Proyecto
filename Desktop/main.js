const { app, BrowserWindow } = require('electron');
const path = require('path');
let mainWindow;
let splash;
function safeSendProgress(value) {
  if (splash && !splash.isDestroyed() && splash.webContents) {
    splash.webContents.send('progress', value);
  }
}
function createWindows() {
  splash = new BrowserWindow({
    width: 500,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    center: true
  });
  splash.loadFile('splash.html');
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    icon: path.join(__dirname, 'img/posiblelogo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });
  //mainWindow.setMenu(null);
  mainWindow.loadURL('http://localhost:5173');
  // Eventos seguros
  mainWindow.webContents.on('did-start-loading', () => {
    safeSendProgress(20);
  });
  mainWindow.webContents.on('dom-ready', () => {
    safeSendProgress(60);
  });
  mainWindow.webContents.on('did-finish-load', () => {
    safeSendProgress(100);
  });
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (splash && !splash.isDestroyed()) {
        splash.close();
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
      }
    }, 500);
  });
  mainWindow.maximize(); 
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  splash.on('closed', () => {
    splash = null;
  });
}

app.whenReady().then(createWindows);