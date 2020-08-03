const os = require("os");

const state = {
  deviceName: os.hostname(),
  cpuThreads: Math.round(os.cpus().length / 1.25),
  cpuPriority: 5,
  address:
    process.env.NODE_ENV === "development"
      ? "NQ65 GS91 H8CS QFAN 1EVS UK3G X7PL L9N1 X4KC"
      : "",
  host: "pool.acemining.co",
  port: 8443,
  displayName: "AceMining",
  cpuDeviceId: 0,
  gpuDeviceId: 0,
  gpuMemory: 0,
  gpuThreads: 2,
  gpuCache: 4,
  gpuMemoryTradeoff: 256,
  gpuJobs: 6,
};

const mutations = {
  SET_DEVICE_NAME(state, value) {
    state.deviceName = value;
  },
  SET_CPU_THREADS(state, value) {
    state.cpuThreads = value;
  },
  SET_CPU_PRIORITY(state, value) {
    state.cpuPriority = value;
  },
  SET_ADDRESS(state, value) {
    state.address = value;
  },
  SET_HOST(state, value) {
    state.host = value;
  },
  SET_PORT(state, value) {
    state.port = value;
  },
  SET_DISPLAY_NAME(state, value) {
    state.displayName = value;
  },
  SET_CPU_DEVICE_ID(state, value) {
    state.cpuDeviceId = value;
  },
  SET_GPU_DEVICE_ID(state, value) {
    state.gpuDeviceId = value;
  },
  SET_GPU_MEMORY(state, value) {
    state.gpuMemory = value;
  },
  SET_GPU_THREADS(state, value) {
    state.gpuThreads = value;
  },
  SET_GPU_CACHE(state, value) {
    state.gpuCache = value;
  },
  SET_GPU_MEMORY_TRADEOFF(state, value) {
    state.gpuMemoryTradeoff = value;
  },
  SET_GPU_JOBS(state, value) {
    state.gpuJobs = value;
  },
};

const actions = {
  setDeviceName({ commit }, value) {
    commit("SET_DEVICE_NAME", value);
  },
  setCpuThreads({ commit }, value) {
    commit("SET_CPU_THREADS", value);
  },
  setCpuPriority({ commit }, value) {
    commit("SET_CPU_PRIORITY", value);
  },
  setAddress({ commit }, value) {
    commit("SET_ADDRESS", value);
  },
  setHost({ commit }, value) {
    commit("SET_HOST", value);
  },
  setPort({ commit }, value) {
    commit("SET_PORT", value);
  },
  setDisplayName({ commit }, value) {
    commit("SET_DISPLAY_NAME", value);
  },
  setCpuDeviceId({ commit }, value) {
    commit("SET_CPU_DEVICE_ID", value);
  },
  setGpuDeviceId({ commit }, value) {
    commit("SET_GPU_DEVICE_ID", value);
  },
  setGpuMemory({ commit }, value) {
    commit("SET_GPU_MEMORY", value);
  },
  setGpuThreads({ commit }, value) {
    commit("SET_GPU_THREADS", value);
  },
  setGpuCache({ commit }, value) {
    commit("SET_GPU_CACHE", value);
  },
  setGpuMemoryTradeoff({ commit }, value) {
    commit("SET_GPU_MEMORY_TRADEOFF", value);
  },
  setGpuJobs({ commit }, value) {
    commit("SET_GPU_JOBS", value);
  },
};

export default {
  state,
  mutations,
  actions,
};
