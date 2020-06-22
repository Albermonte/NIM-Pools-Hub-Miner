<template>
  <div class="alert">
    <div class="nq-card">
      <div class="nq-card-header">
        <h2 class="nq-h2">Miner Error</h2>
      </div>
      <div class="nq-card-body">
        <p>{{message || 'Unknown Error :/'}}</p>
      </div>
      <div class="nq-card-footer">
        <button @click="hideAlert" class="nq-button-pill red">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    message: {
      type: String,
      default: null
    }
  },
  methods: {
    hideAlert() {
      this.$emit("hideAlert");
    }
  }
};
</script>

<style scoped>
.alert {
  position: absolute;
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(1px);
}

.nq-card {
  width: 80%;
}

.nq-card-header {
  padding-top: 14px;
  padding-bottom: 14px;
}

.nq-card-body{
    text-align: center;
    padding: 14px;
}

.nq-card-footer {
  padding-left: 16px;
  padding-right: 16px;
  padding-bottom: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>