<script setup>
import { onMounted, ref } from 'vue';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuthorizationStore } from '../../stores/authorization';
import { getApiAssetUrl } from '../../services/api';
import { useCotizaciones } from '../../services/cotizaciones/useCotizaciones';
import { cancelarCotizacion, generarFacturaCotizacion, obtenerCotizacion, reactivarCotizacion } from '../../services/cotizaciones';
import { useCotizacionForm } from './js/useCotizacionForm';
import '../../assets/style/cotizaciones/cotizaciones.css';

const auth = useAuthorizationStore();
const { cotizaciones, loading, error, pagination, filtros, cargar, limpiar } = useCotizaciones();
const detail = ref(null);
const formApi = useCotizacionForm(() => cargar());
const {
  visible: formVisible,
  saving: formSaving,
  editingId,
  searchProduct,
  subtotal,
  descuento,
  iva,
  total,
} = formApi;
const money = (value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value || 0));
const date = (value) => value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';
const status = (value) => ['Pendiente', 'Procesada', 'Cancelada'][Number(value)] || 'Desconocida';
const can = (key) => auth.can(key);
const productImage = (product) => {
  const image = product?.imagenes?.find((item) => item?.url);
  return image ? getApiAssetUrl(image.url) : '';
};
const apiError = (e) => Array.isArray(e.response?.data?.message) ? e.response.data.message.join(', ') : (e.response?.data?.message || e.message || 'Ocurrió un error');
async function show(id) { try { detail.value = (await obtenerCotizacion(id)).data; } catch (e) { Swal.fire('Error', apiError(e), 'error'); } }
async function edit(id) { try { formApi.open((await obtenerCotizacion(id)).data); } catch (e) { Swal.fire('Error', apiError(e), 'error'); } }
async function submit() { try { const result = await formApi.save(); Swal.fire('Listo', result.message, 'success'); } catch (e) { Swal.fire('No fue posible guardar', apiError(e), 'error'); } }
async function action(quote, kind) {
  const labels = { cancel: ['Cancelar cotización', 'cancelar', cancelarCotizacion], reactivate: ['Reactivar cotización', 'reactivar', reactivarCotizacion], invoice: ['Generar factura', 'convertir en factura', generarFacturaCotizacion] };
  const [title, verb, request] = labels[kind];
  const confirmed = await Swal.fire({ title, text: `¿Deseas ${verb} ${quote.folioCotizacion}?`, icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, continuar', cancelButtonText: 'Volver' });
  if (!confirmed.isConfirmed) return;
  try { const { data } = await request(quote.id); await cargar(); Swal.fire('Listo', data.message, 'success'); } catch (e) { Swal.fire('Operación rechazada', apiError(e), 'error'); }
}
async function pdf(id) {
  try {
    const q = (await obtenerCotizacion(id)).data, doc = new jsPDF();
    doc.setFontSize(18); doc.text('APARICIO - COTIZACIÓN', 14, 18); doc.setFontSize(10);
    doc.text(`Folio: ${q.folioCotizacion}`, 14, 28); doc.text(`Fecha: ${date(q.fechaCotizacion)}`, 14, 34);
    doc.text(`Cliente: ${q.datosFiscalesSnapshot?.razon_social || '—'}`, 14, 40); doc.text(`RFC: ${q.datosFiscalesSnapshot?.rfc || '—'}`, 14, 46);
    autoTable(doc, { startY: 54, head: [['Código', 'Descripción', 'Cant.', 'Precio', 'Desc.', 'Total']], body: q.detalles.map((x) => [x.codigoProducto, x.nombreProducto, x.cantidad, money(x.precioUnitario), `${x.descuento}%`, money(x.montoTotal)]) });
    const y = doc.lastAutoTable.finalY + 8; doc.text(`Subtotal: ${money(q.subtotal)}`, 145, y); doc.text(`Descuento: ${money(q.descuento)}`, 145, y + 6); doc.text(`IVA: ${money(q.iva)}`, 145, y + 12); doc.text(`Total: ${money(q.total)}`, 145, y + 18); doc.setTextColor(120); doc.text('Documento informativo sin validez fiscal.', 14, y + 28);
    doc.save(`${q.folioCotizacion}.pdf`);
  } catch (e) { Swal.fire('Error', apiError(e), 'error'); }
}
onMounted(() => cargar(1));
</script>

<template>
  <main class="quotes-page">
    <header class="quotes-heading"><div><h1>Cotizaciones</h1><p>Consulta y administra propuestas comerciales</p></div><button v-if="can('cotizaciones.crear')" class="btn btn-primary" @click="formApi.open()"><i class="bi bi-plus-lg"></i> Nueva cotización</button></header>
    <form class="quotes-filters" @submit.prevent="cargar(1)">
      <label>Folio<input v-model.trim="filtros.folio" class="form-control" placeholder="COT-2026-..."></label>
      <label>Cliente<input v-model.trim="filtros.cliente" class="form-control" placeholder="Nombre o razón social"></label>
      <label>Desde<input v-model="filtros.desde" type="date" class="form-control"></label>
      <label>Hasta<input v-model="filtros.hasta" type="date" class="form-control"></label>
      <label>Estado<select v-model="filtros.solicitada" class="form-select"><option value="">Todos</option><option value="0">Pendiente</option><option value="1">Procesada</option><option value="2">Cancelada</option></select></label>
      <div class="filter-actions"><button class="btn btn-primary">Filtrar</button><button type="button" class="btn btn-outline-secondary" @click="limpiar">Limpiar</button></div>
    </form>
    <p v-if="error" class="alert alert-danger">{{ error }}</p>
    <div class="quotes-table-wrap">
      <table class="table quotes-table"><thead><tr><th>Folio</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody><tr v-if="loading"><td colspan="6">Cargando...</td></tr><tr v-else-if="!cotizaciones.length"><td colspan="6" class="empty">No hay cotizaciones para mostrar</td></tr>
          <tr v-for="q in cotizaciones" :key="q.id"><td>{{ q.folioCotizacion }}</td><td>{{ q.datosFiscalesSnapshot?.razon_social || '—' }}</td><td>{{ date(q.fechaCotizacion) }}</td><td>{{ money(q.total) }}</td><td><span :class="['status', `s-${q.solicitada}`]">{{ status(q.solicitada) }}</span></td><td class="actions">
            <button title="Ver" @click="show(q.id)"><i class="bi bi-eye"></i></button><button v-if="can('cotizaciones.imprimir')" title="PDF" @click="pdf(q.id)"><i class="bi bi-file-earmark-pdf"></i></button><button v-if="q.solicitada===0 && can('cotizaciones.editar')" title="Editar" @click="edit(q.id)"><i class="bi bi-pencil"></i></button><button v-if="q.solicitada===0 && can('cotizaciones.generar_factura')" title="Generar factura" @click="action(q,'invoice')"><i class="bi bi-receipt"></i></button><button v-if="q.solicitada===0 && can('cotizaciones.cancelar')" title="Cancelar" @click="action(q,'cancel')"><i class="bi bi-x-circle"></i></button><button v-if="q.solicitada===2 && can('cotizaciones.reactivar')" title="Reactivar" @click="action(q,'reactivate')"><i class="bi bi-arrow-counterclockwise"></i></button>
          </td></tr></tbody></table>
    </div>
    <footer class="pagination"><span>Página {{ pagination.page }} de {{ pagination.lastPage }} · {{ pagination.total }} registros</span><div><button class="btn btn-sm btn-outline-secondary" :disabled="pagination.page<=1" @click="cargar(pagination.page-1)">Anterior</button><button class="btn btn-sm btn-outline-secondary" :disabled="pagination.page>=pagination.lastPage" @click="cargar(pagination.page+1)">Siguiente</button></div></footer>

    <div v-if="formVisible" class="quote-overlay" @click.self="formVisible=false"><section class="quote-modal"><header><div><h2>{{ editingId ? 'Editar cotización' : 'Nueva cotización' }}</h2><p>Completa los datos y conceptos</p></div><button class="modal-close" @click="formVisible=false">×</button></header><div class="quote-modal-body">
      <section class="quote-form-section"><h3>Datos generales y vendedor</h3><div class="form-grid">
        <label>Vendedor *<div class="autocomplete"><input v-model="formApi.form.vendedorTexto" class="form-control" autocomplete="off" @input="formApi.findSellers" @keydown.enter.prevent="formApi.suggestions.vendedores[0] && formApi.selectSeller(formApi.suggestions.vendedores[0])"><ul v-if="formApi.suggestions.vendedores.length"><li v-for="x in formApi.suggestions.vendedores" :key="x.id" @click="formApi.selectSeller(x)">{{ x.nombre }} · {{ x.email }}</li></ul></div><small>Se selecciona automáticamente el usuario conectado; puedes cambiarlo.</small></label>
        <label>Folio especial<input v-model.trim="formApi.form.folioEspecial" class="form-control"></label><label>Almacén *<input v-model.trim="formApi.form.almacen" class="form-control" placeholder="Escribe el almacén"></label><label>Método de pago<select v-model="formApi.form.metodoPago" class="form-select"><option value="Efectivo">Efectivo</option><option value="Transferencia">Transferencia</option></select></label><label>Vigencia<input v-model="formApi.form.fechaVigencia" type="date" class="form-control"></label><label>Entrega<input v-model="formApi.form.fechaEntrega" type="date" class="form-control"></label><label class="check"><input v-model="formApi.form.credito" type="checkbox"> Venta a crédito</label>
      </div></section>
      <section class="quote-form-section"><h3>Datos del cliente</h3><label class="client-search">Buscar cliente *<div class="autocomplete"><input v-model="formApi.form.clienteTexto" class="form-control" placeholder="Escribe el nombre del cliente" autocomplete="off" @input="formApi.findClients" @keydown.enter.prevent="formApi.suggestions.clientes[0] && formApi.selectClient(formApi.suggestions.clientes[0])"><ul v-if="formApi.suggestions.clientes.length"><li v-for="x in formApi.suggestions.clientes" :key="x.id" @click="formApi.selectClient(x)"><strong>{{ x.nombre }}</strong> · {{ x.datosFiscales?.rfc || 'Sin datos fiscales' }}</li></ul></div></label>
        <div class="client-data-grid"><label>Razón social<input :value="formApi.form.clienteDatos.razonSocial" class="form-control" readonly></label><label>RFC<input :value="formApi.form.clienteDatos.rfc" class="form-control" readonly></label><label>Tipo de persona<input :value="formApi.form.clienteDatos.tipoPersona" class="form-control" readonly></label><label>Código postal<input :value="formApi.form.clienteDatos.codigoPostal" class="form-control" readonly></label><label>Régimen fiscal<input :value="formApi.form.clienteDatos.regimenFiscal" class="form-control" readonly></label><label>Uso CFDI<input :value="formApi.form.clienteDatos.usoCfdi" class="form-control" readonly></label><label>Correo<input :value="formApi.form.clienteDatos.correo" class="form-control" readonly></label><label>Teléfono<input :value="formApi.form.clienteDatos.telefono" class="form-control" readonly></label><label class="wide">Dirección<input :value="formApi.form.clienteDatos.direccion" class="form-control" readonly></label><label>Colonia<input :value="formApi.form.clienteDatos.colonia" class="form-control" readonly></label><label>Población<input :value="formApi.form.clienteDatos.poblacion" class="form-control" readonly></label></div>
      </section>
      <section class="quote-form-section"><h3>Observaciones</h3><textarea v-model.trim="formApi.form.observaciones" class="form-control" rows="3" placeholder="Notas o condiciones de la cotización"></textarea></section>
      <section class="concepts quote-form-section"><h3>Productos</h3><div class="product-picker-layout"><div class="autocomplete product-search"><input v-model="searchProduct" class="form-control" placeholder="Buscar por código o descripción" autocomplete="off" @input="formApi.findProducts" @keydown.enter.prevent="formApi.suggestions.productos[0] && formApi.addProduct(formApi.suggestions.productos[0])"><ul v-if="formApi.suggestions.productos.length"><li v-for="x in formApi.suggestions.productos" :key="x.id" @click="formApi.addProduct(x)"><img v-if="productImage(x)" :src="productImage(x)" alt=""><span><strong>{{ x.codigo }}</strong> {{ x.descripcion }} · Stock {{ x.existencia }} · {{ money(x.precio) }}</span></li></ul></div>
        <div class="product-gallery"><article v-for="x in formApi.form.conceptos" :key="`image-${x.productoId}`"><div class="product-photo"><img v-if="productImage(x)" :src="productImage(x)" :alt="x.descripcion"><i v-else class="bi bi-image" aria-hidden="true"></i></div><span>{{ x.codigo }}</span></article><p v-if="!formApi.form.conceptos.length">Las imágenes de los productos agregados aparecerán aquí. Los productos sin imagen también pueden agregarse.</p></div></div>
        <div class="quotes-table-wrap"><table class="table"><thead><tr><th>Código</th><th>Descripción</th><th>Precio</th><th>Cantidad</th><th>Desc. %</th><th>Total</th><th></th></tr></thead><tbody><tr v-for="(x,i) in formApi.form.conceptos" :key="x.productoId"><td>{{ x.codigo }}</td><td>{{ x.descripcion }}</td><td>{{ money(x.precio) }}</td><td><input v-model.number="x.cantidad" type="number" min="1" :max="x.existencia" class="form-control compact"></td><td><input v-model.number="x.descuento" type="number" min="0" max="100" class="form-control compact"></td><td>{{ money(x.precio*x.cantidad*(1-x.descuento/100)*1.16) }}</td><td><button class="remove" @click="formApi.form.conceptos.splice(i,1)">×</button></td></tr></tbody></table></div>
      </section><aside class="totals"><span>Subtotal <b>{{ money(subtotal) }}</b></span><span>Descuento <b>- {{ money(descuento) }}</b></span><span>IVA (16%) <b>{{ money(iva) }}</b></span><span class="grand">Total <b>{{ money(total) }}</b></span></aside>
    </div><footer><button class="btn btn-outline-secondary" @click="formVisible=false">Cerrar</button><button class="btn btn-primary" :disabled="formSaving" @click="submit">{{ formSaving ? 'Guardando...' : 'Guardar cotización' }}</button></footer></section></div>

    <div v-if="detail" class="quote-overlay" @click.self="detail=null"><section class="quote-modal detail-modal"><header><div><h2>{{ detail.folioCotizacion }}</h2><p>Detalle de cotización</p></div><button class="modal-close" @click="detail=null">×</button></header><div class="quote-modal-body"><div class="detail-grid"><p><b>Cliente</b><br>{{ detail.datosFiscalesSnapshot?.razon_social }}</p><p><b>RFC</b><br>{{ detail.datosFiscalesSnapshot?.rfc }}</p><p><b>Fecha</b><br>{{ date(detail.fechaCotizacion) }}</p><p><b>Estado</b><br>{{ status(detail.solicitada) }}</p></div><div class="quotes-table-wrap"><table class="table"><thead><tr><th>Código</th><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr></thead><tbody><tr v-for="x in detail.detalles" :key="x.id"><td>{{ x.codigoProducto }}</td><td>{{ x.nombreProducto }}</td><td>{{ x.cantidad }}</td><td>{{ money(x.precioUnitario) }}</td><td>{{ money(x.montoTotal) }}</td></tr></tbody></table></div><aside class="totals"><span>Total <b>{{ money(detail.total) }}</b></span></aside></div><footer><button class="btn btn-primary" @click="detail=null">Cerrar</button></footer></section></div>
  </main>
</template>
