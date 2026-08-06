<script setup>
import { onMounted, ref } from 'vue';
import './style/index.css';
import { useUsuarios } from '../../services/usuarios/useUsuarios';
import { useUsuarioForm } from './js/Usuarios';
import PreciosEspecialesModal from './components/PreciosEspecialesModal.vue';
const { usuariosFiltrados, obtenerUsuarios, cambiarPagina, filtrar, filtros, pagination } = useUsuarios();
const { formCrear, formEditar, guardarUsuario, actualizarUsuario, eliminarUsuario, detalleUsuario, detalle, editarUsuario } = useUsuarioForm();
const clienteDescuentos = ref(null);
const abrirDescuentos = (usuario) => { clienteDescuentos.value = usuario; };
onMounted(async () => {
  await obtenerUsuarios();
});
</script>
<template>
<div class="col-md-12 mb-3 container-fluid p-4">
  <div class="d-flex justify-content-between align-items-center">
    <h4 class="mb-0">Productos</h4>
    <div class="d-flex gap-2">
      <button data-bs-toggle="modal" data-bs-target="#creacion" class="btn btn-primary btn-sm">
        <i class="fa fa-plus"></i> Nuevo Usuario
      </button>
    </div>
  </div>
    <div class="card mt-3 shadow-sm border-0">
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-md-3">
            <label class="form-label">Nombre</label>
            <input v-model="filtros.nombre" type="text" class="form-control form-control-sm" placeholder="XXXX XXXX XXX...">
          </div>
          <div class="col-md-3">
            <label class="form-label">Estatus</label>
            <select v-model="filtros.estatus" class="form-select form-select-sm">
              <option value="">Seleccione una opción</option>
              <option value="1">Activo</option>
              <option value="2">Desactivado</option>
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
    <table class="table table-hover align-middle custom-table">
      <thead class="table-dark">
        <tr class="text-center">
          <th>#</th>
          <th>Nombre</th>
          <th>Tipo</th>
          <th>¿Descuento especial?</th>
          <th>Estatus</th>
          <th>Fecha de ingreso</th>
          <th class="text-center">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in usuariosFiltrados" :key="item.id" class="text-center">
          <td>{{ item.id }}</td>
          <td>{{ item.Nombre }} {{ item.Apellido_p }} {{ item.Apellido_m }}</td>
          <td>{{ item.identidad }}</td>
          <td><span class="badge" :class="Number(item.descuento || 0) > 0 ? 'bg-success' : 'bg-danger'">{{ Number(item.descuento || 0) > 0 ? item.descuento + '%' : 'No' }}</span></td>
          <td><span class="badge" :class="item.estatus == 1 ? 'bg-success' : 'bg-danger'">{{ item.estatus == 1 ? 'Activo' : 'Inactivo' }}</span></td>
          <td>{{ item.fecha_creacion }}</td>
          <td class="text-center">
              <div class="d-flex justify-content-center gap-2">
                  <!-- Detalles -->
                  <button @click="detalleUsuario(item.id)" class="btn btn-sm btn-outline-info" title="Detalles" data-bs-toggle="modal" data-bs-target="#detalle">
                    <i class="bi bi-eye"></i>
                  </button>
                  <!-- Editar -->
                  <button @click="editarUsuario(item.id)" class="btn btn-sm btn-outline-primary" title="Editar" data-bs-toggle="modal" data-bs-target="#editar">
                    <i class="bi bi-pencil-square"></i>
                  </button>
                  <!-- Descuentos -->
                  <button v-if="item.identidad?.trim().toLowerCase() === 'cliente'" @click="abrirDescuentos(item)" class="btn btn-sm btn-outline-warning" title="Precios especiales">
                    <i class="bi bi-tags"></i>
                  </button>
                  <!-- Eliminar -->
                  <button @click="eliminarUsuario(item.id)" class="btn btn-sm btn-outline-danger" title="Eliminar">
                    <i class="bi bi-trash"></i>
                  </button>
              </div>
          </td>
        </tr>
      </tbody>
    </table>
      <div class="d-flex justify-content-between align-items-center mt-3">
        <div>
          Página
        </div>
        <div class="btn-group">
          <button class="btn btn-sm btn-secondary" @click="cambiarPagina(pagination.page - 1)" :disabled="pagination.page <= 1">
            Anterior
          </button>
          <button class="btn btn-sm btn-secondary" @click="cambiarPagina(pagination.page + 1)" :disabled="pagination.page >= pagination.lastPage">
            Siguiente
          </button>
        </div>
      </div>
  </div>
