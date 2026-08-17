<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { logout } from '../../services/auth';
import { useTheme } from '../../composables/useTheme';
import { useAuthorizationStore } from '../../stores/authorization';

const collapsed = ref(false);
const router = useRouter();
const readCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('current_user') || 'null');
  } catch {
    return null;
  }
};
const currentUser = ref(readCurrentUser());
const userName = computed(() => currentUser.value?.nombre || 'Usuario');
const { isDark, toggleTheme } = useTheme();
const authorization = useAuthorizationStore();
const can = (permission) => authorization.can(permission);

function toggleSidebar() {
  collapsed.value = !collapsed.value;
}

function syncCurrentUser(event) {
  if (!event || event.key === 'current_user') currentUser.value = readCurrentUser();
}

async function closeSession() {
  authorization.signOut();
  currentUser.value = null;
  await router.replace('/login');
}

onMounted(() => window.addEventListener('storage', syncCurrentUser));
onUnmounted(() => window.removeEventListener('storage', syncCurrentUser));
</script>

<template>
  <aside :class="['sidebar', 'd-flex', 'flex-column', 'h-100', { collapsed }]">
    
    <div class="sidebar-header d-flex justify-content-between align-items-center">

      <div class="d-flex align-items-center gap-2">
        <button
          v-if="!collapsed"
          type="button"
          class="sidebar-title sidebar-title-button fst-italic fs-3"
          aria-label="Colapsar menú lateral"
          @click="toggleSidebar"
        >
          APARICIO
        </button>
      </div>

      <button
        v-if="collapsed"
        type="button"
        class="toggle-btn d-flex align-items-center justify-content-center"
        title="Expandir menú lateral"
        aria-label="Expandir menú lateral"
        @click="toggleSidebar"
      >
        <i class="fa fa-lg fa-list-ul"></i>
      </button>

    </div>

    <nav>
      <router-link v-if="can('dashboard.ver')" to="/" class="nav-link">
        <i class="bi bi-house fs-5"></i>
        <span v-if="!collapsed">Dashboard</span>
      </router-link>
      <router-link v-if="can('catalogo.ver')" to="/Productos" class="nav-link">
        <i class="bi bi-archive fs-5"></i>
        <span v-if="!collapsed"> Productos</span>
      </router-link>
      <router-link v-if="can('facturacion.ver')" to="/Facturaciones" class="nav-link">
        <i class="bi bi-clipboard fs-5"></i>
        <span v-if="!collapsed"> Facturaciones</span>
      </router-link>
      <router-link v-if="can('usuarios.ver')" to="/Usuarios" class="nav-link">
        <i class="fa fa-user-o" aria-hidden="true"></i>
        <span v-if="!collapsed"> Usuarios</span>
      </router-link>
    </nav>

    <div class="sidebar-footer mt-auto">
      <div class="sidebar-user" :title="userName">
        <i v-if="collapsed" class="fa fa-user-o" aria-hidden="true"></i>
        <span v-else class="text-truncate">{{ userName }}</span>
      </div>
      <button
        type="button"
        class="nav-link sidebar-logout"
        :title="isDark ? 'Modo claro' : 'Modo oscuro'"
        :aria-label="isDark ? 'Activar modo claro' : 'Activar modo oscuro'"
        @click="toggleTheme"
      >
        <i :class="['fa', isDark ? 'fa-sun-o' : 'fa-moon-o']" aria-hidden="true"></i>
        <span v-if="!collapsed">{{ isDark ? 'Modo claro' : 'Modo oscuro' }}</span>
      </button>
      <button type="button" class="nav-link sidebar-logout" title="Cerrar sesión" @click="closeSession">
        <i class="fa fa-sign-out" aria-hidden="true"></i>
        <span v-if="!collapsed">Cerrar sesión</span>
      </button>
    </div>

  </aside>
</template>

<style scoped>
.sidebar-title-button {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.sidebar-title-button:hover,
.sidebar-title-button:focus-visible {
  opacity: 0.85;
}

.sidebar-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding-top: 10px;
}

.sidebar-user {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 0 10px;
  overflow: hidden;
}

.sidebar:not(.collapsed) .sidebar-user {
  justify-content: flex-start;
}

.sidebar-logout {
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
}

.sidebar.collapsed .sidebar-logout {
  justify-content: center;
}
</style>
