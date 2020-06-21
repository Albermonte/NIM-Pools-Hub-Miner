<template>
  <div class="nq-card">
    <div class="nq-card-header">
      <span class="nq-h2">Pool Balance</span>
    </div>
    <div v-if="!loading" class="nq-card-body">{{ balance }} NIM</div>
    <div v-else class="nq-card-body">
      <CircleSpinner />
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from "electron";
import CircleSpinner from "@/components/CircleSpinner";

export default {
  name: "balance-card",
  components: {
    CircleSpinner
  },
  data() {
    return {
      loading: false,
      balance: 0,
      confirmedBalance: 0
    };
  },
  mounted() {
    ipcRenderer.on("pool-balance", (event, message) => {
      this.loading = false;
      this.balance = message.balance;
      this.confirmedBalance = message.confirmedBalance;
    });
  },
  methods: {
    startMining() {
      this.loading = true;
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