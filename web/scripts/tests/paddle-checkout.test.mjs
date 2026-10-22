import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = readFileSync(
  new URL('../../app/hooks/usePaddle.ts', import.meta.url),
  'utf8',
)
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
})
const checkoutOptions = {
  override: 'https://checkout.paddle.com/checkout/custom/test-checkout',
  email: 'customer@example.com',
  locale: 'en',
}

function createHarness() {
  const scripts = []
  const redirects = []
  const timers = new Map()
  let currentMount
  const window = { location: { assign: (url) => redirects.push(url) } }
  const module = { exports: {} }
  runInNewContext(outputText, {
    exports: module.exports,
    window,
    URL,
    document: {
      createElement: () => ({
        remove() {
          this.removed = true
        },
      }),
      body: { appendChild: (script) => scripts.push(script) },
    },
    setTimeout: (callback, delay) => {
      timers.set(callback, delay)
      return callback
    },
    clearTimeout: (callback) => timers.delete(callback),
    require: (name) => {
      if (name === '~/lib/constants') {
        return {
          PADDLE_JS_URL: 'https://cdn.paddle.com/paddle/paddle.js',
          PADDLE_VENDOR_ID: 139393,
        }
      }
      assert.equal(name, 'react')
      return {
        useCallback: (callback) => callback,
        useRef: (value) => ({ current: value }),
        useState: (value) => {
          const state = currentMount.state
          const index = state.push(value) - 1
          return [
            value,
            (next) => {
              state[index] = next
            },
          ]
        },
        useEffect: (effect) => {
          currentMount.effect = effect
        },
      }
    },
  })
  return {
    window,
    scripts,
    redirects,
    timers,
    mount(options) {
      currentMount = { state: [] }
      const hook = module.exports.usePaddle(options)
      const unmount = currentMount.effect()
      return { ...hook, state: currentMount.state, unmount }
    },
  }
}

test('a checkout requested before Paddle loads opens the generated hosted link', () => {
  const harness = createHarness()
  const checkout = harness.mount()
  assert.deepEqual(checkout.state, [false, false])
  assert.equal(checkout.openCheckout(checkoutOptions), true)
  assert.deepEqual(harness.redirects, [checkoutOptions.override])
})

test('a blocked script fails immediately and does not prevent checkout', () => {
  const harness = createHarness()
  const checkout = harness.mount()
  harness.scripts[0].onerror()
  assert.deepEqual(checkout.state, [false, true])
  assert.equal(harness.timers.size, 0)
  assert.equal(harness.scripts[0].removed, true)
  assert.equal(checkout.openCheckout(checkoutOptions), true)
  assert.deepEqual(harness.redirects, [checkoutOptions.override])
})

test('a stalled script times out and a later mount retries initialization', () => {
  const harness = createHarness()
  const checkout = harness.mount()
  const [[timeout, delay]] = harness.timers
  assert.equal(delay, 15_000)
  timeout()
  assert.deepEqual(checkout.state, [false, true])
  assert.equal(harness.timers.size, 0)
  checkout.unmount()
  const retry = harness.mount()
  assert.equal(harness.scripts.length, 2)
  assert.deepEqual(retry.state, [false, false])
  harness.window.Paddle = { Setup() {}, Checkout: { open() {} } }
  harness.scripts[1].onload()
  assert.deepEqual(retry.state, [true, false])
})

test('successful initialization is shared, opens the overlay and forwards events to mounted listeners', () => {
  const harness = createHarness()
  const events = []
  const opened = []
  let setup
  const checkout = harness.mount({ onEvent: (event) => events.push(event) })
  const second = harness.mount()
  assert.equal(harness.scripts.length, 1)
  harness.window.Paddle = {
    Setup(options) {
      setup = options
    },
    Checkout: { open: (options) => opened.push(options) },
  }
  harness.scripts[0].onload()
  assert.equal(setup.vendor, 139393)
  assert.deepEqual(checkout.state, [true, false])
  assert.deepEqual(second.state, [true, false])
  assert.equal(harness.timers.size, 0)
  assert.equal(checkout.openCheckout(checkoutOptions), true)
  assert.deepEqual(opened, [checkoutOptions])
  assert.deepEqual(harness.redirects, [])
  const completed = { event: 'Checkout.Complete' }
  setup.eventCallback(completed)
  assert.deepEqual(events, [completed])
  checkout.unmount()
  setup.eventCallback({ event: 'Checkout.Close' })
  assert.deepEqual(events, [completed])
  harness.mount()
  assert.equal(harness.scripts.length, 1)
})

test('setup errors and an incompatible SDK fail cleanly and use hosted checkout', () => {
  for (const paddle of [
    undefined,
    { Initialize() {} },
    {
      Setup() {
        throw new Error('Setup failed')
      },
      Checkout: { open() {} },
    },
  ]) {
    const harness = createHarness()
    const checkout = harness.mount()
    harness.window.Paddle = paddle
    harness.scripts[0].onload()
    assert.deepEqual(checkout.state, [false, true])
    assert.equal(harness.timers.size, 0)
    assert.equal(checkout.openCheckout(checkoutOptions), true)
    assert.deepEqual(harness.redirects, [checkoutOptions.override])
  }
})

test('overlay errors fall back to the same generated payment link', () => {
  const harness = createHarness()
  const checkout = harness.mount()
  harness.window.Paddle = {
    Setup() {},
    Checkout: {
      open() {
        throw new Error('Checkout failed')
      },
    },
  }
  harness.scripts[0].onload()
  assert.equal(checkout.openCheckout(checkoutOptions), true)
  assert.deepEqual(checkout.state, [false, true])
  assert.deepEqual(harness.redirects, [checkoutOptions.override])
})

test('replacing the SDK after initialization cannot open a Classic checkout with the wrong SDK', () => {
  const harness = createHarness()
  const checkout = harness.mount()
  harness.window.Paddle = { Setup() {}, Checkout: { open() {} } }
  harness.scripts[0].onload()
  harness.window.Paddle = {
    Checkout: {
      open() {
        assert.fail('Wrong SDK')
      },
    },
  }
  assert.equal(checkout.openCheckout(checkoutOptions), true)
  assert.deepEqual(harness.redirects, [checkoutOptions.override])
})

test('missing, malformed and non-Paddle fallback links fail without navigation', () => {
  const harness = createHarness()
  const checkout = harness.mount()
  for (const override of [
    undefined,
    '',
    'not a URL',
    'javascript:alert(1)',
    'http://checkout.paddle.com/test',
    'https://paddle.com.example.com/test',
    'https://example.com/test',
    'https://user:password@checkout.paddle.com/test',
  ]) {
    assert.equal(checkout.openCheckout({ override }), false)
  }
  assert.deepEqual(harness.redirects, [])
})
