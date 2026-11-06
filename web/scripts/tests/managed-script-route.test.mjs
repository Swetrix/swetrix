import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { test } from 'node:test'

import {
  managedTrackerVersion,
  readManagedRecorder,
} from '../../app/utils/managed-tracker.server.ts'

const internalAPI = 'http://swetrix-api:5005/'
const publicSite = 'https://analytics.example'
const previousBaseURL = process.env.BASE_URL
process.env.BASE_URL = publicSite
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === '~/lib/constants') {
      const config = `export const API_URL = ${JSON.stringify(internalAPI)}, isSelfhosted = true, isStaging = false, isBrowser = false, MAIN_URL = 'https://swetrix.com';`
      return next(`data:text/javascript,${encodeURIComponent(config)}`, context)
    }
    if (specifier.startsWith('~/utils/')) {
      const path = `../../app/${specifier.slice(2)}.ts`
      return next(new URL(path, import.meta.url).href, context)
    }
    return next(specifier, context)
  },
})
const { loader } = await import('../../app/routes/p.$file.ts')
hooks.deregister()
if (previousBaseURL === undefined) delete process.env.BASE_URL
else process.env.BASE_URL = previousBaseURL

const settings = {
  pageviews: true,
  outboundLinks: false,
  errors: false,
  sessionReplay: true,
}
const load = (file, headers) =>
  loader({
    params: { file },
    request: new Request(`https://untrusted-host.example/p/${file}`, {
      headers,
    }),
  })

test('serves the project script with public CE URLs, caches it, and revalidates by ETag', async (t) => {
  const upstream = t.mock.method(globalThis, 'fetch', async () =>
    Response.json(settings),
  )
  const file = 'Alpha0123456.js'
  const response = await load(file, { Cookie: 'session=private' })
  assert.equal(response.status, 200)
  assert.match(response.headers.get('Content-Type'), /javascript/)
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*')
  const cache = response.headers.get('Cache-Control')
  assert.match(cache, /(?:^|,\s*)max-age=0(?:,|$)/)
  const sharedTTL = Number(/s-maxage=(\d+)/.exec(cache)?.[1])
  assert.ok(sharedTTL > 0 && sharedTTL <= 300)
  const body = await response.text()
  assert.ok(body.includes(`${publicSite}/backend/v1/log`))
  assert.ok(
    body.includes(`${publicSite}/p/recorder-${managedTrackerVersion}.js`),
  )
  assert.ok(!body.includes('swetrix-api:5005'))
  assert.ok(!body.includes('untrusted-host'))
  const etag = response.headers.get('ETag')
  assert.ok(etag)
  const validated = await load(file, { 'If-None-Match': etag })
  assert.equal(validated.status, 304)
  assert.equal(validated.headers.get('ETag'), etag)
  assert.equal(await validated.text(), '')
  assert.equal(upstream.mock.callCount(), 1)
  const [url, options] = upstream.mock.calls[0].arguments
  assert.equal(
    String(url),
    `${internalAPI}v1/project/Alpha0123456/tracker-config`,
  )
  assert.equal(new Headers(options?.headers).get('cookie'), null)
})

test('serves the matching immutable recorder and rejects malformed identifiers without an upstream call', async (t) => {
  const upstream = t.mock.method(globalThis, 'fetch', async () =>
    assert.fail('unexpected fetch'),
  )
  const recorder = await load(`recorder-${managedTrackerVersion}.js`)
  assert.equal(recorder.status, 200)
  assert.match(recorder.headers.get('Cache-Control'), /immutable/)
  assert.equal(await recorder.text(), readManagedRecorder())
  for (const file of [
    'not-a-project.js',
    'Abcd--123456.js',
    'recorder-0.0.0.js',
  ]) {
    assert.equal((await load(file)).status, 404)
  }
  assert.equal(upstream.mock.callCount(), 0)
})

test('missing projects return an empty 404 and failures never produce a tracking script', async (t) => {
  const upstream = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(null, { status: 404 }),
  )
  const missing = await load('Absent123456.js')
  assert.equal(missing.status, 404)
  assert.equal(await missing.text(), '')
  const file = 'Retry0123456.js'
  for (const reply of [
    new Response(null, { status: 500 }),
    Response.json({ ...settings, sessionReplay: 'true' }),
  ]) {
    upstream.mock.mockImplementation(async () => reply)
    const failed = await load(file)
    assert.equal(failed.status, 503)
    assert.equal(failed.headers.get('Cache-Control'), 'no-store')
    assert.equal(await failed.text(), '')
  }
  upstream.mock.mockImplementation(async () => Response.json(settings))
  assert.equal((await load(file)).status, 200)
  assert.equal(upstream.mock.callCount(), 4)
})
