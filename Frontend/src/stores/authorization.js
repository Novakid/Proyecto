import { defineStore } from 'pinia';
import api from '../services/api';
import { isAuthenticated, logout } from '../services/auth';

export const useAuthorizationStore = defineStore('authorization', {
  state: () => ({ user: null, roles: [], permissions: [], loaded: false, loading: null }),
  actions: {
    async load(force = false) {
      if (!isAuthenticated()) { this.clear(); return null; }
      if (this.loaded && !force) return this.user;
      if (this.loading) return this.loading;
      this.loading = api.get('/auth/me').then(({ data }) => {
        this.user = data; this.roles = data.roles || []; this.permissions = data.permissions || []; this.loaded = true;
        return data;
      }).finally(() => { this.loading = null; });
      return this.loading;
    },
    can(permission) { return this.permissions.includes(permission); },
    canAny(keys) { return keys.some((key) => this.can(key)); },
    canAll(keys) { return keys.every((key) => this.can(key)); },
    clear() { this.user = null; this.roles = []; this.permissions = []; this.loaded = false; },
    signOut() { logout(); this.clear(); },
  },
});
