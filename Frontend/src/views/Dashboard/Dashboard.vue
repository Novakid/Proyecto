<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { connectDashboardEvents, getDashboardSummary } from '../../services/dashboard';
import { useAuthorizationStore } from '../../stores/authorization';

const authorization = useAuthorizationStore();
const can = (permission) => authorization.can(permission);
const resumen = reactive({ ventasHoy: null, facturasHoy: null, pendientesHoy: null, stockBajoTotal: null, facturasPendientes: [], stockBajo: [] });
const loading = ref(true);
const error = ref('');
const ahora = ref(new Date());
let disconnectEvents = null;
let clockTimer = null;
let currentRequest = null;

const cargarResumen = async () => {
  if (currentRequest) return currentRequest;
  currentRequest = (async () => {
    try {
      const { data } = await getDashboardSummary();
      Object.assign(resumen, data, {
        facturasPendientes: Array.isArray(data.facturasPendientes) ? data.facturasPendientes : [],
        stockBajo: Array.isArray(data.stockBajo) ? data.stockBajo : [],
      });
      error.value = '';
    } catch (requestError) {
      error.value = 'No fue posible actualizar el resumen. Puedes intentarlo nuevamente.';
      console.error('Error al cargar Dashboard', requestError);
    } finally {
      loading.value = false;
      currentRequest = null;
    }
  })();
  return currentRequest;
};

const moneda = (value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value || 0));
const fechaLocal = (value) => value ? new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Sin fecha';
const fechaHoraActual = computed(() => {
  const fecha = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(ahora.value);
  const hora = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(ahora.value);
  return `${fecha} · ${hora}`;
});

const indicadores = computed(() => [
  { key: 'ventas', title: 'Ventas de hoy', value: moneda(resumen.ventasHoy), helper: 'Total timbrado hoy', icon: 'bi-currency-dollar', accent: 'success', permission: 'facturacion.ver', route: '/Facturaciones' },
  { key: 'facturas', title: 'Facturas emitidas', value: resumen.facturasHoy, helper: 'Hoy', icon: 'bi-file-earmark-text', accent: 'primary', permission: 'facturacion.ver', route: '/Facturaciones' },
  { key: 'entregas', title: 'Por entregar', value: resumen.pendientesHoy, helper: 'Pedidos pendientes', icon: 'bi-box-seam', accent: 'warning', permission: 'facturacion.ver', route: '/Facturaciones' },
  { key: 'stock', title: 'Stock bajo', value: resumen.stockBajoTotal ?? resumen.stockBajo.length, helper: 'Productos', icon: 'bi-exclamation-triangle', accent: 'danger', permission: 'catalogo.ver', route: '/Productos' },
]);

const acciones = computed(() => [
  { title: 'Nueva factura', icon: 'bi-file-earmark-plus', permission: 'facturacion.crear', route: '/Facturaciones' },
  { title: 'Nuevo producto', icon: 'bi-box-seam', permission: 'catalogo.crear', route: '/Productos' },
  { title: 'Ver usuarios', icon: 'bi-people', permission: 'usuarios.ver', route: '/Usuarios' },
].filter((action) => can(action.permission)));

onMounted(async () => {
  await cargarResumen();
  disconnectEvents = connectDashboardEvents(cargarResumen, (eventError) => console.warn('SSE Dashboard desconectado', eventError));
  clockTimer = window.setInterval(() => { ahora.value = new Date(); }, 60000);
});
onUnmounted(() => {
  disconnectEvents?.();
  if (clockTimer) window.clearInterval(clockTimer);
});
</script>

