<template>
  <div class="container">
    <div class="row py-2">
      <div v-if="development" class="col">
        <input
          placeholder="Nimiq Address"
          id="address"
          value="NQ65 GS91 H8CS QFAN 1EVS UK3G X7PL L9N1 X4KC"
          class="nq-input-s text-center"
          style="width: 100%"
        />
      </div>
      <div v-else class="col">
        <input placeholder="Nimiq Address" id="address" class="nq-input-s" />
      </div>
    </div>
    <div class="row space-between py-2">
      <BalanceCard />
      <HashrateCard />
    </div>
    <div class="row space-between py-2">
      <input class="nq-input-s text-center" placeholder="Pool Host" id="host" value="eu.nimpool.io" />
      <input class="nq-input-s text-center" placeholder="Pool Port" id="port" value="8444" />
    </div>
    <div class="row py-2">
      <button v-if="!mining" @click="startMining" class="nq-button light-blue">Start Mining</button>
      <button v-else @click="stopMining" class="nq-button red">Stop Mining</button>
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from "electron";
import HashrateCard from "@/components/HashrateCard.vue";
import BalanceCard from "@/components/BalanceCard.vue";

export default {
  name: "landing-page",
  components: {
    HashrateCard,
    BalanceCard
  },
  data() {
    return {
      mining: false
    };
  },
  computed: {
    development() {
      return process.env.NODE_ENV === "development";
    }
  },
  methods: {
    startMining() {
      const address = document.getElementById("address").value;
      const host = document.getElementById("host").value;
      const port = document.getElementById("port").value;
      console.log({
        address,
        host,
        port
      });
      if (address === "" || host === "" || port === "") {
        alert("Fill all the inputs");
        return;
      } else {
        this.mining = true;
        this.$children[0].startMining();

        ipcRenderer.send("startMining", {
          address,
          host,
          port
        });
      }
    },
    stopMining() {
      this.mining = false;
      this.$children[0].stopMining();
      ipcRenderer.send("stopMining");
    }
  }
};
</script>

<style lang='scss'>
@import url("https://fonts.googleapis.com/css?family=Source+Sans+Pro");
@import "../../../node_modules/@nimiq/style/nimiq-style.min.css";

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
}

.space-between {
  justify-content: space-between !important;
}

.py-2 {
  padding-top: 8px;
  padding-bottom: 8px;
}

.text-center {
  text-align: center;
}
</style>
