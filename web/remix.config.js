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
  serverMinify: process.env.NODE_ENV === 'production',
  routes(defineRoutes) {
    // uses the v1 convention, works in v1.15+ and v2
    return createRoutesFromFolders(defineRoutes)
  },
}
