<template>
  <div style="text-align: center">
    <h2 class="nq-h2" style="padding-bottom: 8px">Threads: {{ threads }}</h2>
    <vue-slider
      :width="'32vw'"
      v-model="threads"
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

import { mapState, mapActions } from "vuex";

export default {
  components: {
    VueSlider,
  },
  data() {
    return {
      maxThreads: os.cpus().length,
      marks: (val) => Number.isInteger(val),
    };
  },
  computed: {
    threads: {
      get() {
        return this.$store.state.settings.threads;
      },
      set(value) {
        this.setThreads(value);
      },
    },
  },
  methods: mapActions(["setThreads"]),
};
</script>

<style>
.vue-slider-process {
  background: var(--nimiq-light-blue-bg);
}
</style>