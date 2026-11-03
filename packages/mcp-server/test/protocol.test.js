import assert from 'node:assert/strict'
import { once } from 'node:events'
import { get } from 'node:http'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { httpServer } from '../src/http.js'

function client(mode = 'legacy') {
  return new Client(
    { name: 'test-client', version: '1' },
    { versionNegotiation: { mode } },
  )
}

test('the stdio executable advertises reads only and rejects invalid tool inputs', async (t) => {
  const session = client()
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../src/cli.js', import.meta.url))],
    env: { SWETRIX_API_KEY: 'test', SWETRIX_API_URL: 'http://127.0.0.1:1' },
  })
  t.after(() => session.close())
  await session.connect(transport)
  const { tools } = await session.listTools()
  assert.ok(tools.some((tool) => tool.name === 'list_projects'))
  assert.ok(tools.some((tool) => tool.name === 'get_stats_summary'))
  assert.ok(tools.every((tool) => tool.annotations.readOnlyHint))
  const result = await session.callTool({
    name: 'get_stats_breakdown',
    arguments: { projectId: '../project' },
  })
  assert.equal(result.isError, true)
  assert.match(result.content[0].text, /[Ii]nvalid|validation/)
})

test('HTTP validates the request boundary and isolates concurrent clients across protocol versions', async (t) => {
  const calls = []
  const readerKey = 'swx_' + 'a'.repeat(64)
  const limitedKey = 'swx_' + 'b'.repeat(64)
  const server = httpServer({
    baseUrl: 'https://analytics.example/api',
    enableWrites: true,
    async fetchImpl(url, { headers, method, redirect, signal }) {
      const key = headers['x-api-key']
      calls.push({ key, url: url.href, method, redirect })
      assert.ok(signal instanceof AbortSignal)
      if (key === limitedKey) {
        return Response.json(
          { message: 'This API key requires analytics:read' },
          { status: 403 },
        )
      }
      return Response.json({ data: { visitors: 17 } })
    },
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const endpoint = new URL(`http://127.0.0.1:${server.address().port}/mcp`)
  assert.equal((await fetch(endpoint)).status, 401)
  const [rejected] = await once(
    get(endpoint, { headers: { host: 'evil.example' } }),
    'response',
  )
  rejected.resume()
  assert.equal(rejected.statusCode, 403)
  assert.equal(
    (
      await fetch(endpoint, {
        headers: { authorization: 'Bearer not-a-swetrix-key' },
      })
    ).status,
    401,
  )
  assert.equal(
    (await fetch(endpoint, { headers: { origin: 'https://evil.example' } }))
      .status,
    403,
  )
  assert.equal((await fetch(new URL('/other', endpoint))).status, 404)

  async function connect(key, mode) {
    const session = client(mode)
    t.after(() => session.close())
    await session.connect(
      new StreamableHTTPClientTransport(endpoint, {
        requestInit: { headers: { authorization: `Bearer ${key}` } },
      }),
    )
    return session
  }
  const [reader, restricted] = await Promise.all([
    connect(readerKey, 'auto'),
    connect(limitedKey, 'legacy'),
  ])
  const { tools } = await reader.listTools()
  assert.equal(
    tools.find((tool) => tool.name === 'create_annotation').annotations
      .readOnlyHint,
    false,
  )
  const input = {
    name: 'get_stats_summary',
    arguments: { projectId: 'AbC123xYz789', period: '7d' },
  }
  const [report, denied] = await Promise.all([
    reader.callTool(input),
    restricted.callTool(input),
  ])
  assert.deepEqual(JSON.parse(report.content[0].text), {
    data: { visitors: 17 },
  })
  assert.equal(denied.isError, true)
  assert.match(denied.content[0].text, /403.*analytics:read/)
  assert.deepEqual(calls.map((call) => call.key).sort(), [
    readerKey,
    limitedKey,
  ])
  assert.ok(
    calls.every(
      (call) =>
        call.method === 'GET' &&
        call.redirect === 'error' &&
        call.url ===
          'https://analytics.example/api/v2/projects/AbC123xYz789/traffic/summary?period=7d',
    ),
  )
})
