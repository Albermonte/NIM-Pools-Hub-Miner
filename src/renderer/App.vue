<template>
  <div id="app" class="app">
    <Sidebar :cpuPage="cpuPage" />
    <div class="main-window">
      <Header :cpuPage="cpuPage" />
      <router-view></router-view>
      <!-- <PoolSelect v-if="showPoolList" @poolSelected="showPoolList = false" />
      <LandingPage v-else @selectPool="showPoolList = true" />-->
    </div>
  </div>
</template>

<script>
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import LandingPage from "@/pages/LandingPage";
import PoolSelect from "@/pages/PoolSelect";
import { ipcRenderer } from "electron";

export default {
  name: "nim-pools-hub-miner",
  components: {
    Sidebar,
    Header,
    PoolSelect,
    LandingPage
  },
  data() {
    return {
      showPoolList: false,
      cpuPage: true
    };
  },
  updated() {
    this.cpuPage = this.$router.currentRoute.path === "/";
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
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  flex-direction: row;
}

.main-window {
  height: 100%;
  width: 100%;
}
</style>
