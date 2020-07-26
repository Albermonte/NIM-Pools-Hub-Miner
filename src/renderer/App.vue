<template>
  <div id="app" class="app">
    <Sidebar :cpuPage="cpuPage" />
    <div class="main-window">
      <Header :cpuPage="cpuPage" />
      <router-view></router-view>
    </div>
  </div>
</template>

<script>
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { ipcRenderer } from "electron";

const Store = require("electron-store");
const store = new Store();

export default {
  name: "nim-pools-hub-miner",
  components: {
    Sidebar,
    Header,
  },
  data() {
    return {
      showPoolList: false,
      cpuPage: true,
    };
  },
  updated() {
    this.cpuPage = this.$router.currentRoute.path === "/";
  },
  created() {
    ipcRenderer.on("log", (message) => {
      console.log(message);
    });

    const route = store.get("page");
    this.$router.replace(route === "cpu" || !route ? "/" : "/gpu");
    this.cpuPage = this.$router.currentRoute.path === "/";
  },
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
