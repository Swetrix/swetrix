import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  server: {
    port: 3000,
  },
  optimizeDeps: {
    include: ['axios-auth-refresh', '@swetrix/sdk'],
  },
  build: {
    sourcemap: true,
  },
  ssr: {
    noExternal: [
      'axios',
      'axios-auth-refresh',
      '@swetrix/sdk',
      'd3',
      /^d3-*/,
      'nivo',
      /^nivo-*/,
      /^@nivo*/,
      'delaunator',
      'internmap',
      'robust-predicates',
      'marked',
      'billboard.js',
      /^remix-utils.*/,
      /^remix-i18next.*/,
      'lucide-react',
    ],
    optimizeDeps: {
      include: ['axios-auth-refresh', '@swetrix/sdk'],
    },
  },
  plugins: [reactRouter(), tsconfigPaths(), tailwindcss()],
})
