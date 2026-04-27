import fs from 'fs'
import path from 'path'
import { Injectable } from '@nestjs/common'
import { isbot } from 'isbot'
import { parse as parseDomain } from 'tldts'

import { BotsProtectionLevel, Project } from '../project/entity/project.entity'
import { ProjectService } from '../project/project.service'
import { getIPDetails } from '../common/utils'

export type BotReason =
  | 'user_agent'
  | 'headless_browser'
  | 'suspicious_headers'
  | 'probe_path'
  | 'referrer_spam'
  | 'datacenter_ip'

export type BotEndpoint =
  | 'pageview'
  | 'custom'
  | 'error'
  | 'heartbeat'
  | 'noscript'

interface BotDetectionInput {
  pid: string
  userAgent?: string | null
  headers: Record<string, string | string[] | undefined> | undefined
  ip: string
  referrer?: string | null
  /** Path component of the tracked pageview (e.g. `/wp-admin/`). */
  path?: string | null
  endpoint: BotEndpoint
}

export interface BotDetectionResult {
  isBot: boolean
  reason: BotReason | null
}

const NEGATIVE: BotDetectionResult = {
  isBot: false,
  reason: null,
}

const HEADLESS_PATTERN =
  /HeadlessChrome|PhantomJS|SlimerJS|Selenium|WebDriver|Puppeteer|Playwright|Cypress|Nightmare|Splash/i

// Paths that almost exclusively appear in vulnerability scans / probes.
// Conservative on purpose: WordPress admin paths (`/wp-admin`, `/wp-login.php`),
// `/admin`, `/phpmyadmin` etc. are deliberately excluded because legitimate
// sites do host those. Everything here is either a hidden dotfile, a config
// file that should never be served, or a server-internal endpoint that no
// browser pageview should ever target.
const PROBE_PATH_PREFIXES: readonly string[] = [
  '/.env',
  '/.git',
  '/.svn',
  '/.hg',
  '/.bzr',
  '/.aws',
  '/.ssh',
  '/.docker',
  '/.htaccess',
  '/.htpasswd',
  '/.DS_Store',
  '/cgi-bin',
  '/server-status',
  '/server-info',
  '/composer.json',
  '/composer.lock',
  '/composer.phar',
  '/vendor/phpunit',
  '/vendor/composer',
  '/owa',
  '/ecp',
  '/autodiscover.xml',
  '/HNAP1',
  '/boaform',
]

const matchesProbePath = (rawPath: string | null | undefined): boolean => {
  if (!rawPath) return false

  let path = rawPath.trim()
  if (!path) return false

  // Strip query string + hash, lower-case for case-insensitive matching.
  path = path.split('?')[0].split('#')[0].toLowerCase()
  if (!path.startsWith('/')) path = `/${path}`

  for (const rawPrefix of PROBE_PATH_PREFIXES) {
    const prefix = rawPrefix.toLowerCase()
    if (
      path === prefix ||
      path.startsWith(`${prefix}/`) ||
      // covers extension variants like `/.env.local`, `/.env.production`
      path.startsWith(`${prefix}.`)
    ) {
      return true
    }
  }
  return false
}

const DEV_DATA_DIR = path.join(__dirname, 'data')
const PROD_DATA_DIR = path.join(__dirname, '..', 'analytics', 'data')

const loadReferrerSpamSet = (): ReadonlySet<string> => {
  const candidates = [
    path.join(DEV_DATA_DIR, 'referrer-spammers.txt'),
    path.join(PROD_DATA_DIR, 'referrer-spammers.txt'),
  ]

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue
    try {
      const raw = fs.readFileSync(candidate, 'utf8')
      const set = new Set<string>()
      for (const line of raw.split('\n')) {
        const trimmed = line.trim().toLowerCase()
        if (!trimmed || trimmed.startsWith('#')) continue
        set.add(trimmed.replace(/^www\./, ''))
      }
      return set
    } catch {
      // fall through to next candidate
    }
  }

  return new Set<string>()
}

const REFERRER_SPAM_SET: ReadonlySet<string> = loadReferrerSpamSet()

