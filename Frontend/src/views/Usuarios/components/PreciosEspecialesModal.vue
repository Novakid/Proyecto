<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  createPrecioEspecial,
  getPreciosEspeciales,
  getProductosDisponibles,
  updatePrecioEspecial,
} from '../../../services/usuarios/preciosEspeciales';

const props = defineProps({ cliente: { type: Object, default: null } });
const emit = defineEmits(['close']);
const precios = ref([]);
const productos = ref([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const success = ref('');
const search = ref('');
const filtroEstatus = ref('');
const productSearch = ref('');
const selectedProductId = ref('');
const precioNuevo = ref('');
const pagination = ref({ page: 1, lastPage: 1, total: 0 });
const productPagination = ref({ page: 1, lastPage: 1, total: 0 });
const editing = ref({});
let debounceTimer;
let productRequest = 0;

const visible = computed(() => Boolean(props.cliente));
const messageFrom = (err) => {
  if (!err.response) return 'No fue posible conectar con el servidor.';
  const message = err.response?.data?.message;
  return Array.isArray(message) ? message.join('. ') : (message || 'No fue posible completar la operación.');
};

async function cargar(page = 1) {
  if (!props.cliente) return;
  loading.value = true;
  error.value = '';
  try {
    const { data } = await getPreciosEspeciales(props.cliente.id, {
      page, limit: 8, search: search.value || undefined, estatus: filtroEstatus.value || undefined,
    });
    precios.value = Array.isArray(data.data) ? data.data : [];
    pagination.value = { page: data.page, lastPage: data.lastPage, total: data.total };
    editing.value = {};
  } catch (err) {
    error.value = messageFrom(err);
  } finally {
    loading.value = false;
  }
}

async function buscarProductos(page = 1) {
  if (!props.cliente) return;
  const request = ++productRequest;
  try {
    const { data } = await getProductosDisponibles(props.cliente.id, {
      page, limit: 10, search: productSearch.value || undefined,
    });
    if (request !== productRequest) return;
    productos.value = Array.isArray(data.data) ? data.data : [];
    productPagination.value = { page: data.page, lastPage: data.lastPage, total: data.total };
    if (!productos.value.some((item) => item.id === Number(selectedProductId.value))) selectedProductId.value = '';
  } catch (err) {
    if (request === productRequest) error.value = messageFrom(err);
  }
}

watch(() => props.cliente, async (cliente) => {
  if (!cliente) return;
  search.value = '';
  filtroEstatus.value = '';
  productSearch.value = '';
  selectedProductId.value = '';
  precioNuevo.value = '';
  success.value = '';
  await Promise.all([cargar(1), buscarProductos(1)]);
});

watch(productSearch, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => buscarProductos(1), 300);
});
onBeforeUnmount(() => clearTimeout(debounceTimer));

async function agregar() {
  error.value = '';
  success.value = '';
  const parsed = Number(precioNuevo.value);
  if (!selectedProductId.value || precioNuevo.value === '' || !Number.isFinite(parsed) || parsed < 0 || !/^\d+(\.\d{1,2})?$/.test(String(precioNuevo.value))) {
    error.value = 'Selecciona un producto e ingresa un precio válido con máximo dos decimales.';
    return;
  }
  saving.value = true;
  try {
    await createPrecioEspecial(props.cliente.id, { productoId: Number(selectedProductId.value), precioEspecial: parsed });
    success.value = 'Precio especial guardado.';
    selectedProductId.value = '';
    precioNuevo.value = '';
    await Promise.all([cargar(1), buscarProductos(1)]);
  } catch (err) {
    error.value = messageFrom(err);
  } finally {
    saving.value = false;
  }
}

function comenzarEdicion(item) {
  editing.value = { id: item.id, precioEspecial: Number(item.precioEspecial).toFixed(2) };
}

async function guardarEdicion(item) {
  const value = String(editing.value.precioEspecial ?? '');
  const parsed = Number(value);
  if (!/^\d+(\.\d{1,2})?$/.test(value) || !Number.isFinite(parsed) || parsed < 0) {
    error.value = 'El precio debe ser válido y tener máximo dos decimales.';
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    await updatePrecioEspecial(props.cliente.id, item.id, { precioEspecial: parsed });
    success.value = 'Precio actualizado.';
    await cargar(pagination.value.page);
  } catch (err) {
    error.value = messageFrom(err);
  } finally {
    saving.value = false;
  }
}

