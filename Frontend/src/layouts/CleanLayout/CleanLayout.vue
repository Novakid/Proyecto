<script setup>
import Sidebar from '../../components/sidebar/Sidebar.vue';
</script>
<template>
  <div class="clean-layout app-container d-flex">
    <Sidebar />
    <div class="main-content">
      <div class="clean-content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<style>
.clean-layout {
  height: 100vh;
  min-height: 0;
  overflow: hidden;
}

.clean-layout .main-content {
  min-width: 0;
  min-height: 0;
}

.clean-content {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.clean-content .table-responsive {
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
}
</style>
