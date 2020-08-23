<template>
  <div class="nq-card">
    <div class="nq-card-header">
      <span class="nq-h2">Pool Balance</span>
    </div>
    <div v-if="!loading" class="nq-card-body">{{ balances !== null ? balances.balance : 0 }} NIM</div>
    <div v-else class="nq-card-body">
      <CircleSpinner />
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from "electron";
import CircleSpinner from "@/components/CircleSpinner";

import { mapState } from "vuex";

export default {
  name: "balance-card",
  components: {
    CircleSpinner,
  },
  computed: {
    ...mapState({
      balances: (state) => state.hashrate.balances,
      currentPage: (state) => state.views.currentPage,
      miningCPU: (state) => state.hashrate.mining.cpu,
      miningGPU: (state) => state.hashrate.mining.gpu,
    }),
    loading() {
      if (this.currentPage === "cpu") {
        return this.miningCPU && this.balances === null;
      } else if (this.currentPage === "gpu") {
        return this.miningGPU && this.balances === null;
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