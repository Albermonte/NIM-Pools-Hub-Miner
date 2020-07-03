<template>
  <div id="app" class="app">
    <Header />
    <PoolSelect />
    <!-- <LandingPage /> -->
  </div>
</template>

<script>
import Header from "@/components/Header";
import LandingPage from "@/pages/LandingPage";
import PoolSelect from "@/pages/PoolSelect";
import { ipcRenderer } from "electron";

export default {
  name: "nim-pools-hub-miner",
  components: {
    LandingPage,
    PoolSelect,
    Header
  },
  created() {
    ipcRenderer.on("log", message => {
      console.log(message);
    });
  }
};
</script>

<style>
@import "../../node_modules/@nimiq/style/nimiq-style.min.css";

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
