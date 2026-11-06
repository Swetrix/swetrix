import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

import { createCookie, RouterContextProvider } from 'react-router'
import ts from 'typescript'

const require = createRequire(import.meta.url)

function loadModule(file, dependencies = {}) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  })
  const module = { exports: {} }
  runInNewContext(outputText, {
    exports: module.exports,
    process,
    URL,
    require: (name) => dependencies[name] ?? require(name),
  })
  return module.exports
}

const constants = loadModule('../../app/lib/constants/index.ts', {
  '../pricing/catalog': loadModule('../../app/lib/pricing/catalog.ts'),
})
const { i18nextMiddleware, getLocale } = loadModule(
  '../../app/i18next.server.ts',
  {
    '~/lib/constants': constants,
    './i18n': {
      default: { fallbackLng: 'en', defaultNS: 'common' },
      __esModule: true,
    },
  },
)

const encodedCookie = await createCookie('i18next').serialize('de')
const cases = [
  [
    'English preference overrides Chinese browser language',
    '/login',
    'i18next=en',
    'en',
    'zh-CN',
  ],
  [
    'Chinese preference overrides English browser language',
    '/login',
    'i18next=zh',
    'zh',
    'en-GB',
  ],
  [
    'localised path overrides the preference cookie',
    '/zh/login',
    'i18next=en',
    'zh',
    'en-GB',
  ],
  [
    'existing German preference remains supported',
    '/login',
    'i18next=de',
    'de',
    'en-GB',
  ],
  [
    'React Router encoded cookies remain supported',
    '/login',
    encodedCookie,
    'de',
    'en-GB',
  ],
  [
    'unsupported duplicate cookie does not hide a valid preference',
    '/login',
    'i18next=unsupported; i18next=de',
    'de',
    'en-GB',
  ],
  [
    'malformed duplicate cookie does not hide a valid preference',
    '/login',
    'i18next=%E0%A4; i18next=zh',
    'zh',
    'en-GB',
  ],
  [
    'unsupported duplicate cookie does not hide an encoded preference',
    '/login',
    `i18next=unsupported; ${encodedCookie}`,
    'de',
    'en-GB',
  ],
  [
    'first supported encoded preference takes precedence over a later plain cookie',
    '/login',
    `${encodedCookie}; i18next=zh`,
    'de',
    'en-GB',
  ],
  [
    'malformed preference falls back to the browser language',
    '/login',
    'i18next=%E0%A4',
    'zh',
    'zh-CN',
  ],
]

for (const [name, pathname, cookie, expected, browserLanguage] of cases) {
  test(name, async () => {
    const request = new Request(`https://swetrix.test${pathname}`, {
      headers: {
        Cookie: cookie,
        'Accept-Language': browserLanguage,
      },
    })
    const context = new RouterContextProvider()
    await i18nextMiddleware({ request, context }, async () => new Response())
    assert.equal(getLocale(context), expected)
  })
}
