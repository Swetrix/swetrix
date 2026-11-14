#!/usr/bin/env node
// Production launcher for the Swetrix frontend.
// Loads .env into process.env, then hands off to @react-router/serve in-process.
// Works as a standalone entry point AND with PM2 cluster mode (which only
// supports Node.js scripts, not shell scripts).

const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const envPath = path.join(__dirname, '.env')

if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath)
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production'
}

// @react-router/serve restricts subpath imports via its exports field,
// so we resolve the CLI through the package.json (which is exported).
const pkgJsonPath = require.resolve('@react-router/serve/package.json')
const cliPath = path.join(path.dirname(pkgJsonPath), 'dist/cli.js')
const buildPath = path.join(__dirname, 'build/server/index.js')

// The CLI reads the build path from process.argv[2].
process.argv = [process.argv[0], cliPath, buildPath]

async function start() {
  const baseUrl = process.env.BASE_URL?.trim()
  let host

  if (baseUrl) {
    const url = new URL(baseUrl)
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.hostname.includes('*')
    ) {
      throw new Error(
        'BASE_URL must be an HTTP(S) URL without credentials or wildcards',
      )
    }
    host = url.host
  }

  const build = await import(pathToFileURL(buildPath).href)

  if (host) {
    if (!Array.isArray(build.allowedActionOrigins)) {
      throw new Error(
        'The server build must export an allowedActionOrigins array',
      )
    }
    if (!build.allowedActionOrigins.includes(host)) {
      build.allowedActionOrigins.push(host)
    }
  }

  await import(pathToFileURL(cliPath).href)
}

start().catch((error) => {
  console.error('Failed to start the Swetrix frontend:', error.message)
  process.exit(1)
})
