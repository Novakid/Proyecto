<script setup>
import { useRoute } from 'vue-router';
import { ref, onMounted, onUnmounted } from 'vue';

const route = useRoute();
const currentTime = ref('');
let interval = null;
const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};
onMounted(() => {
  updateTime();
  interval = setInterval(updateTime, 1000);
});
onUnmounted(() => {
  clearInterval(interval);
});
</script>

<template>
  <div class="breadcrumb-bar px-4 py-2 d-flex justify-content-between align-items-center">
    <!-- IZQUIERDA -->
    <div class="d-flex gap-4 info-section">
      <span>
        Hora Local -
        <i class="bi bi-clock me-1"></i>
        {{ currentTime }}
      </span>
    </div>
  </div>
</template>