<script setup>
import { ref, onMounted } from 'vue';
import { useProductos } from '../../services/productos/useProductos';

const { productos, cargarProductos, crear, eliminar } = useProductos();

onMounted(async () => {
  await cargarProductos();
});
const handleFiles = (event) => {
  const files = event.target.files;
  imagenes.value = Array.from(files);
  previews.value = imagenes.value.map(file => URL.createObjectURL(file));
};
const imagenes = ref([]);
const previews = ref([]);
const form = ref({
  nombre: '',
  codigo: '',
  precio: null,
  stock: null,
  nuevo: false,
  almacen: 0,
  piso: 0,
  descripcion: ''
});
const guardarProducto = async () => {
  try {
    const formData = new FormData();
    formData.append('nombre', form.value.nombre);
    formData.append('precio', form.value.precio);
    formData.append('stock', form.value.stock);
    formData.append('descripcion', form.value.descripcion);
    formData.append('nuevo', form.value.nuevo);
    formData.append('codigo', form.value.codigo);
    formData.append('almacen', form.value.almacen);
    formData.append('piso', form.value.piso);
    imagenes.value.forEach((file) => {
      formData.append('imagenes', file);
    });
    await crear(formData);
    form.value = {
      nombre: '',
      activo: false,
      descripcion: '',
    };
    imagenes.value = [];
    previews.value = [];
  } catch (error) {
    console.error(error);
  }
};
</script>
<template>
<div class="col-md-12 mb-3 container-fluid p-4">
  <!-- HEADER -->
  <div class="d-flex justify-content-between align-items-center">
    <h4 class="mb-0">Productos</h4>
    <div class="d-flex gap-2">
      <button data-bs-toggle="modal" data-bs-target="#pruebas" class="btn btn-primary btn-sm">
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
            <input type="text" class="form-control form-control-sm" placeholder="Goma...">
          </div>
          <div class="col-md-2">
            <label class="form-label">Desde</label>
            <input type="date" class="form-control form-control-sm">
          </div>
          <div class="col-md-2">
            <label class="form-label">Hasta</label>
            <input type="date" class="form-control form-control-sm">
          </div>
          <div class="col-md-3">
            <label class="form-label">Tipo</label>
            <select class="form-select form-select-sm">
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
  <div class="mt-3">
    <table class="table table-hover align-middle custom-table">
      <thead class="table-dark">
        <tr>
          <th>#</th>
          <th>Producto</th>
          <th>Monto</th>
          <th>Stock</th>
          <th>Existencia</th>
          <th>¿Es nuevo?</th>
          <th>Estatus</th>
          <th class="text-center">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in productos" :key="item.id">
          <td>{{ index + 1 }}</td>
          <td>{{ new Date(item.fechaIngreso).toLocaleString() }}</td>
          <td>{{ item.nombre }}</td>
          <td>${{ item.precio }}</td>
          <td>{{ item.stock }}</td>
          <td>
            <span
              class="badge"
              :class="item.stock > 0 ? 'bg-success' : 'bg-danger'"
            >
              {{ item.stock > 0 ? 'Disponible' : 'Sin stock' }}
            </span>
          </td>
          <td class="text-center">
            <button class="btn btn-sm btn-secondary me-2">Detalles</button>
            <button class="btn btn-sm btn-primary me-2">Editar</button>
            <button class="btn btn-sm btn-danger">Eliminar</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
<!--  MODAL CREACION  -->
<div class="modal fade" id="pruebas" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h1 class="modal-title fs-5" id="staticBackdropLabel">Crear Producto</h1>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="col-md-12 mb-3 container-fluid p-4">
            <div class="row">
              <!-- IZQUIERDA -->
              <div class="col-md-6">
                <div class="p-2">
                  <label class="form-label">Nombre del producto</label>
                  <input v-model="form.nombre" type="text" class="form-control" placeholder="GMG-092...">                    
                </div>
                <div class="p-2">
                  <label class="form-label">Código del producto</label>
                  <input v-model="form.codigo" type="text" class="form-control" placeholder="GMG-092...">                    
                </div>
                <div class="p-2">
                  <label class="form-label">Tipo</label>
                  <select class="form-select">
                    <option value="">Seleccione una opción</option>
                    <option value="01">Nissan</option>
                    <option value="02">Versa</option>
                  </select>
                </div>
                <div class="p-2">
                  <label class="form-label">Precio</label>
                  <input v-model="form.precio" type="number" class="form-control" placeholder="$100.00..">
                </div>
                <div class="p-2">
                  <label class="form-label">Stock</label>
                  <input v-model="form.stock" type="number" class="form-control" placeholder="01...">
                </div>
                <div class="p-2">
                  <label class="form-label">¿Es producto nuevo?</label>
                  <div class="form-check">
                    <input v-model="form.nuevo" class="form-check-input" type="radio" name="nuevo" :value="true">
                    <label class="form-check-label">Sí</label>
                  </div>
                  <div class="form-check">
                    <input v-model="form.nuevo" class="form-check-input" type="radio" name="nuevo" :value="false" checked>
                    <label class="form-check-label">No</label>
                  </div>
                </div>
                <!-- 🔥 INPUT IMAGEN -->
                <div class="p-2">
                  <label class="form-label">Imagen del producto</label>
                  <input type="file" class="form-control" accept="image/*" multiple @change="handleFiles"/>
                </div>
              </div>
              <!-- DERECHA -->
              <div class="col-md-6">
                <!-- PREVIEW (reemplaza carousel dinámicamente si quieres) -->
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
                <div class="form-floating p-2">
                  <textarea v-model="form.descripcion" class="form-control" placeholder="Leave a comment here" id="floatingTextarea2" style="height: 100px"></textarea>
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
</template>