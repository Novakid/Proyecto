<script setup>
import { onMounted, ref } from 'vue';
import { useProductos } from '../../services/productos/useProductos';
import { useTipos } from '../../services/tipos/useTipos';
import { useProductoForm } from './js/Productos';

const { productos, cargarProductos, filtros, pagination, filtrar, cambiarPagina } = useProductos();
const { tipos, getTipos, cargarTipos } = useTipos();
const { form, formEditar, formCrear, previews, handleFiles, guardarProducto, eliminarProducto, editarProducto, editarProductoSubmit, obtenerNombreTipo, agregarTipo, quitarTipo, tiposSeleccionados, detalleProducto } = useProductoForm(tipos);
const errorCarga = ref('');
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
  <div class="d-flex justify-content-between align-items-center">
    <h4 class="mb-0">Productos</h4>
    <div class="d-flex gap-2">
      <button data-bs-toggle="modal" data-bs-target="#creacion" class="btn btn-primary btn-sm">
        <i class="fa fa-plus"></i> Nuevo Producto
      </button>
      <router-link to="/productos/NuevoTipo" class="btn btn-primary btn-sm">
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
    <table class="table table-hover align-middle custom-table">
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
          <td>
            <button class="btn btn-sm btn-secondary me-2" data-bs-toggle="modal" data-bs-target="#detalle" @click="detalleProducto(item.id)">Detalles</button>
            <button class="btn btn-sm btn-primary me-2" data-bs-toggle="modal" data-bs-target="#editar" @click="editarProducto(item.id)">Editar</button>
            <button class="btn btn-sm btn-danger" @click="eliminarProducto(item.id)">Eliminar</button>
          </td>
        </tr>
      </tbody>
    </table>
      <div class="d-flex justify-content-between align-items-center mt-3">
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
<!--  MODAL CREACION  -->
<div class="modal fade" id="creacion" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h1 class="modal-title fs-5" id="staticBackdropLabel">Crear Producto</h1>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="col-md-12 mb-3 container-fluid p-4">
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
                <div class="p-2 text-center">
                  <img class="img-fluid rounded shadow-sm" style="max-height: 250px;">
                </div>
                <div id="carouselExample" class="carousel slide p-2">
                  <div class="carousel-inner">
                    <div class="carousel-item active">
                      <div class="p-2 text-center">
                        <img v-for="(img, i) in previews" :key="i" :src="img" class="img-fluid rounded shadow-sm m-1" style="max-height: 120px;">
                      </div>
                    </div>
                  </div>
                </div>
                <div class="p-2">
                  <label class="form-label">Imagen del producto</label>
                  <input type="file" class="form-control" accept="image/*" multiple @change="handleFiles"/>
                </div>
                <div class="form-floating p-2">
                  <textarea v-model="formCrear.descripcion" class="form-control" placeholder="Leave a comment here" id="floatingTextarea2" style="height: 100px"></textarea>
                  <label for="floatingTextarea2">Descripción del producto</label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          <button @click="guardarProducto" type="button" class="btn btn-success">Guardar</button>
        </div>
      </div>
    </div>
</div>
<!--  MODAL EDITAR  -->
<div class="modal fade" id="editar" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-xl">
    <div class="modal-content">
      <div class="modal-header">
        <h1 class="modal-title fs-5" id="staticBackdropLabel">Editar Producto</h1>
        <input class="form-control" style="display: none;" type="text" v-model="form.idEditar">
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="col-md-12 mb-3 container-fluid p-4">
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
              <div class="p-2 text-center">
                <img class="img-fluid rounded shadow-sm" style="max-height: 250px;">
              </div>
              <div id="carouselExample" class="carousel slide p-2">
                <div class="carousel-inner">
                  <div class="carousel-item active">
                    <div class="p-2 text-center">
                      <img v-for="(img, i) in previews" :key="i" :src="img" class="img-fluid rounded shadow-sm m-1" style="max-height: 120px;">
                    </div>
                  </div>
                </div>
              </div>
              <div class="p-2">
                <label class="form-label">Imagen del producto</label>
                <input type="file" class="form-control" accept="image/*" multiple @change="handleFiles"/>
              </div>
              <div class="form-floating p-2">
                <textarea v-model="formEditar.descripcion" class="form-control" placeholder="Leave a comment here" id="floatingTextarea2" style="height: 100px"></textarea>
                <label for="floatingTextarea2">Descripción del producto</label>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
        <button @click="editarProductoSubmit" type="button" class="btn btn-success">Guardar</button>
      </div>
    </div>
  </div>
</div>
<!--  MODAL DETALLE  -->
<div class="modal fade" id="detalle" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-xl">
    <div class="modal-content">
      <div class="modal-header">
        <h1 class="modal-title fs-5" id="staticBackdropLabel">Editar Producto</h1>
        <input class="form-control" style="display: none;" type="text" v-model="form.idEditar">
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="col-md-12 mb-3 container-fluid p-4">
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
              <div class="p-2 text-center">
                <img class="img-fluid rounded shadow-sm" style="max-height: 250px;">
              </div>
              <div id="carouselDetalle" class="carousel slide">
                <div class="carousel-indicators">
                  <button v-for="(img, index) in previews" :key="index" type="button" data-bs-target="#carouselDetalle" :data-bs-slide-to="index" :class="{ active: index === 0 }"/>
                </div>
                <div class="carousel-inner">
                  <div v-for="(img, index) in previews" :key="index" class="carousel-item" :class="{ active: index === 0 }">
                    <img :src="img" class="d-block w-100 rounded" style="height:350px; object-fit:contain;">
                  </div>
                </div>
                <button class="btn btn-dark rounded-circle position-absolute top-50 start-0 translate-middle-y ms-2" data-bs-target="#carouselDetalle" data-bs-slide="prev">
                    <i class="bi bi-chevron-left"></i>
                </button>
                <button class="btn btn-dark rounded-circle position-absolute top-50 end-0 translate-middle-y me-2" data-bs-target="#carouselDetalle" data-bs-slide="next">
                  <i class="bi bi-chevron-right"></i>
                </button>
              </div>
              <div class="p-2">
                <label class="form-label">Imagen del producto</label>
                <input type="file" class="form-control" accept="image/*" multiple @change="handleFiles"/>
              </div>
              <div class="form-floating p-2">
                <textarea disabled v-model="form.descripcionDetalle" class="form-control" placeholder="Leave a comment here" id="floatingTextarea2" style="height: 100px"></textarea>
                <label for="floatingTextarea2">Descripción del producto</label>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
      </div>
    </div>
  </div>
</div>
</template>