</div>
<!--  MODAL CREACION  -->
<div class="modal fade" id="creacion" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-xl">
    <div class="modal-content modal-producto">
      <!-- HEADER -->
      <div class="modal-header">
        <div>
          <h5 class="modal-title fw-bold">
            <i class="bi bi-person-plus me-2 text-primary"></i>
            Crear cliente
          </h5>
          <small class="text-muted">
            Registra la información general y fiscal del cliente
          </small>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <!-- BODY -->
      <div class="modal-body">
        <!-- DATOS PERSONALES -->
        <div class="form-section">
          <h6 class="section-title">
            <i class="bi bi-person me-2"></i>
            Datos personales
          </h6>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Nombre</label>
              <input type="text" v-model="formCrear.Nombre" class="form-control" placeholder="Ej. Juan">
            </div>
            <div class="col-md-6">
              <label class="form-label">Apellido paterno</label>
              <input type="text" v-model="formCrear.Apellido_p" class="form-control" placeholder="Ej. Pérez">
            </div>
            <div class="col-md-6">
              <label class="form-label">Apellido materno</label>
              <input type="text" v-model="formCrear.Apellido_m" class="form-control">
            </div>
            <div class="col-md-6">
              <label class="form-label">RFC</label>
              <input type="text" v-model="formCrear.rfc" class="form-control" placeholder="XXXX000000XXX">
            </div>
          </div>
        </div>
        <!-- DOMICILIO -->
        <div class="form-section mt-4">
          <h6 class="section-title">
            <i class="bi bi-geo-alt me-2"></i>
            Domicilio
          </h6>
          <div class="row g-3">
            <div class="col-md-8">
              <label class="form-label">Calle</label>
              <input type="text" v-model="formCrear.Calle" class="form-control">
            </div>
            <div class="col-md-2">
              <label class="form-label">
                Número interior
              </label>
              <input type="text" v-model="formCrear.num_interior" class="form-control">
            </div>
            <div class="col-md-2">
              <label class="form-label">
                Número exterior
              </label>
              <input type="text" v-model="formCrear.num_exterior" class="form-control">
            </div>
            <div class="col-md-4">
              <label class="form-label">
                Colonia
              </label>
              <input type="text" v-model="formCrear.colonia" class="form-control">
            </div>
            <div class="col-md-4">
              <label class="form-label">
                Población
              </label>
              <input type="text" v-model="formCrear.poblacion" class="form-control">
            </div>
            <div class="col-md-4">
              <label class="form-label">
                Código postal
              </label>
              <input type="text" v-model="formCrear.cp" class="form-control">
            </div>
          </div>
        </div>
        <!-- CONFIGURACIÓN -->
        <div class="form-section mt-4">
          <h6 class="section-title">
            <i class="bi bi-gear me-2"></i>
            Configuración
          </h6>
          <div class="row align-items-center">
            <div class="col-md-6">
              <label class="form-label">
                ¿Activar cuenta?
              </label>
              <div class="d-flex gap-4">
                <div class="form-check">
                  <input class="form-check-input" v-model="formCrear.estatus" type="radio" name="activo" value="1" checked>
                  <label class="form-check-label">
                    Sí
                  </label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" v-model="formCrear.estatus" type="radio" name="activo" value="2">
                  <label class="form-check-label">
                    No
                  </label>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <label class="form-label">
                Identidad
              </label>
              <select class="form-select" v-model="formCrear.identidad">
                <option value="Cliente">Cliente</option>
                <option value="Empleado">Empleado</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <!-- FOOTER -->
      <div class="modal-footer">
        <button class="btn btn-light" data-bs-dismiss="modal">
          Cancelar
        </button>
        <button class="btn btn-primary px-4" @click="guardarUsuario">
          <i class="bi bi-save me-2"></i>
          Guardar cliente
        </button>
      </div>
    </div>
  </div>
</div>
<!-- MODAL EDICION -->
<div class="modal fade" id="editar" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-xl">
    <div class="modal-content modal-producto">
      <div class="modal-header">
        <h5 class="modal-title fw-bold">Editar cliente</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="row g-3">
          <div class="col-md-4"><label class="form-label">Nombre</label><input v-model="formEditar.Nombre" class="form-control"></div>
          <div class="col-md-4"><label class="form-label">Apellido paterno</label><input v-model="formEditar.Apellido_p" class="form-control"></div>
          <div class="col-md-4"><label class="form-label">Apellido materno</label><input v-model="formEditar.Apellido_m" class="form-control"></div>
          <div class="col-md-4"><label class="form-label">RFC</label><input v-model="formEditar.rfc" class="form-control"></div>
          <div class="col-md-8"><label class="form-label">Calle</label><input v-model="formEditar.Calle" class="form-control"></div>
          <div class="col-md-3"><label class="form-label">Núm. interior</label><input v-model="formEditar.num_interior" class="form-control"></div>
          <div class="col-md-3"><label class="form-label">Núm. exterior</label><input v-model="formEditar.num_exterior" class="form-control"></div>
          <div class="col-md-3"><label class="form-label">Colonia</label><input v-model="formEditar.colonia" class="form-control"></div>
          <div class="col-md-3"><label class="form-label">Población</label><input v-model="formEditar.poblacion" class="form-control"></div>
          <div class="col-md-3"><label class="form-label">Código postal</label><input v-model="formEditar.cp" class="form-control"></div>
          <div class="col-md-3"><label class="form-label">Descuento (%)</label><input v-model.number="formEditar.descuento" type="number" min="0" max="100" class="form-control"></div>
          <div class="col-md-3"><label class="form-label">Estatus</label><select v-model.number="formEditar.estatus" class="form-select"><option :value="1">Activo</option><option :value="2">Inactivo</option></select></div>
          <div class="col-md-3"><label class="form-label">Identidad</label><select v-model="formEditar.identidad" class="form-select"><option value="Cliente">Cliente</option><option value="Empleado">Empleado</option></select></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
        <button class="btn btn-success" @click="actualizarUsuario">Guardar</button>
      </div>
    </div>
  </div>
