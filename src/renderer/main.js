import Vue from "vue";
import vuescroll from "vuescroll/dist/vuescroll-native";
import App from "./App";
import router from "./router";

Vue.config.productionTip = false;

Vue.use(vuescroll);

/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  template: "<App/>",
}).$mount("#app");
