<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { connectDashboardEvents, getDashboardSummary } from '../../services/dashboard';

const resumen = reactive({ ventasHoy: 0, facturasHoy: 0, pendientesHoy: 0, facturasPendientes: [], stockBajo: [] });
const error = ref('');
let disconnectEvents = null;
const cargarResumen = async () => {
  try {
    const { data } = await getDashboardSummary();
    Object.assign(resumen, data);
    error.value = '';
  } catch (requestError) {
    error.value = 'No fue posible actualizar el Dashboard';
    console.error('Error al cargar Dashboard', requestError);
  }
};
const moneda = (value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value || 0));
const fechaLocal = (value) => value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value)) : '';
onMounted(async () => {
  await cargarResumen();
  disconnectEvents = connectDashboardEvents(cargarResumen, (eventError) => console.warn('SSE Dashboard desconectado', eventError));
});
onUnmounted(() => disconnectEvents?.());
</script>

<template>
  <div class="container-fluid p-4">
    <div class="row mb-4">
      <div class="col-md-4"><div class="card shadow-sm border-0"><div class="card-body">
        <h6 class="text-muted">Ventas de hoy</h6><h3 class="fw-bold text-success">{{ moneda(resumen.ventasHoy) }}</h3>
      </div></div></div>
      <div class="col-md-4"><div class="card shadow-sm border-0"><div class="card-body">
        <h6 class="text-muted">Facturas emitidas</h6><h3 class="fw-bold text-primary">{{ resumen.facturasHoy }}</h3>
      </div></div></div>
      <div class="col-md-4"><div class="card shadow-sm border-0"><div class="card-body">
        <h6 class="text-muted">Pedidos pendientes</h6><h3 class="fw-bold text-warning">{{ resumen.pendientesHoy }}</h3>
      </div></div></div>
    </div>
    <div class="row">
      <div class="col-md-8"><div class="card shadow-sm border-0"><div class="card-body">
        <h5 class="mb-3">Pedidos pendientes</h5>
        <div class="table-responsive scroll-box"><table class="table table-hover">
          <thead><tr><th>ID</th><th>Cliente</th><th>Fecha</th><th>Estado</th></tr></thead>
          <tbody>
            <tr v-for="factura in resumen.facturasPendientes" :key="factura.id">
              <td>#{{ factura.id }}</td><td>{{ factura.cliente }}</td><td>{{ fechaLocal(factura.fecha) }}</td>
              <td><span class="badge bg-warning">{{ factura.estatus }}</span></td>
            </tr>
            <tr v-if="!resumen.facturasPendientes.length"><td colspan="4" class="text-muted">Sin pedidos pendientes hoy</td></tr>
          </tbody>
        </table></div>
      </div></div></div>
      <div class="col-md-4"><div class="card shadow-sm border-0"><div class="card-body">
        <h5 class="mb-3">Stock bajo</h5><div class="scroll-box"><ul class="list-group list-group-flush">
          <li v-for="producto in resumen.stockBajo" :key="producto.id" class="list-group-item d-flex justify-content-between">
            {{ producto.descripcion }}<span class="badge bg-danger">{{ producto.existencia }}</span>
          </li>
          <li v-if="!resumen.stockBajo.length" class="list-group-item text-muted">Sin productos con stock bajo</li>
        </ul></div>
      </div></div></div>
    </div>
    <small v-if="error" class="text-muted">{{ error }}</small>
  </div>
</template>
