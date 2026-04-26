#!/usr/bin/env node
/**
 * Auto-translate untranslated Crowdin source strings via Gemini.
 *
 * Workflow:
 *   1. crowdin upload      (uploads new keys from en.json to Crowdin)
 *   2. node web/scripts/translate.js   (this script — translates missing strings)
 *   3. crowdin download    (pulls translations back into web/public/locales/*.json)
 *
 * Usage:
 *   GEMINI_API_KEY=... node web/scripts/translate.js [options]
 *
 * Options:
 *   --languages=<csv>   Restrict to specific target language IDs (e.g. de,uk).
 *   --limit=<n>         Cap untranslated strings per language (debug aid).
 *   --dry-run           Translate but skip uploading to Crowdin.
 *   --help, -h          Show help.
 *
 * Environment (read from the shell first, then web/.env as fallback):
 *   GEMINI_API_KEY      Required. Google AI Studio API key.
 *   GEMINI_RPM          Optional. Max Gemini requests/min (default 20, free tier limit 25).
 *   CROWDIN_API_TOKEN   Optional. Overrides token from crowdin.yml.
 *   CROWDIN_PROJECT_ID  Optional. Overrides project_id from crowdin.yml.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Client } from '@crowdin/crowdin-api-client'
import { GoogleGenAI } from '@google/genai'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WEB_DIR = path.resolve(__dirname, '..')
const CROWDIN_YML = path.join(WEB_DIR, 'crowdin.yml')
const DOTENV_PATH = path.join(WEB_DIR, '.env')

const CONFIG = {
  GEMINI_MODEL: 'gemini-3.1-pro-preview',
  THINKING_LEVEL: 'medium',
  // Free-tier Gemini quota for gemini-3.1-pro is 25 RPM. Stay safely under it.
  // Override via GEMINI_RPM env var if you're on a higher tier.
  GEMINI_RPM_DEFAULT: 20,
  BATCH_SIZE: 25,
  LANGUAGE_CONCURRENCY: 4,
  PER_LANGUAGE_BATCH_CONCURRENCY: 4,
  UPLOAD_CONCURRENCY: 8,
  MAX_RETRIES: 6,
  INITIAL_RETRY_DELAY_MS: 1000,
}

// ---------------------------------------------------------------- helpers --

const ansi = (code) => (s) => `\x1b[${code}m${s}\x1b[0m`
const c = {
  bold: ansi('1'),
  dim: ansi('2'),
  red: ansi('31'),
  green: ansi('32'),
  yellow: ansi('33'),
  blue: ansi('34'),
  cyan: ansi('36'),
  gray: ansi('90'),
}
const log = (...a) => console.log(...a)
const info = (...a) => console.log(c.cyan('info'), ...a)
const warn = (...a) => console.log(c.yellow('warn'), ...a)
const fail = (...a) => console.error(c.red('err '), ...a)
const ok = (...a) => console.log(c.green(' ok '), ...a)
const tag = (label) => c.gray(`[${label}]`)

function parseArgs(argv) {
  const out = { languages: null, dryRun: false, limit: null, help: false }
  for (const a of argv.slice(2)) {
    if (a === '--help' || a === '-h') out.help = true
    else if (a === '--dry-run') out.dryRun = true
    else if (a.startsWith('--languages=')) {
      out.languages = a
        .slice('--languages='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    } else if (a.startsWith('--limit=')) {
      const n = Number.parseInt(a.slice('--limit='.length), 10)
      if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid --limit value: ${a}`)
      out.limit = n
    } else throw new Error(`Unknown argument: ${a} (try --help)`)
  }
  return out
}

function printHelp() {
  log(`${c.bold('translate.js')} — auto-fill missing Crowdin translations via Gemini.

${c.bold('Usage')}
  GEMINI_API_KEY=... node web/scripts/translate.js [options]

${c.bold('Options')}
  --languages=<csv>   Restrict to specific target language IDs (e.g. de,uk).
  --limit=<n>         Cap number of untranslated strings per language (debug).
  --dry-run           Fetch + translate but skip uploading to Crowdin.
  --help, -h          Show this help.

${c.bold('Environment')} (shell env wins, web/.env is used as fallback)
  GEMINI_API_KEY      Required. Google AI Studio API key.
  GEMINI_RPM          Optional. Max Gemini requests/min (default 20; free tier limit is 25).
  CROWDIN_API_TOKEN   Optional. Overrides token from crowdin.yml.
  CROWDIN_PROJECT_ID  Optional. Overrides project_id from crowdin.yml.
`)
}

async function loadDotEnvFallback(filePath) {
  let content
  try {
    content = await fs.readFile(filePath, 'utf8')
  } catch (e) {
    if (e?.code === 'ENOENT') return
    throw e
  }
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

async function loadCrowdinConfig() {
  let projectId = process.env.CROWDIN_PROJECT_ID
  let token = process.env.CROWDIN_API_TOKEN

  if (!projectId || !token) {
    const yml = await fs.readFile(CROWDIN_YML, 'utf8').catch(() => null)
    if (!yml) {
      throw new Error(
        `crowdin.yml not found at ${CROWDIN_YML}. Set CROWDIN_API_TOKEN and CROWDIN_PROJECT_ID env vars instead.`,
      )
    }
    projectId ||= yml.match(/['"]?project_id['"]?\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? null
    token ||= yml.match(/['"]?api_token['"]?\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? null
  }
  if (!projectId) throw new Error('Could not determine Crowdin project_id (set CROWDIN_PROJECT_ID).')
  if (!token) throw new Error('Could not determine Crowdin api_token (set CROWDIN_API_TOKEN).')

  const id = Number(projectId)
  if (!Number.isFinite(id)) throw new Error(`Crowdin project_id is not a number: ${projectId}`)

  return { projectId: id, token }
}

async function pMap(items, mapper, concurrency = 4) {
  const results = new Array(items.length)
  let cursor = 0
  let aborted = false
  let abortError = null

  async function worker() {
    while (!aborted) {
      const idx = cursor++
      if (idx >= items.length) return
      try {
        results[idx] = await mapper(items[idx], idx)
      } catch (e) {
        aborted = true
        abortError = e
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(Math.max(concurrency, 1), items.length) }, () => worker()),
  )
  if (aborted) throw abortError
  return results
}

async function withRetry(fn, { retries = CONFIG.MAX_RETRIES, baseDelay = CONFIG.INITIAL_RETRY_DELAY_MS, label = 'op' } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      const status = httpStatus(e)
      const isLast = attempt === retries
      const isClientError =
        typeof status === 'number' && status >= 400 && status < 500 && status !== 408 && status !== 429
      if (isLast || isClientError) throw e

      const apiRetryMs = status === 429 ? extractRetryDelayMs(e) : null
      const delay =
        apiRetryMs != null
          ? apiRetryMs + 750
          : baseDelay * 2 ** attempt + Math.floor(Math.random() * 250)

      const reason = status === 429 ? 'rate limited (HTTP 429)' : (e?.message ?? String(e))
      const human = delay >= 2000 ? `${(delay / 1000).toFixed(1)}s` : `${delay}ms`
      warn(`${label}: attempt ${attempt + 1} failed (${truncate(reason, 120)}); retrying in ${human}`)
      await sleep(delay)
    }
  }
  throw lastErr
}

function truncate(s, n) {
  return typeof s === 'string' && s.length > n ? `${s.slice(0, n - 1)}…` : s
}

/**
 * Pulls `RetryInfo.retryDelay` (e.g. "56s") out of a Google API error payload.
 * The @google/genai SDK puts the JSON body in `e.message` on 429s.
 */
