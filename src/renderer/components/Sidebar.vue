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
      <svg
        class="nq-icon"
        style="color: white;width:24px;height:24px"
        viewBox="0 0 24 24"
        @click="openSettings"
      >
        <path
          d="M21.66 9.31l1.26.45a2.37 2.37 0 0 1 0 4.48l-1.27.45a1.37 1.37 0 0 0-.77 1.88l.57 1.22a2.38 2.38 0 0 1-3.16 3.16l-1.22-.57a1.37 1.37 0 0 0-1.88.78l-.45 1.26a2.38 2.38 0 0 1-4.48 0l-.45-1.26a1.37 1.37 0 0 0-1.88-.78l-1.22.57a2.38 2.38 0 0 1-3.16-3.16l.57-1.22a1.37 1.37 0 0 0-.78-1.88l-1.26-.45a2.38 2.38 0 0 1 0-4.48l1.26-.45a1.38 1.38 0 0 0 .78-1.88l-.57-1.21A2.38 2.38 0 0 1 6.7 3.04l1.22.58a1.38 1.38 0 0 0 1.88-.78l.45-1.27a2.38 2.38 0 0 1 4.48 0l.45 1.27a1.37 1.37 0 0 0 1.88.78l1.22-.58a2.38 2.38 0 0 1 3.16 3.17l-.57 1.2a1.37 1.37 0 0 0 .78 1.9zm-13.6 4.53a4.93 4.93 0 0 0 6.28 2.6 4.81 4.81 0 0 0 2.6-6.28 4.87 4.87 0 0 0-6.28-2.6 4.81 4.81 0 0 0-2.6 6.28z"
          fill="currentColor"
        />
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
    openCPU() {
      this.setcurrentPage("cpu");
      this.$router.replace("/");
    },
    openGPU() {
      this.setcurrentPage("gpu");
      this.$router.replace("/gpu");
    },
    openHub() {
      shell.openExternal("https://hub.shortnim.me/");
    },
    openSettings() {
      this.$router.replace("/settings");
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