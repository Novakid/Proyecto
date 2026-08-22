import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard/Dashboard.vue';
import MainLayout from '../layouts/Main/MainLayout.vue';
import CleanLayout from '../layouts/CleanLayout/CleanLayout.vue';
import Productos from '../views/Productos/Productos.vue';
import CreacionTipos from '../views/Productos/CreacionTipos.vue';
import Facturaciones from '../views/Facturaciones/Facturaciones.vue';
import Usuarios from '../views/Usuarios/Usuarios.vue';
import Cotizaciones from '../views/Cotizaciones/Cotizaciones.vue';
import Login from '../views/Login/Login.vue';
import { isAuthenticated } from '../services/auth';
import { useAuthorizationStore } from '../stores/authorization';

const routes = [
  { path: '/login', component: Login, meta: { title: 'Iniciar sesión', public: true } },
  { path: '/forbidden', component: { template: '<main class="container py-5"><div class="alert alert-warning"><h1 class="h4">Acceso no autorizado</h1><p class="mb-0">Tu cuenta no tiene permiso para abrir este módulo.</p></div></main>' }, meta: { title: 'Sin permiso', requiresAuth: true } },
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', component: Dashboard, meta: { title: 'Dashboard', requiresAuth: true, requiredPermission: 'dashboard.ver' } },
    ]
  },
  {
    path: '/Productos',
    component: CleanLayout,
    children: [
      { path: '', component: Productos, meta: { title: 'Lista de productos', requiredPermission: 'catalogo.ver' } },
      { path: 'NuevoTipo', component: CreacionTipos, meta: { title: 'Creacion de Tipos', requiredPermission: 'catalogo.crear' } }
    ]
  },
  {
    path: '/Facturaciones',
    component: CleanLayout,
    children: [
      { path: '', component: Facturaciones, meta: { title: 'Facturaciones', requiredPermission: 'facturacion.ver' } },
    ]
  },
  {
    path: '/cotizaciones',
    component: CleanLayout,
    children: [
      { path: '', component: Cotizaciones, meta: { title: 'Cotizaciones', requiredPermission: 'cotizaciones.ver' } },
    ]
  },
  {
    path: '/Usuarios',
    component: CleanLayout,
    children: [
      { path: '', component: Usuarios, meta: { title: 'Usuarios', requiredPermission: 'usuarios.ver' } },
    ]
  }
];

const router = createRouter({
  history: window.location.protocol === 'file:' ? createWebHashHistory() : createWebHistory(),
  routes
});

router.beforeEach(async (to) => {
  if (!to.meta.public && !isAuthenticated()) return '/login';
  if (to.path === '/login' && isAuthenticated()) return '/';
  if (!to.meta.public && isAuthenticated()) {
    const auth = useAuthorizationStore();
    try {
      await auth.load();
    } catch {
      return '/login';
    }
    if (to.meta.requiredPermission && !auth.can(to.meta.requiredPermission)) return to.path === '/forbidden' ? true : '/forbidden';
  }
  return true;
});

export default router;
