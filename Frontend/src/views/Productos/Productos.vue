<script setup>
import { onMounted, ref } from 'vue';
import { useProductos } from '../../services/productos/useProductos';
import { useTipos } from '../../services/tipos/useTipos';
import { useProductoForm } from './js/Productos';
import { useAuthorizationStore } from '../../stores/authorization';
import Swal from 'sweetalert2';
import AgregarStockModal from './AgregarStockModal.vue';
import { deleteProducto, reactivateProducto as reactivateProductoApi } from '../../services/productos';

const { productos, cargarProductos, filtros, pagination, filtrar, cambiarPagina } = useProductos();
const { tipos, getTipos, cargarTipos } = useTipos();
const { form, formEditar, formCrear, previews, handleFiles, guardarProducto, eliminarProducto, editarProducto, editarProductoSubmit, obtenerNombreTipo, agregarTipo, quitarTipo, tiposSeleccionados, detalleProducto } = useProductoForm(tipos);
const authorization = useAuthorizationStore();
const can = (permission) => authorization.can(permission);
const errorCarga = ref('');
const stockModal = ref(null);
const stockActualizado = (data) => { const item=productos.value.find(p=>p.id===data.productoId);if(item){item.stock=data.stockNuevo;item.existencia=data.existenciaNueva} };
const desactivarProducto = async(item)=>{const r=await Swal.fire({icon:'warning',title:'¿Desactivar este producto?',text:'El producto dejará de estar disponible para operaciones nuevas.',showCancelButton:true,confirmButtonText:'Sí, desactivar',cancelButtonText:'Cancelar'});if(!r.isConfirmed)return;try{await deleteProducto(item.id);item.activo=false;await Swal.fire('Producto desactivado correctamente','','success')}catch(e){await Swal.fire('No fue posible desactivar el producto',e.response?.data?.message||'Error de conexión','error')}};
const reactivarProducto = async(item)=>{try{await reactivateProductoApi(item.id);item.activo=true;await Swal.fire('Producto reactivado correctamente','','success')}catch(e){await Swal.fire('No fue posible reactivar el producto',e.response?.data?.message||'Error de conexión','error')}};
onMounted(async () => {
  try {
    await cargarProductos();
    const { data } = await getTipos({ limit: 100 });
    tipos.value = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('No fue posible cargar el catalogo de productos:', error);
    errorCarga.value = error.response?.data?.message?.join?.(', ')
      || error.response?.data?.message
      || 'No fue posible cargar los productos. Comprueba que el backend este disponible.';
  }
});
</script>
<template>
<div class="col-md-12 mb-3 container-fluid p-4">
  <!-- HEADER -->
  <div class="page-header d-flex justify-content-between align-items-center gap-2">
    <h4 class="mb-0">Productos</h4>
    <div class="page-actions d-flex gap-2">
      <button v-if="can('catalogo.crear')" data-bs-toggle="modal" data-bs-target="#creacion" class="btn btn-primary btn-sm">
        <i class="fa fa-plus"></i> Nuevo Producto
      </button>
      <router-link v-if="can('catalogo.crear')" to="/productos/NuevoTipo" class="btn btn-primary btn-sm">
        <i class="fa fa-plus"></i> Nuevo Tipo
      </router-link>
    </div>
  </div>
    <div class="card mt-3 shadow-sm border-0">
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-md-3">
            <label class="form-label">Buscar</label>
            <input v-model="filtros.nombre" type="text" class="form-control form-control-sm" placeholder="Goma...">
          </div>
          <div class="col-md-2">
            <label class="form-label">Desde</label>
            <input v-model="filtros.desde" type="date" class="form-control form-control-sm">
          </div>
          <div class="col-md-2">
            <label class="form-label">Hasta</label>
            <input v-model="filtros.hasta" type="date" class="form-control form-control-sm">
          </div>
          <div class="col-md-3">
            <label class="form-label">Tipo</label>
            <select v-model="filtros.tipo" class="form-select form-select-sm">
              <option value="">Seleccione una opción</option>
              <option v-for="item in tipos" :key="item.id" :value="item.id">{{ item.nombre }}</option>
            </select>
          </div>
          <div class="col-md-2">
            <button @click="filtrar" class="btn btn-primary btn-sm w-100">
              Filtrar
            </button>
          </div>
        </div>
      </div>
    </div>
  <!-- TABLA -->
  <div class="mt-3">
    <div v-if="errorCarga" class="alert alert-danger" role="alert">{{ errorCarga }}</div>
    <div class="table-responsive"><table class="table table-hover align-middle custom-table">
      <thead class="table-dark">
        <tr class="text-center">
          <th>#</th>
          <th>Producto</th>
          <th>Precio</th>
          <th>Stock</th>
          <th>Existencia</th>
          <th>¿Es nuevo?</th>
          <th>Estatus</th>
          <th class="text-center">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in productos" :key="item.id" class="text-center">
          <td>{{ item.id }}</td>
          <td>{{ item.codigo }}</td>
          <td>${{ item.precio }}</td>
          <td>{{ item.stock }}</td>
          <td>{{ item.existencia }}</td>
          <td><span class="badge" :class="item.nuevo === true ? 'bg-success' : 'bg-danger'">{{ item.nuevo === true ? 'Sí' : 'No' }}</span></td>
          <td><span class="badge" :class="item.activo === true ? 'bg-success' : 'bg-danger'">{{ item.activo === true ? 'Activo' : 'Inactivo' }}</span></td>
          <td class="text-center">
            <div class="d-flex justify-content-center flex-wrap gap-2">
            <button v-if="can('catalogo.detalles')" type="button" class="btn btn-sm btn-outline-info" data-bs-toggle="modal" data-bs-target="#detalle" title="Ver detalles" aria-label="Ver detalles" @click="detalleProducto(item.id)"><i class="bi bi-eye" /></button>
            <button v-if="can('catalogo.editar')" type="button" class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#editar" title="Editar producto" aria-label="Editar producto" @click="editarProducto(item.id)"><i class="bi bi-pencil-square" /></button>
            <button v-if="can('catalogo.agregar_stock') && item.activo" type="button" class="btn btn-sm btn-outline-success" title="Agregar stock" aria-label="Agregar stock" @click="stockModal.open(item.id)"><i class="bi bi-box-seam" /><i class="bi bi-plus small" /></button>
            <button v-if="can('catalogo.eliminar') && item.activo" type="button" class="btn btn-sm btn-outline-danger" title="Desactivar producto" aria-label="Desactivar producto" @click="desactivarProducto(item)"><i class="bi bi-trash" /></button>
            <button v-if="can('catalogo.eliminar') && !item.activo" type="button" class="btn btn-sm btn-outline-success" title="Reactivar producto" aria-label="Reactivar producto" @click="reactivarProducto(item)"><i class="bi bi-arrow-clockwise" /></button>
            </div>
          </td>
        </tr>
      </tbody>
    </table></div>
      <div class="responsive-pager d-flex justify-content-between align-items-center gap-2 mt-3">
        <div>
          Página {{ pagination.page }} de {{ pagination.lastPage }}
        </div>
        <div class="btn-group">
          <button class="btn btn-sm btn-secondary" @click="cambiarPagina(pagination.page - 1)">
            Anterior
          </button>
          <button class="btn btn-sm btn-secondary" @click="cambiarPagina(pagination.page + 1)">
            Siguiente
          </button>
        </div>
      </div>
  </div>