const extractHost = (raw: string | null | undefined): string | null => {
  if (!raw) return null
  const value = raw.trim()
  if (!value) return null

  let candidate = value
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`
  }

  try {
    const parsed = parseDomain(candidate)
    const host = (parsed.hostname || '').toLowerCase()
    if (!host) return null
    return host.replace(/^www\./, '')
  } catch {
    return null
  }
}

const matchesSpamSet = (host: string, set: ReadonlySet<string>): boolean => {
  if (set.has(host)) return true

  // Walk up subdomains: a.b.example.com -> b.example.com -> example.com
  const labels = host.split('.')
  for (let i = 1; i < labels.length - 1; i++) {
    const suffix = labels.slice(i).join('.')
    if (set.has(suffix)) return true
  }
  return false
}

const headerValue = (
  headers: BotDetectionInput['headers'],
  name: string,
): string | null => {
  if (!headers) return null
  const raw = headers[name] ?? headers[name.toLowerCase()]
  if (raw == null) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return String(raw)
}

@Injectable()
export class BotDetectionService {
  constructor(private readonly projectService: ProjectService) {}

  static get spamSetSize(): number {
    return REFERRER_SPAM_SET.size
  }

  /**
   * Backwards-compatible boolean-only detector. Prefer detect().
   */
  async isBot(
    pid: string,
    userAgent: string | null | undefined,
  ): Promise<boolean> {
    const project = await this.projectService.getRedisProject(pid)
    if (!project) return false

    const level =
      (project.botsProtectionLevel as BotsProtectionLevel) ||
      BotsProtectionLevel.BASIC

    if (level === BotsProtectionLevel.OFF) return false

    return isbot(userAgent || '')
  }

  /**
   * Main entry point used by ingestion endpoints.
   *
   * Returns the first matching reason in priority order:
   *   user_agent -> headless_browser -> suspicious_headers
   *   -> referrer_spam -> datacenter_ip
   *
   * `basic` runs only `user_agent` + `headless_browser`.
   * `strict` runs the full chain.
   */
  async detect(input: BotDetectionInput): Promise<BotDetectionResult> {
    const project = await this.projectService.getRedisProject(input.pid)
    return this.detectForProject(project, input)
  }

  detectForProject(
    project: Project | null,
    input: BotDetectionInput,
  ): BotDetectionResult {
    if (!project) return NEGATIVE

    const level =
      (project.botsProtectionLevel as BotsProtectionLevel) ||
      BotsProtectionLevel.BASIC

    if (level === BotsProtectionLevel.OFF) return NEGATIVE

    const ua = (input.userAgent || '').trim()

    if (ua && isbot(ua)) {
      return { isBot: true, reason: 'user_agent' }
    }

    if (ua && HEADLESS_PATTERN.test(ua)) {
      return { isBot: true, reason: 'headless_browser' }
    }

    if (level !== BotsProtectionLevel.STRICT) {
      return NEGATIVE
    }

    if (this.hasSuspiciousHeaders(input)) {
      return { isBot: true, reason: 'suspicious_headers' }
    }

    if (matchesProbePath(input.path)) {
      return { isBot: true, reason: 'probe_path' }
    }

    if (this.matchReferrerSpam(input)) {
      return { isBot: true, reason: 'referrer_spam' }
    }

    if (input.ip && getIPDetails(input.ip).isHosting) {
      return { isBot: true, reason: 'datacenter_ip' }
    }

    return NEGATIVE
  }

  private hasSuspiciousHeaders(input: BotDetectionInput): boolean {
    if (input.endpoint === 'noscript') return false

    const accept = headerValue(input.headers, 'accept')
    const acceptLanguage = headerValue(input.headers, 'accept-language')
    const acceptEncoding = headerValue(input.headers, 'accept-encoding')

    let missing = 0
    if (!accept) missing += 1
    if (!acceptLanguage) missing += 1
    if (!acceptEncoding) missing += 1

    return missing >= 2
  }

  private matchReferrerSpam(input: BotDetectionInput): string | null {
    if (REFERRER_SPAM_SET.size === 0) return null

    const candidates = [
      input.referrer,
      headerValue(input.headers, 'referer'),
      headerValue(input.headers, 'referrer'),
      headerValue(input.headers, 'origin'),
    ]

    for (const candidate of candidates) {
      const host = extractHost(candidate)
      if (host && matchesSpamSet(host, REFERRER_SPAM_SET)) {
        return host
      }
    }

    return null
  }
}
