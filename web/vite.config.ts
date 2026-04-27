import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 3000,
  },
  resolve: {
    tsconfigPaths: true,
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
      /^remix-i18next.*/
    ],
    external: ['@takumi-rs/image-response'],
  },
  plugins: [reactRouter(), tailwindcss()],
})