</div>
<AgregarStockModal ref="stockModal" @updated="stockActualizado" />
<!--  MODAL CREACION  -->
<div class="modal fade product-modal" id="creacion" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
      <div class="modal-content modal-producto">
        <div class="modal-header">
          <div><h5 class="modal-title fw-bold" id="staticBackdropLabel">Crear producto</h5><small class="text-muted">Registra la información general, inventario e imágenes</small></div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="product-modal-layout container-fluid">
            <div class="row">
              <div class="col-md-6">
                <div class="p-2">
                  <label class="form-label">Código del producto</label>
                  <input v-model="formCrear.codigo" type="text" class="form-control" placeholder="GMG-092...">                    
                </div>
                <div class="p-2">
                  <label class="form-label">Tipo</label>
                  <select class="form-select" @change="agregarTipo($event)">
                    <option value="">Seleccione una opción</option>
                    <option v-for="item in tipos" :key="item.id" :value="item.id">
                      {{ item.nombre }}
                    </option>
                  </select>
                  <div class="mt-2 d-flex flex-wrap gap-2">
                    <span
                      v-for="tipoId in tiposSeleccionados"
                      :key="tipoId"
                      class="badge bg-primary d-flex align-items-center"
                    >
                      {{ obtenerNombreTipo(tipoId) }}
                      <button
                        class="btn-close btn-close-white ms-2"
                        style="font-size: 0.6rem;"
                        @click="quitarTipo(tipoId)"
                      ></button>
                    </span>
                  </div>
                </div>
                <div class="p-2">
                  <label class="form-label">Precio</label>
                  <input v-model="formCrear.precio" type="number" class="form-control" placeholder="$100.00..">
                </div>
                <div class="p-2">
                  <label class="form-label">Stock</label>
                  <input v-model="formCrear.stock" type="number" class="form-control" placeholder="01...">
                </div>
                <div class="p-2">
                  <label class="form-label">Existencia</label>
                  <input v-model="formCrear.existencia" type="number" class="form-control" placeholder="01...">
                </div>
                <div class="p-2">
                  <label class="form-label">¿Es producto nuevo?</label>
                  <div class="form-check">
                    <input v-model="formCrear.nuevo" class="form-check-input" type="radio" name="nuevo" :value="true">
                    <label class="form-check-label">Sí</label>
                  </div>
                  <div class="form-check">
                    <input v-model="formCrear.nuevo" class="form-check-input" type="radio" name="nuevo" :value="false" checked>
                    <label class="form-check-label">No</label>
                  </div>
                </div>
                <div class="p-2">
                  <label class="form-label">¿Habilitar el producto?</label>
                  <div class="form-check">
                    <input v-model="formCrear.activo" class="form-check-input" type="radio" name="activo" :value="true">
                    <label class="form-check-label">Sí</label>
                  </div>
                  <div class="form-check">
                    <input v-model="formCrear.activo" class="form-check-input" type="radio" name="activo" :value="false" checked>
                    <label class="form-check-label">No</label>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="product-image-zone">
                  <div v-if="previews.length" class="product-image-grid">
                    <img v-for="(img, i) in previews" :key="i" :src="img" class="product-image-preview" alt="Vista previa del producto">
                  </div>
                  <div v-else class="product-image-placeholder">
                    <i class="bi bi-image"></i>
                    <span>Vista previa de imágenes</span>
                  </div>
                </div>
                <div class="p-2">
                  <label class="form-label">Imagen del producto</label>
                  <input type="file" class="form-control" accept="image/*" multiple @change="handleFiles"/>
                </div>
                <div class="form-floating p-2">
                  <textarea id="descripcionCrear" v-model="formCrear.descripcion" class="form-control" placeholder="Descripción del producto" style="height: 100px"></textarea>
                  <label for="descripcionCrear">Descripción del producto</label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
          <button @click="guardarProducto" type="button" class="btn btn-primary">Crear producto</button>
        </div>
      </div>
    </div>
