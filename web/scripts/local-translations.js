import { createHash, randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export const LANGUAGES = [
  { id: 'fr', name: 'French', file: 'fr' },
  { id: 'de', name: 'German', file: 'de' },
  { id: 'pl', name: 'Polish', file: 'pl' },
  { id: 'uk', name: 'Ukrainian', file: 'uk' },
  { id: 'pt-BR', name: 'Brazilian Portuguese', file: 'pt' },
]

const hash = (text) => createHash('sha256').update(text).digest('hex')
const serialise = (value) => `${JSON.stringify(value, null, 2)}\n`
const pluralPattern = /^(.*)_(zero|one|two|few|many|other)$/

export function flatten(value, prefix = '') {
  if (!value || typeof value !== 'object') {
    throw new Error(
      `Expected a JSON object, array or string at ${prefix || 'root'}`,
    )
  }
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entry]) => {
      if (key.includes('.'))
        throw new Error(`Dots in locale keys are unsupported: ${key}`)
      const fullKey = prefix ? `${prefix}.${key}` : key
      if (typeof entry === 'string') return [[fullKey, entry]]
      return Object.entries(flatten(entry, fullKey))
    }),
  )
}

function nest(entries, source) {
  const result = Object.create(null)
  const insert = (key, value) => {
    const parts = key.split('.')
    let parent = result
    let shape = source
    for (const part of parts.slice(0, -1)) {
      shape = shape?.[part]
      parent = parent[part] ??= Array.isArray(shape) ? [] : Object.create(null)
    }
    parent[parts.at(-1)] = value
  }
  for (const [key, value] of entries) insert(key, value)
  const preserveEmpty = (node, prefix = '') => {
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'string') continue
      const fullKey = prefix ? `${prefix}.${key}` : key
      if (Object.keys(value).length === 0)
        insert(fullKey, Array.isArray(value) ? [] : {})
      else preserveEmpty(value, fullKey)
    }
  }
  preserveEmpty(source)
  return result
}

export function createState(source) {
  return {
    version: 1,
    sourceHashes: Object.fromEntries(
      Object.entries(source).map(([key, text]) => [key, hash(text)]),
    ),
    pending: Object.fromEntries(LANGUAGES.map(({ id }) => [id, []])),
  }
}

export function expectedStrings(source, language) {
  const categories = new Set(
    new Intl.PluralRules(language.id).resolvedOptions().pluralCategories,
  )
  const result = new Map()
  for (const [key, text] of Object.entries(source)) {
    const match = pluralPattern.exec(key)
    const base = match?.[1]
    const isPlural =
      base &&
      Object.hasOwn(source, `${base}_one`) &&
      Object.hasOwn(source, `${base}_other`)
    if (!isPlural) {
      result.set(key, { key, text, sourceKeys: [key] })
      continue
    }
    const sourceKeys = Object.keys(source).filter(
      (candidate) => pluralPattern.exec(candidate)?.[1] === base,
    )
    const wanted = new Set(categories)
    if (Object.hasOwn(source, `${base}_zero`)) wanted.add('zero')
    for (const category of ['zero', 'one', 'two', 'few', 'many', 'other']) {
      if (!wanted.has(category)) continue
      const targetKey = `${base}_${category}`
      const sourceKey = Object.hasOwn(source, targetKey)
        ? targetKey
        : `${base}_other`
      result.set(targetKey, {
        key: targetKey,
        text: source[sourceKey],
        sourceKeys,
        context: `Plural category "${category}" for ${language.id}. Use the appropriate grammatical form. English singular: ${source[`${base}_one`]}; English plural: ${source[`${base}_other`]}.`,
      })
    }
  }
  return result
}

const tokens = (text, pattern) => (text.match(pattern) ?? []).sort()
const sameTokens = (a, b, pattern) =>
  JSON.stringify(tokens(a, pattern)) === JSON.stringify(tokens(b, pattern))
const tagPattern = /<\/?[\w-]+(?:\s+[^<>]*?)?\s*\/?>/g
const voidTags = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

