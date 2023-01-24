<template>
  <vuescroll :ops="ops" style="height: 513px">
    <div class="container space-between">
      <div class="row" style="width: 88vw;">
        <div class="nq-card">
          <div class="nq-card-header">
            <h2 class="nq-h2">General Settings</h2>
          </div>
          <div class="nq-card-body">
            <div class="row" style="padding-bottom: 14px">
              <input placeholder="Nimiq Address" :value="address" @input="updateAddress" class="nq-input-s text-center" style="width: 100%; text-transform:uppercase;" />
            </div>
            <div class="row">
              <div class="col align-start">Device Name:</div>
              <div class="col align-end">
                <input class="nq-input-s text-center" :value="deviceName" @input="updateDeviceName" />
              </div>
            </div>
            <div class="row">
              <div class="col align-start">CPU Device ID:</div>
              <div class="col align-end">
                <input class="nq-input-s text-center vanishing" :value="cpuDeviceId" disabled />
              </div>
            </div>
            <div class="row">
              <div class="col align-start">GPU Device ID:</div>
              <div class="col align-end">
                <input class="nq-input-s text-center vanishing" :value="gpuDeviceId" disabled />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="row" style="width: 88vw;">
        <div class="nq-card">
          <div class="nq-card-header">
            <h2 class="nq-h2">CPU Settings</h2>
          </div>
          <div class="nq-card-body">
            <div class="row">
              <div class="col align-start">Threads:</div>
              <div class="col align-end">
                <input class="nq-input-s text-center" type="number" style="width: 100%;" min="1" :max="maxThreads" :value="cpuThreads" @input="updateCpuThreads" />
              </div>
            </div>
            <div class="row">
              <div class="col align-start">CPU Priority:</div>
              <div class="col align-end">
                <input class="nq-input-s text-center" type="number" min="0" max="5" style="width: 100%;" :value="cpuPriority" @input="updateCpuPriority" />
              </div>
            </div>
            <div class="row">
              <div class="col align-start py-1">Higher CPU Priority means more hashrate while Mining</div>
            </div>
            <div class="row">
              <div class="col align-start">CPU Hashrate:</div>
              <div class="col align-end">
                <input class="nq-input-s text-center vanishing" :value="hashrateCPU === '0 kH/s' && miningCPU ? 'Loading...' : hashrateCPU" disabled />
              </div>
            </div>
          </div>
          <div class="nq-card-footer">
            <button v-if="miningCPU" class="nq-button-pill red" @click="stopCPU">Stop</button>
            <button class="nq-button-pill" :class="miningCPU ? 'orange' : 'light-blue'" @click="restartGPU(false)">Test new CPU Miner Settings</button>
          </div>
        </div>
      </div>
      <div class="row" style="width: 88vw;">
        <div class="nq-card">
          <div class="nq-card-header">
            <h2 class="nq-h2">GPU Settings</h2>
          </div>
          <div class="nq-card-body">
            <div class="row">
              <div class="col align-start">Memory:</div>
              <div class="col align-end">
                <input class="nq-input-s text-center" type="number" style="width: 100%;" :value="gpuMemory" @input="updateGpuMemory" />
              </div>
            </div>
            <div class="row">
              <div class="col align-start py-1">If memory equals 0, it's auto-detected</div>
            </div>
            <div class="row">
              <div class="col align-start">Threads:</div>
              <div class="col align-end">
                <input class="nq-input-s text-center" type="number" style="width: 100%;" min="1" :value="gpuThreads" @input="updateGpuThreads" />
              </div>
            </div>
            <div class="row">
              <div class="col align-start">Cache:</div>
              <div class="col align-end">
                <input class="nq-input-s text-center" type="number" style="width: 100%;" :value="gpuCache" @input="updateGpuCache" />
              </div>
            </div>
            <div class="row">
              <div class="col align-start">Memory Tradeoff (NVIDIA):</div>
              <div class="col align-end">
                <input class="nq-input-s text-center" type="number" style="width: 100%;" :value="gpuMemoryTradeoff" @input="updateGpuMemoryTradeoff" />
              </div>
            </div>
            <div class="row">
              <div class="col align-start">Jobs (AMD):</div>
              <div class="col align-end">
                <input class="nq-input-s text-center" type="number" style="width: 100%;" :value="gpuJobs" @input="updateGpuJos" />
              </div>
            </div>
            <div class="row">
              <div class="col align-start">GPU Hashrate:</div>
              <div class="col align-end">
                <input class="nq-input-s text-center vanishing" :value="hashrateGPU === '0 kH/s' && miningGPU ? 'Loading...' : hashrateGPU" disabled />
              </div>
            </div>
          </div>
          <div class="nq-card-footer">
            <button v-if="miningGPU" class="nq-button-pill red" @click="stopGPU">Stop</button>
            <button class="nq-button-pill" :class="miningGPU ? 'orange' : 'light-blue'" @click="restartGPU(true)">Test new GPU Miner Settings</button>
          </div>
        </div>
      </div>
    </div>
  </vuescroll>
