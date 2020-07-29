const os = require("os");

const state = {
  threads: Math.round(os.cpus().length / 1.25),
  address:
    process.env.NODE_ENV === "development"
      ? "NQ65 GS91 H8CS QFAN 1EVS UK3G X7PL L9N1 X4KC"
      : "",
  host: "eu.nimpool.io",
  port: 8444,
  displayName: "Nimpool",
};

const mutations = {
  SET_THREADS(state, value) {
    state.threads = value;
  },
  SET_ADDRESS(state, value) {
    state.address = value;
  },
  SET_HOST(state, value) {
    state.host = value;
  },
  SET_PORT(state, value) {
    state.displayName = value;
  },
  SET_DISPLAY_NAME(state, value) {
    state.threads = value;
  },
};

const actions = {
  setThreads({ commit }, value) {
    commit("SET_THREADS", value);
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
};

export default {
  state,
  mutations,
  actions,
};
