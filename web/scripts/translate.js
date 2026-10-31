#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { GoogleGenAI } from '@google/genai'

import { syncTranslations } from './local-translations.js'

const WEB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOTENV_PATH = path.join(WEB_DIR, '.env')
const DEFAULT_MODEL = 'gemini-3.1-pro-preview'
const warn = (...args) => console.warn(...args)

export function parseArgs(argv) {
  const out = {
    languages: null,
    dryRun: false,
    check: false,
    limit: null,
    help: false,
  }
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') out.help = true
    else if (arg === '--dry-run') out.dryRun = true
    else if (arg === '--check') out.check = true
    else if (arg.startsWith('--languages=')) {
      out.languages = arg
        .slice('--languages='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (!out.languages.length)
        throw new Error('--languages must not be empty')
    } else if (arg.startsWith('--limit=')) {
      const value = arg.slice('--limit='.length)
      if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))
        throw new Error(`Invalid --limit value: ${value}`)
      out.limit = Number(value)
    } else throw new Error(`Unknown argument: ${arg} (try --help)`)
  }
  if (out.check && out.dryRun)
    throw new Error('Use either --check or --dry-run')
  return out
}

function printHelp() {
  console.log(`Translate local locale files from en.json using Gemini.

Usage: npm run translate -- [options]

  --languages=fr,de   Restrict target languages (fr, de, pl, uk, pt-BR; pt also works).
  --limit=25          Translate at most this many strings per language.
  --dry-run           List pending translations and obsolete keys; no API calls or writes.
  --check             Exit 1 if translations need syncing; no API calls or writes.
  --help, -h          Show this help.

Environment (shell values override web/.env):
  GEMINI_API_KEY      Required only when there are strings to translate.
  GEMINI_MODEL        Optional model override (default: ${DEFAULT_MODEL}).
  GEMINI_RPM          Maximum requests per minute (default: 20).

Commit updated locales together with scripts/translation-state.json.
Partial runs retain successful translations and exit 1 while selected languages remain incomplete.`)
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

async function withRetry(
  fn,
  { retries = 6, baseDelay = 1000, label = 'op' } = {},
) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      const status = httpStatus(e)
      const isLast = attempt === retries
      const isClientError =
        typeof status === 'number' &&
        status >= 400 &&
        status < 500 &&
        status !== 408 &&
        status !== 429
      if (isLast || isClientError) throw e

      const apiRetryMs = status === 429 ? extractRetryDelayMs(e) : null
      const delay =
        apiRetryMs != null
          ? apiRetryMs + 750
          : baseDelay * 2 ** attempt + Math.floor(Math.random() * 250)

      const reason =
        status === 429 ? 'rate limited (HTTP 429)' : (e?.message ?? String(e))
      const human =
        delay >= 2000 ? `${(delay / 1000).toFixed(1)}s` : `${delay}ms`
      warn(
        `${label}: attempt ${attempt + 1} failed (${truncate(reason, 120)}); retrying in ${human}`,
      )
      await sleep(delay)
    }
  }
  throw lastErr
}

function truncate(s, n) {
  return typeof s === 'string' && s.length > n ? `${s.slice(0, n - 1)}…` : s
}

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
      if (
        typeof t === 'string' &&
        t.endsWith('RetryInfo') &&
        typeof d.retryDelay === 'string'
      ) {
        const m = /^(\d+(?:\.\d+)?)s$/.exec(d.retryDelay)
        if (m) return Math.ceil(Number.parseFloat(m[1]) * 1000)
      }
    }
  }
  return null
}

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

      while (
        this.timestamps.length > 0 &&
        this.timestamps[0] <= now - this.windowMs
      ) {
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
  const candidates = [
    e?.response?.status,
    e?.status,
    e?.statusCode,
    typeof e?.code === 'number' ? e.code : null,
  ]
  for (const v of candidates) if (typeof v === 'number') return v
  return null
}

class GeminiTranslator {
  constructor({ apiKey, rateLimiter, model }) {
    this.ai = new GoogleGenAI({ apiKey })
    this.rateLimiter = rateLimiter
    this.model = model
  }

