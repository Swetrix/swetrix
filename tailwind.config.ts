import type { Config } from 'tailwindcss'

export default {
  mode: 'jit',
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class', // or 'media' or 'class'
  theme: {
    screens: {
      xs: '400px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        gray: {
          750: '#141d2e',
        },
      },
      width: {
        'card-toggle': 'calc(100% - 3rem)',
      },
      animation: {
        'ping-slow': 'ping-op 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        appear: 'appear 0.5s cubic-bezier(0, 0, 0.2, 1) 1',
      },
      keyframes: {
        'ping-op': {
          '0%': {
            opacity: '0.75',
          },
          '75%, 100%': {
            transform: 'scale(2)',
            opacity: '0',
          },
        },
        appear: {
          '0%': {
            transform: 'scale(0)',
            opacity: '0',
          },
          '75%, 100%': {
            transform: 'scale(1)',
            opacity: '1',
          },
        },
      },
    },
    minHeight: {
      72: '18rem',
      page: 'calc(100vh - 74px)', // header height -> 74px
      'min-footer': 'calc(100vh - 160px)', // 74px + 88px footer height
      'min-footer-ad': 'calc(100vh - 265px)', // 74px + 88px footer height
    },
  },
  variants: {
    extend: {},
    scrollBehavior: ['motion-safe', 'motion-reduce', 'responsive'],
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
} satisfies Config
