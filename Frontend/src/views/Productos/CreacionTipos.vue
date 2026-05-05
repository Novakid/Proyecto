<script setup>
import { ref, onMounted } from 'vue';
import { useTipos } from '../../services/tipos/useTipos';
import { reactive } from 'vue';

const { tipos, getTipos, obtenerTipo, cargarTipos, crear, eliminar, tiposFiltrados, pagination, filtros, cargarDatos, actualizar } = useTipos();

onMounted(async () => {
  await cargarDatos();
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
  activo: false,
  descripcion: '',
});
const guardarTipo = async () => {
  try {
    const formData = new FormData();
    formData.append('nombre', form.value.nombre);
    formData.append('activo', form.value.activo);
    formData.append('descripcion', form.value.descripcion);
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
const borrarTipo = async (id) => {
  try {
    await eliminar(id);
  } catch (error) {
    return error;
  }
}
const resetFiltros = async () => {
  filtros.nombre = '';
  filtros.tipoId = '';
  pagination.page = 1;
  await cargarDatos();
};
const filtrarDatos = async () => {
  try {
    pagination.page = 1;
    const resp = await getTipos({
      nombre: filtros.nombre,
      tipoId: filtros.tipoId,
      page: pagination.page,
      limit: pagination.limit
    });
    tiposFiltrados.value = resp.data;
    pagination.total = resp.total;
    pagination.lastPage = resp.lastPage;

  } catch (error) {
    console.error(error);
  }
};
const editarTipo = async (id) => {
  const resp = await obtenerTipo(id);
  const tipo = resp.data;
  form.value = {
    idEditar: tipo.id,
    nombreEditar: tipo.nombre,
    activoEditar: tipo.activo,
    descripcionEditar: tipo.descripcion
  };
  previews.value = tipo.imagenes?.map(img => `http://localhost:3000${img.url}`) || [];
  imagenes.value = [];
};
const capturarTipo = async () => {
  try {
    const formData = new FormData();
    formData.append('nombre', form.value.nombreEditar);
    formData.append('activo', form.value.activoEditar);
    formData.append('descripcion', form.value.descripcionEditar);
    imagenes.value.forEach((file) => {
      formData.append('imagenes', file);
    });
    await actualizar(form.value.idEditar, formData);
  } catch (error) {
    console.error(error);
  }
}
</script>
<template>
  <div class="col-md-12 mb-3 container-fluid p-4">
    <!-- HEADER -->
    <div class="d-flex justify-content-between align-items-center">
      <h4 class="mb-0">Tipos</h4>
      <div class="d-flex gap-2">
        <button data-bs-toggle="modal" data-bs-target="#modalCrear" class="btn btn-primary btn-sm">
          <i class="fa fa-plus"></i> Nuevo Tipo
        </button>
        <router-link to="/productos" class="btn btn-light active btn-sm">
          <i class="fa fa-arrow-left"></i> Regresar
        </router-link>
      </div>
    </div>
    <div class="card mt-3 shadow-sm border-0">
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-md-3">
            <label class="form-label">Nombre</label>
            <input v-model="filtros.nombre" type="text" class="form-control form-control-sm" placeholder="Nombre...">
          </div>
          <div class="col-md-3">
            <label class="form-label">Tipo</label>
            <select id="filtroSelect" v-model="filtros.tipoId" class="form-select form-select-sm">
              <option value="">Seleccione una opción</option>
              <option v-for="(item, index) in tipos" :key="item.id" :value="item.id">{{ item.nombre }}</option>
            </select>
          </div>
          <div class="col-md-2">
            <button class="btn btn-primary btn-sm w-100" @click="filtrarDatos();">
              Filtrar
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-3">
      <table class="table table-hover align-middle custom-table">
        <thead class="table-dark">
          <tr>
            <th>#</th>
            <th>Imagen</th>
            <th>Fecha</th>
            <th>Marca</th>
            <th>Descripción</th>
            <th>Estatus</th>
            <th class="text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in tiposFiltrados" :key="item.id">
            <td>{{ index + 1 }}</td>
            <td><img :src="`http://localhost:3000${item.imagenes[0]?.url}`" style="width: 50px;" /></td>
            <td>{{ new Date(item.fecha).toLocaleString() }}</td>
            <td>{{ item.nombre }}</td>
            <td>{{ item.descripcion }}</td>
            <td>{{ item.activo ? 'Activo' : 'Desactivado'}}</td>
            <td class="text-center">
              <button class="btn btn-sm btn-primary me-2" data-bs-toggle="modal" data-bs-target="#modalEditar" @click="editarTipo( item.id )">Editar</button>
              <button class="btn btn-sm btn-danger" @click="borrarTipo( item.id )">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="d-flex justify-content-between align-items-center mt-3">
      <div>
        Página {{ pagination.page }} de {{ pagination.lastPage }}
      </div>
      <div class="btn-group">
        <button class="btn btn-sm btn-secondary" @click="pagination.page--; cargarDatos()" :disabled="pagination.page === 1">
          Anterior
        </button>
        <button class="btn btn-sm btn-secondary"  @click="pagination.page++; cargarDatos()">
          Siguiente
        </button>
      </div>
    </div>
    </div>
  </div>
  <!-- Modal Crear -->
  <div class="modal fade" id="modalCrear" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h1 class="modal-title fs-5" id="staticBackdropLabel">Crear Tipo</h1>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="col-md-12 mb-3 container-fluid p-4">
            <div class="row">
              <!-- IZQUIERDA -->
              <div class="col-md-6">
                <div class="p-2">
                  <label class="form-label">Nombre del Tipo</label>
                  <input v-model="form.nombre" type="text" class="form-control" placeholder="Suzuki...">                    
                </div>
                <div class="p-2">
                  <label class="form-label">¿Activarlo?</label>
                  <div class="form-check">
                    <input v-model="form.activo" class="form-check-input" type="radio" name="nuevo" :value="true">
                    <label  class="form-check-label">Sí</label>
                  </div>
                  <div class="form-check">
                    <input v-model="form.activo" class="form-check-input" type="radio" name="nuevo" :value="false" checked>
                    <label  class="form-check-label">No</label>
                  </div>
                </div>
                <div class="form-floating p-2">
                  <textarea v-model="form.descripcion" class="form-control" placeholder="Leave a comment here" id="floatingTextarea2" style="height: 100px"></textarea>
                  <label  for="floatingTextarea2">Descripción del producto</label>
                </div>
                <!-- 🔥 INPUT IMAGEN -->
                <div class="p-2">
                  <label class="form-label">Logo del tipo</label>
                  <input type="file" class="form-control" accept="image/*" @change="handleFiles">
                </div>
              </div>
              <!-- DERECHA -->
              <div class="col-md-6">
                <div class="p-2 text-center">
                  <img class="img-fluid rounded shadow-sm" style="max-height: 250px;">
                </div>
                <div id="carouselExample" class="carousel slide p-2">
                  <div class="carousel-inner">
                    <div class="carousel-item active">
                      <div class="p-2 text-center">
                        <img v-for="(img, i) in previews" :key="i" :src="img" class="img-fluid rounded shadow-sm m-1" style="max-height: 220px;">
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          <button type="button" class="btn btn-success" @click="guardarTipo">Guardar</button>
        </div>
      </div>
    </div>
  </div>
  <!-- Modal Editar -->
  <div class="modal fade" id="modalEditar" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h1 class="modal-title fs-5" id="staticBackdropLabel">Editar Tipo</h1>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          <input class="form-control" style="display: none;" type="text" v-model="form.idEditar">
        </div>
        <div class="modal-body">
          <div class="col-md-12 mb-3 container-fluid p-4">
            <div class="row">
              <!-- IZQUIERDA -->
              <div class="col-md-6">
                <div class="p-2">
                  <label class="form-label">Nombre del Tipo</label>
                  <input v-model="form.nombreEditar" type="text" class="form-control" placeholder="Suzuki...">                    
                </div>
                <div class="p-2">
                  <label class="form-label">¿Activarlo?</label>
                  <div class="form-check">
                    <input v-model="form.activoEditar" class="form-check-input" type="radio" name="nuevo" :value="true">
                    <label  class="form-check-label">Sí</label>
                  </div>
                  <div class="form-check">
                    <input v-model="form.activoEditar" class="form-check-input" type="radio" name="nuevo" :value="false" checked>
                    <label  class="form-check-label">No</label>
                  </div>
                </div>
                <div class="form-floating p-2">
                  <textarea v-model="form.descripcionEditar" class="form-control" placeholder="Leave a comment here" id="floatingTextarea2" style="height: 100px"></textarea>
                  <label  for="floatingTextarea2">Descripción del producto</label>
                </div>
                <!-- 🔥 INPUT IMAGEN -->
                <div class="p-2">
                  <label class="form-label">Logo del tipo</label>
                  <input type="file" class="form-control" accept="image/*" @change="handleFiles">
                </div>
              </div>
              <!-- DERECHA -->
              <div class="col-md-6">
                <div class="p-2 text-center">
                  <img class="img-fluid rounded shadow-sm" style="max-height: 250px;">
                </div>
                <div id="carouselExample" class="carousel slide p-2">
                  <div class="carousel-inner">
                    <div class="carousel-item active">
                      <div class="p-2 text-center">
                        <img v-for="(img, i) in previews" :key="i" :src="img" class="img-fluid rounded shadow-sm m-1" style="max-height: 220px;">
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          <button type="button" class="btn btn-success" @click="capturarTipo()">Guardar</button>
        </div>
      </div>
    </div>
  </div>
</template>