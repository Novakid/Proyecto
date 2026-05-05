import { createApp } from 'vue';
import App from './App.vue';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './assets/style/main/main.css';
import 'font-awesome/css/font-awesome.min.css';
import router from './router';
import { createPinia } from 'pinia';

const app = createApp(App)

app.use(router)
app.use(createPinia())

app.mount('#app')