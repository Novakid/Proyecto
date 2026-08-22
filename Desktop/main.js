const { app, BrowserWindow, ipcMain } = require('electron');
const { generarHTML, validarConfiguracion } = require('./lable');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { randomUUID } = require('crypto');
const MAX_LABELS = 500;
const validateEtiquetas = (etiquetas) => {
  if (!Array.isArray(etiquetas)) throw new Error('etiquetas no es un array');
  if (etiquetas.length > MAX_LABELS) throw new Error(`No se permiten mas de ${MAX_LABELS} etiquetas`);
  return etiquetas.map((item) => ({
    numero: String(item?.numero ?? '').slice(0, 100),
    codigo: String(item?.codigo ?? '').slice(0, 100),
    nombre: String(item?.nombre ?? '').slice(0, 200),
    descripcion: String(item?.descripcion ?? '').slice(0, 300),
    precio: String(item?.precio ?? '').slice(0, 50),
    adicional: String(item?.adicional ?? '').slice(0, 100),
  }));
};
const validateLabelRequest = (payload) => ({
  etiquetas: validateEtiquetas(payload?.etiquetas),
  configuracion: validarConfiguracion(payload?.configuracion),
});
const loadGeneratedLabelHtml = async (win, html) => {
  const temporaryFile = path.join(os.tmpdir(), `aparicio-label-${randomUUID()}.html`);
  fs.writeFileSync(temporaryFile, html, { encoding: 'utf8', flag: 'wx' });
  try {
    await win.loadFile(temporaryFile);
  }
  finally {
    fs.rmSync(temporaryFile, { force: true });
  }
};
if (!app.isPackaged && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.join(__dirname, '.env'));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('No se pudo leer Desktop/.env:', error.message);
  }
}
let mainWindow;
let splash;
const STARTUP_TIMEOUT_MS = 30000;

function safeSendProgress(value) {
  if (splash && !splash.isDestroyed() && !splash.webContents.isDestroyed()) {
    splash.webContents.send('splash:progress', Math.max(0, Math.min(100, value)));
  }
}

function safeSendSplashError(message) {
  if (splash && !splash.isDestroyed() && !splash.webContents.isDestroyed()) {
    splash.webContents.send('splash:error', message);
  }
}

function closeSplash() {
  if (!splash || splash.isDestroyed()) {
    splash = null;
    return;
  }
  try {
    splash.close();
  } finally {
    if (splash && !splash.isDestroyed()) splash.destroy();
    splash = null;
  }
}

ipcMain.on('splash:quit', (event) => {
  if (splash && !splash.isDestroyed() && event.sender === splash.webContents) app.quit();
});
ipcMain.handle('preview-etiquetas', async (_event, payload) => {
  const request = validateLabelRequest(payload);
  let win;
  try {
    const generated = generarHTML(request.etiquetas, request.configuracion);
    win = new BrowserWindow({
      show: false,
      width: 600,
      height: 400,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    await loadGeneratedLabelHtml(win, generated.html);

    await new Promise(r => setTimeout(r, 500));


    const pdf = await win.webContents.printToPDF({

      printBackground: true,

      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      },

      preferCSSPageSize: true

    });


    return { pdf, warnings: generated.warnings, config: generated.config, total: generated.total };
  } catch (error) {
    console.error('ERROR PDF:', error);
    throw new Error(error instanceof Error ? error.message : 'No fue posible generar las etiquetas');
  } finally {
    if (win && !win.isDestroyed()) win.close();
  }
});
ipcMain.handle('print-labels', async (_event, payload) => {
  const request = validateLabelRequest(payload);
  const generated = generarHTML(request.etiquetas, request.configuracion);
  const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
  try {
    await loadGeneratedLabelHtml(win, generated.html);
    const pdf = await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    return { pdf, warnings: generated.warnings, config: generated.config, total: generated.total };
  } finally {
    win.close();
  }
});
async function loadDevelopmentRenderer(window, url, attempts = 30) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await window.loadURL(url);
      return;
    } catch (error) {
      if (attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function createWindows() {
  if (mainWindow && !mainWindow.isDestroyed()) return;

  splash = new BrowserWindow({
    width: 500,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, 'splash-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  splash.on('closed', () => {
    splash = null;
  });
  await splash.loadFile(path.join(__dirname, 'splash.html'));
  safeSendProgress(10);
  safeSendProgress(25);

  const rendererUrl = process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173';
  const allowedRendererOrigin = app.isPackaged ? 'file:' : new URL(rendererUrl).origin;
  safeSendProgress(45);

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    icon: path.join(__dirname, 'img/vocho_rojo.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  safeSendProgress(65);

  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    const allowed = app.isPackaged ? targetUrl.startsWith('file:') : new URL(targetUrl).origin === allowedRendererOrigin;
    if (!allowed) event.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('blob:')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
        },
      };
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('dom-ready', () => {
    safeSendProgress(75);
  });
  mainWindow.webContents.on('did-finish-load', () => {
    safeSendProgress(85);
    rendererLoaded = true;
    windowReady = true;
    finishStartupIfReady();
  });

  let startupFinished = false;
  let rendererLoaded = false;
  let windowReady = false;
  const finishStartupIfReady = () => {
    if (startupFinished || !rendererLoaded || !windowReady) return;
    startupFinished = true;
    clearTimeout(startupTimeout);
    safeSendProgress(100);
    setTimeout(() => {
      closeSplash();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.maximize();
        mainWindow.show();
      }
    }, 350);
  };
  const startupTimeout = setTimeout(() => {
    if (startupFinished) return;
    startupFinished = true;
    console.error('La ventana principal no estuvo lista dentro del tiempo esperado.');
    safeSendSplashError('No fue posible iniciar la aplicacion. Comprueba que el frontend este disponible.');
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
  }, STARTUP_TIMEOUT_MS);

  mainWindow.once('ready-to-show', () => {
    windowReady = true;
    finishStartupIfReady();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  try {
    if (app.isPackaged) {
      await mainWindow.loadFile(path.join(process.resourcesPath, 'frontend', 'index.html'));
    } else {
      await loadDevelopmentRenderer(mainWindow, rendererUrl);
    }
    rendererLoaded = true;
    finishStartupIfReady();
  } catch (error) {
    if (!startupFinished) {
      startupFinished = true;
      clearTimeout(startupTimeout);
      console.error('No se pudo cargar la ventana principal:', error);
      safeSendSplashError('No fue posible cargar la aplicacion. Comprueba que el frontend este disponible.');
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
    }
  }
}

app.whenReady().then(createWindows).catch((error) => {
  console.error('No se pudo iniciar Electron:', error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindows();
});
