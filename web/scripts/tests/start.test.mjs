import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const routerUrl = pathToFileURL(require.resolve('react-router')).href

function runLauncher(t, { baseUrl, envFile, origins, requests = [] } = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), 'swetrix-start-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const serveDirectory = path.join(
    directory,
    'node_modules/@react-router/serve',
  )
  mkdirSync(path.join(serveDirectory, 'dist'), { recursive: true })
  mkdirSync(path.join(directory, 'build/server'), { recursive: true })
  copyFileSync(
    new URL('../../start.cjs', import.meta.url),
    path.join(directory, 'start.cjs'),
  )
  writeFileSync(path.join(directory, 'package.json'), '{"type":"module"}')
  if (envFile !== undefined)
    writeFileSync(path.join(directory, '.env'), envFile)
  writeFileSync(
    path.join(serveDirectory, 'package.json'),
    JSON.stringify({
      type: 'module',
      exports: { './package.json': './package.json' },
    }),
  )
  writeFileSync(
    path.join(directory, 'build/server/index.js'),
    `
      export const allowedActionOrigins = ${JSON.stringify(origins ?? ['swetrix.com', 'www.swetrix.com'])}
      export const loadedBaseUrl = process.env.BASE_URL
      export const loadedNodeEnv = process.env.NODE_ENV
      export const basename = '/'
      export const ssr = true
      export const future = {}
      export const routeDiscovery = { mode: 'initial', manifestPath: '/__manifest' }
      export const assets = { routes: {} }
      export let actionCalls = 0
      export const entry = { module: {
        default: async (_request, status, headers) => new Response('Rendered', { status, headers }),
        handleError() {},
      } }
      export const routes = {
        root: { id: 'root', path: '', module: { default() { return null } } },
        login: { id: 'login', parentId: 'root', path: 'login', module: {
          default() { return null },
          action() { actionCalls++; return { ok: true } },
        } },
      }
    `,
  )
  writeFileSync(
    path.join(serveDirectory, 'dist/cli.js'),
    `
      import { pathToFileURL } from 'node:url'
      import { createRequestHandler } from ${JSON.stringify(routerUrl)}
      const build = await import(pathToFileURL(process.argv[2]).href)
      const handle = createRequestHandler(build, 'test')
      const responses = []
      for (const { url, origin } of ${JSON.stringify(requests)}) {
        const response = await handle(new Request(url, {
          method: 'POST',
          headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'email=user%40example.com',
        }))
        responses.push(response.status)
        await response.text()
      }
      console.log(JSON.stringify({
        origins: build.allowedActionOrigins,
        baseUrl: build.loadedBaseUrl,
        nodeEnv: build.loadedNodeEnv,
        actionCalls: build.actionCalls,
        responses,
      }))
    `,
  )
  const env = { ...process.env }
  delete env.BASE_URL
  delete env.NODE_ENV
  delete env.NODE_OPTIONS
  if (baseUrl !== undefined) env.BASE_URL = baseUrl
  return spawnSync(process.execPath, [path.join(directory, 'start.cjs')], {
    cwd: directory,
    env,
    encoding: 'utf8',
    timeout: 10000,
  })
}

function output(result) {
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout)
}

for (const baseUrl of [
  'https://analytics.example.com',
  'https://analytics.example.com:8443/',
  'http://analytics.example.com:8080',
  'https://[::1]:8443',
]) {
  test(`allows proxied data and document actions for ${baseUrl}`, (t) => {
    const origin = new URL(baseUrl).origin
    const result = output(
      runLauncher(t, {
        baseUrl,
        requests: ['/login.data', '/login'].map((pathname) => ({
          url: `http://swetrix:3000${pathname}`,
          origin,
        })),
      }),
    )
    assert.deepEqual(result.responses, [200, 200])
    assert.equal(result.actionCalls, 2)
    assert.equal(result.nodeEnv, 'production')
    assert.deepEqual(result.origins, [
      'swetrix.com',
      'www.swetrix.com',
      new URL(baseUrl).host,
    ])
  })
}

test('rejects unrelated origins and mismatched ports before invoking actions', (t) => {
  const result = output(
    runLauncher(t, {
      baseUrl: 'https://analytics.example.com:8443',
      requests: [
        'https://evil.example',
        'https://analytics.example.com',
        'https://analytics.example.com:9443',
        'https://sub.analytics.example.com:8443',
        'null',
      ].flatMap((origin) =>
        ['/login.data', '/login'].map((pathname) => ({
          url: `http://swetrix:3000${pathname}`,
          origin,
        })),
      ),
    }),
  )
  assert.deepEqual(result.responses, Array(10).fill(400))
  assert.equal(result.actionCalls, 0)
})

test('loads BASE_URL from .env before importing the build', (t) => {
  const result = output(
    runLauncher(t, { envFile: 'BASE_URL=https://from-file.example\n' }),
  )
  assert.equal(result.baseUrl, 'https://from-file.example')
  assert.ok(result.origins.includes('from-file.example'))
})

test('runtime environment takes precedence over .env', (t) => {
  const result = output(
    runLauncher(t, {
      baseUrl: 'https://runtime.example',
      envFile: 'BASE_URL=https://from-file.example\n',
    }),
  )
  assert.equal(result.baseUrl, 'https://runtime.example')
  assert.ok(result.origins.includes('runtime.example'))
  assert.ok(!result.origins.includes('from-file.example'))
})

test('preserves same-origin and cloud actions without BASE_URL or .env', (t) => {
  const result = output(
    runLauncher(t, {
      requests: [
        {
          url: 'http://localhost:3000/login.data',
          origin: 'http://localhost:3000',
        },
        { url: 'http://swetrix.com/login.data', origin: 'https://swetrix.com' },
        {
          url: 'http://swetrix:3000/login.data',
          origin: 'https://www.swetrix.com',
        },
        {
          url: 'http://swetrix:3000/login.data',
          origin: 'https://analytics.example.com',
        },
      ],
    }),
  )
  assert.deepEqual(result.responses, [200, 200, 200, 400])
  assert.equal(result.actionCalls, 3)
  assert.deepEqual(result.origins, ['swetrix.com', 'www.swetrix.com'])
})

test('does not duplicate an existing allowed host', (t) => {
  const result = output(runLauncher(t, { baseUrl: 'https://swetrix.com' }))
  assert.deepEqual(result.origins, ['swetrix.com', 'www.swetrix.com'])
})

test('fails startup for invalid or wildcard BASE_URL values', (t) => {
  for (const baseUrl of [
    'not-a-url',
    'ftp://analytics.example.com',
    'https://*.example.com',
    'https://user:password@example.com',
  ]) {
    const result = runLauncher(t, { baseUrl })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /Failed to start the Swetrix frontend/)
    assert.equal(result.stdout, '')
  }
})

test('fails startup if the build cannot accept the configured host', (t) => {
  const result = runLauncher(t, {
    baseUrl: 'https://analytics.example.com',
    origins: false,
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /allowedActionOrigins array/)
})
