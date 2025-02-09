import { vitePlugin as remix } from '@remix-run/dev'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  server: {
    port: 3000,
  },
  optimizeDeps: {
    include: ['axios-auth-refresh', '@swetrix/sdk'],
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
  plugins: [
    remix({
      ignoredRouteFiles: ['**/.*'],
      appDirectory: 'app',
      future: {
        v3_fetcherPersist: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
        v3_singleFetch: true,
        v3_relativeSplatPath: true,
        unstable_optimizeDeps: true,
      },
    }),
    tsconfigPaths(),
  ],
})