</div>
<!--  MODAL EDITAR  -->
<div class="modal fade product-modal" id="editar" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
    <div class="modal-content modal-producto">
      <div class="modal-header">
        <div><h5 class="modal-title fw-bold">Editar producto</h5><small class="text-muted">Actualiza la información, inventario e imágenes</small></div>
        <input class="form-control" style="display: none;" type="text" v-model="form.idEditar">
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="product-modal-layout container-fluid">
          <div class="row">
            <div class="col-md-6">
              <div class="p-2">
                <label class="form-label">Código del producto</label>
                <input v-model="formEditar.codigo" type="text" class="form-control" placeholder="GMG-092...">                    
              </div>
              <div class="p-2">
                <label class="form-label">Tipo</label>
                <select class="form-select" @change="agregarTipo($event)">
                  <option value="">Seleccione una opción</option>
                  <option v-for="item in tipos" :key="item.id" :value="item.id">
                    {{ item.nombre }}
                  </option>
                </select>
                <div class="mt-2 d-flex flex-wrap gap-2">
                  <span
                    v-for="tipoId in form.tipos"
                    :key="tipoId"
                    class="badge bg-primary d-flex align-items-center"
                  >
                    {{ obtenerNombreTipo(tipoId) }}
                    <button
                      class="btn-close btn-close-white ms-2"
                      style="font-size: 0.6rem;"
                      @click="quitarTipo(tipoId)"
                    ></button>
                  </span>
                </div>                 
              </div>
              <div class="p-2">
                <label class="form-label">Precio</label>
                <input v-model="formEditar.precio" type="number" class="form-control" placeholder="$100.00..">
              </div>
              <div class="p-2">
                <label class="form-label">Stock</label>
                <input v-model="formEditar.stock" type="number" class="form-control" placeholder="01...">
              </div>
              <div class="p-2">
                <label class="form-label">Existencia</label>
                <input v-model="formEditar.existencia" type="number" class="form-control" placeholder="01...">
              </div>
              <div class="p-2">
                <label class="form-label">¿Es producto nuevo?</label>
                <div class="form-check">
                  <input v-model="formEditar.nuevo" class="form-check-input" type="radio" name="nuevo" :value="true">
                  <label class="form-check-label">Sí</label>
                </div>
                <div class="form-check">
                  <input v-model="formEditar.nuevo" class="form-check-input" type="radio" name="nuevo" :value="false" checked>
                  <label class="form-check-label">No</label>
                </div>
              </div>
              <div class="p-2">
                <label class="form-label">¿Habilitar el producto?</label>
                <div class="form-check">
                  <input v-model="formEditar.activo" class="form-check-input" type="radio" name="activo" :value="true">
                  <label class="form-check-label">Sí</label>
                </div>
                <div class="form-check">
                  <input v-model="formEditar.activo" class="form-check-input" type="radio" name="activo" :value="false" checked>
                  <label class="form-check-label">No</label>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="product-image-zone">
                <div v-if="previews.length" class="product-image-grid">
                  <img v-for="(img, i) in previews" :key="i" :src="img" class="product-image-preview" alt="Vista previa del producto">
                </div>
                <div v-else class="product-image-placeholder">
                  <i class="bi bi-image"></i>
                  <span>Sin imágenes seleccionadas</span>
                </div>
              </div>
              <div class="p-2">
                <label class="form-label">Imágenes del producto</label>
                <input type="file" class="form-control" accept="image/*" multiple @change="handleFiles"/>
                <div class="form-text">Selecciona archivos únicamente si deseas reemplazar las imágenes actuales.</div>
              </div>
              <div class="form-floating p-2">
                <textarea id="descripcionEditar" v-model="formEditar.descripcion" class="form-control" placeholder="Descripción del producto" style="height: 100px"></textarea>
                <label for="descripcionEditar">Descripción del producto</label>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
        <button @click="editarProductoSubmit" type="button" class="btn btn-primary">Guardar cambios</button>
      </div>
    </div>
  </div>