  buildSystemInstruction(language) {
    const langLabel = language.name
      ? `${language.name} (${language.id})`
      : language.id

    const regionalNotes = {
      'pt-BR':
        'Target Brazilian Portuguese (pt-BR) as written and spoken in Brazil. Use Brazilian vocabulary, spelling and grammar (e.g. "você", "tela", "arquivo", "gerenciar", "e-mail", "celular"); do NOT use European Portuguese forms (e.g. "utilizador", "ecrã", "ficheiro", "gerir", "telemóvel").',
    }
    const note = regionalNotes[language.id]

    return [
      `You are a professional UI/UX translator working on Swetrix — a privacy-focused, developer-oriented web analytics product.`,
      `Translate the supplied user interface strings from English into ${langLabel}.`,
      ...(note ? [``, `IMPORTANT regional variant: ${note}`] : []),
      ``,
      `Rules (all are mandatory):`,
      `1. Preserve every interpolation placeholder verbatim, exactly as it appears: {{name}}, {{count}}, {{max}} — do not translate, rename, alter casing, or change the number of occurrences. Reorder placeholders only when required by the target language.`,
      `2. Preserve every HTML/JSX-like tag verbatim, including unusual ones such as <0>, <1>, <span>, <integrationLink>, <discordUrl>. Translate only the text BETWEEN tags. Keep tag pairs balanced.`,
      `3. Do not translate brand names: Swetrix, Google Analytics, Matomo, Plausible, Stripe, Paddle, GitHub, Discord, Telegram, Slack, etc.`,
      `4. Keep widely accepted technical terms (API, URL, dashboard, analytics, GDPR, CAPTCHA, dashboard, webhook, etc.) in the form most natural for the target language — translate only when a well-established native term exists.`,
      `5. Match the formality, capitalization style, and punctuation of the source. Sentence case in source → sentence case in target. Imperative mood → imperative mood.`,
      `6. Keep translations concise; UI labels should be short. Prefer the natural phrasing a native speaker would use.`,
      `7. Do not add explanations, quotes, prefixes, suffixes, or commentary. Return ONLY the translation text.`,
      `8. Treat the "key" path as additional context about WHERE the string is used in the UI — use it to choose the right tone (e.g. button labels vs error messages vs marketing copy).`,
      `9. If a source string is purely a placeholder/URL/email/number/code, output it unchanged.`,
      `10. Follow the plural category supplied in the context. Preserve nested i18next references such as $t(key) exactly.`,
      `11. Preserve line breaks and blank lines exactly. Escape newline characters only once in the JSON response so that parsing the JSON produces actual line breaks, not literal backslash-n text. Preserve any literal backslash sequences in the source unchanged.`,
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
            model: this.model,
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
              thinkingConfig: { thinkingLevel: 'medium' },
            },
          })
        } catch (e) {
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
      throw new Error(
        `Gemini returned non-JSON output for ${language.id}: ${e.message}\n--- output ---\n${text}`,
      )
    }
    if (!Array.isArray(parsed)) {
      throw new Error(
        `Gemini returned non-array output for ${language.id}: ${typeof parsed}`,
      )
    }

    const expectedIds = new Set(items.map(({ batchId }) => batchId))
    const map = new Map()
    for (const row of parsed) {
      if (
        !row ||
        !expectedIds.has(row.id) ||
        map.has(row.id) ||
        typeof row.text !== 'string'
      ) {
        throw new Error(
          `Gemini returned invalid or duplicate IDs for ${language.id}`,
        )
      }
      map.set(row.id, row.text)
    }
    return map
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) return printHelp()
  const result = await syncTranslations({
    localesDir: path.join(WEB_DIR, 'public/locales'),
    stateFile: path.join(WEB_DIR, 'scripts/translation-state.json'),
    args,
    createTranslator: async () => {
      await loadDotEnvFallback(DOTENV_PATH)
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey)
        throw new Error(
          'Set GEMINI_API_KEY in your shell or web/.env to translate pending strings.',
        )
      const rpm = Number(process.env.GEMINI_RPM ?? 20)
      if (!Number.isSafeInteger(rpm) || rpm < 1)
        throw new Error('GEMINI_RPM must be a positive integer.')
      const model = process.env.GEMINI_MODEL || DEFAULT_MODEL
      console.log(`Gemini: ${model}, ${rpm} requests/min`)
      return new GeminiTranslator({
        apiKey,
        model,
        rateLimiter: new RateLimiter(rpm),
      })
    },
  })
  console.log(
    `Translated: ${result.translated}; obsolete keys ${args.check || args.dryRun ? 'found' : 'removed'}: ${result.removed}; remaining: ${result.remaining}; failed: ${result.failed}`,
  )
  if (
    !args.dryRun &&
    (result.remaining || result.failed || (args.check && result.removed))
  )
    process.exitCode = 1
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
