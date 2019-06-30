// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import axios from './utils/http.js'
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import './assets/reset.scss';
import Highlight from './directives/highlight.js'

Vue.config.productionTip = false
Vue.prototype.$axios=axios
Vue.prototype.$bus = new Vue(); 
Vue.use(ElementUI);
Vue.use(Highlight);
// Vue.use(lasso);

	/* eslint-disable no-new */
new Vue({
  el: '#app',
  components: { App },
  template: '<App/>'
})