<template>
  <main class="dashboard container-fluid p-4">
    <header class="dashboard-heading d-flex justify-content-between align-items-start gap-3 mb-4">
      <div><h1 class="dashboard-title mb-1">Resumen general</h1><p class="dashboard-subtitle mb-0">Así marcha el negocio hoy</p></div>
      <time class="dashboard-clock" :datetime="ahora.toISOString()"><i class="bi bi-clock" aria-hidden="true"></i>{{ fechaHoraActual }}</time>
    </header>

    <div v-if="error" class="alert alert-warning dashboard-alert d-flex align-items-center justify-content-between gap-3" role="alert">
      <span><i class="bi bi-exclamation-circle me-2" aria-hidden="true"></i>{{ error }}</span>
      <button type="button" class="btn btn-sm btn-outline-warning" @click="cargarResumen">Reintentar</button>
    </div>

    <section aria-labelledby="indicadores-dashboard" class="mb-4">
      <h2 id="indicadores-dashboard" class="visually-hidden">Indicadores del día</h2>
      <div class="row g-3">
        <div v-for="card in indicadores" :key="card.key" class="col-12 col-md-6 col-xl-3">
          <component :is="can(card.permission) ? RouterLink : 'div'" :to="can(card.permission) ? card.route : undefined" class="metric-card text-decoration-none" :class="[`metric-card--${card.accent}`, { 'metric-card--interactive': can(card.permission) }]" :aria-label="can(card.permission) ? `Abrir ${card.title}` : undefined">
            <div class="metric-card__content">
              <span class="metric-card__title">{{ card.title }}</span>
              <template v-if="loading"><span class="dashboard-skeleton dashboard-skeleton--value" aria-label="Cargando"></span><span class="dashboard-skeleton dashboard-skeleton--text"></span></template>
              <template v-else><strong class="metric-card__value">{{ card.value }}</strong><small class="metric-card__helper">{{ card.helper }}</small></template>
            </div>
            <span class="metric-card__icon" aria-hidden="true"><i :class="['bi', card.icon]"></i></span>
          </component>
        </div>
      </div>
    </section>

    <div class="row g-3 align-items-start mb-4">
      <section class="col-12 col-xl-8" aria-labelledby="entregas-title">
        <div class="dashboard-panel dashboard-panel--fixed">
          <div class="dashboard-panel__header">
            <div><h2 id="entregas-title" class="dashboard-panel__title">Entregas pendientes</h2><p class="dashboard-panel__subtitle">Facturas pendientes del día</p></div>
            <RouterLink v-if="can('facturacion.ver')" to="/Facturaciones" class="panel-link">Ver todas</RouterLink>
          </div>
          <div v-if="loading" class="panel-loading" aria-label="Cargando entregas"><span v-for="index in 3" :key="index" class="dashboard-skeleton dashboard-skeleton--row"></span></div>
          <div v-else-if="!resumen.facturasPendientes.length" class="empty-state"><i class="bi bi-check-circle" aria-hidden="true"></i><div><strong>No hay entregas pendientes para hoy</strong><small>Las entregas aparecerán aquí cuando estén disponibles.</small></div></div>
          <div v-else class="table-responsive">
            <table class="table dashboard-table align-middle mb-0">
              <thead><tr><th scope="col">Cliente</th><th scope="col">Fecha de entrega</th><th scope="col">Estado</th><th v-if="can('facturacion.ver')" scope="col" class="text-end">Acción</th></tr></thead>
              <tbody><tr v-for="factura in resumen.facturasPendientes" :key="factura.id">
                <td class="fw-semibold">{{ factura.cliente }}</td><td>{{ fechaLocal(factura.fecha) }}</td><td><span class="status-badge"><span class="status-dot"></span>{{ factura.estatus }}</span></td>
                <td v-if="can('facturacion.ver')" class="text-end"><RouterLink to="/Facturaciones" class="btn btn-sm btn-outline-info" title="Ver facturación" aria-label="Ver detalles en facturación"><i class="bi bi-eye"></i></RouterLink></td>
              </tr></tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="col-12 col-xl-4" aria-labelledby="stock-title">
        <div class="dashboard-panel dashboard-panel--fixed">
          <div class="dashboard-panel__header"><div><h2 id="stock-title" class="dashboard-panel__title">Stock bajo</h2><p class="dashboard-panel__subtitle">Productos que requieren atención</p></div><RouterLink v-if="can('catalogo.ver')" to="/Productos" class="panel-link">Ver catálogo</RouterLink></div>
          <div v-if="loading" class="panel-loading" aria-label="Cargando productos"><span v-for="index in 3" :key="index" class="dashboard-skeleton dashboard-skeleton--row"></span></div>
          <div v-else-if="!resumen.stockBajo.length" class="empty-state empty-state--success"><i class="bi bi-check-circle" aria-hidden="true"></i><div><strong>Existencias suficientes</strong><small>Todos los productos superan el nivel mínimo.</small></div></div>
          <ul v-else class="stock-list list-unstyled mb-0"><li v-for="producto in resumen.stockBajo" :key="producto.id" class="stock-item">
            <div class="min-width-0"><strong class="stock-name">{{ producto.descripcion }}</strong><small v-if="producto.codigo" class="stock-code">{{ producto.codigo }}</small></div><span class="stock-count" :aria-label="`${producto.existencia} unidades disponibles`">{{ producto.existencia }}</span>
          </li></ul>
        </div>
      </section>
    </div>

    <section v-if="acciones.length" class="dashboard-panel quick-panel" aria-labelledby="acciones-title">
      <div class="dashboard-panel__header mb-2"><div><h2 id="acciones-title" class="dashboard-panel__title">Acciones rápidas</h2><p class="dashboard-panel__subtitle">Accesos frecuentes</p></div></div>
      <div class="quick-actions"><RouterLink v-for="accion in acciones" :key="accion.permission" :to="accion.route" class="quick-action" :title="accion.title" :aria-label="accion.title"><i :class="['bi', accion.icon]" aria-hidden="true"></i><span>{{ accion.title }}</span><i class="bi bi-chevron-right quick-action__arrow" aria-hidden="true"></i></RouterLink></div>
    </section>
  </main>
