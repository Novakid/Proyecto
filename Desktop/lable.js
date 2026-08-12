const LIMITS = Object.freeze({ anchoMm: [15, 210], altoMm: [10, 297], margenMm: [0, 10], paddingMm: [0, 10], fuentePt: [5, 30] });
const DEFAULT_CONFIG = Object.freeze({ anchoMm: 50, altoMm: 25, margenMm: 0, paddingMm: 2, fuentePt: 9, orientacion: 'horizontal' });

function finiteInRange(value, field) {
  const number = typeof value === 'number' ? value : Number(value);
  const [min, max] = LIMITS[field];
  if (!Number.isFinite(number) || number < min || number > max) throw new Error(`${field} debe estar entre ${min} y ${max}`);
  return number;
}

function validarConfiguracion(config = {}) {
  const validated = {
    anchoMm: finiteInRange(config.anchoMm, 'anchoMm'), altoMm: finiteInRange(config.altoMm, 'altoMm'),
    margenMm: finiteInRange(config.margenMm, 'margenMm'), paddingMm: finiteInRange(config.paddingMm, 'paddingMm'),
    fuentePt: finiteInRange(config.fuentePt, 'fuentePt'),
    orientacion: config.orientacion === 'vertical' ? 'vertical' : config.orientacion === 'horizontal' ? 'horizontal' : null,
  };
  if (!validated.orientacion) throw new Error('orientacion debe ser horizontal o vertical');
  if (validated.margenMm * 2 >= validated.anchoMm || validated.margenMm * 2 >= validated.altoMm) throw new Error('El margen consume todo el espacio imprimible');
  const printableWidth = validated.anchoMm - validated.margenMm * 2;
  const printableHeight = validated.altoMm - validated.margenMm * 2;
  if (validated.paddingMm * 2 >= printableWidth || validated.paddingMm * 2 >= printableHeight) throw new Error('El padding consume todo el espacio de la etiqueta');
  return validated;
}

const escapeHtml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const cleanText = (value, max) => String(value ?? '').trim().slice(0, max);

function analizarContenido(etiqueta, config) {
  const usableArea = (config.anchoMm - config.margenMm * 2 - config.paddingMm * 2) * (config.altoMm - config.margenMm * 2 - config.paddingMm * 2);
  const textLoad = etiqueta.codigo.length * 1.4 + etiqueta.nombre.length + etiqueta.descripcion.length * 0.65 + etiqueta.precio.length;
  const compact = usableArea < 1300;
  const warning = textLoad * config.fuentePt > usableArea * 1.35;
  return { compact, warning };
}

function generarHTML(etiquetas, configuration = DEFAULT_CONFIG) {
  if (!Array.isArray(etiquetas) || !etiquetas.length) throw new Error('Se requiere al menos una etiqueta');
  const config = validarConfiguracion(configuration);
  const pageWidth = config.orientacion === 'vertical' ? config.altoMm : config.anchoMm;
  const pageHeight = config.orientacion === 'vertical' ? config.anchoMm : config.altoMm;
  const reservedBrandHeight = Math.min(10, Math.max(4, pageHeight * 0.18));
  const normalized = etiquetas.map((item) => ({
    codigo: cleanText(item.codigo, 100), nombre: cleanText(item.nombre, 200),
    descripcion: cleanText(item.descripcion, 300), precio: cleanText(item.precio, 50),
    adicional: cleanText(item.adicional, 100),
  }));
  const warnings = normalized.map((item, index) => analizarContenido(item, config).warning ? `La etiqueta ${index + 1} podría requerir un tamaño mayor` : null).filter(Boolean);
  const pages = normalized.map((item) => {
    const analysis = analizarContenido(item, config);
    return `<section class="etiqueta${analysis.compact ? ' compacta' : ''}${analysis.warning ? ' advertencia-ajuste' : ''}">
      <div class="marca-reservada" aria-hidden="true"></div>
      <div class="contenido">
        <div class="nombre">${escapeHtml(item.nombre)}</div>
        <div class="codigo"><span>Código:</span> ${escapeHtml(item.codigo)}</div>
        ${item.descripcion ? `<div class="descripcion">${escapeHtml(item.descripcion)}</div>` : ''}
        ${item.adicional ? `<div class="adicional">${escapeHtml(item.adicional)}</div>` : ''}
        <div class="precio">$${escapeHtml(item.precio)}</div>
      </div>
    </section>`;
  }).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box} @page{size:${pageWidth}mm ${pageHeight}mm;margin:${config.margenMm}mm}
    html,body{margin:0;padding:0;font-family:Arial,sans-serif;background:#FFFFFF} body{font-size:${config.fuentePt}pt}
    .etiqueta{width:${pageWidth - config.margenMm * 2}mm;height:${pageHeight - config.margenMm * 2}mm;padding:0 ${config.paddingMm}mm ${config.paddingMm}mm;background:#FFFFFF;color:#292D32;display:flex;flex-direction:column;overflow:hidden;break-after:page;page-break-after:always;overflow-wrap:anywhere;line-height:1.08}
    .etiqueta:last-child{break-after:auto;page-break-after:auto}.marca-reservada{height:${reservedBrandHeight}mm;min-height:${reservedBrandHeight}mm;flex:none}.contenido{min-height:0;flex:1;display:flex;flex-direction:column;position:relative;padding-top:.8mm}.nombre{color:#292D32;font-weight:800;text-transform:uppercase;letter-spacing:.025em;max-height:2.2em;overflow:hidden;flex:none}.codigo{color:#6B7280;font-size:.78em;flex:none;margin-top:.25em}.codigo span{color:#6B7280}.precio{color:#D71920;font-weight:900;font-size:1.35em;line-height:1;text-align:right;margin-top:auto;flex:none}.descripcion{color:#6B7280;font-size:.72em;max-height:1.1em;overflow:hidden;margin-top:.2em}.adicional{color:#6B7280;font-size:.68em;max-height:1.1em;overflow:hidden}.compacta .descripcion,.compacta .adicional{display:none}
  </style></head><body>${pages}</body></html>`;
  return { html, warnings, config, total: normalized.length };
}

module.exports = { DEFAULT_CONFIG, LIMITS, validarConfiguracion, generarHTML, escapeHtml };
