<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../../services/auth';

const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const submit = async () => {
  error.value = '';
  loading.value = true;
  try {
    await login({ email: email.value, password: password.value });
    await router.push('/');
  } catch (requestError) {
    error.value = requestError.response?.data?.message ?? 'No fue posible iniciar sesion';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <main class="container min-vh-100 d-flex align-items-center justify-content-center">
    <form class="card shadow-sm p-4" style="width: min(420px, 100%)" @submit.prevent="submit">
      <h1 class="h4 mb-3">Iniciar sesión</h1>
      <div v-if="error" class="alert alert-danger">{{ error }}</div>
      <label class="form-label" for="email">Correo</label>
      <input id="email" v-model="email" class="form-control mb-3" type="email" autocomplete="username" required>
      <label class="form-label" for="password">Contraseña</label>
      <input id="password" v-model="password" class="form-control mb-3" type="password" autocomplete="current-password" minlength="8" required>
      <button class="btn btn-primary" :disabled="loading">{{ loading ? 'Ingresando…' : 'Ingresar' }}</button>
    </form>
  </main>
</template>