function extractRetryDelayMs(e) {
  const candidates = []
  if (typeof e?.message === 'string') candidates.push(e.message)
  if (typeof e?.body === 'string') candidates.push(e.body)
  if (e?.response?.data) candidates.push(e.response.data)

  for (const c of candidates) {
    let payload = c
    if (typeof payload === 'string') {
      const start = payload.indexOf('{')
      if (start < 0) continue
      try {
        payload = JSON.parse(payload.slice(start))
      } catch {
        continue
      }
    }
    const details = payload?.error?.details
    if (!Array.isArray(details)) continue
    for (const d of details) {
      const t = d?.['@type']
      if (typeof t === 'string' && t.endsWith('RetryInfo') && typeof d.retryDelay === 'string') {
        const m = /^(\d+(?:\.\d+)?)s$/.exec(d.retryDelay)
        if (m) return Math.ceil(Number.parseFloat(m[1]) * 1000)
      }
    }
  }
  return null
}

/**
 * Sliding-window rate limiter shared across all Gemini calls.
 * Single-threaded JS makes the check-and-push atomic per microtask, so no mutex needed.
 */
class RateLimiter {
  constructor(rpm) {
    this.rpm = Math.max(1, rpm)
    this.windowMs = 60_000
    this.timestamps = []
    this.pausedUntil = 0
  }

