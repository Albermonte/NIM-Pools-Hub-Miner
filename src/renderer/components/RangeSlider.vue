<template>
  <div class="rating">
    <div class="value">Threads: {{ value }}</div>
    <input type="range" v-model="value" min="1" list="tickmarks" :max="maxThreads" />
  </div>
</template>

<script>
import { ipcRenderer } from "electron";
const os = require("os");
const Store = require("electron-store");

const store = new Store();

export default {
  data() {
    return {
      value: store.get("threads") || Math.round(os.cpus().length / 1.25),
      maxThreads: os.cpus().length
    };
  },
  updated() {
    ipcRenderer.send("threads", this.value);
    store.set("threads", this.value);
  }
};
</script>

<style lang="sass" scoped>  
.rating
  text-align: center
  
.value
  margin-top: 14px
  margin-bottom: 8px
  font-weight: 600
  color: #1F2348
    
input[type="range"]
  appearance: none
  height: 6px
  background-color: #eee
  border-radius: 4px
  width: 45vw
  outline: none
  transition: background-color 1s, height 1s
</style>