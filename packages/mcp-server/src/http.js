import { createServer as createHttpServer } from 'node:http'
import { toNodeHandler } from '@modelcontextprotocol/node'
import {
  createMcpHandler,
  localhostAllowedHostnames,
  validateHostHeader,
  validateOriginHeader,
} from '@modelcontextprotocol/server'
import { createApi } from './api.js'
import { createServer } from './server.js'

const maxRequestBodySize = 64 * 1024
const bearer = /^Bearer (swx_[a-f\d]{64})$/i

export function httpServer({
  baseUrl,
  allowedHosts = localhostAllowedHostnames(),
  enableWrites = false,
  fetchImpl,
}) {
  const handler = createMcpHandler(
    ({ requestInfo }) => {
      const [, key] = bearer.exec(requestInfo.headers.get('authorization'))
      return createServer(createApi(baseUrl, key, fetchImpl), { enableWrites })
    },
    { maxRequestBodySize, maxSubscriptions: 0 },
  )
  const serve = toNodeHandler(
    {
      async fetch(request) {
        const response = await handler.fetch(request)
        response.headers.set('cache-control', 'no-store')
        return response
      },
    },
    { maxRequestBodySize },
  )

  const server = createHttpServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    if (req.url !== '/mcp') return res.writeHead(404).end()
    if (
      !validateHostHeader(req.headers.host, allowedHosts).ok ||
      !validateOriginHeader(req.headers.origin, allowedHosts).ok
    ) {
      return res.writeHead(403).end('Untrusted host or origin.')
    }
    if (!bearer.test(req.headers.authorization || '')) {
      return res
        .writeHead(401, { 'WWW-Authenticate': 'Bearer realm="Swetrix MCP"' })
        .end(
          'Supply a scoped Swetrix API key starting with swx_ as a bearer credential.',
        )
    }
    return serve(req, res)
  })
  server.on('close', () => handler.close())
  return server
}
