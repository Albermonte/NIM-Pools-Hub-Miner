<template>
  <div id="app" class="app">
    <landing-page></landing-page>
  </div>
</template>

<script>
import LandingPage from "@/components/LandingPage";

export default {
  name: "nim-pools-hub-miner",
  components: {
    LandingPage
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
}
</style>
