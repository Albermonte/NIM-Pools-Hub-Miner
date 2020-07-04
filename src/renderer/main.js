import Vue from "vue";
import vuescroll from "vuescroll/dist/vuescroll-native";
import App from "./App";

if (!process.env.IS_WEB) Vue.use(require("vue-electron"));
Vue.config.productionTip = false;

Vue.use(vuescroll);

/* eslint-disable no-new */
new Vue({
  components: { App },
  template: "<App/>",
}).$mount("#app");
