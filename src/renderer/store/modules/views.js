const state = {
  currentPage: "cpu",
  appVersion: "0.0.0",
};

const mutations = {
  CHANGE_PAGE(state, value) {
    state.currentPage = value;
  },
  SET_APP_VERSION(state, value) {
    state.appVersion = value;
  },
};

const actions = {
  setcurrentPage({ commit }, value) {
    commit("CHANGE_PAGE", value);
  },
  setAppVersion({ commit }, value) {
    commit("SET_APP_VERSION", value);
  },
};

export default {
  state,
  mutations,
  actions,
};
