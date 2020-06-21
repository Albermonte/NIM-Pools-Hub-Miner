<template>
  <div class="nq-card">
    <div class="nq-card-header">
      <span class="nq-h2">Pool Balance</span>
    </div>
    <div class="nq-card-body">
        <Amount />
      {{ balance }} NIM
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from "electron";
import Amount from "@/components/Amount";

export default {
  name: "hashrate-card",
  components: {
    Amount
  },
  data() {
    return {
      loading: false,
      balance: 0
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