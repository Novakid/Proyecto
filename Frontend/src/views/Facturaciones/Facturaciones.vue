<script setup>
import { onMounted, ref, computed } from 'vue';
import { Dropdown, Modal } from 'bootstrap';
import '../../assets/style/facturacion/facturacion.css';
import { useFacturas } from '../../services/facturacion/useFacturas';
import { useFacturasForm } from './js/Facturaciones';
import { useAuthorizationStore } from '../../stores/authorization';
import Swal from 'sweetalert2';
const { facturas, pagination, filtros, errorFacturas, cargarFacturas, aplicarFiltros, limpiarFiltros, obtener, cancelar, timbrar } = useFacturas();
const { formatearFecha, formatearFechaHora, busqueda, form, abrirModal, productosEncontrados, buscandoProductos, indiceProductoActivo, buscarProductos, teclaProducto, cerrarSugerenciasProductos, productosFactura, agregarProducto, subtotalBruto, descuentoTotal, iva, total, formatoMoneda, construirFactura, generarPDF, previewEtiquetas, buscarVendedores, buscarClientes, seleccionarClientePorNombre, clientesFiltrados, vendedoresFiltrados, mensajeFactura, imagenProducto, editingId, cargarEdicion, cargandoCliente, errorFiscalCliente, datosFiscalesCliente } = useFacturasForm();
const detalleFactura = ref(null);
const authorization = useAuthorizationStore();
const can = (permission) => authorization.can(permission);
const mensajeAccion = ref('');
const facturaEtiquetas = ref(null);
const procesandoEtiquetas = ref(false);
const timbrandoId = ref(null);
const errorEtiquetas = ref('');
const avisosEtiquetas = ref([]);
const labelPresets = {
  '50x25': { anchoMm: 50, altoMm: 25 }, '50x30': { anchoMm: 50, altoMm: 30 },
  '60x40': { anchoMm: 60, altoMm: 40 }, '100x50': { anchoMm: 100, altoMm: 50 }
};
const savedLabelConfig = (() => { try { return JSON.parse(localStorage.getItem('label_print_config') || 'null'); } catch { return null; } })();
const labelConfig = ref(savedLabelConfig || { preset: '50x25', anchoMm: 50, altoMm: 25, margenMm: 0, paddingMm: 2, fuentePt: 9, orientacion: 'horizontal' });
const totalEtiquetas = computed(() => (facturaEtiquetas.value?.conceptos || []).reduce((sum, item) => sum + Number(item.cantidad || 0), 0));
onMounted(async () => {
  await cargarFacturas();
});
const verDetalles = async (item) => {
  detalleFactura.value = await obtener(item.id);
  Modal.getOrCreateInstance(document.getElementById('modalDetalles')).show();
};
const editarFactura = async (item) => {
  if (item.fecha_cancelado) return;
  const completa = await obtener(item.id);
  await cargarEdicion(completa);
  Modal.getOrCreateInstance(document.getElementById('modalCrear')).show();
};
const cancelarFactura = async (item) => {
  if (!window.confirm(`¿Cancelar la factura ${item.folio_cliente}? El inventario será restaurado.`)) return;
  try { await cancelar(item.id); await cargarFacturas(); }
  catch (error) { mensajeAccion.value = error.response?.data?.message || 'No fue posible cancelar la factura'; }
};
const guardarFactura = async () => {
  mensajeAccion.value = '';
  try { await construirFactura(); Modal.getInstance(document.getElementById('modalCrear'))?.hide(); }
  catch (error) { mensajeAccion.value = error.response?.data?.message || error.message || 'No fue posible guardar'; }
};
const pdfCompleto = async (item) => generarPDF(await obtener(item.id));
const abrirConfiguracionEtiquetas = async (item) => {
  errorEtiquetas.value = ''; avisosEtiquetas.value = [];
  try {
    facturaEtiquetas.value = await obtener(item.id);
    Modal.getOrCreateInstance(document.getElementById('modalEtiquetas')).show();
  } catch (error) { mensajeAccion.value = error.response?.data?.message || 'No fue posible cargar los productos de la factura'; }
};
const timbrarSimulado = async (item) => {
  if (timbrandoId.value || item.fecha_cancelado || Number(item.timbrada) === 1) return;
  const result = await Swal.fire({
    icon: 'question', title: '¿Marcar esta factura como timbrada?',
    text: 'Esta acción únicamente actualizará el estado interno de la factura. No se enviará al SAT ni se generará un CFDI fiscal.',
    showCancelButton: true, confirmButtonText: 'Sí, marcar como timbrada', cancelButtonText: 'Cancelar'
  });
  if (!result.isConfirmed) return;
  timbrandoId.value = item.id;
  try {
    const { data } = await timbrar(item.id);
    item.timbrada = 1; item.fecha_timbrado = data.fecha_timbrado; item.estatus = 'timbrada';
    await Swal.fire('Factura marcada como timbrada correctamente.', 'Registro interno; documento sin validez fiscal.', 'success');
  } catch (error) {
    await Swal.fire('No fue posible marcar la factura', error.response?.data?.message || 'Error de conexión', 'error');
  } finally { timbrandoId.value = null; }
};
const aplicarPresetEtiqueta = () => {
  const preset = labelPresets[labelConfig.value.preset];
  if (preset) Object.assign(labelConfig.value, preset);
};
const validarLabelConfig = () => {
  const c = labelConfig.value;
  const rules = [['anchoMm', 15, 210], ['altoMm', 10, 297], ['margenMm', 0, 10], ['paddingMm', 0, 10], ['fuentePt', 5, 30]];
  for (const [field, min, max] of rules) if (!Number.isFinite(Number(c[field])) || Number(c[field]) < min || Number(c[field]) > max) throw new Error(`${field} debe estar entre ${min} y ${max}`);
  if (Number(c.margenMm) * 2 >= Number(c.anchoMm) || Number(c.margenMm) * 2 >= Number(c.altoMm)) throw new Error('El margen consume todo el espacio imprimible');
  if (Number(c.paddingMm) * 2 >= Number(c.anchoMm) - Number(c.margenMm) * 2 || Number(c.paddingMm) * 2 >= Number(c.altoMm) - Number(c.margenMm) * 2) throw new Error('El padding consume todo el espacio de la etiqueta');
};
const abrirPreviewEtiquetas = async () => {
  procesandoEtiquetas.value = true; errorEtiquetas.value = ''; avisosEtiquetas.value = [];
  try {
    validarLabelConfig();
    const config = { anchoMm: Number(labelConfig.value.anchoMm), altoMm: Number(labelConfig.value.altoMm), margenMm: Number(labelConfig.value.margenMm), paddingMm: Number(labelConfig.value.paddingMm), fuentePt: Number(labelConfig.value.fuentePt), orientacion: labelConfig.value.orientacion };
    localStorage.setItem('label_print_config', JSON.stringify({ ...config, preset: labelConfig.value.preset }));
    const result = await previewEtiquetas(facturaEtiquetas.value, config);
    avisosEtiquetas.value = result?.warnings || [];
  } catch (error) { errorEtiquetas.value = error.message || 'No fue posible abrir la vista previa'; }
  finally { procesandoEtiquetas.value = false; }
};
const toggleActions = (event) => Dropdown.getOrCreateInstance(event.currentTarget).toggle();
const facturasHoy = computed(() => {
  const hoy = new Date().toISOString().split('T')[0];
  return facturas.value.filter(f => {
    const fechaFactura = new Date(f.fecha_emision).toISOString().split('T')[0];
    return fechaFactura === hoy;
  });
});
const facturasPorTimbrar = computed(() => {
  return facturas.value.filter(
    f => !f.fecha_cancelado && Number(f.timbrada ?? 0) === 0
  );
});
</script>
<template>
  <div class="col-md-12 mb-3 container-fluid p-4">
      <!-- HEADER -->
      <div class="page-header d-flex justify-content-between align-items-center gap-2">
          <h4 class="mb-0">Gestión de facturas</h4>
          <div class="page-summary d-flex gap-4">
              <span>Facturas hoy: <strong class="text-success">{{ facturasHoy.length }}</strong></span>
              <span>Por timbrar: <strong class="text-warning">{{ facturasPorTimbrar.length }}</strong></span>
          </div>
      </div>
      <div class="card mt-3 shadow-sm border-0">
          <div class="card-body">
              <button v-if="can('facturacion.crear')" @click="abrirModal" class="btn btn-primary btn-md" data-bs-toggle="modal" data-bs-target="#modalCrear">Crear factura</button>
          </div>
          <form class="card-body" @submit.prevent="aplicarFiltros">
              <div class="row g-2 align-items-end">
                  <div class="col-md-3">
                      <label class="form-label">Folio</label>
                      <input v-model="filtros.folio" type="text" class="form-control form-control-sm" placeholder="Folio: XXX-XXX-XXX..">
                  </div>
                  <div class="col-md-3">
                      <label class="form-label">Desde</label>
                      <input v-model="filtros.desde" type="date" class="form-control form-control-sm">
                  </div>
                  <div class="col-md-3">
                      <label class="form-label">Hasta</label>
                      <input v-model="filtros.hasta" type="date" class="form-control form-control-sm">
                  </div>
                  <div class="col-md-3">
                      <label class="form-label">Monto</label>
                      <input v-model.number="filtros.monto" type="number" min="0" step="0.01" class="form-control form-control-sm" placeholder="$ 100.00">
                  </div>
              </div>
              <div class="row g-2 align-items-end">
                  <div class="col-md-3">
                      <label class="form-label">Nombre del Cliente</label>
                      <input v-model="filtros.cliente" type="text" class="form-control form-control-sm" placeholder="Ricardo..">
                  </div>
                  <div class="col-md-3">
                      <label class="form-label">Estatus</label>
                      <select v-model="filtros.estatus" class="form-control form-control-sm">
                          <option value="">Todos</option>
                          <option value="activa">Activa</option>
                          <option value="cancelada">Cancelada</option>
                      </select>
                  </div>
                  <div class="col-md-2">
                      <button type="submit" class="btn btn-primary btn-sm w-100">
                          Filtrar
                      </button>
                  </div>
                  <div class="col-md-2"><button type="button" @click="limpiarFiltros" class="btn btn-outline-secondary btn-sm w-100">Limpiar</button></div>
              </div>
          </form>
      </div>
      <!-- TABLA -->
      <div class="mt-3 facturas-table">
          <div class="table-responsive"><table class="table table-hover align-middle custom-table">
              <thead class="table-dark">
                  <tr>
                      <th>Folio</th>
                      <th>Cliente</th>
                      <th>Fecha de emisión</th>
                      <th>Fecha de entrega</th>
                      <th>Credito</th>
                      <th>Monto</th>
                      <th>Estatus</th>
                      <th class="text-center">Acciones</th>
                  </tr>
              </thead>
              <tbody>
                  <tr v-for="item in facturas" :key="item.id">
                      <td>
                        <span class="d-block fw-semibold">{{ item.folio_cliente }}</span>
                        <small v-if="item.folio_especial" class="text-muted">Especial: {{ item.folio_especial }}</small>
                      </td>
                      <td>{{ item.razon_social }}</td>
                      <td>{{ formatearFechaHora(item.fecha_emision) }}</td>
                      <td>{{ item.fecha_entrega }}</td>
                      <td>{{ Number(item.credito) === 1 ? 'Sí' : 'No' }}</td>
                      <td>{{ item.total }}</td>
                      <td>{{ item.fecha_cancelado ? 'Cancelada' : (Number(item.timbrada ?? 0) === 1 ? 'Timbrada' : 'Pendiente') }}</td>
                      <td class="text-center">
                          <div class="d-flex justify-content-center gap-2">
                              <button v-if="can('facturacion.timbrar') && !item.fecha_cancelado && Number(item.timbrada ?? 0) !== 1" @click="timbrarSimulado(item)" :disabled="timbrandoId === item.id" class="btn btn-sm btn-outline-success" title="Timbrado simulado">
                              <i class="bi bi-bell"></i>
                              </button>
                              <button v-if="can('facturacion.imprimir')" @click="pdfCompleto(item)" class="btn btn-sm btn-outline-danger" title="Ver PDF">
                                <i class="bi bi-file-earmark-pdf"></i>
                              </button>
                              <button v-if="can('facturacion.imprimir')" @click="abrirConfiguracionEtiquetas(item)" class="btn btn-sm btn-outline-primary" title="Imprimir etiquetas">
                                <i class="bi bi-upc-scan"></i>
                              </button>
                              <div class="dropdown">
                                  <button @click="toggleActions" class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                                    <i class="bi bi-justify"></i>
                                  </button>
                                  <ul class="dropdown-menu dropdown-menu-end">
                                      <li>
                                      <a v-if="can('facturacion.editar')" @click.prevent="editarFactura(item)" :class="{ disabled: item.fecha_cancelado }" class="dropdown-item" href="#">
                                          <i class="bi bi-pencil me-2"></i> Editar
                                      </a>
                                      </li>
                                      <li>
                                      <a v-if="can('facturacion.cancelar')" @click.prevent="cancelarFactura(item)" :class="{ disabled: item.fecha_cancelado }" class="dropdown-item text-danger" href="#">
                                          <i class="bi bi-x-circle me-2"></i> Cancelar
                                      </a>
                                      </li>
                                      <li>
                                      <a @click.prevent="verDetalles(item)" class="dropdown-item" href="#">
                                          <i class="bi bi-eye me-2"></i> Detalles
                                      </a>
                                      </li>
                                  </ul>
                              </div>
                          </div>
                      </td>
                  </tr>
              </tbody>
          </table></div>
          <div v-if="errorFacturas || mensajeAccion" class="alert alert-warning">{{ errorFacturas || mensajeAccion }}</div>
          <nav class="d-flex justify-content-center align-items-center gap-3">
            <button class="btn btn-outline-secondary btn-sm" :disabled="pagination.page <= 1" @click="cargarFacturas(pagination.page - 1)">Anterior</button>
            <span>Página {{ pagination.page }} de {{ pagination.lastPage }}</span>
            <button class="btn btn-outline-secondary btn-sm" :disabled="pagination.page >= pagination.lastPage" @click="cargarFacturas(pagination.page + 1)">Siguiente</button>
          </nav>
      </div>
  </div>
    <!-- MODAL CREACIÓN FACTURA -->
  <div class="modal fade" id="modalCrear" data-bs-backdrop="static" data-bs-keyboard="false">
    <div class="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable modal-editado">
      <div class="modal-content">
        <!-- HEADER -->
        <div class="modal-header">
          <h5 class="modal-title">{{ editingId ? 'Editar factura' : 'Crear factura' }}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <!-- BODY -->
        <div class="modal-body">
          <div class="container-fluid">
            <div class="row">
              <!-- IZQUIERDA -->
              <div class="col-md-9">
                <!-- DATOS GENERALES -->
                <div class="card shadow-sm mb-3">
                  <div class="card-header">Datos generales</div>
                  <div class="card-body">
                    <div class="row g-3">
                      <div class="col-md-3">
                        <label for="folioClienteFactura">Folio</label>
                        <input id="folioClienteFactura" type="text" class="form-control" readonly :value="form.folioCliente || 'Se generará al guardar'">
                        <div class="form-text">Asignado automáticamente por el sistema.</div>
                      </div>
                      <div class="col-md-3">
                        <label for="folioEspecialFactura">Folio especial <span class="text-muted">(opcional)</span></label>
                        <input id="folioEspecialFactura" v-model="form.folioEspecial" type="text" maxlength="100" class="form-control" placeholder="Ingrese un folio especial (opcional)">
                      </div>
                      <div class="col-md-2">
                        <label>Fecha</label>
                        <input type="date" class="form-control" v-model="form.fecha">
                      </div>
                      <div class="col-md-2">
                        <label>Vendedor</label>
              <input
                  class="form-control"
                  list="listaVendedores"
                  v-model="form.vendedor"
                  @input="buscarVendedores"
                  autocomplete="off"
              >

              <datalist id="listaVendedores">
                  <option
                      v-for="usuario in vendedoresFiltrados"
                      :key="usuario.id"
                      :value="usuario.Nombre"
                  />
              </datalist>
                      </div>
                      <div class="col-md-2">
                        <label>Almacén</label>
                        <input type="text" class="form-control" v-model="form.almacen">
                      </div>
                    </div>
                  </div>
                </div>
                <!-- CLIENTE -->
                <div class="card shadow-sm mb-3">
                  <div class="card-header">Cliente</div>
                  <div class="card-body">
                    <div class="row g-3">
                      <div class="col-md-4">
                        <label>Nombre / Razón social</label>
                        <input type="text" class="form-control" list="listaClientesFactura" v-model="form.cliente.nombre" @input="buscarClientes" @change="seleccionarClientePorNombre">
                        <datalist id="listaClientesFactura"><option v-for="cliente in clientesFiltrados" :key="cliente.id" :value="cliente.Nombre" /></datalist>
                      </div>
                      <div class="col-md-4">
                        <label>RFC</label>
                        <input type="text" class="form-control" v-model="form.cliente.rfc" readonly>
                      </div>
                      <div class="col-md-4">
                        <label>Dirección</label>
                        <input type="text" class="form-control" v-model="form.cliente.direccion">
                      </div>
                      <div class="col-md-3">
                        <label>Colonia</label>
                        <input type="text" class="form-control" v-model="form.cliente.colonia">
                      </div>
                      <div class="col-12">
                        <div v-if="cargandoCliente" class="alert alert-info py-2 mb-0">Cargando datos fiscales…</div>
                        <div v-else-if="errorFiscalCliente" class="alert alert-warning py-2 mb-0">{{ errorFiscalCliente }}</div>
                        <div v-else-if="datosFiscalesCliente" class="fiscal-summary">
                          <strong>Datos fiscales:</strong>
                          {{ datosFiscalesCliente.razonSocial || datosFiscalesCliente.razon_social }} · RFC {{ datosFiscalesCliente.rfc }} ·
                          CP {{ datosFiscalesCliente.codigoPostal || datosFiscalesCliente.codigo_postal }} ·
                          Régimen {{ datosFiscalesCliente.regimenFiscal || datosFiscalesCliente.regimen_fiscal }} ·
                          Uso CFDI {{ datosFiscalesCliente.usoCfdi || datosFiscalesCliente.uso_cfdi }}
                        </div>
                      </div>
                      <div class="col-md-3">
                        <label>Población</label>
                        <input type="text" class="form-control" v-model="form.cliente.poblacion">
                      </div>
                      <div class="col-md-3">
                        <label>Fecha entrega</label>
                        <input type="date" class="form-control" v-model="form.cliente.fechaEntrega">
                      </div>
                      <div class="col-md-3">
                        <label>Operador</label>
                        <input type="text" class="form-control" v-model="form.cliente.operador">
                      </div>
                      <div class="col-md-3">
                        <label>¿A crédito?</label> 
                        <div class="form-check form-switch">
                          <input class="form-check-input" type="checkbox" role="switch" id="switchCheckDefault" v-model="form.cliente.credito">
                        </div>                       
                      </div>
                    </div>
                  </div>
                </div>
                <!-- PRODUCTOS -->
                <div class="card shadow-sm">
                  <div class="card-header">
                    <span>Productos</span>
                    <div class="product-autocomplete mt-2" @focusout="cerrarSugerenciasProductos">
                      <input id="buscarProductoFactura" v-model="busqueda" type="search" class="form-control" autocomplete="off" placeholder="Buscar por código o nombre…" @input="buscarProductos" @keydown="teclaProducto">
                      <div v-if="busqueda.trim()" class="product-suggestions" role="listbox">
                        <div v-if="buscandoProductos" class="product-suggestion-status">Buscando…</div>
                        <button v-for="(item, index) in productosEncontrados" v-else :key="item.id" type="button" class="product-suggestion" :class="{ active: indiceProductoActivo === index }" @mousedown.prevent="agregarProducto(item)">
                          <strong>{{ item.codigo }} · {{ item.descripcion }}</strong>
                          <small>Precio: {{ formatoMoneda(item.precio) }} · Stock: {{ item.existencia }}</small>
                        </button>
                        <div v-if="!buscandoProductos && !productosEncontrados.length" class="product-suggestion-status">No existen coincidencias</div>
                      </div>
                    </div>
                  </div>
                  <div class="card-body p-0">
                    <table class="table table-hover align-middle mb-0">
                      <thead class="table-dark text-center">
                        <tr>
                          <th>#</th>
                          <th>Código</th>
                          <th>Descripción</th>
                          <th>Stock</th>
                          <th>Precio original</th>
                          <th>Precio (editable)</th>
                          <th>Desc %</th>
                          <th>Cant.</th>
                          <th>Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody class="text-center">
                        <tr v-for="(item, index) in productosFactura" :key="index">
                          <td>{{ index + 1 }}</td>
                          <td>{{ item.codigo }}</td>
                          <td>{{ item.descripcion }}</td>
                          <td>{{ item.existencia }}</td>
                          <td>{{ formatoMoneda(item.precioOriginal) }}</td>
                          <td><input type="number" min="0" step="0.01" v-model.number="item.precioEditable" class="form-control form-control-sm" readonly title="El backend determina el precio definitivo"></td>
                          <td>
                            <input type="number" min="0" max="100" v-model.number="item.descuento" class="form-control form-control-sm">
                          </td>
                          <td>
                            <input type="number" min="1" :max="item.existencia" v-model.number="item.cantidad" class="form-control form-control-sm">
                          </td>
                          <td>
                            {{ formatoMoneda((item.precioEditable * item.cantidad) - (item.precioEditable * item.cantidad * (item.descuento / 100))) }}
                          </td>
                          <td>
                            <button class="btn btn-danger btn-sm" @click="productosFactura.splice(index,1)">
                              X
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <!-- DERECHA (RESUMEN) -->
              <div class="col-md-3">
                <div class="resumen-box">
                  <div v-if="mensajeFactura" class="alert alert-warning py-1">{{ mensajeFactura }}</div>
                  <h6 class="mb-3">Resumen</h6>
                  <div class="d-flex justify-content-between mb-2">
                    <span>Subtotal</span>
                    <strong>{{ formatoMoneda(subtotalBruto) }}</strong>
                  </div>
                  <div class="d-flex justify-content-between mb-2">
                    <span>Descuento</span>
                    <strong>- {{ formatoMoneda(descuentoTotal) }}</strong>
                  </div>
                  <div class="d-flex justify-content-between mb-2">
                    <span>IVA (16%)</span>
                    <strong>{{ formatoMoneda(iva) }}</strong>
                  </div>
                  <hr>
                  <div class="d-flex justify-content-between total-final">
                    <span>Total</span>
                    <strong>{{ formatoMoneda(total) }}</strong>
                  </div>
                  <img v-if="imagenProducto" :src="imagenProducto" alt="Producto seleccionado" class="img-fluid rounded mt-3">
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- FOOTER -->
        <div class="modal-footer">
          <button class="btn btn-success" :disabled="cargandoCliente" @click="guardarFactura">{{ editingId ? 'Guardar cambios' : 'Crear factura' }}</button>
          <button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal fade" id="modalDetalles" tabindex="-1">
    <div class="modal-dialog modal-xl modal-dialog-scrollable"><div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Detalles de factura</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
      <div v-if="detalleFactura" class="modal-body">
        <div class="row mb-3">
          <div class="col"><strong>Folio:</strong> {{ detalleFactura.folio_cliente }}</div>
          <div class="col"><strong>Folio especial:</strong> {{ detalleFactura.folio_especial || '—' }}</div>
          <div class="col"><strong>Fecha:</strong> {{ formatearFecha(detalleFactura.fecha_emision) }}</div>
          <div class="col"><strong>Vendedor:</strong> {{ detalleFactura.vendedor }}</div>
          <div class="col"><strong>Almacén:</strong> {{ detalleFactura.almacen }}</div>
          <div class="col"><strong>Estatus:</strong> {{ detalleFactura.estatus }}</div>
        </div>
        <div class="mb-2"><span class="badge" :class="Number(detalleFactura.timbrada) === 1 ? 'text-bg-success' : 'text-bg-secondary'">{{ Number(detalleFactura.timbrada) === 1 ? 'Timbrada' : 'No timbrada' }}</span><span v-if="detalleFactura.fecha_timbrado" class="ms-2">Fecha: {{ formatearFecha(detalleFactura.fecha_timbrado) }}</span> · Documento sin validez fiscal</div>
        <div v-if="detalleFactura.datosFiscalesSnapshot" class="mb-3"><strong>Datos fiscales:</strong> {{ detalleFactura.datosFiscalesSnapshot.razon_social }} · RFC {{ detalleFactura.datosFiscalesSnapshot.rfc }} · CP {{ detalleFactura.datosFiscalesSnapshot.codigo_postal }} · Régimen {{ detalleFactura.datosFiscalesSnapshot.regimen_fiscal }} · Uso CFDI {{ detalleFactura.datosFiscalesSnapshot.uso_cfdi }}</div>
        <div class="mb-3"><strong>Cliente:</strong> {{ detalleFactura.razon_social }} · RFC {{ detalleFactura.rfc }} · {{ detalleFactura.direccion }}, {{ detalleFactura.colonia }}, {{ detalleFactura.poblacion }}</div>
        <table class="table table-sm"><thead><tr><th>Código</th><th>Descripción</th><th>Cantidad</th><th>Precio original</th><th>Precio usado</th><th>Base</th><th>IVA</th><th>Total</th></tr></thead>
          <tbody><tr v-for="c in detalleFactura.conceptos" :key="c.id"><td>{{ c.producto?.codigo || c.id_catalogo }}</td><td>{{ c.producto?.descripcion }}</td><td>{{ c.cantidad }}</td><td>{{ c.precio_original == null ? 'N/D' : formatoMoneda(c.precio_original) }}</td><td>{{ formatoMoneda(c.precio_unitario) }}</td><td>{{ formatoMoneda(c.monto_sin_iva) }}</td><td>{{ formatoMoneda(c.monto_iva) }}</td><td>{{ formatoMoneda(c.monto_total) }}</td></tr></tbody>
        </table>
        <div class="text-end"><strong>Subtotal:</strong> {{ formatoMoneda(detalleFactura.subtotal) }} · <strong>Descuento:</strong> {{ formatoMoneda(detalleFactura.descuento) }} · <strong>Total:</strong> {{ formatoMoneda(detalleFactura.total) }}</div>
      </div>
      <div class="modal-footer"><button @click="pdfCompleto(detalleFactura)" class="btn btn-outline-danger">PDF</button><button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button></div>
    </div></div>
  </div>
  <div class="modal fade" id="modalEtiquetas" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"><div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Configurar etiquetas</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body">
        <div v-if="errorEtiquetas" class="alert alert-danger">{{ errorEtiquetas }}</div>
        <div v-if="avisosEtiquetas.length" class="alert alert-warning"><strong>Avisos de contenido:</strong><ul class="mb-0"><li v-for="warning in avisosEtiquetas" :key="warning">{{ warning }}</li></ul></div>
        <div class="alert alert-info">Se generarán <strong>{{ totalEtiquetas }}</strong> etiquetas, una página por cada unidad.</div>
        <div class="row g-3">
          <div class="col-md-6"><label class="form-label">Tamaño</label><select v-model="labelConfig.preset" class="form-select" @change="aplicarPresetEtiqueta"><option value="50x25">50 × 25 mm</option><option value="50x30">50 × 30 mm</option><option value="60x40">60 × 40 mm</option><option value="100x50">100 × 50 mm</option><option value="custom">Personalizado</option></select></div>
          <div class="col-md-3"><label class="form-label">Ancho (mm)</label><input v-model.number="labelConfig.anchoMm" type="number" min="15" max="210" step="0.1" class="form-control" @input="labelConfig.preset = 'custom'"></div>
          <div class="col-md-3"><label class="form-label">Alto (mm)</label><input v-model.number="labelConfig.altoMm" type="number" min="10" max="297" step="0.1" class="form-control" @input="labelConfig.preset = 'custom'"></div>
          <div class="col-md-3"><label class="form-label">Margen (mm)</label><input v-model.number="labelConfig.margenMm" type="number" min="0" max="10" step="0.1" class="form-control"></div>
          <div class="col-md-3"><label class="form-label">Padding (mm)</label><input v-model.number="labelConfig.paddingMm" type="number" min="0" max="10" step="0.1" class="form-control"></div>
          <div class="col-md-3"><label class="form-label">Fuente (pt)</label><input v-model.number="labelConfig.fuentePt" type="number" min="5" max="30" step="0.5" class="form-control"></div>
          <div class="col-md-3"><label class="form-label">Orientación</label><select v-model="labelConfig.orientacion" class="form-select"><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></select></div>
        </div>
      </div>
      <div class="modal-footer"><button class="btn btn-primary" :disabled="procesandoEtiquetas || totalEtiquetas < 1" @click="abrirPreviewEtiquetas"><span v-if="procesandoEtiquetas" class="spinner-border spinner-border-sm me-2"></span>Abrir vista previa</button><button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button></div>
    </div></div>
  </div>
</template>
