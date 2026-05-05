import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard/Dashboard.vue';
import MainLayout from '../layouts/Main/MainLayout.vue';
import CleanLayout from '../layouts/CleanLayout/CleanLayout.vue';
import Productos from '../views/Productos/Productos.vue';
import CreacionTipos from '../views/Productos/CreacionTipos.vue';
import Facturaciones from '../views/Facturaciones/Facturaciones.vue';

const routes = [
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', component: Dashboard, meta: { title: 'Dashboard' } },
    ]
  },
  {
    path: '/productos',
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
  }
];

export default createRouter({
  history: createWebHistory(),
  routes
});