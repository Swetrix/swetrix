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
  ],
  [
    'Chinese preference overrides English browser language',
    '/login',
    'i18next=zh',
    'zh',
  ],
  [
    'localised path overrides the preference cookie',
    '/zh/login',
    'i18next=en',
    'zh',
  ],
  [
    'existing German preference remains supported',
    '/login',
    'i18next=de',
    'de',
  ],
  [
    'React Router encoded cookies remain supported',
    '/login',
    encodedCookie,
    'de',
  ],
  [
    'malformed preference falls back to the browser language',
    '/login',
    'i18next=%E0%A4',
    'en',
  ],
]

for (const [name, pathname, cookie, expected] of cases) {
  test(name, async () => {
    const request = new Request(`https://swetrix.test${pathname}`, {
      headers: {
        Cookie: cookie,
        'Accept-Language':
          expected === 'en' && cookie === 'i18next=en' ? 'zh-CN' : 'en-GB',
      },
    })
    const context = new RouterContextProvider()
    await i18nextMiddleware({ request, context }, async () => new Response())
    assert.equal(getLocale(context), expected)
  })
}
