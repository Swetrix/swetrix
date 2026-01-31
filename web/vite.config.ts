import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 3000,
  },
  ssr: {
    noExternal: [
      'axios',
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
      /^remix-i18next.*/
    ],
  },
  plugins: [reactRouter(), tsconfigPaths(), tailwindcss()],
})
