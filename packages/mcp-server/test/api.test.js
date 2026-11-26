import assert from 'node:assert/strict'
import test from 'node:test'
import { apiBaseUrl, createApi } from '../src/api.js'

test('API base URL supports self-hosted prefixes and rejects ambiguous credential destinations', () => {
  assert.equal(
    apiBaseUrl('https://swetrix.example/api/'),
    'https://swetrix.example/api',
  )
  for (const value of [
    '/api',
    'file:///tmp/test',
    'https://me:pw@example.org',
    'https://host/v2',
    'https://host?test=1',
  ]) {
    assert.throws(() => apiBaseUrl(value))
  }
})

test('rate limits and size limits produce actionable errors', async () => {
  const call = (response) =>
    createApi(apiBaseUrl(), 'example-key', async () => response).request(
      '/v1/project',
    )
  await assert.rejects(
    call(new Response(null, { status: 429, headers: { 'retry-after': '15' } })),
    /429.*Retry in 15 seconds/,
  )
  await assert.rejects(
    call(Response.json({ message: 'invalid: example-key' }, { status: 400 })),
    /invalid: \[redacted\]/,
  )
  await assert.rejects(call(new Response('a'.repeat(1048577))), /too much data/)
  await assert.rejects(call(new Response('<html></html>')), /base URL/)
})
