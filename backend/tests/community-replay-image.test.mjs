import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'

test('the API image matches the Playwright version used by rrvideo', () => {
  const require = createRequire(import.meta.url)
  const requireFromRrvideo = createRequire(
    require.resolve('rrvideo/package.json'),
  )
  const { version } = requireFromRrvideo('playwright/package.json')
  const dockerfile = readFileSync(
    new URL('../Dockerfile', import.meta.url),
    'utf8',
  )
  const image = dockerfile.match(
    /^FROM mcr\.microsoft\.com\/playwright:v([\d.]+)-/m,
  )

  assert.equal(image?.[1], version)
})
