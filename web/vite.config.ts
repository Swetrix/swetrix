import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 3000,
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      // Serve rrweb under a neutral specifier so the dev dep URL becomes
      // /.vite/deps/dom-player.js (and the prod chunk is named accordingly)
      // instead of containing "rrweb", which privacy adblock lists block.
      'dom-player': 'rrweb',
    },
  },
  optimizeDeps: {
    // rrweb is only imported inside the lazily-loaded SessionReplayModal chunk,
    // so Vite's initial scan never sees it. Without this it gets discovered on
    // first replay open, triggering a mid-session re-optimization that changes
    // the dep hash and breaks the in-flight dynamic import ("error loading
    // dynamically imported module"). Pre-bundling it on startup avoids that.
    include: ['dom-player'],
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
