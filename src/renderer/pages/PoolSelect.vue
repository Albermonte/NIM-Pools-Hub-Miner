<template>
  <div class="nq-card card-flex">
    <div class="nq-card-header">
      <h2 class="nq-h2">Pool List</h2>
      <p class="nq-notice">Select which pool you want to mine on</p>
    </div>
    <div class="nq-card-body" style="min-width: 100%; max-height: 408px;">
      <vuescroll :ops="ops">
        <div class="pool-grid">
          <PoolCard
            :displayName="pool.displayName"
            :name="pool.name"
            :globalHashrate="globalHashrate"
            :poolUrl="pool.url"
            v-for="pool in poolList"
            :key="pool.index"
            @setPool="setPool"
          />
          <div
            class="nq-card"
            style="height: 145px; width: 91%; box-shadow: 0 0.5rem 2rem rgba(0, 0, 0, 0.111158);"
          >
            <div class="nq-card-header" style="padding-top: 12px; padding-bottom: 12px;">
              <h2 class="nq-h2">Custom Pool</h2>
            </div>
            <div class="nq-card-body">
              <div class="row">
                <input class="nq-input-s text-center" placeholder="Pool Host" v-model="host" />
                <input class="nq-input-s text-center" placeholder="Pool Port" v-model="port" />
              </div>
            </div>
            <div
              class="nq-card-footer"
              style="display: flex; justify-content: flex-end; padding-top: 1rem;"
            >
              <button class="nq-button-pill light-blue" @click="setCustomPool">Select</button>
            </div>
          </div>
        </div>
      </vuescroll>
    </div>
  </div>
</template>

<script>
import PoolCard from "@/components/PoolCard";
import poolListArray from "@/store/poolList.js";
import vuescroll from "vuescroll";
import { ipcRenderer } from "electron";

import { mapState, mapActions } from "vuex";

export default {
  name: "pool-select",
  components: {
    PoolCard,
    vuescroll,
  },
  data() {
    return {
      poolList: poolListArray,
      host: null,
      port: null,
      globalHashrate: 1,
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
      currentPage: (state) => state.views.currentPage,
    }),
  },
  mounted() {
    ipcRenderer.send("getGlobalHashrate");
    ipcRenderer.on("getGlobalHashrateReply", (_, arg) => {
      this.globalHashrate = arg;
    });
  },
  methods: {
    ...mapActions(["setHost", "setPort", "setDisplayName"]),
    setCustomPool() {
      this.setHost(this.host);
      this.setPort(this.port);
      this.setDisplayName(this.host);
      this.$router.replace(`${this.currentPage}`);
    },
    setPool(pool) {
      this.setHost(pool.host);
      this.setPort(pool.port);
      this.setDisplayName(pool.displayName);
      this.$router.replace(`${this.currentPage}`);
    },
  },
};
</script>

<style scoped>
.row {
  display: flex;
  width: 100%;
  justify-content: space-around;
}

.col {
  display: flex;
  width: 100%;
}

.pool-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
}

.space-between {
  justify-content: space-between !important;
}

.py-2 {
  padding-top: 8px;
  padding-bottom: 8px;
}

.px-3 {
  padding-right: 14px;
  padding-left: 14px;
}

.py-3 {
  padding-top: 14px;
  padding-bottom: 14px;
}

.text-center {
  text-align: center;
}

.nq-card {
  width: 95%;
  height: 100%;
  margin: 14px;
}

.card-flex {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: calc(100% - 75px);
}

.nq-card-body {
  padding: 1rem;
}

.nq-card-header .nq-notice {
  margin: 5px;
}

.nq-card-header {
  padding-top: 12px !important;
  padding-bottom: 8px !important;
}

.nq-input-s {
  width: calc(50% - 18px);
}
</style>