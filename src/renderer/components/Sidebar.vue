<template>
  <div class="sidebar">
    <div style="color: white" class="gpu-cpu-holder">
      <div class="nq-card" :class="currentPage === 'cpu' ? 'active' : ''" @click="openCPU">
        <div class="nq-card-body">CPU</div>
      </div>
      <div class="nq-card" :class="currentPage === 'gpu' ? 'active' : ''" @click="openGPU">
        <div class="nq-card-body">GPU</div>
      </div>
    </div>
    <div class="logo-holder">
      <img class="logo" :src="require('../assets/logo.png').default" width="45px" @click="openHub" />
    </div>
    <div class="settings-holder">
      <svg class="nq-icon" style="color: white;">
        <use xlink:href="node_modules/@nimiq/style/nimiq-style.icons.svg#nq-gear" />
      </svg>
    </div>
  </div>
</template>

<script>
import { shell } from "electron";

import { mapState, mapActions } from "vuex";

export default {
  name: "Sidebar",
  computed: {
    ...mapState({
      currentPage: (state) => state.views.currentPage,
    }),
  },
  methods: {
    ...mapActions(["setcurrentPage"]),
    openHub() {
      shell.openExternal("https://hub.shortnim.me/");
    },
    openSettings() {},
    openCPU() {
      this.setcurrentPage("cpu");
      this.$router.replace("/");
    },
    openGPU() {
      this.setcurrentPage("gpu");
      this.$router.replace("/gpu");
    },
  },
};
</script>

<style scoped>
.sidebar {
  height: 100%;
  width: 70px;
  background: #304156;
  /* 
  #304156
  --nimiq-purple-bg
  --nimiq-green-bg
  --nimiq-light-blue-bg-darkened
   */
  /* border-radius: 0 5px 5px 0; */
}

.nq-icon {
  width: 50px;
  height: 25px;
  cursor: pointer;
  /*   position: absolute;
  bottom: 15px; */
}

.logo {
  cursor: pointer;
}

.nq-card {
  margin: 0;
  margin-top: 15px;
  width: 46px;
  height: 46px;

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
  color: white;
  background: var(--nimiq-gold-bg);
  /**
  --nimiq-pink-bg
  --nimiq-gold-bg
   */
}
.nq-card-body {
  padding: 5px;
  font-size: 18px;
  font-weight: 600;
}

.gpu-cpu-holder,
.logo-holder,
.settings-holder {
  height: calc(100% / 3);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.gpu-cpu-holder {
  justify-content: flex-start;
}
.logo-holder {
  justify-content: center;
}
.settings-holder {
  justify-content: flex-end;
  padding-bottom: 10px;
}

.active {
  color: #304156;
  background: var(--nimiq-gold-bg);
}
</style>