</div>
<!--  MODAL DETALLE  -->
<div class="modal fade product-modal" id="detalle" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
    <div class="modal-content modal-producto">
      <div class="modal-header">
        <div><h5 class="modal-title fw-bold">Detalles del producto</h5><small class="text-muted">Información general, inventario, estado e imágenes</small></div>
        <input class="form-control" style="display: none;" type="text" v-model="form.idEditar">
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="product-modal-layout container-fluid">
          <div class="row">
            <div class="col-md-6">
              <div class="p-2">
                <label class="form-label">Código del producto</label>
                <input disabled v-model="form.codigoDetalle" type="text" class="form-control" placeholder="GMG-092...">                    
              </div>
              <div class="p-2">
                <label class="form-label">Tipo</label>
                <select disabled class="form-select">
                  <option value="">Seleccione una opción</option>
                  <option v-for="item in tipos" :key="item.id" :value="item.id">
                    {{ item.nombre }}
                  </option>
                </select>
                <div class="mt-2 d-flex flex-wrap gap-2">
                  <span
                    v-for="tipoId in form.tipos"
                    :key="tipoId"
                    class="badge bg-primary d-flex align-items-center"
                  >
                    {{ obtenerNombreTipo(tipoId) }}
                    <button
                      class="btn-close btn-close-white ms-2"
                      style="font-size: 0.6rem;"
                      @click="quitarTipo(tipoId)"
                    ></button>
                  </span>
                </div>                 
              </div>
              <div class="p-2">
                <label class="form-label">Precio</label>
                <input disabled v-model="form.precioDetalle" type="number" class="form-control" placeholder="$100.00..">
              </div>
              <div class="p-2">
                <label class="form-label">Stock</label>
                <input disabled v-model="form.stockDetalle" type="number" class="form-control" placeholder="01...">
              </div>
              <div class="p-2">
                <label class="form-label">Existencia</label>
                <input disabled v-model="form.existenciaDetalle" type="number" class="form-control" placeholder="01...">
              </div>
              <div class="p-2">
                <label class="form-label">¿Es producto nuevo?</label>
                <div class="form-check">
                  <input disabled v-model="form.nuevoDetalle" class="form-check-input" type="radio" name="nuevo" :value="true">
                  <label class="form-check-label">Sí</label>
                </div>
                <div class="form-check">
                  <input disabled v-model="form.nuevoDetalle" class="form-check-input" type="radio" name="nuevo" :value="false" checked>
                  <label class="form-check-label">No</label>
                </div>
              </div>
              <div class="p-2">
                <label class="form-label">¿Habilitar el producto?</label>
                <div class="form-check">
                  <input disabled v-model="form.activoDetalle" class="form-check-input" type="radio" name="activo" :value="true">
                  <label class="form-check-label">Sí</label>
                </div>
                <div class="form-check">
                  <input disabled v-model="form.activoDetalle" class="form-check-input" type="radio" name="activo" :value="false" checked>
                  <label class="form-check-label">No</label>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="product-image-zone product-image-zone--detail">
                <div v-if="previews.length" id="carouselDetalle" class="carousel slide h-100 w-100">
                  <div v-if="previews.length > 1" class="carousel-indicators">
                  <button v-for="(img, index) in previews" :key="index" type="button" data-bs-target="#carouselDetalle" :data-bs-slide-to="index" :class="{ active: index === 0 }"/>
                  </div>
                  <div class="carousel-inner h-100">
                    <div v-for="(img, index) in previews" :key="index" class="carousel-item h-100" :class="{ active: index === 0 }">
                      <img :src="img" class="product-detail-image" alt="Imagen del producto">
                    </div>
                  </div>
                  <button v-if="previews.length > 1" type="button" class="btn btn-dark rounded-circle position-absolute top-50 start-0 translate-middle-y ms-2" data-bs-target="#carouselDetalle" data-bs-slide="prev" aria-label="Imagen anterior">
                    <i class="bi bi-chevron-left"></i>
                  </button>
                  <button v-if="previews.length > 1" type="button" class="btn btn-dark rounded-circle position-absolute top-50 end-0 translate-middle-y me-2" data-bs-target="#carouselDetalle" data-bs-slide="next" aria-label="Imagen siguiente">
                    <i class="bi bi-chevron-right"></i>
                  </button>
                </div>
                <div v-else class="product-image-placeholder">
                  <i class="bi bi-image"></i>
                  <span>Producto sin imágenes</span>
                </div>
              </div>
              <div class="form-floating p-2">
                <textarea id="descripcionDetalle" disabled v-model="form.descripcionDetalle" class="form-control" placeholder="Descripción del producto" style="height: 100px"></textarea>
                <label for="descripcionDetalle">Descripción del producto</label>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Cerrar</button>
      </div>
    </div>
  </div>