</div>
<!--  MODAL DETALLE  -->
<div class="modal fade" id="detalle" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-xl">
    <div class="modal-content modal-producto">
      <!-- HEADER -->
      <div class="modal-header">
        <div>
          <h5 class="modal-title fw-bold">
            <i class="bi bi-person-plus me-2 text-primary"></i>
            Detalles del cliente
          </h5>
          <small class="text-muted">
            Detalles de la información general y fiscal del cliente
          </small>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <!-- BODY -->
      <div class="modal-body">
        <!-- DATOS PERSONALES -->
        <div class="form-section">
          <h6 class="section-title">
            <i class="bi bi-person me-2"></i>
            Datos personales
          </h6>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Nombre</label>
              <input type="text" :value="detalle.Nombre" class="form-control" placeholder="Ej. Juan" readonly>
            </div>
            <div class="col-md-6">
              <label class="form-label">Apellido paterno</label>
              <input type="text" :value="detalle.Apellido_p" class="form-control" placeholder="Ej. Pérez" readonly>
            </div>
            <div class="col-md-6">
              <label class="form-label">Apellido materno</label>
              <input type="text" :value="detalle.Apellido_m" class="form-control" readonly>
            </div>
            <div class="col-md-6">
              <label class="form-label">RFC</label>
              <input type="text" :value="detalle.rfc" class="form-control" placeholder="XXXX000000XXX" readonly>
            </div>
          </div>
        </div>
        <!-- DOMICILIO -->
        <div class="form-section mt-4">
          <h6 class="section-title">
            <i class="bi bi-geo-alt me-2"></i>
            Domicilio
          </h6>
          <div class="row g-3">
            <div class="col-md-8">
              <label class="form-label">Calle</label>
              <input type="text" :value="detalle.Calle" class="form-control" readonly>
            </div>
            <div class="col-md-2">
              <label class="form-label">
                Número interior
              </label>
              <input type="text" :value="detalle.num_interior" class="form-control" readonly>
            </div>
            <div class="col-md-2">
              <label class="form-label">
                Número exterior
              </label>
              <input type="text" :value="detalle.num_exterior" class="form-control" readonly>
            </div>
            <div class="col-md-4">
              <label class="form-label">
                Colonia
              </label>
              <input type="text" :value="detalle.colonia" class="form-control" readonly>
            </div>
            <div class="col-md-4">
              <label class="form-label">
                Población
              </label>
              <input type="text" :value="detalle.poblacion" class="form-control" readonly>
            </div>
            <div class="col-md-4">
              <label class="form-label">
                Código postal
              </label>
              <input type="text" :value="detalle.cp" class="form-control" readonly>
            </div>
          </div>
        </div>
        <!-- CONFIGURACIÓN -->
        <div class="form-section mt-4">
          <h6 class="section-title">
            <i class="bi bi-gear me-2"></i>
            Configuración
          </h6>
          <div class="row align-items-center">
            <div class="col-md-6">
              <label class="form-label">
                ¿Activar cuenta?
              </label>
              <div class="d-flex gap-4">
                <div class="form-check">
                  <input class="form-check-input" :checked="detalle.estatus == 1" type="radio" name="activo" disabled>
                  <label class="form-check-label">
                    Sí
                  </label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" :checked="detalle.estatus == 2" type="radio" name="activo" disabled>
                  <label class="form-check-label">
                    No
                  </label>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <label class="form-label">
                Identidad
              </label>
              <select class="form-select" :value="detalle.identidad" readonly>
                <option value="Cliente">Cliente</option>
                <option value="Empleado">Empleado</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <!-- FOOTER -->
      <div class="modal-footer">
        <button class="btn btn-primary" data-bs-dismiss="modal">
          Cerrar
        </button>
      </div>
    </div>
  </div>
</div>
<PreciosEspecialesModal :cliente="clienteDescuentos" @close="clienteDescuentos = null" />
</template>
