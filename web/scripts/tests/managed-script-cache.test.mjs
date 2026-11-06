import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  getCachedManagedScript,
  invalidateManagedScript,
} from '../../app/utils/managed-script-cache.server.ts'

test('cache hits forward only the remaining lifetime, including for missing projects', async (t) => {
  let now = 0
  t.mock.method(Date, 'now', () => now)
  const load = t.mock.fn(async () => 'script')
  const first = await getCachedManagedScript('fresh', load)
  assert.equal(first.maxAge, 300)
  assert.match(first.etag, /^W\/"[^"]+"$/)
  now = 46_125
  assert.deepEqual(await getCachedManagedScript('fresh', load), {
    ...first,
    maxAge: 253,
  })
  assert.equal(load.mock.callCount(), 1)
  now = 300_000
  await getCachedManagedScript('fresh', load)
  assert.equal(load.mock.callCount(), 2)

  assert.deepEqual(await getCachedManagedScript('missing', async () => null), {
    body: null,
    etag: undefined,
    maxAge: 15,
  })
  now += 14_000
  assert.equal((await getCachedManagedScript('missing', load)).body, null)
  now += 1_000
  assert.equal((await getCachedManagedScript('missing', load)).body, 'script')
})

test('concurrent readers share one load and an invalidated load yields the replacement', async () => {
  const old = Promise.withResolvers()
  const first = getCachedManagedScript('updated', () => old.promise)
  const second = getCachedManagedScript('updated', () =>
    assert.fail('duplicate load'),
  )
  invalidateManagedScript('updated')
  const fresh = await getCachedManagedScript(
    'updated',
    async () => 'updated script',
  )
  old.resolve('old script')
  for (const result of await Promise.all([first, second])) {
    assert.equal(result.body, 'updated script')
    assert.equal(result.etag, fresh.etag)
  }
})

test('failed loads can be retried and an older rejection leaves its replacement cached', async () => {
  const unavailable = new Error('Unavailable')
  await assert.rejects(
    getCachedManagedScript('retry', async () => {
      throw unavailable
    }),
    unavailable,
  )
  assert.equal(
    (await getCachedManagedScript('retry', async () => 'recovered')).body,
    'recovered',
  )

  const delayed = Promise.withResolvers()
  const old = getCachedManagedScript('race', () => delayed.promise)
  invalidateManagedScript('race')
  await getCachedManagedScript('race', async () => 'replacement')
  delayed.reject(unavailable)
  await assert.rejects(old, unavailable)
  assert.equal(
    (
      await getCachedManagedScript('race', () =>
        assert.fail('replacement lost'),
      )
    ).body,
    'replacement',
  )
})

test('capacity evicts the least recently used result and bounds pending requests', async () => {
  for (let i = 0; i < 512; i++) {
    await getCachedManagedScript(`entry-${i}`, async () => 'initial')
  }
  await getCachedManagedScript('entry-0', () =>
    assert.fail('premature eviction'),
  )
  await getCachedManagedScript('overflow', async () => 'new')
  assert.equal(
    (await getCachedManagedScript('entry-1', async () => 'reloaded')).body,
    'reloaded',
  )
  assert.equal(
    (await getCachedManagedScript('entry-0', async () => 'reloaded')).body,
    'initial',
  )

  const gate = Promise.withResolvers()
  const pending = Array.from({ length: 512 }, (_, i) =>
    getCachedManagedScript(`pending-${i}`, () => gate.promise),
  )
  await assert.rejects(
    getCachedManagedScript('overloaded', () =>
      assert.fail('capacity exceeded'),
    ),
    /cache is busy/,
  )
  gate.resolve('ready')
  await Promise.all(pending)
  assert.equal(
    (await getCachedManagedScript('overloaded', async () => 'ok')).body,
    'ok',
  )
})