</div>
</template>

<style scoped>
.product-modal .modal-body {
  max-height: 72vh;
  padding: 1rem;
}
.product-modal .modal-header,
.product-modal .modal-footer {
  border-color: var(--bs-border-color);
}
.product-modal-layout {
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: .75rem;
  padding: 1rem;
}
.product-modal .form-label {
  font-weight: 600;
  margin-bottom: .4rem;
}
.product-modal input:disabled,
.product-modal textarea:disabled,
.product-modal select:disabled {
  color: var(--bs-body-color);
  background-color: var(--bs-tertiary-bg);
  opacity: 1;
}
.product-modal .modal-footer .btn {
  min-width: 110px;
}
.product-image-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 220px;
  margin: .5rem;
  padding: .75rem;
  overflow: hidden;
  background: var(--bs-tertiary-bg);
  border: 1px dashed var(--bs-border-color);
  border-radius: .75rem;
}
.product-image-zone--detail {
  height: 280px;
}
.product-image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: .5rem;
  align-content: center;
  width: 100%;
  height: 100%;
  overflow: auto;
}
.product-image-preview {
  width: 100%;
  height: 100px;
  object-fit: contain;
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: .5rem;
}
.product-image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  color: var(--bs-secondary-color);
  text-align: center;
}
.product-image-placeholder .bi {
  font-size: 2rem;
}
.product-detail-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: .5rem;
}
@media (max-width: 576px) {
  .product-modal .modal-dialog { margin: .5rem; }
  .product-modal-layout { padding: .75rem; }
  .product-image-zone { height: 190px; }
  .product-image-zone--detail { height: 230px; }
  .product-modal .modal-footer { flex-wrap: nowrap; }
  .product-modal .modal-footer .btn { min-width: 0; flex: 1; }
}
</style>
