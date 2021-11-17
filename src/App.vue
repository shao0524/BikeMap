<template>
  <!-- sidebar -->
  <Sidebar />
  <!-- map -->
  <Map />
</template>

<script>
import Map from "./components/Map.vue";
import Sidebar from "./components/Map";
export default {
  name: "App",
  components: {
    Map,
    Sidebar,
  },
};
</script>

<style lang="scss">
@import "scss/all.scss";
</style>
