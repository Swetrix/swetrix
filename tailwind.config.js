module.exports = {
  mode: 'jit',
  important: true,
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      width: {
        'card-toggle': 'calc(100% - 3rem)',
      },
      animation: {
        'ping-slow': 'ping-op 3s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        'ping-op': {
          '0%': {
            opacity: 0.75,
          },
          '75%, 100%': {
            transform: 'scale(2)',
            opacity: 0,
          },
        },
      },
    },
    minHeight: {
     '72': '18rem',
     'page': 'calc(100vh - 74px)', // header height -> 74px
     'min-footer': 'calc(100vh - 162px)', // 74px + 88px footer height
    },
  },
  variants: {
    extend: {},
    scrollBehavior: ['motion-safe', 'motion-reduce', 'responsive'],
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
