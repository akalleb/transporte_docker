// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  srcDir: 'app/',
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase', '@nuxtjs/color-mode'],
  app: {
    head: {
      link: [
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800&display=swap' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0' }
      ]
    }
  },
  colorMode: {
    classSuffix: '',
    preference: 'system', // default value of $colorMode.preference
    fallback: 'light', // fallback value if not system preference found
    globalName: '__NUXT_COLOR_MODE__',
    componentName: 'ColorScheme',
    classPrefix: '',
    storageKey: 'nuxt-color-mode'
  },
  css: ['~/assets/css/main.css'],
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/login', '/confirm', '/esqueci-senha', '/redefinir-senha'],
    },
    cookieOptions: {
      secure: false, // Necessário para funcionar em HTTP (IP do VPS)
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      sameSite: 'lax',
    }
  },
  runtimeConfig: {
    public: {
      whatsappApiUrl: process.env.WHATSAPP_API_URL || 'http://localhost:3001'
    }
  }
})