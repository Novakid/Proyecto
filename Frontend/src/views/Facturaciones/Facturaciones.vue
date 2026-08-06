<script setup>
import { onMounted, ref, computed, toRaw } from 'vue';
import '../../assets/style/facturacion/facturacion.css';
import { useProductos } from '../../services/productos/useProductos';
import { useFacturas } from '../../services/facturacion/useFacturas';
import { useFacturasForm } from './js/Facturaciones';
const { productos, cargarProductos, filtrar } = useProductos();
const { facturas ,crear, cargarFacturas } = useFacturas();
const { formatearFecha, busqueda, productoSeleccionado, form, abrirModal, productosFiltrados, productosFactura, agregarProducto, subtotalBruto, descuentoTotal, subtotal, iva, total, formatoMoneda, construirFactura, generarPDF, construirEtiquetas, previewEtiquetas, buscarVendedores, seleccionarVendedor, usuariosFiltrados, mostrarSugerencias, cargandoUsuarios } = useFacturasForm();
onMounted(async () => {
  await cargarFacturas();
});
const facturasHoy = computed(() => {
  const hoy = new Date().toISOString().split('T')[0];
  return facturas.value.filter(f => {
    const fechaFactura = new Date(f.fecha_emision).toISOString().split('T')[0];
    return fechaFactura === hoy;
  });
});
const facturasPorTimbrar = computed(() => {
  return facturas.value.filter(
    f => f.uuid === null || f.uuid === ''
  );
});
</script>
<template>
  <div class="col-md-12 mb-3 container-fluid p-4">
      <!-- HEADER -->
      <div class="d-flex justify-content-between align-items-center">
          <h4 class="mb-0">GestiÃƒÂ³n de facturas</h4>
          <div class="d-flex gap-4">
              <span>Facturas hoy: <strong class="text-success">{{ facturasHoy.length }}</strong></span>
              <span>Por timbrar: <strong class="text-warning">{{ facturasPorTimbrar.length }}</strong></span>
          </div>
      </div>
      <div class="card mt-3 shadow-sm border-0">
          <div class="card-body">
              <button @click="abrirModal" class="btn btn-primary btn-md" data-bs-toggle="modal" data-bs-target="#modalCrear">Crear factura</button>
          </div>
          <div class="card-body">
              <div class="row g-2 align-items-end">
                  <div class="col-md-3">
                      <label class="form-label">Folio</label>
                      <input type="text" class="form-control form-control-sm" placeholder="Folio: XXX-XXX-XXX..">
                  </div>
                  <div class="col-md-3">
                      <label class="form-label">Desde</label>
                      <input type="date" class="form-control form-control-sm">
                  </div>
                  <div class="col-md-3">
                      <label class="form-label">Hasta</label>
                      <input type="date" class="form-control form-control-sm">
                  </div>
                  <div class="col-md-3">
                      <label class="form-label">Monto</label>
                      <input type="text" class="form-control form-control-sm" placeholder="$ 100.00">
                  </div>
              </div>
              <div class="row g-2 align-items-end">
                  <div class="col-md-3">
                      <label class="form-label">Nombre del Cliente</label>
                      <input type="text" class="form-control form-control-sm" placeholder="Ricardo..">
                  </div>
                  <div class="col-md-3">
                      <label class="form-label">Estatus</label>
                      <select type="date" class="form-control form-control-sm" name="" id="">
                          <option value="">Seleccione una opciÃƒÂ³n</option>
                          <option value="Timbrado">Timbrado</option>
                          <option value="Pendiente">Pendiente</option>
                      </select>
                  </div>
                  <div class="col-md-2">
                      <button class="btn btn-primary btn-sm w-100">
                          Filtrar
                      </button>
                  </div>
              </div>
          </div>
      </div>
      <!-- TABLA -->
      <div class="mt-3 facturas-table">
          <table class="table table-hover align-middle custom-table">
              <thead class="table-dark">
                  <tr>
                      <th>Folio</th>
                      <th>Cliente</th>
                      <th>Fecha de emisiÃƒÂ³n</th>
                      <th>Fecha de entrega</th>
                      <th>Credito</th>
                      <th>Monto</th>
                      <th>Estatus</th>
                      <th class="text-center">Acciones</th>
                  </tr>
              </thead>
              <tbody>
                  <tr v-for="item in facturas" :key="item.id">
                      <td>{{ item.folio_cliente }}</td>
                      <td>{{ item.razon_social }}</td>
                      <td>{{ item.fecha_emision }}</td>
                      <td>{{ item.fecha_entrega }}</td>
                      <td>{{ item.credito === 1? 'SÃƒÂ­' : 'No' }}</td>
                      <td>{{ item.total }}</td>
                      <td>{{ item.uuid !== null ? 'Timbrado' : 'Sin timbrar' }}</td>
                      <td class="text-center">
                          <div class="d-flex justify-content-center gap-2">
                              <button class="btn btn-sm btn-outline-success" title="Timbrar">
                              <i class="bi bi-bell"></i>
                              </button>
                              <button @click="generarPDF(item)" class="btn btn-sm btn-outline-danger" title="Ver PDF">
                                <i class="bi bi-file-earmark-pdf"></i>
                              </button>
                              <button @click="previewEtiquetas(item)" class="btn btn-sm btn-outline-primary" title="Imprimir etiquetas">
                                <i class="bi bi-upc-scan"></i>
                              </button>
                              <div class="dropdown">
                                  <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                                    <i class="bi bi-justify"></i>
                                  </button>
                                  <ul class="dropdown-menu dropdown-menu-end">
                                      <li>
                                      <a class="dropdown-item" href="#">
                                          <i class="bi bi-pencil me-2"></i> Editar
                                      </a>
                                      </li>
                                      <li>
                                      <a class="dropdown-item text-danger" href="#">
                                          <i class="bi bi-x-circle me-2"></i> Cancelar
                                      </a>
                                      </li>
                                      <li>
                                      <a class="dropdown-item" href="#">
                                          <i class="bi bi-eye me-2"></i> Detalles
                                      </a>
                                      </li>
                                  </ul>
                              </div>
                          </div>
                      </td>
                  </tr>
              </tbody>
          </table>
      </div>
  </div>
    <!-- MODAL CREACIÃƒâ€œN FACTURA -->
  <div class="modal fade" id="modalCrear" data-bs-backdrop="static" data-bs-keyboard="false">
    <div class="modal-dialog modal-dialog-centered modal-xl modal-editado">
      <div class="modal-content">
        <!-- HEADER -->
        <div class="modal-header">
          <h5 class="modal-title">Crear factura</h5>
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
                        <label>Folio</label>
                        <input type="text" class="form-control" v-model="form.folio">
                      </div>
                      <div class="col-md-3">
                        <label>Fecha</label>
                        <input type="date" class="form-control" v-model="form.fecha">
                      </div>
                      <div class="col-md-3">
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
                      v-for="usuario in usuariosFiltrados"
                      :key="usuario.id"
                      :value="usuario.Nombre"
                  />
              </datalist>
                      </div>
                      <div class="col-md-3">
                        <label>AlmacÃƒÂ©n</label>
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
                        <label>Nombre / RazÃƒÂ³n social</label>
                        <input type="text" class="form-control" v-model="form.cliente.nombre">
                      </div>
                      <div class="col-md-4">
                        <label>RFC</label>
                        <input type="text" class="form-control" v-model="form.cliente.rfc">
                      </div>
                      <div class="col-md-4">
                        <label>DirecciÃƒÂ³n</label>
                        <input type="text" class="form-control" v-model="form.cliente.direccion">
                      </div>
                      <div class="col-md-3">
                        <label>Colonia</label>
                        <input type="text" class="form-control" v-model="form.cliente.colonia">
                      </div>
                      <div class="col-md-3">
                        <label>PoblaciÃƒÂ³n</label>
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
                        <label>Ã‚Â¿A credito?</label> 
                        <div class="form-check form-switch">
                          <input class="form-check-input" type="checkbox" role="switch" id="switchCheckDefault" v-model="form.cliente.credito">
                        </div>                       
                      </div>
                    </div>
                  </div>
                </div>
                <!-- PRODUCTOS -->
                <div class="card shadow-sm">
                  <div class="card-header d-flex justify-content-between align-items-center">
                    <span>Productos</span>
                    <div class="d-flex gap-2">
                      <input  v-model="busqueda" type="text" class="form-control" placeholder="Buscar producto...">
                      <select class="form-select" v-model="productoSeleccionado">
                        <option>Selecciona producto</option>
                        <option v-for="item in productosFiltrados" :key="item.id" :value="item.id">{{ item.codigo }}</option>
                      </select>
                      <button class="btn btn-primary" @click="agregarProducto">Agregar</button>
                    </div>
                  </div>
                  <div class="card-body p-0">
                    <table class="table table-hover align-middle mb-0">
                      <thead class="table-dark text-center">
                        <tr>
                          <th>#</th>
                          <th>CÃƒÂ³digo</th>
                          <th>DescripciÃƒÂ³n</th>
                          <th>Stock</th>
                          <th>Precio</th>
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
                          <td>{{ item.stock }}</td>
                          <td>{{ item.precio }}</td>
                          <td>
                            <input type="number" v-model="item.descuento" class="form-control form-control-sm">
                          </td>
                          <td>
                            <input type="number" v-model="item.cantidad" class="form-control form-control-sm">
                          </td>
                          <td>
                            {{ formatoMoneda((item.precio * item.cantidad) - (item.precio * item.cantidad * (item.descuento / 100))) }}
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
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- FOOTER -->
        <div class="modal-footer">
          <button class="btn btn-success" @click="construirFactura">Crear factura</button>
          <button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
        </div>
      </div>
    </div>
  </div>  
</template>