  pauseUntil(timestamp) {
    if (timestamp > this.pausedUntil) this.pausedUntil = timestamp
  }

  async acquire() {
    while (true) {
      const now = Date.now()

      if (now < this.pausedUntil) {
        await sleep(this.pausedUntil - now + 100)
        continue
      }

      while (this.timestamps.length > 0 && this.timestamps[0] <= now - this.windowMs) {
        this.timestamps.shift()
      }

      if (this.timestamps.length < this.rpm) {
        this.timestamps.push(now)
        return
      }

      const waitFor = this.timestamps[0] + this.windowMs - now + 100
      await sleep(Math.max(50, waitFor))
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function httpStatus(e) {
  const candidates = [e?.response?.status, e?.status, e?.statusCode, typeof e?.code === 'number' ? e.code : null]
  for (const v of candidates) if (typeof v === 'number') return v
  return null
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ---------------------------------------------------------------- crowdin --

class CrowdinService {
  constructor({ projectId, token }) {
    this.projectId = projectId
    const client = new Client({ token })
    this.projectsApi = client.projectsGroupsApi
    this.sourceStringsApi = client.sourceStringsApi
    this.stringTranslationsApi = client.stringTranslationsApi
  }

  async getTargetLanguages() {
    const res = await withRetry(() => this.projectsApi.getProject(this.projectId), {
      label: 'crowdin.getProject',
    })
    return res.data.targetLanguages.map((l) => ({
      id: l.id,
      name: l.name,
      locale: l.locale,
      twoLettersCode: l.twoLettersCode,
    }))
  }

  async listAllSourceStrings() {
    const res = await withRetry(
      () => this.sourceStringsApi.withFetchAll().listProjectStrings(this.projectId),
      { label: 'crowdin.listSourceStrings' },
    )
    return res.data.map((d) => ({
      id: d.data.id,
      identifier: d.data.identifier,
      key: d.data.key ?? d.data.identifier,
      text: typeof d.data.text === 'string' ? d.data.text : null,
      context: d.data.context || '',
      isHidden: !!d.data.isHidden,
    }))
  }

  async listTranslatedStringIds(languageId) {
    const res = await withRetry(
      () =>
        this.stringTranslationsApi
          .withFetchAll()
          .listLanguageTranslations(this.projectId, languageId),
      { label: `crowdin.listLanguageTranslations(${languageId})` },
    )
    const ids = new Set()
    for (const t of res.data) {
      const sid = t.data.stringId ?? t.data.string_id
      if (typeof sid === 'number') ids.add(sid)
    }
    return ids
  }

  async addTranslation({ stringId, languageId, text }) {
    return await withRetry(
      () =>
        this.stringTranslationsApi.addTranslation(this.projectId, {
          stringId,
          languageId,
          text,
        }),
      { label: `crowdin.addTranslation(${languageId}#${stringId})` },
    )
  }
}

// ----------------------------------------------------------------- gemini --

class GeminiTranslator {
  constructor({ apiKey, rateLimiter }) {
    this.ai = new GoogleGenAI({ apiKey })
    this.rateLimiter = rateLimiter
  }

  buildSystemInstruction(language) {
    const langLabel = language.name
      ? `${language.name} (${language.id})`
      : language.id
    return [
      `You are a professional UI/UX translator working on Swetrix — a privacy-focused, developer-oriented web analytics product.`,
      `Translate the supplied user interface strings from English into ${langLabel}.`,
      ``,
      `Rules (all are mandatory):`,
      `1. Preserve every interpolation placeholder verbatim, exactly as it appears: {{name}}, {{count}}, {{max}} — do not translate, reorder, rename, or alter casing.`,
      `2. Preserve every HTML/JSX-like tag verbatim, including unusual ones such as <0>, <1>, <span>, <integrationLink>, <discordUrl>. Translate only the text BETWEEN tags. Keep tag pairs balanced.`,
      `3. Do not translate brand names: Swetrix, Google Analytics, Matomo, Plausible, Stripe, Paddle, GitHub, Discord, Telegram, Slack, etc.`,
      `4. Keep widely accepted technical terms (API, URL, dashboard, analytics, GDPR, CAPTCHA, dashboard, webhook, etc.) in the form most natural for the target language — translate only when a well-established native term exists.`,
      `5. Match the formality, capitalization style, and punctuation of the source. Sentence case in source → sentence case in target. Imperative mood → imperative mood.`,
      `6. Keep translations concise; UI labels should be short. Prefer the natural phrasing a native speaker would use.`,
      `7. Do not add explanations, quotes, prefixes, suffixes, or commentary. Return ONLY the translation text.`,
      `8. Treat the "key" path as additional context about WHERE the string is used in the UI — use it to choose the right tone (e.g. button labels vs error messages vs marketing copy).`,
      `9. If a source string is purely a placeholder/URL/email/number/code, output it unchanged.`,
    ].join('\n')
  }

  buildBatchPrompt(items) {
    const payload = items.map((s) => ({
      id: s.batchId,
      key: s.key,
      source: s.text,
      ...(s.context ? { context: s.context } : {}),
    }))
    return [
      `Translate the following ${items.length} strings.`,
      `Each string has an "id" (integer), a "key" (dot-path describing UI location), the English "source" text, and optionally a "context" hint.`,
      ``,
      `Return a JSON array containing one object per input, each shaped like {"id": <integer>, "text": <translation>}.`,
      `The output array must contain exactly ${items.length} objects, one per input id, in any order.`,
      ``,
      `Input:`,
      JSON.stringify(payload, null, 2),
    ].join('\n')
  }

  async translateBatch(items, language) {
    const systemInstruction = this.buildSystemInstruction(language)
    const prompt = this.buildBatchPrompt(items)
    const rateLimiter = this.rateLimiter

    const response = await withRetry(
      async () => {
        await rateLimiter.acquire()
        try {
          return await this.ai.models.generateContent({
            model: CONFIG.GEMINI_MODEL,
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    text: { type: 'string' },
                  },
                  required: ['id', 'text'],
                  propertyOrdering: ['id', 'text'],
                },
              },
              thinkingConfig: { thinkingLevel: CONFIG.THINKING_LEVEL },
            },
          })
        } catch (e) {
          // Drain other waiters too — if Google says wait Ns, no point firing another call sooner.
          if (httpStatus(e) === 429) {
            const ms = extractRetryDelayMs(e)
            if (ms != null) rateLimiter.pauseUntil(Date.now() + ms)
          }
          throw e
        }
      },
      { label: `gemini.translate(${language.id}, n=${items.length})` },
    )

    const text = response.text ?? response.response?.text ?? ''
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      throw new Error(`Gemini returned non-JSON output for ${language.id}: ${e.message}\n--- output ---\n${text}`)
    }
    if (!Array.isArray(parsed)) {
      throw new Error(`Gemini returned non-array output for ${language.id}: ${typeof parsed}`)
    }

