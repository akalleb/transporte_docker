/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    './app/components/**/*.{js,vue,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/plugins/**/*.{js,ts}',
    './app/app.vue',
    './app/error.vue',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Brand Colors (WhatsApp-inspired)
        primary: {
          50: '#e0fdf0',
          100: '#b3fadd',
          200: '#80f6c5',
          300: '#4df2ad',
          400: '#26ee95',
          500: '#19e683', // Base Green (User Requested)
          600: '#10b969',
          700: '#0a8d4f',
          800: '#066036',
          900: '#02331c',
          DEFAULT: '#19e683', // Primary Brand Color
          light: '#4df2ad',
        },
        // Secondary Colors (Teal/Blue Accents)
        secondary: {
          50: '#E0F2F1',
          100: '#B2DFDB',
          200: '#80CBC4',
          300: '#4DB6AC',
          400: '#26A69A',
          500: '#009688', // Teal Base
          600: '#00897B',
          700: '#00796B',
          800: '#00695C',
          900: '#004D40',
          DEFAULT: '#075E54', // WhatsApp Teal
        },
        // Semantic Action Colors
        action: {
          light: '#63B3ED',
          DEFAULT: '#3182CE', // Blue for buttons/links
          dark: '#2B6CB0',
          hover: '#2C5282',
        },
        success: {
          light: '#68D391',
          DEFAULT: '#38A169', // Green for success states
          dark: '#2F855A',
        },
        danger: {
          light: '#FC8181',
          DEFAULT: '#E53E3E', // Red for errors/deletions
          dark: '#C53030',
        },
        warning: {
          light: '#F6E05E',
          DEFAULT: '#D69E2E', // Yellow/Orange for warnings
          dark: '#B7791F',
        },
        info: {
          light: '#76E4F7',
          DEFAULT: '#3182CE', // Blue for information
          dark: '#2B6CB0',
        },
        // Neutral Grays (Slate-based)
        gray: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        // Backgrounds
        background: {
          light: '#F0F2F5', // Light gray background common in chat apps
          DEFAULT: '#FFFFFF',
          dark: '#111B21',  // Dark mode background
          card: '#FFFFFF',
          'card-dark': '#202C33', // Dark mode card/message bubble
        },
        // Chat specific
        chat: {
          'bubble-out': '#D9FDD3', // Outgoing message bubble (light)
          'bubble-out-dark': '#005C4B', // Outgoing message bubble (dark)
          'bubble-in': '#FFFFFF', // Incoming message bubble (light)
          'bubble-in-dark': '#202C33', // Incoming message bubble (dark)
        }
      },
      // Spacing System Extension
      spacing: {
        '4.5': '1.125rem', // 18px
        '18': '4.5rem',    // 72px
        '112': '28rem',
        '128': '32rem',
        '144': '36rem',
      },
      // Border Radius System
      borderRadius: {
        '4xl': '2rem',
        'bubble': '0.5rem', // Standard chat bubble radius
      },
      // Font Sizes
      fontSize: {
        'xxs': '0.625rem', // 10px
      },
      // Shadows
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        'float': '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
      },
      fontFamily: {
        sans: ['Lexend', 'sans-serif'],
        display: ['Lexend', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
