import Vue from "vue";
import vuescroll from "vuescroll/dist/vuescroll-native";
import App from "./App";
import router from "./router";
import store from "./store";

Vue.config.productionTip = false;

Vue.use(vuescroll);

/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  store,
  template: "<App/>",
}).$mount("#app");