function balancedTags(text) {
  const stack = []
  for (const tag of text.match(tagPattern) ?? []) {
    const name = /^<\/?([\w-]+)/.exec(tag)[1]
    if (tag.startsWith('</')) {
      if (stack.pop() !== name) return false
    } else if (!tag.endsWith('/>') && !voidTags.has(name)) stack.push(name)
  }
  return stack.length === 0
}

export function validateTranslation(source, translation) {
  if (
    typeof translation !== 'string' ||
    (source.trim() && !translation.trim())
  ) {
    return 'empty or missing translation'
  }
  if (!sameTokens(source, translation, /\{\{[^}]+\}\}/g))
    return 'placeholder mismatch'
  if (!sameTokens(source, translation, /\$t\([^)]*\)/g))
    return 'nested translation mismatch'
  if (
    !sameTokens(source, translation, /(?:\r\n|\r|\n)+/g) ||
    !sameTokens(source, translation, /\\[rn]/g)
  )
    return 'line break mismatch'
  if (!sameTokens(source, translation, tagPattern)) return 'tag mismatch'
  if (balancedTags(source) && !balancedTags(translation))
    return 'unbalanced tags'
  return null
}

async function readJSON(file, fallback) {
  try {
    const raw = await fs.readFile(file, 'utf8')
    return { raw, value: JSON.parse(raw) }
  } catch (error) {
    if (error.code === 'ENOENT' && fallback !== undefined)
      return { raw: null, value: fallback }
    throw new Error(`Cannot read ${file}: ${error.message}`)
  }
}

function validateState(state) {
  if (
    !state ||
    state.version !== 1 ||
    !state.sourceHashes ||
    !state.pending ||
    Object.values(state.sourceHashes).some(
      (value) => typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value),
    ) ||
    LANGUAGES.some(
      ({ id }) =>
        !Array.isArray(state.pending[id]) ||
        state.pending[id].some((key) => typeof key !== 'string'),
    )
  ) {
    throw new Error(
      'Invalid translation-state.json. Restore it from Git; do not reset it after editing English strings.',
    )
  }
}

async function writeJSON(file, value, previousRaw) {
  const raw = serialise(value)
  const current = await fs.readFile(file, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return null
    throw error
  })
  if (current !== previousRaw)
    throw new Error(
      `${file} changed during translation; refusing to overwrite it. Run again.`,
    )
  if (raw === previousRaw) return previousRaw
  const temporary = `${file}.${randomUUID()}.tmp`
  try {
    await fs.writeFile(temporary, raw, { flag: 'wx' })
    await fs.rename(temporary, file)
  } finally {
    await fs.rm(temporary, { force: true })
  }
  return raw
}

export async function syncTranslations({
  localesDir,
  stateFile,
  args = {},
  createTranslator,
  log = console.log,
}) {
  const selected = LANGUAGES.filter(
    (language) =>
      !args.languages ||
      args.languages.some((id) => id === language.id || id === language.file),
  )
  if (
    args.languages?.some(
      (id) =>
        !LANGUAGES.some(
          (language) => id === language.id || id === language.file,
        ),
    ) ||
    selected.length === 0
  ) {
    throw new Error(
      `Unknown language. Available: ${LANGUAGES.map(({ id }) => id).join(', ')} (pt is an alias for pt-BR).`,
    )
  }
  const readOnly = args.check || args.dryRun
  const lockFile = `${stateFile}.lock`
  let lock
  if (!readOnly) {
    try {
      lock = await fs.open(lockFile, 'wx')
      await lock.writeFile(`${process.pid}\n`)
    } catch (error) {
      if (error.code === 'EEXIST')
        throw new Error(
          `Translation lock exists: ${lockFile}. If the previous run was interrupted, confirm it has stopped before removing the lock.`,
        )
      throw error
    }
  }
  try {
    return await sync({
      localesDir,
      stateFile,
      args,
      createTranslator,
      log,
      selected,
      readOnly,
    })
  } finally {
    if (lock) {
      await lock.close()
      await fs.rm(lockFile, { force: true })
    }
  }
}

