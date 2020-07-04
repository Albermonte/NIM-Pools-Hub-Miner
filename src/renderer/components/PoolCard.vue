<template>
  <div class="nq-card">
    <div class="nq-card-header row">
      <h2 class="nq-h2" style="padding-left:5px">{{ displayName }}</h2>
      <button class="nq-button-s" :class="isOnlineColor">{{ isOnline }}</button>
    </div>
    <div class="nq-card-body">
      <p class="nq-text-s">Pool Hashrate: {{ poolHashrate }}</p>
      <p class="nq-text-s">Minimum Payout: {{ minimum_payout }} NIM</p>
      <p class="nq-text-s">Pool Fee: {{ fee }}</p>
    </div>
    <div class="nq-card-footer row">
      <button class="nq-button-pill gold" @click="openHub">More info</button>
      <button
        class="nq-button-pill light-blue tooltip"
        :class="tooMuchHS ? 'disabled' : ''"
        :disabled="tooMuchHS"
        @click="setPool"
      >
        Select
        <span v-if="tooMuchHS" class="tooltiptext">Pool Hashrate too high</span>
      </button>
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
    globalHashrate: {
      type: Number,
      default: 1
    },
    poolUrl: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      isOnline: "Checking",
      poolHashrate: 0,
      poolHashrateComplete: 0,
      fee: "1.0%",
      minimum_payout: 5
    };
  },
  computed: {
    isOnlineColor() {
      if (this.isOnline === "Offline") return "red";
      else if (this.isOnline === "Online") return "green";
      else return "orange";
    },
    tooMuchHS() {
      return this.poolHashrateComplete / this.globalHashrate > 0.51;
    }
  },
  mounted() {
    ipcRenderer.send("poolOnline", this.name);
    ipcRenderer.on(`poolOnlineReply${this.name}`, (event, arg) => {
      this.isOnline = arg.online ? "Online" : "Offline";
      this.poolHashrateComplete = arg.hashrateComplete;
      this.poolHashrate = arg.hashrate;
      this.fee = arg.pool_fee;
      this.minimum_payout = arg.minimum_payout;
    });
  },
  methods: {
    openHub() {
      shell.openExternal("https://hub.shortnim.me/");
    },
    setPool() {
      if (this.poolUrl === null) console.error("Pool is null ", this.poolUrl);
      const pool = this.poolUrl.split(":");
      this.$emit("setPool", {
        host: pool[0],
        port: pool[1],
        displayName: this.displayName
      });
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
  height: 170px !important;
  width: 225px !important;
  box-shadow: 0 0.5rem 2.5rem rgba(0, 0, 0, 0.111158);
}

.nq-card-header {
  padding-top: 14px;
  padding-bottom: 4px;
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
  padding-top: 1.6rem !important;
  padding-bottom: 1.4rem;
}

.disabled {
  opacity: 0.8;
  cursor: not-allowed;
}

.tooltip {
  position: relative;
  display: inline-block;
}

.tooltip .tooltiptext {
  visibility: hidden;
  width: 180px;
  background-color: #1f2348;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 5px 0;

  /* Position the tooltip */
  position: absolute;
  z-index: 1;
  top: -42px;
  left: -115px;
}

.tooltip:hover .tooltiptext {
  visibility: visible;
}
</style>