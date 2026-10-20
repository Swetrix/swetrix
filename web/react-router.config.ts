import type { Config } from '@react-router/dev/config'

export default {
  allowedActionOrigins: ['swetrix.com', 'www.swetrix.com'],
  splitRouteModules: true,
  future: {
    unstable_optimizeDeps: true,
  },
} satisfies Config
