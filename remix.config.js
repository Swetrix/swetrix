const {
  createRoutesFromFolders,
} = require("@remix-run/v1-route-convention")

/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ['**/.*'],
  appDirectory: 'app',
  // assetsBuildDirectory: "public/build",
  // serverBuildPath: "build/index.js",
  // publicPath: "/build/",
  tailwind: true,
  postcss: true,
  serverModuleFormat: 'cjs',
  future: {
    v2_errorBoundary: true,
    v2_meta: true,
    v2_normalizeFormMethod: true,
    v2_dev: true,
    v2_headers: true,
    v2_routeConvention: true,
  },
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
  ],
  serverMinify: process.env.NODE_ENV === 'production',
  routes(defineRoutes) {
    // uses the v1 convention, works in v1.15+ and v2
    return createRoutesFromFolders(defineRoutes)
  }
}
