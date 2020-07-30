import Vue from "vue";
import Router from "vue-router";

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: "/",
      name: "cpu-page",
      component: require("@/pages/CPUPage").default,
    },
    {
      path: "/gpu",
      name: "gpu-page",
      component: require("@/pages/GPUPage").default,
    },
    {
      path: "/pools",
      name: "pool-select",
      component: require("@/pages/PoolSelect").default,
    },
    {
      path: "/settings",
      name: "settings-page",
      component: require("@/pages/Settings").default,
    },
    {
      path: "*",
      redirect: "/",
    },
  ],
});
