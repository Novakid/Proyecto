<script setup>
import { getApiAssetUrl } from '../../services/api';
import { onMounted } from 'vue';
import { useTipos } from '../../services/tipos/useTipos';
import { useTipoForm } from './js/Tipos';

const { tipos, tiposFiltrados, pagination, filtros, cargarDatos } = useTipos();
const { form, previews, handleFiles, guardarTipo, borrarTipo, filtrarDatos, editarTipo, capturarTipo } = useTipoForm();

onMounted(async () => {
  await cargarDatos();
});
</script>
<template>
  <div class="col-md-12 mb-3 container-fluid p-4">
    <!-- HEADER -->
    <div class="page-header d-flex justify-content-between align-items-center gap-2">
      <h4 class="mb-0">Tipos</h4>
      <div class="page-actions d-flex gap-2">
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
              <option v-for="item in tipos" :key="item.id" :value="item.id">{{ item.nombre }}</option>
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
      <div class="table-responsive"><table class="table table-hover align-middle custom-table">
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
            <td>
              <img v-if="item.imagenes?.[0]?.url" :src="getApiAssetUrl(item.imagenes[0].url)" class="type-table-image" alt="Logo del tipo">
              <span v-else class="type-table-image-placeholder" title="Sin imagen"><i class="bi bi-image"></i></span>
            </td>
            <td>{{ new Date(item.fecha).toLocaleString() }}</td>
            <td>{{ item.nombre }}</td>
            <td>{{ item.descripcion }}</td>
            <td><span class="badge" :class="item.activo ? 'bg-success' : 'bg-danger'">{{ item.activo ? 'Activo' : 'Desactivado'}}</span></td>
            <td class="text-center">
              <div class="d-flex justify-content-center gap-2">
                <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#modalEditar" title="Editar" aria-label="Editar tipo" @click="editarTipo(item.id)">
                  <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" title="Eliminar" aria-label="Eliminar tipo" @click="borrarTipo(item.id)">
                  <i class="bi bi-trash"></i>
                </button>
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
  <div class="modal fade type-modal" id="modalCrear" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="tituloCrearTipo" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
      <div class="modal-content modal-tipo">
        <div class="modal-header">
          <div>
            <h5 class="modal-title fw-bold" id="tituloCrearTipo">Crear tipo</h5>
            <small class="text-muted">Registra la información general y el logotipo</small>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="type-modal-layout container-fluid">
            <div class="row">
              <div class="col-md-6">
                <div class="p-2">
                  <label class="form-label">Nombre del Tipo</label>
                  <input v-model="form.nombre" type="text" class="form-control" placeholder="Suzuki...">                    
                </div>
                <div class="p-2">
                  <label class="form-label">¿Activarlo?</label>
                  <div class="form-check">
                    <input v-model="form.activo" class="form-check-input" type="radio" name="activoTipoCrear" :value="true">
                    <label  class="form-check-label">Sí</label>
                  </div>
                  <div class="form-check">
                    <input v-model="form.activo" class="form-check-input" type="radio" name="activoTipoCrear" :value="false" checked>
                    <label  class="form-check-label">No</label>
                  </div>
                </div>
                <div class="form-floating p-2">
                  <textarea id="descripcionTipoCrear" v-model="form.descripcion" class="form-control" placeholder="Descripción del tipo" style="height: 120px"></textarea>
                  <label for="descripcionTipoCrear">Descripción del tipo</label>
                </div>
              </div>
              <div class="col-md-6">
                <div class="type-image-zone">
                  <img v-if="previews.length" :src="previews[0]" class="type-image-preview" alt="Vista previa del logotipo">
                  <div v-else class="type-image-placeholder">
                    <i class="bi bi-image"></i>
                    <span>Vista previa del logotipo</span>
                  </div>
                </div>
                <div class="p-2">
                  <label class="form-label">Logo del tipo</label>
                  <input type="file" class="form-control" accept="image/*" @change="handleFiles">
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-primary" @click="guardarTipo">Crear tipo</button>
        </div>
      </div>
    </div>
  </div>
  <!-- Modal Editar -->
  <div class="modal fade type-modal" id="modalEditar" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="tituloEditarTipo" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
      <div class="modal-content modal-tipo">
        <div class="modal-header">
          <div>
            <h5 class="modal-title fw-bold" id="tituloEditarTipo">Editar tipo</h5>
            <small class="text-muted">Actualiza la información general y el logotipo</small>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          <input class="form-control" style="display: none;" type="text" v-model="form.idEditar">
        </div>
        <div class="modal-body">
          <div class="type-modal-layout container-fluid">
            <div class="row">
              <div class="col-md-6">
                <div class="p-2">
                  <label class="form-label">Nombre del Tipo</label>
                  <input v-model="form.nombreEditar" type="text" class="form-control" placeholder="Suzuki...">                    
                </div>
                <div class="p-2">
                  <label class="form-label">¿Activarlo?</label>
                  <div class="form-check">
                    <input v-model="form.activoEditar" class="form-check-input" type="radio" name="activoTipoEditar" :value="true">
                    <label  class="form-check-label">Sí</label>
                  </div>
                  <div class="form-check">
                    <input v-model="form.activoEditar" class="form-check-input" type="radio" name="activoTipoEditar" :value="false" checked>
                    <label  class="form-check-label">No</label>
                  </div>
                </div>
                <div class="form-floating p-2">
                  <textarea id="descripcionTipoEditar" v-model="form.descripcionEditar" class="form-control" placeholder="Descripción del tipo" style="height: 120px"></textarea>
                  <label for="descripcionTipoEditar">Descripción del tipo</label>
                </div>
              </div>
              <div class="col-md-6">
                <div class="type-image-zone">
                  <img v-if="previews.length" :src="previews[0]" class="type-image-preview" alt="Vista previa del logotipo">
                  <div v-else class="type-image-placeholder">
                    <i class="bi bi-image"></i>
                    <span>Tipo sin logotipo</span>
                  </div>
                </div>
                <div class="p-2">
                  <label class="form-label">Logo del tipo</label>
                  <input type="file" class="form-control" accept="image/*" @change="handleFiles">
                  <div class="form-text">Selecciona un archivo únicamente si deseas reemplazar el logotipo actual.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-primary" @click="capturarTipo()">Guardar cambios</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.type-table-image,
