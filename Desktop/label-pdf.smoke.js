const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');
const { generarHTML } = require('./lable');

const outputDirectory = path.join(__dirname, 'tmp', 'pdfs');
const labels = [
  { codigo: 'ABC-123', nombre: 'Balata delantera premium', descripcion: 'Compatible con varios modelos; descripción de prueba', precio: '1299.90', adicional: 'Unidad 1 de 2' },
  { codigo: 'ABC-123', nombre: 'Balata delantera premium', descripcion: 'Compatible con varios modelos; descripción de prueba', precio: '1299.90', adicional: 'Unidad 2 de 2' },
  { codigo: '<XSS-TEST>', nombre: 'Filtro & aceite', descripcion: '<script>no ejecutar</script>', precio: '89.50' },
];
const formats = [
  ['50x25', 50, 25], ['50x30', 50, 30], ['60x40', 60, 40], ['100x50', 100, 50], ['custom-75.5x33.2', 75.5, 33.2],
];

app.whenReady().then(async () => {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const window = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
  try {
    for (const [name, anchoMm, altoMm] of formats) {
      const generated = generarHTML(labels, { anchoMm, altoMm, margenMm: 0, paddingMm: 2, fuentePt: 9, orientacion: 'horizontal' });
      const temporaryFile = path.join(os.tmpdir(), `aparicio-label-smoke-${randomUUID()}.html`);
      fs.writeFileSync(temporaryFile, generated.html, 'utf8');
      try {
        await window.loadFile(temporaryFile);
      }
      finally {
        fs.rmSync(temporaryFile, { force: true });
      }
      const pdf = await window.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, margins: { top: 0, bottom: 0, left: 0, right: 0 } });
      fs.writeFileSync(path.join(outputDirectory, `${name}.pdf`), pdf);
    }
  } finally {
    window.destroy();
  }
  app.quit();
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
