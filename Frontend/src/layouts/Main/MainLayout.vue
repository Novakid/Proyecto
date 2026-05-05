<script setup>
import Sidebar from '../../components/sidebar/Sidebar.vue';
import Topbar from '../../components/topbar/Topbar.vue';
import Breadcrumb from '../../components/breadcrumb/Breadcrumb.vue';
</script>

<template>
  <div class="app-container d-flex">
    <Sidebar />
    <div class="main-content">
      <Topbar />
      <Breadcrumb />
      <div class="content">
        <transition name="fade" mode="out-in">
          <router-view />
        </transition>
      </div>
    </div>
  </div>
</template>