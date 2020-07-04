<template>
  <div class="container">
    <div class="row py-2">
      <div v-if="development" class="col">
        <input
          placeholder="Nimiq Address"
          id="address"
          v-model="address"
          class="nq-input-s text-center"
          style="width: 100%; text-transform:uppercase;"
        />
      </div>
      <div v-else class="col">
        <input
          placeholder="Nimiq Address"
          v-model="address"
          class="nq-input-s text-center"
          style="width: 100%; text-transform:uppercase;"
        />
      </div>
    </div>
    <div class="row space-between py-2">
      <BalanceCard />
      <HashrateCard />
    </div>
    <div class="row py-2">
      <line-chart :chart-data="datacollection" style="height: 120px; width:100%"></line-chart>
    </div>
    <div class="row">
      <div class="col space-between">
        <div class="row" style="width: 100%; align-items: center; margin-top:5px">
          <h1 class="nq-h1">Pool: {{ displayName }}</h1>
        </div>
        <button
          class="nq-button orange"
          @click="selectPool"
          :class="mining ? 'disabled' : ''"
        >Change Pool</button>
      </div>
      <div class="col space-between">
        <RangeSlider :class="mining ? 'disabled' : ''" />
        <button v-if="!mining" @click="startMining" class="nq-button light-blue">Start Mining</button>
        <button v-else @click="stopMining" class="nq-button red">Stop Mining</button>
      </div>
    </div>
    <Alert :message="alertMessage" v-if="showAlert" @hideAlert="hideAlertHandler" />
    <span class="app-version">v: {{ appVersion }}</span>
  </div>
</template>

<script>
import { ipcRenderer } from "electron";
import HashrateCard from "@/components/HashrateCard.vue";
import BalanceCard from "@/components/BalanceCard.vue";
import LineChart from "@/components/LineChart.js";
import RangeSlider from "@/components/RangeSlider.vue";
import Alert from "@/components/Alert.vue";

import * as NimiqUtils from "@nimiq/utils";

const Store = require("electron-store");
const store = new Store();

export default {
  name: "landing-page",
  components: {
    HashrateCard,
    BalanceCard,
    LineChart,
    RangeSlider,
    Alert
  },
  data() {
    return {
      address:
        process.env.NODE_ENV === "development"
          ? "NQ65 GS91 H8CS QFAN 1EVS UK3G X7PL L9N1 X4KC"
          : store.get("address"),
      host: store.get("host") || "eu.nimpool.io",
      port: store.get("port") || 8444,
      displayName: store.get("poolDisplayName") || "Nimpool",
      mining: false,
      datacollection: {
        labels: null,
        datasets: [
          {
            label: "Hashrate",
            borderColor: "#E9B213",
            pointBorderColor: "#E9B213",
            pointBackgroundColor: "#E9B213",
            pointBorderWidth: 5,
            pointRadius: 2,
            fill: false,
            borderWidth: 3,
            data: null
          }
        ]
      },
      time: [],
      hashrate: [],
      alertMessage: null,
      showAlert: false,
      appVersion: "0.0.0"
    };
  },
  mounted() {
    ipcRenderer.on("hashrate-update", (event, message) => {
      this.hashrate.push(Number(message.split(" ")[0]));
      if (this.hashrate.length > 15) {
        this.hashrate.shift();
      }

      this.time.push(
        `${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`
      );
      if (this.time.length > 15) {
        this.time.shift();
      }

      this.datacollection = {
        labels: this.time,
        datasets: [
          {
            label: "Hashrate",
            borderColor: "#E9B213",
            pointBorderColor: "#E9B213",
            pointBackgroundColor: "#E9B213",
            pointBorderWidth: 5,
            pointRadius: 2,
            fill: false,
            borderWidth: 3,
            data: this.hashrate
          }
        ]
      };
    });
    ipcRenderer.on("update-downloaded", () => {
      this.alert("New update downloaded, restarting in 5 seconds...");
    });
    ipcRenderer.send("app-version");
    ipcRenderer.on("app-version-reply", (event, message) => {
      console.log("App Version: " + message);
      this.appVersion = message;
    });
  },
  computed: {
    development() {
      return process.env.NODE_ENV === "development";
    }
  },
  methods: {
    startMining() {
      ipcRenderer.send("stopMining");
      console.log(this.address);
      store.set("address", this.address);

      const address = this.address;
      const host = this.host;
      const port = this.port;
      console.log({
        address,
        host,
        port
      });
      if (address === "" || host === "" || port === "") {
        this.alert("Fill all the inputs: Address, Pool Host and Pool Port");
        return;
      } else {
        try {
          NimiqUtils.ValidationUtils.isUserFriendlyAddress(address);
        } catch (e) {
          this.alert(e);
          return;
        }
        this.mining = true;
        //const expresion = /(vue-component-\d+-balance-card)/i
        //console.log(this.$children);
        const hashrateComponent = this.$children.find(
          x => x.$vnode.tag === "vue-component-6-hashrate-card"
        );
        hashrateComponent.startMining();

        const balanceComponent = this.$children.find(
          x => x.$vnode.tag === "vue-component-5-balance-card"
        );
        balanceComponent.startMining();

        ipcRenderer.send("startMining", {
          address,
          host,
          port
        });
      }
    },
    stopMining() {
      this.mining = false;
      ipcRenderer.send("stopMining");
      const hashrateComponent = this.$children.find(
        x => x.$vnode.tag === "vue-component-6-hashrate-card"
      );
      hashrateComponent.stopMining();
    },
    alert(e) {
      this.alertMessage = e;
      this.showAlert = true;
    },
    hideAlertHandler() {
      this.showAlert = false;
      this.alertMessage = null;
    },
    selectPool() {
      this.$emit("selectPool");
    }
  }
};
</script>

<style>
.container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.row {
  display: flex;
  width: 90vw;
  justify-content: space-around;
}

.col {
  display: flex;
  width: 100%;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
}

.space-between {
  justify-content: space-between !important;
}

.py-2 {
  padding-top: 8px;
  padding-bottom: 8px;
}

.py-3 {
  padding-top: 14px;
  padding-bottom: 14px;
}

.text-center {
  text-align: center;
}

.app-version {
  position: absolute;
  bottom: 0;
  right: 5px;
  font-size: 12px;
}

.nq-button {
  margin: 1.5rem !important;
}

.nq-h1 {
  margin: 0 !important;
}

.nq-h2 {
  margin: 0 !important;
}

.disabled {
  pointer-events: none;
  opacity: 0.65;
}
</style>
