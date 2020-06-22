<template>
  <div id="app" class="app">
    <Header />
    <landing-page></landing-page>
  </div>
</template>

<script>
import Header from "@/components/Header.vue";
import LandingPage from "@/pages/LandingPage";

export default {
  name: "nim-pools-hub-miner",
  components: {
    LandingPage,
    Header
  }
};
</script>

<style>
/* CSS */
html,
body,
.app {
  margin: 0;
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  flex-direction: column;
}

html {
  border-radius: 15px;
}
</style>
