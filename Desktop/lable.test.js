const test = require('node:test');
const assert = require('node:assert/strict');
const { generarHTML, validarConfiguracion } = require('./lable');

const label = { codigo: 'ABC-123', nombre: 'Producto de prueba', descripcion: 'Descripción corta', precio: '99.90' };
const config = (anchoMm, altoMm) => ({ anchoMm, altoMm, margenMm: 0, paddingMm: 2, fuentePt: 9, orientacion: 'horizontal' });

for (const [width, height] of [[50, 25], [50, 30], [60, 40], [100, 50], [75.5, 33.2]]) {
  test(`genera CSS físico ${width} x ${height} mm`, () => {
    const result = generarHTML([label], config(width, height));
    assert.match(result.html, new RegExp(`size:${width}mm ${height}mm`));
    assert.equal(result.total, 1);
  });
}

test('la orientación vertical intercambia las dimensiones físicas', () => {
  const result = generarHTML([label], { ...config(60, 40), orientacion: 'vertical' });
  assert.match(result.html, /size:40mm 60mm/);
});

test('rechaza medidas inválidas, negativas, NaN e Infinity', () => {
  for (const value of [-1, NaN, Infinity, '', 'texto']) assert.throws(() => validarConfiguracion({ ...config(50, 25), anchoMm: value }));
});

test('rechaza margen y padding que consumen el área', () => {
  assert.throws(() => validarConfiguracion({ ...config(15, 10), margenMm: 6 }));
  assert.throws(() => validarConfiguracion({ ...config(20, 15), paddingMm: 8 }));
});

test('escapa contenido HTML y conserva código y precio', () => {
  const result = generarHTML([{ codigo: '<script>x</script>', nombre: 'A&B', descripcion: '"texto"', precio: '<9>' }], config(50, 25));
  assert.doesNotMatch(result.html, /<script>/);
  assert.match(result.html, /&lt;script&gt;/);
  assert.match(result.html, /A&amp;B/);
  assert.match(result.html, /\$&lt;9&gt;/);
});

test('genera una sección por unidad sin página extra', () => {
  const labels = Array.from({ length: 5 }, (_, index) => ({ ...label, codigo: `P-${index}` }));
  const result = generarHTML(labels, config(50, 30));
  assert.equal((result.html.match(/<section class=/g) || []).length, 5);
  assert.match(result.html, /\.etiqueta:last-child\{break-after:auto;page-break-after:auto\}/);
});

test('avisa por contenido largo en formato pequeño', () => {
  const result = generarHTML([{ ...label, nombre: 'N'.repeat(200), descripcion: 'D'.repeat(300) }], config(50, 25));
  assert.ok(result.warnings.length > 0);
  assert.doesNotMatch(result.html, /CONTENIDO AJUSTADO/);
});

test('reserva la cabecera preimpresa y aplica el diseño claro de Aparicio', () => {
  const result = generarHTML([label], config(50, 25));
  assert.match(result.html, /class="marca-reservada"/);
  assert.doesNotMatch(result.html, />APARICIO</);
  assert.match(result.html, /background:#FFFFFF/);
  assert.match(result.html, /nombre\{color:#292D32;font-weight:800/);
  assert.match(result.html, /precio\{color:#D71920;font-weight:900/);
  assert.doesNotMatch(result.html, /border-top/);
});
