import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard/Dashboard.vue';
import MainLayout from '../layouts/Main/MainLayout.vue';
import CleanLayout from '../layouts/CleanLayout/CleanLayout.vue';
import Productos from '../views/Productos/Productos.vue';
import CreacionTipos from '../views/Productos/CreacionTipos.vue';
import Facturaciones from '../views/Facturaciones/Facturaciones.vue';
import Usuarios from '../views/Usuarios/Usuarios.vue';
import Login from '../views/Login/Login.vue';
import { isAuthenticated } from '../services/auth';

const routes = [
  { path: '/login', component: Login, meta: { title: 'Iniciar sesión', public: true } },
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', component: Dashboard, meta: { title: 'Dashboard' } },
    ]
  },
  {
    path: '/Productos',
    component: CleanLayout,
    children: [
      { path: '', component: Productos, meta: { title: 'Lista de productos' } },
      { path: 'NuevoTipo', component: CreacionTipos, meta: { title: 'Creacion de Tipos' } }
    ]
  },
  {
    path: '/Facturaciones',
    component: CleanLayout,
    children: [
      { path: '', component: Facturaciones, meta: { title: 'Facturaciones' } },
    ]
  },
  {
    path: '/Usuarios',
    component: CleanLayout,
    children: [
      { path: '', component: Usuarios, meta: { title: 'Usuarios' } },
    ]
  }
];

const router = createRouter({
  history: window.location.protocol === 'file:' ? createWebHashHistory() : createWebHistory(),
  routes
});

router.beforeEach((to) => {
  if (!to.meta.public && !isAuthenticated()) return '/login';
  if (to.path === '/login' && isAuthenticated()) return '/';
  return true;
});

export default router;
