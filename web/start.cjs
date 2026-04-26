#!/usr/bin/env node
// Production launcher for the Swetrix frontend.
// Loads .env into process.env, then hands off to @react-router/serve in-process.
// Works as a standalone entry point AND with PM2 cluster mode (which only
// supports Node.js scripts, not shell scripts).

const fs = require('node:fs')
const path = require('node:path')

const envPath = path.join(__dirname, '.env')

if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found')
  process.exit(1)
}

process.loadEnvFile(envPath)

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

require(cliPath)
