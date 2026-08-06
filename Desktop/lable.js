function generarHTML(etiquetas) {
  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  return `
    <html>
      <head>
        <style>

          * {
            box-sizing: border-box;
          }

          @page {
            size: 50mm 25mm;
            margin: 0;
          }

          html,
          body {

            margin: 0;
            padding: 0;

            font-family: Arial, sans-serif;
          }

          .etiqueta {

            width: 50mm;
            height: 25mm;

            padding: 2mm;

            display: flex;
            flex-direction: column;
            justify-content: center;

            overflow: hidden;

            break-after: page;
          }

          .etiqueta:last-child {
            break-after: auto;
          }

          .codigo {
            font-weight: bold;
          }

        </style>
      </head>

      <body>
        ${etiquetas.map(item => `
          <div class="etiqueta">

            <div>Producto: ${escapeHtml(item.numero)}</div>

            <div class="codigo">
              ${escapeHtml(item.codigo)}
            </div>

            <div>
              ${escapeHtml(item.nombre)}
            </div>

            <div>
              $${escapeHtml(item.precio)}
            </div>

          </div>
        `).join('')}
      </body>
    </html>
  `;
}

module.exports = { generarHTML };
