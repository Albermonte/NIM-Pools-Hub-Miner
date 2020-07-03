<template>
  <div class="nq-card card-flex">
    <div class="nq-card-header">
      <h2 class="nq-h2">Pool List</h2>
      <p class="nq-notice">Select which pool you want to mine on</p>
    </div>
    <div class="nq-card-body" style="min-width: 100%;">
      <!-- https://vuescrolljs.yvescoding.org/ -->

      <div class="pool-grid">
        <PoolCard :displayName="pool.displayName" v-for="pool in poolList" :key="pool.index" />
      </div>
    </div>
    <div class="nq-card" style="height: 145px; width: 91%;">
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
        <button class="nq-button-pill light-blue">Select</button>
      </div>
    </div>
  </div>
</template>

<script>
import PoolCard from "@/components/PoolCard";
import poolListArray from "@/store/poolList.js";

export default {
  name: "pool-select",
  components: {
    PoolCard
  },
  data() {
    return {
      poolList: poolListArray,
      host: null,
      port: null
    };
  }
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
  backdrop-filter: blur(1px);
  margin: 14px;
}

.card-flex {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.nq-card-body {
  padding: 1rem;
}

.nq-notice {
  margin: 1.2rem 0 0;
}

.nq-card-header {
  padding-top: 18px;
  padding-bottom: 18px;
}

.nq-input-s {
  width: calc(50% - 18px);
}
</style>