.type-table-image-placeholder {
  width: 50px;
  height: 50px;
  border-radius: .5rem;
}
.type-table-image {
  display: block;
  object-fit: contain;
  background: var(--bs-tertiary-bg);
  border: 1px solid var(--bs-border-color);
}
.type-table-image-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--bs-secondary-color);
  background: var(--bs-tertiary-bg);
  border: 1px solid var(--bs-border-color);
}
.type-modal .modal-body {
  max-height: 72vh;
  padding: 1rem;
}
.type-modal .modal-header,
.type-modal .modal-footer {
  border-color: var(--bs-border-color);
}
.type-modal-layout {
  padding: 1rem;
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: .75rem;
}
.type-modal .form-label {
  margin-bottom: .4rem;
  font-weight: 600;
}
.type-image-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 260px;
  margin: .5rem;
  padding: .75rem;
  overflow: hidden;
  background: var(--bs-tertiary-bg);
  border: 1px dashed var(--bs-border-color);
  border-radius: .75rem;
}
.type-image-preview {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: .5rem;
}
.type-image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  color: var(--bs-secondary-color);
  text-align: center;
}
.type-image-placeholder .bi {
  font-size: 2rem;
}
.type-modal .modal-footer .btn {
  min-width: 110px;
}
@media (max-width: 576px) {
  .type-modal .modal-dialog { margin: .5rem; }
  .type-modal-layout { padding: .75rem; }
  .type-image-zone { height: 210px; }
  .type-modal .modal-footer { flex-wrap: nowrap; }
  .type-modal .modal-footer .btn { min-width: 0; flex: 1; }
}
</style>
