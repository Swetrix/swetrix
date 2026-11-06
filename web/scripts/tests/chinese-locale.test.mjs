import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'

import { createInstance } from 'i18next'

import {
  expectedStrings,
  flatten,
  LANGUAGES,
  validateTranslation,
} from '../local-translations.js'

const localeFile = new URL('../../public/locales/zh.json', import.meta.url)
const english = JSON.parse(
  readFileSync(
    new URL('../../public/locales/en.json', import.meta.url),
    'utf8',
  ),
)

test('Simplified Chinese is available to the translation sync command', () => {
  assert.deepEqual(
    LANGUAGES.find(({ file }) => file === 'zh'),
    { id: 'zh-CN', name: 'Simplified Chinese', file: 'zh' },
  )
})

test('Simplified Chinese covers the English catalogue with intact tokens and Chinese plural forms', () => {
  assert.ok(existsSync(localeFile), 'The Simplified Chinese locale is missing')
  const translated = flatten(JSON.parse(readFileSync(localeFile, 'utf8')))
  const expected = expectedStrings(flatten(english), { id: 'zh-CN' })

  assert.deepEqual(Object.keys(translated).sort(), [...expected.keys()].sort())
  for (const { key, text } of expected.values()) {
    assert.equal(validateTranslation(text, translated[key]), null, key)
  }
})

test('Chinese count translations interpolate zero, one and multiple items without English fallback', async () => {
  assert.ok(existsSync(localeFile), 'The Simplified Chinese locale is missing')
  const chinese = JSON.parse(readFileSync(localeFile, 'utf8'))
  const instance = createInstance()
  await instance.init({
    lng: 'zh',
    fallbackLng: 'en',
    resources: { zh: { translation: chinese }, en: { translation: english } },
  })

  assert.match(chinese.apiKeys.projectsSelected_other, /\p{Script=Han}/u)
  for (const count of [0, 1, 2, 10]) {
    assert.equal(
      instance.t('apiKeys.projectsSelected', { count }),
      chinese.apiKeys.projectsSelected_other.replace(
        '{{count}}',
        String(count),
      ),
    )
  }
})
