import Vue from 'vue'

import App from './App'

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.config.productionTip = false

/* import ElementUI from 'element-ui';
import './assets/element-variables.scss'
Vue.use(ElementUI); */

/* eslint-disable no-new */
new Vue({
  components: { App },
  template: '<App/>'
}).$mount('#app')