</template>

<style scoped>
.dashboard { max-width: 1600px; margin: 0 auto; }
.dashboard-title { color: var(--text-primary); font-size: clamp(1.45rem, 2vw, 1.85rem); font-weight: 750; }
.dashboard-subtitle, .dashboard-panel__subtitle { color: var(--text-secondary); }
.dashboard-clock { display: inline-flex; align-items: center; gap: .5rem; padding: .55rem .8rem; color: var(--text-secondary); background: var(--surface-bg); border: 1px solid var(--border-color); border-radius: .65rem; font-size: .9rem; white-space: nowrap; }
.dashboard-alert { padding: .65rem .8rem; }
.metric-card { position: relative; display: flex; align-items: center; justify-content: space-between; min-height: 132px; height: 100%; padding: 1.15rem; overflow: hidden; color: var(--text-primary); background: var(--surface-bg); border: 1px solid var(--border-color); border-left: 4px solid var(--metric-color); border-radius: .75rem; box-shadow: 0 .15rem .5rem var(--shadow-color); }
.metric-card--success { --metric-color: #198754; --metric-soft: rgba(25, 135, 84, .12); }.metric-card--primary { --metric-color: #0d6efd; --metric-soft: rgba(13, 110, 253, .12); }.metric-card--warning { --metric-color: #d97706; --metric-soft: rgba(217, 119, 6, .14); }.metric-card--danger { --metric-color: #dc3545; --metric-soft: rgba(220, 53, 69, .12); }
.metric-card--interactive { transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }.metric-card--interactive:hover { color: var(--text-primary); transform: translateY(-2px); box-shadow: 0 .3rem .8rem var(--shadow-color); }
.metric-card--interactive:focus-visible, .quick-action:focus-visible, .panel-link:focus-visible { outline: 3px solid rgba(13, 110, 253, .3); outline-offset: 3px; }
.metric-card__content { position: relative; z-index: 1; display: flex; flex-direction: column; min-width: 0; }.metric-card__title { margin-bottom: .5rem; color: var(--text-secondary); font-size: .86rem; font-weight: 650; }.metric-card__value { color: var(--text-primary); font-size: clamp(1.55rem, 2.5vw, 2rem); line-height: 1.15; }.metric-card__helper { margin-top: .35rem; color: var(--text-secondary); }
.metric-card__icon { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 48px; width: 48px; height: 48px; margin-left: .75rem; color: var(--metric-color); background: var(--metric-soft); border-radius: .7rem; font-size: 1.35rem; }
.dashboard-panel { background: var(--surface-bg); border: 1px solid var(--border-color); border-radius: .8rem; box-shadow: 0 .15rem .5rem var(--shadow-color); overflow: hidden; }.dashboard-panel__header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.1rem .8rem; }.dashboard-panel__title { margin: 0 0 .15rem; color: var(--text-primary); font-size: 1.05rem; font-weight: 700; }.dashboard-panel__subtitle { margin: 0; font-size: .8rem; }
.dashboard-panel--fixed { display: flex; flex-direction: column; height: 310px; }
.dashboard-panel--fixed > .table-responsive,
.dashboard-panel--fixed > .stock-list,
.dashboard-panel--fixed > .panel-loading { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }
.dashboard-panel--fixed > .empty-state { flex: 0 0 auto; }
.panel-link { color: var(--bs-primary); font-size: .82rem; font-weight: 600; text-decoration: none; white-space: nowrap; }.panel-link:hover { text-decoration: underline; }
.dashboard-table thead th { padding: .65rem 1rem; color: var(--text-secondary); background: var(--surface-secondary); border-color: var(--border-color); font-size: .75rem; font-weight: 650; text-transform: uppercase; letter-spacing: .025em; }.dashboard-table tbody td { padding: .75rem 1rem; border-color: var(--border-color); }
.dashboard-table thead { position: sticky; top: 0; z-index: 1; }
.status-badge { display: inline-flex; align-items: center; gap: .4rem; padding: .3rem .55rem; color: var(--text-primary); background: var(--surface-muted); border: 1px solid var(--border-color); border-radius: 999px; font-size: .75rem; font-weight: 600; }.status-dot { width: .45rem; height: .45rem; background: #d97706; border-radius: 50%; }
.stock-list { padding: 0 .95rem .7rem; }.stock-item { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .72rem .2rem; border-top: 1px solid var(--border-color); }.stock-name, .stock-code { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.stock-name { color: var(--text-primary); font-size: .88rem; }.stock-code { margin-top: .15rem; color: var(--text-secondary); font-size: .75rem; }
.stock-count { flex: 0 0 auto; min-width: 2rem; padding: .25rem .5rem; color: #fff; background: #b4232f; border-radius: 999px; font-size: .75rem; font-weight: 700; text-align: center; }
.empty-state { display: flex; align-items: center; gap: .8rem; margin: 0 1rem 1rem; padding: 1rem; color: var(--text-secondary); background: var(--surface-secondary); border: 1px dashed var(--border-color); border-radius: .65rem; }.empty-state > i { color: #d97706; font-size: 1.35rem; }.empty-state--success > i { color: #198754; }.empty-state strong, .empty-state small { display: block; }.empty-state strong { color: var(--text-primary); font-size: .88rem; }.empty-state small { margin-top: .15rem; font-size: .76rem; }
.panel-loading { display: grid; gap: .65rem; padding: .25rem 1rem 1rem; }.dashboard-skeleton { display: block; overflow: hidden; background: linear-gradient(90deg, var(--surface-muted) 25%, var(--surface-secondary) 50%, var(--surface-muted) 75%); background-size: 200% 100%; border-radius: .35rem; animation: skeleton 1.4s infinite linear; }.dashboard-skeleton--value { width: 65%; height: 2rem; }.dashboard-skeleton--text { width: 45%; height: .75rem; margin-top: .45rem; }.dashboard-skeleton--row { width: 100%; height: 2.7rem; }
.quick-panel { padding-bottom: .9rem; }.quick-actions { display: flex; flex-wrap: wrap; gap: .75rem; padding: 0 1rem; }.quick-action { display: inline-flex; align-items: center; gap: .6rem; min-width: 180px; padding: .75rem .9rem; color: var(--text-primary); background: var(--surface-secondary); border: 1px solid var(--border-color); border-radius: .65rem; font-size: .88rem; font-weight: 600; text-decoration: none; transition: background-color .18s ease, border-color .18s ease; }.quick-action:hover { color: var(--text-primary); background: var(--hover-bg); border-color: var(--input-border); }.quick-action > i:first-child { color: var(--bs-primary); font-size: 1.1rem; }.quick-action__arrow { margin-left: auto; color: var(--text-secondary); font-size: .75rem; }.min-width-0 { min-width: 0; }
@keyframes skeleton { to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .dashboard-skeleton { animation: none; }.metric-card--interactive { transition: none; } }
@media (max-width: 767.98px) { .dashboard-heading { flex-direction: column; margin-bottom: 1rem !important; }.dashboard-clock { align-self: flex-start; }.quick-actions { flex-direction: column; }.quick-action { width: 100%; }.dashboard-panel__header { align-items: flex-start; }.dashboard-panel--fixed { height: 300px; } }
</style>
