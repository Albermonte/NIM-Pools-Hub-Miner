const state = {
  cpu: 0,
  gpu: 0,
  cpuArray: [],
  gpuArray: [],
  cpuTime: [],
  gpuTime: [],
  balances: null,
  mining: {
    cpu: false,
    gpu: false,
  },
};

const mutations = {
  CPU_HASHRATE(state, value) {
    if (value === null) {
      state.cpu = "0 kH/s";
      state.cpuArray = [];
      state.cpuTime = [];
      return;
    }
    state.cpu = value;
    state.cpuArray.push(Number(value.split(" ")[0]));
    if (state.cpuArray.length > 15) {
      state.cpuArray.shift();
    }
    state.cpuTime.push(
      `${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`
    );
    if (state.cpuTime.length > 15) {
      state.cpuTime.shift();
    }
  },
  GPU_HASHRATE(state, value) {
    if (value === null) {
      state.gpu = "0 kH/s";
      state.gpuArray = [];
      state.gpuTime = [];
      return;
    }
    state.gpu = value;
    state.gpuArray.push(Number(value.split(" ")[0]));
    if (state.gpuArray.length > 15) {
      state.gpuArray.shift();
    }
    state.gpuTime.push(
      `${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`
    );
    if (state.gpuTime.length > 15) {
      state.gpuTime.shift();
    }
  },
  CPU_MINING(state, value) {
    state.mining.cpu = value;
  },
  GPU_MINING(state, value) {
    state.mining.gpu = value;
  },
  POOL_BALANCE(state, value) {
    state.balances = value;
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
  setPoolBalance({ commit }, value) {
    commit("POOL_BALANCE", value);
  },
};

export default {
  state,
  mutations,
  actions,
};
