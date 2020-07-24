<template>
  <div style="text-align: center">
    <h2 class="nq-h2" style="padding-bottom: 8px">Threads: {{ value }}</h2>
    <vue-slider
      :width="'32vw'"
      v-model="value"
      :tooltip="'none'"
      :drag-on-click="true"
      :silent="true"
      :contained="true"
      :min="1"
      :max="maxThreads"
      :included="true"
    ></vue-slider>
  </div>
</template>

<script>
import VueSlider from "vue-slider-component";
import "vue-slider-component/theme/default.css";
import { ipcRenderer } from "electron";
const os = require("os");
const Store = require("electron-store");
const store = new Store();

export default {
  components: {
    VueSlider,
  },
  data() {
    return {
      value: store.get("threads") || Math.round(os.cpus().length / 1.25),
      maxThreads: os.cpus().length,
      marks: (val) => Number.isInteger(val),
    };
  },
  updated() {
    ipcRenderer.send("threads", this.value);
    store.set("threads", this.value);
  },
};
</script>

<style>
.vue-slider-process {
  background: var(--nimiq-light-blue-bg);
}
</style>