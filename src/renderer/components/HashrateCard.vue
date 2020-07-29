<template>
  <div class="nq-card">
    <div class="nq-card-header">
      <span class="nq-h2">Miner Hashrate</span>
    </div>
    <div class="nq-card-body">
      <div v-if="!loading">{{ currentPage === 'cpu' ? hashrateCPU : hashrateGPU}}</div>
      <div v-else>
        <CircleSpinner />
      </div>
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from "electron";
import CircleSpinner from "@/components/CircleSpinner";

import { mapState, mapActions } from "vuex";

export default {
  name: "hashrate-card",
  components: {
    CircleSpinner,
  },
  computed: {
    ...mapState({
      hashrateGPU: (state) => state.hashrate.gpu,
      hashrateCPU: (state) => state.hashrate.cpu,
      currentPage: (state) => state.views.currentPage,
      miningCPU: (state) => state.hashrate.mining.cpu,
      miningGPU: (state) => state.hashrate.mining.gpu,
    }),
    loading() {
      if (this.currentPage === "cpu") {
        return this.miningCPU && this.hashrateCPU === "0 kH/s";
      } else if (this.currentPage === "gpu") {
        return this.miningGPU && this.hashrateGPU === "0 kH/s";
      } else {
        return false;
      }
    },
  },
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