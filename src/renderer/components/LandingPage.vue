<template>
  <div class="container">
    <div class="row">
      <!-- <input placeholder="Nimiq Address" id="address" class="text-centered" /> -->
      <input
        placeholder="Nimiq Address"
        id="address"
        value="NQ65GS91H8CSQFAN1EVSUK3GX7PLL9N1X4KC"
        class="text-centered"
      />
    </div>
    <div class="row">
      <input class="text-centered" placeholder="Pool Host" id="host" value="eu.nimpool.io" />
      <input class="text-centered" placeholder="Pool Port" id="port" value="8444" />
      <button v-if="!mining" @click="startMining">Start Mining</button>
      <button v-else @click="stopMining">Stop Mining</button>
    </div>
    <div class="row">{{ hashrate }}</div>
  </div>
</template>

<script>
import SystemInformation from "./LandingPage/SystemInformation";
import { ipcRenderer } from "electron";

export default {
  name: "landing-page",
  components: { SystemInformation },
  data() {
    return {
      mining: false,
      hashrate: "0 kH/s"
    };
  },
  methods: {
    open(link) {
      this.$electron.shell.openExternal(link);
    },
    startMining() {
      this.hashrate = "Starting...";
      this.mining = true;
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
        ipcRenderer.send("startMining", {
          address,
          host,
          port
        });
      }

      ipcRenderer.on("hashrate-update", (event, message) => {
        this.hashrate = message;
      });
    },
    stopMining() {
      this.mining = false;
      this.hashrate = "0 kH/s";
      ipcRenderer.send("stopMining");
    }
  }
};
</script>

<style>
@import url("https://fonts.googleapis.com/css?family=Source+Sans+Pro");

.container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.row {
  padding: 15px;
  width: fit-content;
}

.startButtonDisplay {
  display: inline;
}

.stopButtonDisplay {
  display: none;
}

.text-centered {
  text-align: center;
}
</style>