async function sync({
  localesDir,
  stateFile,
  args,
  createTranslator,
  log,
  selected,
  readOnly,
}) {
  const sourceFile = path.join(localesDir, 'en.json')
  const sourceDocument = await readJSON(sourceFile)
  const source = flatten(sourceDocument.value)
  const stateDocument = await readJSON(stateFile)
  const state = stateDocument.value
  validateState(state)
  let stateRaw = stateDocument.raw
  const nextHashes = createState(source).sourceHashes
  const changed = new Set(
    Object.keys(source).filter(
      (key) => state.sourceHashes[key] !== nextHashes[key],
    ),
  )
  const plans = []

  for (const language of LANGUAGES) {
    const file = path.join(localesDir, `${language.file}.json`)
    const document = await readJSON(file, {})
    const target = flatten(document.value)
    const expected = expectedStrings(source, language)
    const pending = new Set(state.pending[language.id])
    const work = [...expected.values()].filter(
      (item) =>
        pending.has(item.key) ||
        item.sourceKeys.some((key) => changed.has(key)) ||
        validateTranslation(item.text, target[item.key]),
    )
    state.pending[language.id] = work.map(({ key }) => key)
    const removed = Object.keys(target).filter((key) => !expected.has(key))
    plans.push({
      language,
      file,
      raw: document.raw,
      target,
      expected,
      work,
      removed,
    })
  }
  state.sourceHashes = nextHashes
  const active = plans.filter(({ language }) => selected.includes(language))
  for (const plan of active) {
    log(
      `[${plan.language.id}] ${plan.work.length} to translate, ${plan.removed.length} obsolete keys`,
    )
    if (args.dryRun) {
      for (const item of plan.work) log(`  translate ${item.key}`)
      for (const key of plan.removed) log(`  remove ${key}`)
    }
  }
  const outstanding = () =>
    active.reduce(
      (sum, plan) => sum + state.pending[plan.language.id].length,
      0,
    )
  if (readOnly)
    return {
      remaining: outstanding(),
      removed: active.reduce((sum, plan) => sum + plan.removed.length, 0),
      translated: 0,
      failed: 0,
    }

  const translator = outstanding() ? await createTranslator() : null
  const verifySource = async () => {
    if ((await fs.readFile(sourceFile, 'utf8')) !== sourceDocument.raw)
      throw new Error(
        'en.json changed during translation. Run again to use the latest English strings.',
      )
  }
  const saveState = async () => {
    await verifySource()
    stateRaw = await writeJSON(stateFile, state, stateRaw)
  }
  await saveState()
  const saveLocale = async (plan) => {
    await verifySource()
    const entries = [...plan.expected.values()].map(({ key, text }) => [
      key,
      plan.target[key] ?? text,
    ])
    plan.raw = await writeJSON(
      plan.file,
      nest(entries, sourceDocument.value),
      plan.raw,
    )
  }
  let translated = 0
  let failed = 0
  for (const plan of active) {
    await saveLocale(plan)
    const work = args.limit ? plan.work.slice(0, args.limit) : plan.work
    for (let offset = 0; offset < work.length; offset += 25) {
      const batch = work
        .slice(offset, offset + 25)
        .map((item, batchId) => ({ ...item, batchId }))
      let result
      try {
        result = await translator.translateBatch(batch, plan.language)
      } catch (error) {
        failed += batch.length
        log(`[${plan.language.id}] batch failed: ${error.message}`)
        continue
      }
      const completed = new Set()
      for (const item of batch) {
        const text = result.get(item.batchId)
        const error = validateTranslation(item.text, text)
        if (error) {
          failed++
          log(`[${plan.language.id}] ${item.key}: ${error}`)
          continue
        }
        plan.target[item.key] = text
        completed.add(item.key)
        translated++
      }
      await saveLocale(plan)
      state.pending[plan.language.id] = state.pending[plan.language.id].filter(
        (key) => !completed.has(key),
      )
      await saveState()
      log(
        `[${plan.language.id}] saved ${completed.size}/${batch.length} translations`,
      )
    }
  }
  return {
    translated,
    failed,
    remaining: outstanding(),
    removed: active.reduce((sum, plan) => sum + plan.removed.length, 0),
  }
}
