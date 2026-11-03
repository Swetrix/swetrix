import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createContext, runInContext } from 'node:vm'

import {
  managedTrackerVersion,
  readManagedRecorder,
  renderManagedTracker,
} from '../../app/utils/managed-tracker.server.ts'

const apiURL = 'https://analytics.example/backend/v1/log'
const recorderURL = `https://analytics.example/p/recorder-${managedTrackerVersion}.js`
const pid = 'AbCdEf123456'

function browser(settings, { hostname = 'shop.example', currentScript } = {}) {
  const scripts = []
  const listeners = []
  const requests = []
  const context = createContext({
    location: new URL(`https://${hostname}/`),
    URL,
    navigator: { language: 'en' },
    addEventListener: (event) => listeners.push(event),
    document: {
      readyState: 'loading',
      currentScript,
      baseURI: `https://${hostname}/`,
      addEventListener: (event) => listeners.push(event),
      createElement: () => ({}),
      head: { appendChild: (script) => scripts.push(script) },
    },
    fetch: async (url, { body }) => {
      requests.push({ url, body: JSON.parse(body) })
      return { ok: false }
    },
  })
  context.window = context
  const code = renderManagedTracker({ pid, settings, apiURL, recorderURL })
  const load = () => runInContext(code, context)
  load()
  return { context, code, load, listeners, requests, scripts }
}

test('the managed tag initializes the installed SDK only once and includes only public settings', async () => {
  const { context, code, load, listeners, scripts, requests } = browser({
    pageviews: true,
    outboundLinks: true,
    errors: true,
    sessionReplay: false,
    privateSetting: 'private-project-secret',
  })
  const sdk = context.swetrix
  load()
  assert.equal(context.swetrix, sdk)
  assert.deepEqual(listeners.sort(), ['auxclick', 'click', 'error', 'load'])
  assert.equal(scripts.length, 0)
  assert.ok(!code.includes('private-project-secret'))
  await sdk.track({ ev: 'demo' })
  assert.equal(requests[0].url, `${apiURL}/custom`)
  assert.equal(requests[0].body.pid, pid)
})

test('disabled features attach no listeners and load no recorder', () => {
  const { listeners, scripts } = browser({
    pageviews: false,
    outboundLinks: false,
    errors: false,
    sessionReplay: false,
  })
  assert.deepEqual(listeners, [])
  assert.deepEqual(scripts, [])
})

test('replay loads the versioned recorder only for eligible browsers', async () => {
  const settings = { sessionReplay: true }
  assert.deepEqual(browser(settings, { hostname: 'localhost' }).scripts, [])
  const { context, scripts, requests } = browser(settings)
  assert.equal(scripts.length, 1)
  assert.equal(scripts[0].src, recorderURL)
  assert.equal(scripts[0].crossOrigin, 'anonymous')
  assert.ok(readManagedRecorder().includes('rrwebRecord'))
  context.rrwebRecord = { record: () => assert.fail('record before approval') }
  scripts[0].onload()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, `${apiURL}/session-replay/start`)
  assert.equal(requests[0].body.pid, pid)
  assert.equal(requests[0].body.privacy, 'total')
})

test('a proxied project tag can keep ingestion and the recorder first-party', async () => {
  const { context, requests, scripts } = browser(
    { sessionReplay: true },
    {
      currentScript: {
        src: `https://t.shop.example/p/${pid}.js`,
        getAttribute: (key) =>
          key === 'data-api-url' ? 'https://t.shop.example/log/' : null,
      },
    },
  )
  await context.swetrix.track({ ev: 'test' })
  assert.equal(requests[0].url, 'https://t.shop.example/log/custom')
  assert.equal(
    scripts[0].src,
    `https://t.shop.example/p/recorder-${managedTrackerVersion}.js`,
  )
})
