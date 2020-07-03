<template>
  <div class="nq-card">
    <div class="nq-card-header row">
      <h2 class="nq-h2" style="padding-left:5px">{{ displayName }}</h2>
      <button
        class="nq-button-s"
        :class="online ? 'green' : 'red'"
      >{{ online ? 'Online' : 'Offline'}}</button>
    </div>
    <div class="nq-card-body">
      <p class="nq-text-s">Pool Fee: {{ fee }}</p>
      <p class="nq-text-s">Minimum Payout: {{ minimum_payout }} NIM</p>
    </div>
    <div class="nq-card-footer row">
      <button class="nq-button-pill gold" @click="openHub">More info</button>
      <button class="nq-button-pill light-blue">Select</button>
    </div>
  </div>
</template>

<script>
const { ipcRenderer, shell } = require("electron");

export default {
  name: "pool-card",
  props: {
    name: {
      type: String,
      default: "Nimpool"
    },
    displayName: {
      type: String,
      default: "Unknown"
    },
    online: {
      type: Boolean,
      default: false
    },
    fee: {
      type: String,
      default: "1.0 %"
    },
    minimum_payout: {
      type: Number,
      default: 5
    }
  },
  methods: {
    openHub() {
      shell.openExternal("https://hub.shortnim.me/");
    }
  }
};
</script>

<style scoped>
.row {
  display: flex;
  width: 100%;
  justify-content: space-between;
}

.col {
  display: flex;
  width: 100%;
  justify-content: center;
}

.nq-card {
  height: 155px !important;
  width: 215px !important;
}

.nq-card-header {
  padding-top: 14px;
  padding-bottom: 8px;
  padding-left: 1rem;
  padding-right: 1rem;
}

.nq-card-body {
  padding-right: 2rem;
  padding-left: 2rem;
  padding-top: 5px;
  padding-bottom: 5px;
}

.nq-card-footer {
  padding-top: 2.2rem;
  padding-bottom: 1.4rem;
}
</style>