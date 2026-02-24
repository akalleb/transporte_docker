/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'lucide-vue-next';
declare module 'vue3-emoji-picker';
declare module 'qrcode.vue';