</template>

<script>
import { ipcRenderer } from "electron";
import { mapState, mapActions } from "vuex";

import vuescroll from "vuescroll";

import * as NimiqUtils from "@nimiq/utils";
const os = require("os");

export default {
  name: "settings-page",
  components: {
    vuescroll,
  },
  data() {
    return {
      maxThreads: os.cpus().length,
      ops: {
        vuescroll: {
          detectResize: false,
        },
        bar: {
          background: "#21BCA5",
          keepShow: true,
          opacity: 0.8,
        },
      },
    };
  },
  computed: {
    ...mapState({
      address: (state) => state.settings.address,
      host: (state) => state.settings.host,
      port: (state) => state.settings.port,
      cpuThreads: (state) => state.settings.cpuThreads,
      deviceName: (state) => state.settings.deviceName,
      cpuDeviceId: (state) => state.settings.cpuDeviceId,
      gpuDeviceId: (state) => state.settings.gpuDeviceId,
      cpuPriority: (state) => state.settings.cpuPriority,
      hashrateCPU: (state) => state.hashrate.cpu,
      miningCPU: (state) => state.hashrate.mining.cpu,
      gpuMemory: (state) => state.settings.gpuMemory,
      gpuThreads: (state) => state.settings.gpuThreads,
      gpuCache: (state) => state.settings.gpuCache,
      gpuMemoryTradeoff: (state) => state.settings.gpuMemoryTradeoff,
      gpuJobs: (state) => state.settings.gpuJobs,
      hashrateGPU: (state) => state.hashrate.gpu,
      miningGPU: (state) => state.hashrate.mining.gpu,
    }),
  },
  methods: {
    ...mapActions([
      "setAddress",
      "setDeviceName",
      "setCpuThreads",
      "setCpuPriority",
      "setMiningCPU",
      "setGpuMemory",
      "setGpuThreads",
      "setGpuCache",
      "setGpuMemoryTradeoff",
      "setGpuJobs",
      "setMiningGPU",
    ]),
    updateAddress(e) {
      this.setAddress(e.target.value);
    },
    updateDeviceName(e) {
      this.setDeviceName(e.target.value);
    },
    updateCpuThreads(e) {
      this.setCpuThreads(Number(e.target.value) || 1);
    },
    updateCpuPriority(e) {
      this.setCpuPriority(Number(e.target.value));
    },
    updateGpuMemory(e) {
      this.setGpuMemory(Number(e.target.value));
    },
    updateGpuThreads(e) {
      this.setGpuThreads(Number(e.target.value) || 1);
    },
    updateGpuCache(e) {
      this.setGpuCache(Number(e.target.value));
    },
    updateGpuMemoryTradeoff(e) {
      this.setGpuMemoryTradeoff(Number(e.target.value));
    },
    updateGpuJos(e) {
      this.setGpuJobs(Number(e.target.value));
    },
    restartGPU(gpu) {
      this.stopCPU();
      this.stopGPU();

      const address = this.address;
      const host = this.host;
      const port = this.port;
      console.log({
        address,
        host,
        port,
      });
      if (address === "" || host === "" || port === "") {
        this.alert("Fill the Address input and choose a Pool");
        return;
      } else {
        try {
          NimiqUtils.ValidationUtils.isUserFriendlyAddress(address);
        } catch (e) {
          this.alert(e);
          return;
        }
        this.setMiningCPU(!gpu);
        this.setMiningGPU(gpu);

        ipcRenderer.send("startMining", {
          address,
          host,
          port,
          gpu,
        });
      }
    },
    stopCPU() {
      this.setMiningCPU(false);
      ipcRenderer.send("stopMining", "cpu");
    },
    stopGPU() {
      this.setMiningGPU(false);
      ipcRenderer.send("stopMining", "gpu");
    },
  },
};
</script>

<style scoped>
.container {
  max-height: 513px;
}

.row {
  width: 100%;
  padding-bottom: 8px;
}

.align-start {
  align-items: flex-start;
}

.align-end {
  align-items: flex-end;
}

.nq-card {
  width: 100%;
}

.nq-card-header {
  padding-top: 15px;
  padding-bottom: 15px;
}

.nq-card-body {
  padding-bottom: 1rem;
}

.nq-card-footer {
  display: flex;
  justify-content: center;
  padding-bottom: 12px;
}

.nq-button-pill {
  margin-left: 5px;
  margin-right: 5px;
}
</style>