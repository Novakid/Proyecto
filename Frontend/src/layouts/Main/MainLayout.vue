<script setup>
import Sidebar from '../../components/sidebar/Sidebar.vue';
</script>

<template>
  <div class="app-container d-flex">
    <Sidebar />
    <div class="main-content">
      <div class="content">
        <transition name="fade" mode="out-in">
          <router-view />
        </transition>
      </div>
    </div>
  </div>
</template>
