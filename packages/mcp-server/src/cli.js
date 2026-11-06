#!/usr/bin/env node
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import { apiBaseUrl, createApi } from './api.js'
import { createServer } from './server.js'
import { httpServer } from './http.js'

function main(args, env) {
  if (args.length > 1 || (args.length && args[0] !== '--http')) {
    throw new Error('Usage: swetrix-mcp [--http]')
  }
  const baseUrl = apiBaseUrl(env.SWETRIX_API_URL)
  const enableWrites = env.SWETRIX_MCP_ENABLE_WRITES === 'true'
  if (!args.length) {
    if (!env.SWETRIX_API_KEY)
      throw new Error('Set SWETRIX_API_KEY before connecting over stdio.')
    const api = createApi(baseUrl, env.SWETRIX_API_KEY)
    serveStdio(() => createServer(api, { enableWrites }))
    return
  }

  const host = env.SWETRIX_MCP_HOST || '127.0.0.1'
  const port = Number(env.SWETRIX_MCP_PORT || 3100)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SWETRIX_MCP_PORT must be an integer between 1 and 65535.')
  }
  const allowedHosts = env.SWETRIX_MCP_ALLOWED_HOSTS?.split(',').map((name) =>
    name.trim(),
  )
  const server = httpServer({ baseUrl, enableWrites, allowedHosts })
  server.on('error', (error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  server.listen(port, host)
}

try {
  main(process.argv.slice(2), process.env)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
