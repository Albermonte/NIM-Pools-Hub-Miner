<template>
  <div class="nq-card">
    <div class="nq-card-header">
      <span class="nq-h2">Miner Hashrate</span>
    </div>
    <div class="nq-card-body">
      <div v-if="!loading">{{ hashrate }}</div>
      <div v-else>
        <CircleSpinner />
      </div>
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from "electron";
import CircleSpinner from "@/components/CircleSpinner";

export default {
  name: "hashrate-card",
  components: {
    CircleSpinner
  },
  data() {
    return {
      loading: false,
      hashrate: "0 kH/s"
    };
  },
  mounted() {
    ipcRenderer.on("hashrate-update", (event, message) => {
      this.loading = false;
      this.hashrate = message;
    });
  },
  methods: {
    startMining() {
      this.loading = true;
    },
    stopMining() {
      this.loading = false;
      this.hashrate = "0 kH/s";
    }
  }
};
</script>

<style scoped>
.nq-card {
  width: 240px;
  height: 100px;
  margin-left: 0;
  margin-right: 0;
}

.nq-card-header {
  padding-top: 14px;
  padding-bottom: 10px;
}

.nq-card-body {
  text-align: center;
}
</style>