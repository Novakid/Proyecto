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
  <main class="login-page">
    <div class="ambient-light ambient-light-blue" aria-hidden="true"></div>
    <div class="ambient-light ambient-light-violet" aria-hidden="true"></div>
    <div class="orb orb-one" aria-hidden="true"></div>
    <div class="orb orb-two" aria-hidden="true"></div>
    <div class="orb orb-three" aria-hidden="true"></div>
    <div class="orb orb-four" aria-hidden="true"></div>
    <div class="orb orb-five" aria-hidden="true"></div>

    <form class="login-card" @submit.prevent="submit">
      <div class="card-glow" aria-hidden="true"></div>

      <header class="login-header">
        <p class="brand-name">APARICIO</p>
        <h1>Bienvenido de nuevo</h1>
        <p class="login-subtitle">Ingresa tus datos para continuar</p>
      </header>

      <div v-if="error" class="login-error" role="alert">
        <i class="fa fa-exclamation-circle" aria-hidden="true"></i>
        <span>{{ error }}</span>
      </div>

      <div class="form-field">
        <label for="email">Correo</label>
        <div class="input-shell">
          <i class="fa fa-envelope-o" aria-hidden="true"></i>
          <input id="email" v-model="email" type="email" autocomplete="username" required>
        </div>
      </div>

      <div class="form-field">
        <label for="password">Contraseña</label>
        <div class="input-shell">
          <i class="fa fa-lock" aria-hidden="true"></i>
          <input id="password" v-model="password" type="password" autocomplete="current-password" minlength="8" required>
        </div>
      </div>

      <button class="login-button" type="submit" :disabled="loading">
        {{ loading ? 'Ingresando…' : 'Ingresar' }}
      </button>
    </form>
  </main>
</template>

