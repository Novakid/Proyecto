<script setup>
import { ref } from 'vue';
import router from '../../router';



const collapsed = ref(false);

function toggleSidebar() {
  collapsed.value = !collapsed.value;
}
</script>

<template>
  <aside :class="['sidebar', { collapsed }]">
    
    <div class="sidebar-header d-flex justify-content-between align-items-center">

      <div class="d-flex align-items-center gap-2">
        <span v-if="!collapsed" class="sidebar-title fst-italic fs-3">
          APARICIO
        </span>
      </div>

      <button class="toggle-btn d-flex align-items-center justify-content-center" @click="toggleSidebar">
        <i class="fa fa-lg fa-list-ul"></i>
      </button>

    </div>

    <router-link to="/" class="nav-link">
      <i class="bi bi-house fs-5"></i>
      <span v-if="!collapsed">Dashboard</span>
    </router-link>
    <router-link to="/Productos" class="nav-link">
      <i class="bi bi-archive fs-5"></i>
      <span v-if="!collapsed"> Productos</span>
    </router-link>
    <router-link to="/Facturaciones" class="nav-link">
      <i class="bi bi-clipboard fs-5"></i>
      <span v-if="!collapsed"> Facturaciones</span>      
    </router-link>
    <router-link to="/Usuarios" class="nav-link">
      <i class="fa fa-user-o" aria-hidden="true"></i>
      <span v-if="!collapsed"> Usuarios</span>
    </router-link>

  </aside>
</template>