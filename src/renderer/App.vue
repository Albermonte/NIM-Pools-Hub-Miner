<template>
  <div id="app" class="app">
    <Sidebar style="z-index: 1" />
    <div class="main-window">
      <Header />
      <transition name="pop" mode="out-in">
        <router-view></router-view>
      </transition>
    </div>
  </div>
</template>

<script>
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { ipcRenderer } from "electron";

import { mapState } from "vuex";

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
  computed: {
    ...mapState({
      currentPage: (state) => state.views.currentPage,
    }),
  },
  created() {
    ipcRenderer.on("log", (message) => {
      console.log(message);
    });
  },
  mounted() {
    this.$router.replace(`/${this.currentPage}`);
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
  overflow-x: hidden;
}

.main-window {
  height: 100%;
  width: 100%;
}

.pop-enter-active,
.pop-leave-active {
  transition: transform 0.15s cubic-bezier(0.5, 0, 0.5, 1), opacity 0.2s linear;
}

.pop-enter {
  opacity: 0;
  transform: scale(0.9) translateX(-100%);
}

.pop-leave-to {
  opacity: 0;
  transform: scale(0.9) translateX(100%);
}
</style>
