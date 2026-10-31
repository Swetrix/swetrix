import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

import {
  createState,
  expectedStrings,
  flatten,
  LANGUAGES,
  syncTranslations,
  validateTranslation,
} from '../local-translations.js'
import { parseArgs } from '../translate.js'

async function fixture(
  t,
  source = { title: 'Original', nested: { label: 'Hello {{name}}' } },
) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'swetrix-translate-'))
  t.after(() => fs.rm(dir, { recursive: true, force: true }))
  const localesDir = path.join(dir, 'locales')
  await fs.mkdir(localesDir)
  const stateFile = path.join(dir, 'translation-state.json')
  const write = (file, value) =>
    fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`)
  const read = async (file) => JSON.parse(await fs.readFile(file, 'utf8'))
  const locale = (id) => path.join(localesDir, `${id}.json`)
  await write(locale('en'), source)
  for (const language of LANGUAGES) await write(locale(language.file), source)
  await write(stateFile, createState(flatten(source)))
  const calls = []
  const translateBatch = async (items, language) => {
    calls.push({ language: language.id, items })
    return new Map(
      items.map((item) => [item.batchId, `${language.id}: ${item.text}`]),
    )
  }
  const run = (args = {}, translate = translateBatch) =>
    syncTranslations({
      localesDir,
      stateFile,
      args,
      log: () => {},
      createTranslator: async () => ({ translateBatch: translate }),
    })
  const snapshot = async () =>
    Promise.all(
      [
        stateFile,
        ...['en', ...LANGUAGES.map(({ file }) => file)].map(locale),
      ].map((file) => fs.readFile(file, 'utf8')),
    )
  return {
    localesDir,
    stateFile,
    source,
    write,
    read,
    locale,
    run,
    calls,
    snapshot,
    translateBatch,
  }
}

test('syncs additions, English edits, deletions and nesting without touching existing translations', async (t) => {
  const f = await fixture(t)
  const updated = {
    title: 'Updated',
    nested: { label: f.source.nested.label, added: 'New text' },
  }
  await f.write(f.locale('en'), updated)
  const fr = await f.read(f.locale('fr'))
  fr.nested.label = 'Bonjour {{name}}'
  fr.obsolete = 'Remove me'
  await f.write(f.locale('fr'), fr)
  const result = await f.run()
  assert.equal(result.translated, 10)
  assert.equal(result.remaining, 0)
  assert.equal(result.removed, 1)
  assert.deepEqual(await f.read(f.locale('en')), updated)
  assert.deepEqual(await f.read(f.locale('fr')), {
    title: 'fr: Updated',
    nested: { label: 'Bonjour {{name}}', added: 'fr: New text' },
  })
  const before = await f.snapshot()
  await f.run({}, () =>
    assert.fail('No API call expected for a completed sync'),
  )
  assert.deepEqual(await f.snapshot(), before)
})

test('persists skipped languages and limited work until each translation succeeds', async (t) => {
  const f = await fixture(t)
  await f.write(f.locale('en'), {
    title: 'Changed',
    nested: { label: 'Welcome {{name}}' },
  })
  assert.equal((await f.run({ languages: ['fr'], limit: 1 })).remaining, 1)
  let state = await f.read(f.stateFile)
  assert.deepEqual(state.pending.fr, ['nested.label'])
  assert.deepEqual(state.pending.de, ['title', 'nested.label'])
  f.calls.length = 0
  await f.run({ languages: ['fr'] })
  assert.deepEqual(
    f.calls[0].items.map(({ key }) => key),
    ['nested.label'],
  )
  state = await f.read(f.stateFile)
  assert.deepEqual(state.pending.fr, [])
  assert.equal(state.pending.de.length, 2)
  assert.equal((await f.run()).remaining, 0)
})

test('retries invalid and missing results while preserving valid results', async (t) => {
  const f = await fixture(t)
  await f.write(f.locale('en'), {
    title: 'Changed',
    nested: { label: 'Welcome {{name}}' },
    extra: 'Extra',
  })
  const result = await f.run(
    { languages: ['de'] },
    async (items) =>
      new Map([
        [items[0].batchId, 'Geändert'],
        [items[1].batchId, 'Willkommen'],
      ]),
  )
  assert.equal(result.translated, 1)
  assert.equal(result.failed, 2)
  assert.equal(result.remaining, 2)
  assert.equal(
    (await f.read(f.locale('de'))).nested.label,
    f.source.nested.label,
  )
  assert.equal((await f.read(f.locale('de'))).title, 'Geändert')
  await f.run({ languages: ['de'] })
  assert.deepEqual(
    f.calls[0].items.map(({ key }) => key),
    ['nested.label', 'extra'],
  )
})

test('keeps completed batches when a later API request fails', async (t) => {
  const f = await fixture(t, {})
  await f.write(
    f.locale('en'),
    Object.fromEntries(
      Array.from({ length: 28 }, (_, i) => [`key${i}`, `Text ${i}`]),
    ),
  )
  let calls = 0
  const result = await f.run({ languages: ['fr'] }, async (items, language) => {
    if (++calls === 2) throw new Error('API unavailable')
    return f.translateBatch(items, language)
  })
  assert.equal(result.translated, 25)
  assert.equal(result.failed, 3)
  assert.equal(result.remaining, 3)
  assert.equal(Object.keys(await f.read(f.locale('fr'))).length, 28)
  assert.equal((await f.read(f.locale('fr'))).key27, 'Text 27')
  f.calls.length = 0
  await f.run({ languages: ['fr'] })
  assert.equal(f.calls[0].items.length, 3)
})

test('check and dry-run detect stale, missing, invalid and removed entries without calls or writes', async (t) => {
  const f = await fixture(t)
  await f.write(f.locale('en'), { title: 'Changed', added: 'New' })
  const before = await f.snapshot()
  for (const args of [{ check: true }, { dryRun: true }]) {
    const result = await f.run(args, () =>
      assert.fail('Read-only run called Gemini'),
    )
    assert.equal(result.remaining, 10)
    assert.equal(result.removed, 5)
    assert.deepEqual(await f.snapshot(), before)
    await assert.rejects(fs.access(`${f.stateFile}.lock`))
  }
})

test('derives locale plural categories and refreshes the whole group when English changes', async (t) => {
  const f = await fixture(t, {
    count_one: '{{count}} item',
    count_other: '{{count}} items',
  })
  const result = await f.run()
  assert.equal(result.remaining, 0)
  for (const language of LANGUAGES) {
    const expected = new Intl.PluralRules(language.id)
      .resolvedOptions()
      .pluralCategories.map((category) => `count_${category}`)
      .sort()
    assert.deepEqual(
      Object.keys(await f.read(f.locale(language.file))).sort(),
      expected,
    )
  }
  assert.ok(
    f.calls.some(
      ({ language, items }) =>
        language === 'uk' &&
        items.some(
          ({ key, context }) =>
            key === 'count_few' && context.includes('"few"'),
        ),
    ),
  )
  const uk = await f.read(f.locale('uk'))
  await f.write(f.locale('en'), {
    ...f.source,
    count_one: '{{count}} new item',
  })
  f.calls.length = 0
  await f.run({ languages: ['uk'] })
  assert.equal(f.calls[0].items.length, Object.keys(uk).length)
  assert.equal((await f.run({ check: true, languages: ['uk'] })).remaining, 0)
  const withZero = expectedStrings(
    { count_zero: 'No items', ...f.source },
    LANGUAGES[0],
  )
  assert.ok(withZero.has('count_zero'))
  assert.deepEqual(
    [
      ...expectedStrings(
        { status_one: 'Not a plural group' },
        LANGUAGES[0],
      ).keys(),
    ],
    ['status_one'],
  )
})

test('validates placeholder multiplicity, tag names and nesting, and i18next references', () => {
  assert.equal(validateTranslation('{{a}} {{b}}', '{{b}} {{a}}'), null)
  assert.equal(
    validateTranslation('{{a}} {{a}}', '{{a}}'),
    'placeholder mismatch',
  )
  assert.equal(
    validateTranslation('<Link>Go</Link>', '<link>Go</link>'),
    'tag mismatch',
  )
  assert.equal(
    validateTranslation('<0><1>Go</1></0>', '<0><1>Go</0></1>'),
    'unbalanced tags',
  )
  assert.equal(
    validateTranslation('<a href="url">Go</a>', '<a href="other">Go</a>'),
    'tag mismatch',
  )
  assert.equal(validateTranslation('Go<br/>now', 'Go<br/>now'), null)
  assert.equal(
    validateTranslation('$t(common.save)', '$t(common.delete)'),
    'nested translation mismatch',
  )
  assert.equal(
    validateTranslation('Hello', '  '),
    'empty or missing translation',
  )
  assert.equal(validateTranslation('', ''), null)
})

test('validates line breaks without treating literal escape sequences as newlines', () => {
  const source = 'First paragraph\n\nSecond paragraph\nThird line'
  assert.equal(
    validateTranslation(
      source,
      'Premier paragraphe\n\nDeuxième paragraphe\nTroisième ligne',
    ),
    null,
  )
  for (const translation of [
    source.replaceAll('\n', '\\n'),
    source.replaceAll('\n', ' '),
    source.replaceAll('\n\n', '\n'),
    `${source}\\n`,
  ]) {
    assert.equal(
      validateTranslation(source, translation),
      'line break mismatch',
    )
  }
  assert.equal(validateTranslation('Literal \\n', 'Littéral \\n'), null)
  assert.equal(
    validateTranslation('Literal \\n', 'Littéral \n'),
    'line break mismatch',
  )
  assert.equal(
    validateTranslation('One\r\nTwo', 'Un\\r\\nDeux'),
    'line break mismatch',
  )
})

test('requeues broken line breaks with unchanged English and retains invalid results for retry', async (t) => {
  const f = await fixture(t, { answer: 'First\n\nSecond' })
  const broken = { answer: 'Premier\\n\\nDeuxième' }
  await f.write(f.locale('fr'), broken)
  const before = await f.snapshot()
  assert.equal((await f.run({ check: true })).remaining, 1)
  assert.deepEqual(await f.snapshot(), before)

  const result = await f.run(
    { languages: ['fr'] },
    async (items) => new Map([[items[0].batchId, broken.answer]]),
  )
  assert.equal(result.failed, 1)
  assert.equal(result.remaining, 1)
  assert.equal(result.translated, 0)
  assert.deepEqual((await f.read(f.stateFile)).pending.fr, ['answer'])
  assert.deepEqual(await f.read(f.locale('fr')), broken)

  const corrected = { answer: 'Premier\n\nDeuxième' }
  assert.equal(
    (
      await f.run(
        { languages: ['fr'] },
        async (items) => new Map([[items[0].batchId, corrected.answer]]),
      )
    ).remaining,
    0,
  )
  assert.deepEqual(await f.read(f.locale('fr')), corrected)
  assert.equal((await f.run({ check: true })).remaining, 0)
})

test('missing locale files are recreated, and obsolete keys can be removed without Gemini', async (t) => {
  const f = await fixture(t)
  await fs.rm(f.locale('pt'))
  assert.equal((await f.run({ languages: ['pt'] })).translated, 2)
  assert.equal(f.calls[0].language, 'pt-BR')
  await f.write(f.locale('en'), {})
  assert.equal(
    (await f.run({}, () => assert.fail('Only deletion needed'))).remaining,
    0,
  )
  assert.deepEqual(await f.read(f.locale('pt')), {})
  assert.deepEqual((await f.read(f.stateFile)).pending.fr, [])
})

test('refuses to overwrite locales or English edited while Gemini is running', async (t) => {
  for (const id of ['fr', 'en']) {
    const f = await fixture(t)
    await f.write(f.locale('en'), { title: 'Changed' })
    await assert.rejects(
      f.run({ languages: ['fr'] }, async (items, language) => {
        await f.write(f.locale(id), { title: 'Concurrent edit' })
        return f.translateBatch(items, language)
      }),
      /changed during translation/,
    )
    assert.deepEqual(await f.read(f.locale(id)), { title: 'Concurrent edit' })
    assert.ok((await f.read(f.stateFile)).pending.fr.includes('title'))
    await assert.rejects(fs.access(`${f.stateFile}.lock`))
  }
})

test('rejects unknown languages, missing state, and simultaneous writers', async (t) => {
  const f = await fixture(t)
  const before = await f.snapshot()
  await assert.rejects(f.run({ languages: ['fr', 'typo'] }), /Unknown language/)
  assert.deepEqual(await f.snapshot(), before)
  await fs.writeFile(`${f.stateFile}.lock`, '123\n')
  await assert.rejects(f.run(), /Translation lock exists/)
  await fs.rm(`${f.stateFile}.lock`)
  await fs.rm(f.stateFile)
  await assert.rejects(f.run(), /Cannot read/)
})

test('parses CLI options strictly', () => {
  assert.deepEqual(parseArgs(['--languages=fr,pt', '--limit=2', '--dry-run']), {
    languages: ['fr', 'pt'],
    limit: 2,
    dryRun: true,
    check: false,
    help: false,
  })
  for (const args of [
    ['--languages='],
    ['--limit=2x'],
    ['--limit=0'],
    ['--check', '--dry-run'],
    ['--unknown'],
  ]) {
    assert.throws(() => parseArgs(args))
  }
})

test('preserves arrays and empty containers, using pending English fallbacks after partial failures', async (t) => {
  const f = await fixture(t, { list: ['One'], empty: [], object: {} })
  await f.write(f.locale('en'), {
    list: ['Changed', 'Two'],
    empty: [],
    object: {},
  })
  const result = await f.run(
    { languages: ['fr'] },
    async (items) => new Map([[items[0].batchId, 'Modifié']]),
  )
  assert.equal(result.remaining, 1)
  assert.deepEqual(await f.read(f.locale('fr')), {
    list: ['Modifié', 'Two'],
    empty: [],
    object: {},
  })
  await f.run({ languages: ['fr'] })
  assert.deepEqual(
    f.calls[0].items.map(({ key }) => key),
    ['list.1'],
  )
})