<style scoped>
.login-page {
  position: relative;
  isolation: isolate;
  display: grid;
  place-items: center;
  width: 100vw;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 28px;
  overflow: hidden;
  color: #e8edf8;
  background:
    radial-gradient(circle at 18% 18%, rgba(37, 99, 235, 0.11), transparent 35%),
    radial-gradient(circle at 82% 82%, rgba(124, 58, 237, 0.1), transparent 38%),
    linear-gradient(145deg, #121c30 0%, #0d1424 52%, #10182a 100%);
}

.ambient-light,
.orb {
  position: absolute;
  z-index: -2;
  pointer-events: none;
  will-change: transform;
}

.ambient-light {
  width: 48vw;
  height: 48vw;
  border-radius: 50%;
  filter: blur(85px);
  opacity: 0.18;
}

.ambient-light-blue { top: -28vw; left: -20vw; background: #2563eb; }
.ambient-light-violet { right: -22vw; bottom: -30vw; background: #7c3aed; }

.orb {
  border-radius: 50%;
  box-shadow:
    inset -18px -20px 34px rgba(6, 12, 29, 0.42),
    inset 10px 10px 24px rgba(255, 255, 255, 0.1),
    0 0 45px rgba(79, 70, 229, 0.18);
  opacity: 0.72;
}

.orb-one {
  top: 19%; right: 19%; width: 180px; height: 180px;
  background: radial-gradient(circle at 32% 28%, #55c7ff 0%, #2563eb 38%, #5527a8 78%, #1c184b 100%);
  animation: float-vertical 20s ease-in-out infinite alternate;
}

.orb-two {
  bottom: 13%; left: 20%; width: 112px; height: 112px;
  background: radial-gradient(circle at 30% 28%, #a78bfa 0%, #6d3dde 42%, #252a84 100%);
  animation: float-diagonal 16s ease-in-out infinite alternate;
}

.orb-three {
  top: 14%; left: 28%; width: 58px; height: 58px;
  background: radial-gradient(circle at 30% 25%, #67e8f9, #168acb 48%, #2838a0 100%);
  animation: float-horizontal 14s ease-in-out infinite alternate;
}

.orb-four {
  right: 28%; bottom: 14%; width: 72px; height: 72px;
  background: radial-gradient(circle at 30% 25%, #c4b5fd, #7c3aed 45%, #312e81 100%);
  animation: float-diagonal-reverse 24s ease-in-out infinite alternate;
}

.orb-five {
  top: 51%; left: 13%; width: 42px; height: 42px;
  background: radial-gradient(circle at 28% 25%, #5eead4, #0e7490 52%, #1e3a8a 100%);
  animation: float-vertical 18s ease-in-out infinite alternate-reverse;
}

.login-card {
  position: relative;
  z-index: 1;
  width: min(430px, 100%);
  padding: 42px 40px 40px;
  overflow: hidden;
  border: 1px solid rgba(167, 196, 255, 0.2);
  border-radius: 24px;
  background: rgba(20, 31, 53, 0.86);
  box-shadow: 0 28px 70px rgba(2, 6, 23, 0.5), 0 8px 22px rgba(13, 23, 44, 0.45);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  animation: card-entrance 620ms ease-out both;
}

.card-glow {
  position: absolute;
  top: 0;
  left: 12%;
  width: 76%;
  height: 2px;
  border-radius: 0 0 4px 4px;
  background: linear-gradient(90deg, transparent, #22d3ee 20%, #3b82f6 52%, #8b5cf6 80%, transparent);
  box-shadow: 0 0 16px rgba(59, 130, 246, 0.55);
}

.login-header { margin-bottom: 30px; text-align: center; }

.brand-name {
  margin: 0 0 18px;
  color: #9cc8ff;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.28em;
}

.login-header h1 {
  margin: 0;
  color: #f4f7ff;
  font-size: clamp(1.65rem, 4vw, 2rem);
  font-weight: 650;
  letter-spacing: -0.025em;
}

.login-subtitle { margin: 9px 0 0; color: #a9b4c9; font-size: 0.93rem; }
.form-field { margin-bottom: 20px; }

.form-field label {
  display: block;
  margin-bottom: 8px;
  color: #cbd5e1;
  font-size: 0.88rem;
  font-weight: 500;
}

.input-shell {
  display: flex;
  align-items: center;
  height: 50px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 12px;
  background: rgba(8, 17, 34, 0.68);
  transition: background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
}

.input-shell:focus-within {
  border-color: rgba(96, 165, 250, 0.72);
  background: rgba(8, 17, 34, 0.86);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12), 0 0 18px rgba(99, 102, 241, 0.08);
}

.input-shell i {
  width: 44px;
  color: #8091ad;
  text-align: center;
  transition: color 220ms ease;
}

.input-shell:focus-within i { color: #75baff; }

.input-shell input {
  width: calc(100% - 44px);
  height: 100%;
  padding: 0 15px 0 0;
  border: 0;
  outline: 0;
  color: #eef3ff;
  background: transparent;
  font-size: 0.96rem;
}

.input-shell input:-webkit-autofill,
.input-shell input:-webkit-autofill:hover,
.input-shell input:-webkit-autofill:focus {
  -webkit-text-fill-color: #eef3ff;
  box-shadow: 0 0 0 1000px #101b2f inset;
  caret-color: #eef3ff;
}

.login-error {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-bottom: 20px;
  padding: 11px 13px;
  border: 1px solid rgba(248, 113, 113, 0.24);
  border-radius: 10px;
  color: #fecaca;
  background: rgba(127, 29, 29, 0.2);
  font-size: 0.88rem;
  line-height: 1.4;
}

.login-error i { margin-top: 2px; color: #f87171; }

.login-button {
  width: 100%;
  min-height: 50px;
  margin-top: 8px;
  border: 0;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(110deg, #2563eb, #4f46e5 55%, #7c3aed);
  box-shadow: 0 10px 24px rgba(67, 56, 202, 0.28);
  font-weight: 650;
  letter-spacing: 0.01em;
  transition: filter 180ms ease, transform 180ms ease, box-shadow 180ms ease;
}

.login-button:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
  box-shadow: 0 13px 28px rgba(67, 56, 202, 0.35);
}

.login-button:active:not(:disabled) { transform: translateY(1px); }

.login-button:focus-visible {
  outline: 3px solid rgba(125, 211, 252, 0.4);
  outline-offset: 3px;
}

.login-button:disabled { cursor: not-allowed; filter: saturate(0.6); opacity: 0.66; }

@keyframes card-entrance {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes float-vertical {
  from { transform: translate3d(0, 12px, 0); }
  to { transform: translate3d(0, -18px, 0); }
}

@keyframes float-horizontal {
  from { transform: translate3d(-10px, 0, 0); }
  to { transform: translate3d(14px, -6px, 0); }
}

@keyframes float-diagonal {
  from { transform: translate3d(-10px, 10px, 0); }
  to { transform: translate3d(16px, -15px, 0); }
}

@keyframes float-diagonal-reverse {
  from { transform: translate3d(14px, -9px, 0); }
  to { transform: translate3d(-12px, 14px, 0); }
}

@media (max-width: 640px) {
  .login-page { padding: 20px; }
  .login-card { padding: 36px 26px 30px; border-radius: 21px; }
  .orb-one { right: -45px; width: 130px; height: 130px; }
  .orb-two { bottom: 7%; left: -28px; width: 88px; height: 88px; }
  .orb-three { top: 9%; left: 12%; width: 44px; height: 44px; }
  .orb-four { right: 8%; bottom: 8%; width: 54px; height: 54px; }
  .orb-five { left: 4%; width: 32px; height: 32px; }
}

@media (max-height: 620px) {
  .login-page { padding-block: 16px; }
  .login-card { padding-block: 28px; }
  .login-header { margin-bottom: 20px; }
  .brand-name { margin-bottom: 10px; }
  .form-field { margin-bottom: 14px; }
}

@media (prefers-reduced-motion: reduce) {
  .login-card,
  .orb { animation: none; }

  .login-button,
  .input-shell,
  .input-shell i { transition-duration: 0.01ms; }
}
</style>
