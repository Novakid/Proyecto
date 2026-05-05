<script setup>
import Sidebar from '../../components/sidebar/Sidebar.vue';
</script>
<template>
  <div class="clean-layout app-container d-flex">
    <Sidebar />
    <div class="main-content">
      <router-view />
    </div>
  </div>
</template>

<style>
.clean-layout {
  height: 100vh;
}
</style>