    const map = new Map()
    for (const row of parsed) {
      if (row && typeof row.id === 'number' && typeof row.text === 'string') {
        map.set(row.id, row.text)
      }
    }
    return map
  }
}

// -------------------------------------------------------- placeholder check

const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g
const TAG_RE = /<\/?[\w-]+\s*\/?>/g

function placeholderSet(s) {
  return new Set(s.match(PLACEHOLDER_RE) ?? [])
}
function tagSet(s) {
  return new Set((s.match(TAG_RE) ?? []).map((t) => t.replace(/\s+/g, '').toLowerCase()))
}
function setsEqual(a, b) {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

function validateTranslation(source, translation) {
  if (typeof translation !== 'string' || translation.length === 0) {
    return { ok: false, reason: 'empty translation' }
  }
  if (!setsEqual(placeholderSet(source), placeholderSet(translation))) {
    return { ok: false, reason: 'placeholder mismatch' }
  }
  if (!setsEqual(tagSet(source), tagSet(translation))) {
    return { ok: false, reason: 'tag mismatch' }
  }
  return { ok: true }
}

// ------------------------------------------------------------------ flow ---

async function findUntranslated(crowdin, allStrings, language) {
  const translatedIds = await crowdin.listTranslatedStringIds(language.id)
  return allStrings.filter(
    (s) => !s.isHidden && typeof s.text === 'string' && s.text.length > 0 && !translatedIds.has(s.id),
  )
}

async function translateLanguage({ crowdin, gemini, language, untranslated, args }) {
  const label = tag(language.id)
  if (untranslated.length === 0) {
    ok(`${label} already complete — no untranslated strings`)
    return { language: language.id, translated: 0, uploaded: 0, failed: 0, invalid: 0 }
  }

  const work = args.limit ? untranslated.slice(0, args.limit) : untranslated
  info(`${label} translating ${c.bold(work.length)} strings (model=${CONFIG.GEMINI_MODEL})`)

  const indexed = work.map((s, i) => ({ ...s, batchId: i }))
  const batches = chunk(indexed, CONFIG.BATCH_SIZE)

  const stats = { translated: 0, uploaded: 0, failed: 0, invalid: 0 }
  const drySamples = []
  let batchesDone = 0

  await pMap(
    batches,
    async (batch) => {
      let result
      try {
        result = await gemini.translateBatch(batch, language)
      } catch (e) {
        stats.invalid += batch.length
        const status = httpStatus(e)
        const reason = status === 429 ? 'rate limited' : truncate(e?.message ?? String(e), 200)
        warn(`${label} batch translation failed (${batch.length} strings skipped): ${reason}`)
        batchesDone++
        info(`${label} batch ${batchesDone}/${batches.length} done — ${formatStats(stats)}`)
        return
      }

      const valid = []
      for (const item of batch) {
        const t = result.get(item.batchId)
        if (typeof t !== 'string') {
          stats.invalid++
          warn(`${label} ${c.gray(item.key)} — Gemini returned no translation`)
          continue
        }
        const v = validateTranslation(item.text, t)
        if (!v.ok) {
          stats.invalid++
          warn(`${label} ${c.gray(item.key)} — ${v.reason}; src=${JSON.stringify(item.text)} got=${JSON.stringify(t)}`)
          continue
        }
        valid.push({ stringId: item.id, key: item.key, text: t })
      }
      stats.translated += valid.length

      if (args.dryRun) {
        for (const v of valid) {
          if (drySamples.length < 5) drySamples.push(v)
          else break
        }
      } else if (valid.length > 0) {
        await pMap(
          valid,
          async (t) => {
            try {
              await crowdin.addTranslation({
                stringId: t.stringId,
                languageId: language.id,
                text: t.text,
              })
              stats.uploaded++
            } catch (e) {
              stats.failed++
              const status = httpStatus(e)
              warn(`${label} upload failed for ${c.gray(t.key)} [HTTP ${status ?? '?'}]: ${truncate(e?.message ?? String(e), 200)}`)
            }
          },
          CONFIG.UPLOAD_CONCURRENCY,
        )
      }

      batchesDone++
      const percent = Math.round((batchesDone / batches.length) * 100)
      info(`${label} batch ${batchesDone}/${batches.length} done (${percent}%) — ${formatStats(stats)}`)
    },
    CONFIG.PER_LANGUAGE_BATCH_CONCURRENCY,
  )

  if (args.dryRun) {
    ok(`${label} dry-run complete — ${stats.translated} translations ready (not uploaded)`)
    for (const s of drySamples) log(`     ${c.gray(s.key)} → ${JSON.stringify(s.text)}`)
    if (stats.translated > drySamples.length) {
      log(`     ${c.gray(`… +${stats.translated - drySamples.length} more`)}`)
    }
  }

  if (stats.failed === 0 && stats.invalid === 0) ok(`${label} ${formatStats(stats)}`)
  else warn(`${label} ${formatStats(stats)}`)

  return { language: language.id, ...stats }
}

function formatStats(s) {
  return `translated=${s.translated} uploaded=${s.uploaded} failed=${s.failed} invalid=${s.invalid}`
}

// ------------------------------------------------------------------ main ---

async function main() {
  let args
  try {
    args = parseArgs(process.argv)
  } catch (e) {
    fail(e.message)
    process.exit(2)
  }
  if (args.help) {
    printHelp()
    return
  }

  await loadDotEnvFallback(DOTENV_PATH)

  const geminiApiKey = process.env.GEMINI_API_KEY
  if (!geminiApiKey) {
    fail(`GEMINI_API_KEY is required. Set it in your shell or in ${path.relative(process.cwd(), DOTENV_PATH)}.`)
    process.exit(2)
  }

  const rpmRaw = process.env.GEMINI_RPM
  const rpm = rpmRaw ? Number.parseInt(rpmRaw, 10) : CONFIG.GEMINI_RPM_DEFAULT
  if (!Number.isFinite(rpm) || rpm <= 0) {
    fail(`Invalid GEMINI_RPM value: ${rpmRaw}`)
    process.exit(2)
  }

  const startedAt = Date.now()
  const { projectId, token } = await loadCrowdinConfig()
  const crowdin = new CrowdinService({ projectId, token })
  const rateLimiter = new RateLimiter(rpm)
  const gemini = new GeminiTranslator({ apiKey: geminiApiKey, rateLimiter })

  info(`Gemini rate limit: ${c.bold(rpm)} requests/min`)

  info(`fetching project metadata (project_id=${projectId})…`)
  const allLanguages = await crowdin.getTargetLanguages()
  const languages = args.languages
    ? allLanguages.filter((l) => args.languages.includes(l.id) || args.languages.includes(l.twoLettersCode))
    : allLanguages

  if (languages.length === 0) {
    fail(`No matching target languages. Available: ${allLanguages.map((l) => l.id).join(', ')}`)
    process.exit(1)
  }

  info(`fetching all source strings…`)
  const allStrings = await crowdin.listAllSourceStrings()
  info(`found ${c.bold(allStrings.length)} source strings; target languages: ${c.bold(languages.map((l) => l.id).join(', '))}`)

  info(`scanning untranslated strings per language…`)
  const perLanguage = await pMap(
    languages,
    async (language) => {
      const untranslated = await findUntranslated(crowdin, allStrings, language)
      log(`     ${tag(language.id)} ${untranslated.length} untranslated`)
      return { language, untranslated }
    },
    CONFIG.LANGUAGE_CONCURRENCY,
  )

  const totalToTranslate = perLanguage.reduce((s, x) => s + x.untranslated.length, 0)
  if (totalToTranslate === 0) {
    ok(`All target languages are fully translated — nothing to do.`)
    return
  }
  info(`total strings to translate: ${c.bold(totalToTranslate)}${args.dryRun ? c.yellow(' (dry-run)') : ''}`)

  const results = await pMap(
    perLanguage,
    async ({ language, untranslated }) => {
      try {
        return await translateLanguage({ crowdin, gemini, language, untranslated, args })
      } catch (e) {
        fail(`[${language.id}] aborted: ${truncate(e?.message ?? String(e), 200)}`)
        return { language: language.id, translated: 0, uploaded: 0, failed: 0, invalid: untranslated.length }
      }
    },
    CONFIG.LANGUAGE_CONCURRENCY,
  )

  const summary = results.reduce(
    (acc, r) => ({
      translated: acc.translated + r.translated,
      uploaded: acc.uploaded + r.uploaded,
      failed: acc.failed + r.failed,
      invalid: acc.invalid + r.invalid,
    }),
    { translated: 0, uploaded: 0, failed: 0, invalid: 0 },
  )

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  log()
  log(c.bold('Summary'))
  for (const r of results) {
    log(`  ${tag(r.language)} translated=${r.translated} uploaded=${r.uploaded} failed=${r.failed} invalid=${r.invalid}`)
  }
  log()
  log(
    `${c.bold('Total')}: translated=${summary.translated} uploaded=${summary.uploaded} ` +
      `failed=${summary.failed} invalid=${summary.invalid} ` +
      `${c.gray(`(${elapsed}s)`)}`,
  )

  if (!args.dryRun && summary.uploaded > 0) {
    log()
    ok(`Done. Run ${c.bold('crowdin download')} to pull translations into web/public/locales/*.json.`)
  }

  if (summary.failed > 0 || summary.invalid > 0) process.exitCode = 1
}

main().catch((e) => {
  const status = httpStatus(e)
  if (typeof status === 'number') {
    fail(`${e?.message ?? e} (HTTP ${status})`)
  } else {
    fail(e?.stack ?? e)
  }
  process.exit(1)
})
