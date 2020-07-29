const state = {
  cpu: 0,
  gpu: 0,
  mining: {
    cpu: false,
    gpu: false,
  },
};

const mutations = {
  GPU_HASHRATE(state, value) {
    state.gpu = value;
  },
  CPU_HASHRATE(state, value) {
    state.cpu = value;
  },
  CPU_MINING(state, value) {
    state.mining.cpu = value;
  },
  GPU_MINING(state, value) {
    state.mining.gpu = value;
  },
};

const actions = {
  setGpuHashrate({ commit }, value) {
    commit("GPU_HASHRATE", value);
  },
  setCpuHashrate({ commit }, value) {
    commit("CPU_HASHRATE", value);
  },
  setMiningCPU({ commit }, value) {
    commit("CPU_MINING", value);
  },
  setMiningGPU({ commit }, value) {
    commit("GPU_MINING", value);
  },
};

export default {
  state,
  mutations,
  actions,
};
