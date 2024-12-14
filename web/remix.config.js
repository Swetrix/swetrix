const { createRoutesFromFolders } = require('@remix-run/v1-route-convention')

/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ['**/.*'],
  appDirectory: 'app',
  // assetsBuildDirectory: "public/build",
  // serverBuildPath: 'build/index.js',
  // publicPath: "/build/",
  tailwind: true,
  postcss: true,
  serverModuleFormat: 'cjs',
  serverDependenciesToBundle: [
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
    /^remix-i18next.*/,
  ],
  // eslint-disable-next-line no-undef
  serverMinify: process.env.NODE_ENV === 'production',
  future: {
    v3_fetcherPersist: true,
    v3_throwAbortReason: true,
    v3_lazyRouteDiscovery: true,
    v3_singleFetch: true,
    v3_relativeSplatPath: true,
  },
  routes(defineRoutes) {
    // uses the v1 convention, works in v1.15+ and v2
    return createRoutesFromFolders(defineRoutes)
  },
}