async function cambiarEstatus(item) {
  saving.value = true;
  error.value = '';
  try {
    await updatePrecioEspecial(props.cliente.id, item.id, { estatus: item.estatus === 1 ? 2 : 1 });
    success.value = item.estatus === 1 ? 'Precio desactivado.' : 'Precio reactivado.';
    await cargar(pagination.value.page);
  } catch (err) {
    error.value = messageFrom(err);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div v-if="visible" class="modal-backdrop-custom" role="dialog" aria-modal="true">
    <div class="modal-panel">
      <div class="modal-header">
        <div><h5 class="mb-0">Precios especiales</h5><small>{{ cliente.Nombre }} · {{ cliente.identidad }}</small></div>
        <button class="btn-close" type="button" aria-label="Cerrar" @click="emit('close')"></button>
      </div>
      <div class="modal-body">
        <div v-if="error" class="alert alert-danger">{{ error }}</div>
        <div v-if="success" class="alert alert-success">{{ success }}</div>
        <section class="card card-body mb-3">
          <h6>Agregar producto activo</h6>
          <div class="row g-2 align-items-end">
            <div class="col-md-4"><label class="form-label">Buscar</label><input v-model="productSearch" class="form-control" placeholder="Código o nombre"></div>
            <div class="col-md-4"><label class="form-label">Producto</label><select v-model="selectedProductId" class="form-select"><option value="">Selecciona...</option><option v-for="producto in productos" :key="producto.id" :value="producto.id">{{ producto.codigo }} — {{ producto.descripcion }} (${{ Number(producto.precio).toFixed(2) }})</option></select></div>
            <div class="col-md-2"><label class="form-label">Precio especial</label><input v-model="precioNuevo" type="number" min="0" step="0.01" class="form-control"></div>
            <div class="col-md-2"><button class="btn btn-primary w-100" :disabled="saving" @click="agregar">Agregar</button></div>
          </div>
          <div class="d-flex justify-content-end gap-2 mt-2"><button class="btn btn-sm btn-outline-secondary" :disabled="productPagination.page <= 1" @click="buscarProductos(productPagination.page - 1)">Anterior</button><span>{{ productPagination.page }}/{{ productPagination.lastPage }}</span><button class="btn btn-sm btn-outline-secondary" :disabled="productPagination.page >= productPagination.lastPage" @click="buscarProductos(productPagination.page + 1)">Siguiente</button></div>
        </section>
        <div class="row g-2 mb-2"><div class="col-md-6"><input v-model="search" class="form-control" placeholder="Filtrar por código o nombre" @keyup.enter="cargar(1)"></div><div class="col-md-3"><select v-model="filtroEstatus" class="form-select"><option value="">Todos</option><option value="1">Activos</option><option value="2">Inactivos</option></select></div><div class="col-md-3"><button class="btn btn-outline-primary w-100" @click="cargar(1)">Filtrar</button></div></div>
        <div v-if="loading" class="text-center p-4">Cargando...</div>
        <div v-else class="table-responsive"><table class="table table-sm align-middle"><thead><tr><th>Código</th><th>Producto</th><th>Normal</th><th>Especial</th><th>Estatus</th><th>Responsable</th><th>Actualización</th><th>Acciones</th></tr></thead><tbody><tr v-for="item in precios" :key="item.id"><td>{{ item.producto?.codigo }}</td><td>{{ item.producto?.descripcion }}<span v-if="!item.producto?.activo" class="badge bg-secondary ms-1">Inactivo</span></td><td>${{ Number(item.producto?.precio).toFixed(2) }}</td><td><input v-if="editing.id === item.id" v-model="editing.precioEspecial" type="number" min="0" step="0.01" class="form-control form-control-sm"><span v-else>${{ Number(item.precioEspecial).toFixed(2) }}</span></td><td><span class="badge" :class="item.estatus === 1 ? 'bg-success' : 'bg-secondary'">{{ item.estatus === 1 ? 'Activo' : 'Inactivo' }}</span></td><td>{{ item.empleado?.Nombre || '—' }}</td><td>{{ new Date(item.fechaActualizacion).toLocaleString() }}</td><td><button v-if="editing.id !== item.id" class="btn btn-sm btn-outline-primary me-1" @click="comenzarEdicion(item)">Editar</button><button v-else class="btn btn-sm btn-success me-1" :disabled="saving" @click="guardarEdicion(item)">Guardar</button><button class="btn btn-sm btn-outline-warning" :disabled="saving" @click="cambiarEstatus(item)">{{ item.estatus === 1 ? 'Desactivar' : 'Reactivar' }}</button></td></tr><tr v-if="!precios.length"><td colspan="8" class="text-center text-muted">Sin precios especiales</td></tr></tbody></table></div>
        <div class="d-flex justify-content-end gap-2"><button class="btn btn-sm btn-secondary" :disabled="pagination.page <= 1" @click="cargar(pagination.page - 1)">Anterior</button><span>{{ pagination.page }}/{{ pagination.lastPage }} ({{ pagination.total }})</span><button class="btn btn-sm btn-secondary" :disabled="pagination.page >= pagination.lastPage" @click="cargar(pagination.page + 1)">Siguiente</button></div>
      </div>
      <div class="modal-footer"><button class="btn btn-light" @click="emit('close')">Cerrar</button></div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop-custom { position: fixed; inset: 0; z-index: 2000; background: rgb(0 0 0 / 55%); display: grid; place-items: center; padding: 1rem; }
.modal-panel { background: white; border-radius: .5rem; width: min(1200px, 98vw); max-height: 94vh; overflow: auto; box-shadow: 0 1rem 3rem rgb(0 0 0 / 30%); }
</style>
