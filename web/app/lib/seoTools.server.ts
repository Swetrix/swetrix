import type { ToolActionData } from './freeTools.server'

export type SeoToolSlug =
  | 'indexability-checker'
  | 'robots-txt-tester'
  | 'broken-link-checker'
  | 'hreflang-checker'
  | 'on-page-seo-checker'
  | 'image-seo-checker'
  | 'internal-link-analyzer'
  | 'ai-search-llm-crawlability-checker'
  | 'http-status-bulk-checker'
  | 'seo-migration-redirect-validator'

type IssueLevel = 'good' | 'warning' | 'error' | 'info'

interface Issue {
  level: IssueLevel
  message: string
  details?: string
}

interface RobotsRule {
  directive: 'allow' | 'disallow'
  path: string
}

interface RobotsGroup {
  agents: string[]
  rules: RobotsRule[]
}

interface RobotsData {
  groups: RobotsGroup[]
  sitemaps: string[]
}

interface AnchorEntry {
  href: string | null
  url: string | null
  anchor: string
  rel: string
  kind: 'internal' | 'external' | 'fragment' | 'mailto' | 'tel' | 'invalid'
  isEmpty: boolean
}

interface StatusTrace {
  url: string
  status: number | null
  statusText: string
  finalUrl: string
  redirectCount: number
  chain: Array<{
    url: string
    status: number | null
    location: string | null
  }>
  contentType: string | null
  error: string | null
}

const USER_AGENT = 'Swetrix-Free-SEO-Tools/1.0'
const HTML_LIMIT = 1024 * 1024
const SMALL_TEXT_LIMIT = 250 * 1024
const STATUS_LIMIT = 50
const LINK_CHECK_LIMIT = 60
const IMAGE_HEAD_LIMIT = 30

const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'PerplexityBot',
  'Google-Extended',
  'CCBot',
  'Applebot',
  'Meta-ExternalAgent',
]

function getFormText(formData: FormData, name: string): string {
  return String(formData.get(name) || '').trim()
}

function getFormValue(formData: FormData): string {
  return getFormText(formData, 'value')
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unexpected error'
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error('Please enter a URL')

  const url = new URL(
    /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
  )

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS URLs are supported')
  }

  return url.toString()
}

function normalizePath(value: string): string {
  const trimmed = value.trim() || '/'
  if (/^https?:\/\//i.test(trimmed)) {
    const url = new URL(trimmed)
    return `${url.pathname}${url.search}`
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function getOrigin(url: string): string {
  return new URL(url).origin
}

function getRobotsUrl(value: string): string {
  const normalized = normalizeUrl(value)
  const url = new URL(normalized)
  if (url.pathname.endsWith('/robots.txt')) {
    url.search = ''
    url.hash = ''
    return url.toString()
  }
  return `${url.origin}/robots.txt`
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeout = 10000,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  const headers = new Headers(init.headers)

  if (!headers.has('user-agent')) headers.set('User-Agent', USER_AGENT)
  if (!headers.has('accept')) {
    headers.set(
      'Accept',
      'text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
    )
  }

  try {
    return await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

async function readTextWithLimit(
  response: Response,
  maxBytes = HTML_LIMIT,
): Promise<string> {
  if (!response.body) return response.text()

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let total = 0
  let output = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel().catch(() => {})
      break
    }
    output += decoder.decode(value, { stream: true })
  }

  output += decoder.decode()
  return output
}

function escapeRegex(value: string): string {
  return value.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
}

function getAttributeValue(tag: string, attribute: string): string | null {
  const match = tag.match(
    new RegExp(`\\s${attribute}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'),
  )
  if (!match) return null
  return match[2] ?? match[3] ?? match[4] ?? ''
}

function getAttribute(tag: string, attribute: string): string | null {
  const value = getAttributeValue(tag, attribute)
  return value === null ? null : value.trim() || null
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripTags(html: string): string {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match?.[1] ? decodeHtml(match[1]) : null
}

function findMetaContent(html: string, name: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) || []
  const target = name.toLowerCase()

  for (const tag of tags) {
    const metaName =
      getAttribute(tag, 'name')?.toLowerCase() ||
      getAttribute(tag, 'property')?.toLowerCase()
    if (metaName === target)
      return decodeHtml(getAttribute(tag, 'content') || '')
  }

  return null
}

function findAllMetaContent(html: string, names: string[]): string[] {
  const wanted = new Set(names.map((name) => name.toLowerCase()))
  const tags = html.match(/<meta\b[^>]*>/gi) || []
  const values: string[] = []

  for (const tag of tags) {
    const metaName =
      getAttribute(tag, 'name')?.toLowerCase() ||
      getAttribute(tag, 'property')?.toLowerCase()
    if (metaName && wanted.has(metaName)) {
      const value = getAttribute(tag, 'content')
      if (value) values.push(decodeHtml(value))
    }
  }

  return values
}

function findCanonical(
  html: string,
  baseUrl: string,
): {
  raw: string | null
  absolute: string | null
} {
  const canonicalTag = (html.match(/<link\b[^>]*>/gi) || []).find((tag) =>
    /\brel\s*=\s*["'][^"']*\bcanonical\b[^"']*["']/i.test(tag),
  )
  const raw = canonicalTag ? getAttribute(canonicalTag, 'href') : null

  if (!raw) return { raw: null, absolute: null }

  try {
    return { raw, absolute: new URL(raw, baseUrl).toString() }
  } catch {
    return { raw, absolute: null }
  }
}

function hasNoDirective(value: string | null, directive: string): boolean {
  return Boolean(
    value
      ?.toLowerCase()
      .split(',')
      .map((part) => part.trim())
      .some((part) => part === directive),
  )
}

function parseRobotsTxt(text: string): RobotsData {
  const groups: RobotsGroup[] = []
  const sitemaps: string[] = []
  let agents: string[] = []
  let rules: RobotsRule[] = []

  const pushGroup = () => {
    if (agents.length) {
      groups.push({ agents, rules })
    }
    agents = []
    rules = []
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim()
    if (!line) continue

    const separator = line.indexOf(':')
    if (separator === -1) continue

    const field = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()

    if (field === 'sitemap' && value) {
      sitemaps.push(value)
      continue
    }

    if (field === 'user-agent') {
      if (rules.length) pushGroup()
      if (value) agents.push(value.toLowerCase())
      continue
    }

    if ((field === 'allow' || field === 'disallow') && agents.length) {
      rules.push({ directive: field, path: value })
    }
  }

  pushGroup()
  return { groups, sitemaps: Array.from(new Set(sitemaps)) }
}

function userAgentTokenMatches(token: string, userAgent: string): boolean {
  if (token === '*') return true
  return userAgent.toLowerCase().includes(token.toLowerCase())
}

function robotsRuleMatches(pattern: string, path: string): boolean {
  if (!pattern) return false

  const endsWithDollar = pattern.endsWith('$')
  const cleanPattern = endsWithDollar ? pattern.slice(0, -1) : pattern
  const source = cleanPattern.split('*').map(escapeRegex).join('.*')
  const regex = new RegExp(`^${source}${endsWithDollar ? '$' : ''}`)

  return regex.test(path)
}

function testRobotsRule(
  robots: RobotsData | null,
  userAgent: string,
  path: string,
) {
  if (!robots) {
    return {
      allowed: true,
      matchedRule: null,
      groupAgents: [],
    }
  }

  const matchingGroups = robots.groups
    .map((group) => {
      const matchedLength = Math.max(
        ...group.agents
          .filter((agent) => userAgentTokenMatches(agent, userAgent))
          .map((agent) => (agent === '*' ? 0 : agent.length)),
        -1,
      )
      return { group, matchedLength }
    })
    .filter((entry) => entry.matchedLength >= 0)

  if (!matchingGroups.length) {
    return {
      allowed: true,
      matchedRule: null,
      groupAgents: [],
    }
  }

  const bestLength = Math.max(
    ...matchingGroups.map((entry) => entry.matchedLength),
  )
  const rules = matchingGroups
    .filter((entry) => entry.matchedLength === bestLength)
    .flatMap((entry) => entry.group.rules)

  const matchedRules = rules
    .filter((rule) => robotsRuleMatches(rule.path, path))
    .sort((a, b) => {
      if (b.path.length !== a.path.length) return b.path.length - a.path.length
      if (a.directive === b.directive) return 0
      return a.directive === 'allow' ? -1 : 1
    })

  const matchedRule = matchedRules[0] || null

  return {
    allowed: matchedRule ? matchedRule.directive === 'allow' : true,
    matchedRule,
    groupAgents: Array.from(
      new Set(
        matchingGroups
          .filter((entry) => entry.matchedLength === bestLength)
          .flatMap((entry) => entry.group.agents),
      ),
    ),
  }
}

async function fetchRobotsForUrl(url: string) {
  const robotsUrl = `${getOrigin(url)}/robots.txt`

  try {
    const response = await fetchWithTimeout(
      robotsUrl,
      { redirect: 'follow' },
      8000,
    )
    const text = await readTextWithLimit(response, SMALL_TEXT_LIMIT)

    if (!response.ok) {
      return {
        robotsUrl,
        status: response.status,
        data: null,
        error: `robots.txt returned ${response.status}`,
      }
    }

    return {
      robotsUrl,
      status: response.status,
      data: parseRobotsTxt(text),
      error: null,
    }
  } catch (error) {
    return {
      robotsUrl,
      status: null,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

function extractAnchors(html: string, baseUrl: string): AnchorEntry[] {
  const base = new URL(baseUrl)
  const anchors: AnchorEntry[] = []
  const regex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null

  while ((match = regex.exec(html))) {
    const tag = `<a ${match[1]}>`
    const href = getAttribute(tag, 'href')
    const rel = getAttribute(tag, 'rel') || ''
    const anchor = stripTags(match[2])
    const isEmpty = anchor.length === 0

    if (!href) {
      anchors.push({
        href: null,
        url: null,
        anchor,
        rel,
        kind: 'invalid',
        isEmpty,
      })
      continue
    }

    const lowerHref = href.toLowerCase()

    if (href.startsWith('#')) {
      anchors.push({
        href,
        url: null,
        anchor,
        rel,
        kind: 'fragment',
        isEmpty,
      })
      continue
    }

    if (lowerHref.startsWith('mailto:') || lowerHref.startsWith('tel:')) {
      anchors.push({
        href,
        url: null,
        anchor,
        rel,
        kind: lowerHref.startsWith('mailto:') ? 'mailto' : 'tel',
        isEmpty,
      })
      continue
    }

    try {
      const url = new URL(href, baseUrl)
      const isHttp = url.protocol === 'http:' || url.protocol === 'https:'

      anchors.push({
        href,
        url: isHttp ? url.toString() : null,
        anchor,
        rel,
        kind: isHttp
          ? url.hostname === base.hostname
            ? 'internal'
            : 'external'
          : 'invalid',
        isEmpty,
      })
    } catch {
      anchors.push({
        href,
        url: null,
        anchor,
        rel,
        kind: 'invalid',
        isEmpty,
      })
    }
  }

  return anchors
}

function extractImageTags(html: string, baseUrl: string) {
  const images: Array<{
    src: string | null
    alt: string | null
    hasAlt: boolean
    width: string | null
    height: string | null
    loading: string | null
    format: string
  }> = []
  const tags = html.match(/<img\b[^>]*>/gi) || []

  for (const tag of tags) {
    const rawSrc = getAttribute(tag, 'src') || getFirstSrcsetUrl(tag)
    const rawAlt = getAttributeValue(tag, 'alt')
    let src: string | null = null

    if (rawSrc && !rawSrc.startsWith('data:')) {
      try {
        src = new URL(rawSrc, baseUrl).toString()
      } catch {
        src = null
      }
    }

    images.push({
      src,
      alt: rawAlt === null ? null : decodeHtml(rawAlt),
      hasAlt: rawAlt !== null,
      width: getAttribute(tag, 'width'),
      height: getAttribute(tag, 'height'),
      loading: getAttribute(tag, 'loading'),
      format: getImageFormat(src || rawSrc || ''),
    })
  }

  return images
}

function getFirstSrcsetUrl(tag: string): string | null {
  const srcset = getAttribute(tag, 'srcset')
  if (!srcset) return null

  return (
    srcset
      .split(',')
      .map((candidate) => candidate.trim().split(/\s+/)[0])
      .find(Boolean) || null
  )
}

function getImageFormat(url: string): string {
  const path = (() => {
    try {
      return new URL(url).pathname.toLowerCase()
    } catch {
      return url.toLowerCase()
    }
  })()
  const match = path.match(/\.([a-z0-9]+)$/)
  return match?.[1] || 'unknown'
}

async function traceStatus(
  inputUrl: string,
  maxRedirects = 6,
): Promise<StatusTrace> {
  let currentUrl = inputUrl
  const chain: StatusTrace['chain'] = []
  let contentType: string | null = null

  try {
    for (let index = 0; index <= maxRedirects; index += 1) {
      let response = await fetchWithTimeout(
        currentUrl,
        { method: 'HEAD', redirect: 'manual' },
        8000,
      )

      if (response.status === 405 || response.status === 403) {
        await response.body?.cancel().catch(() => {})
        response = await fetchWithTimeout(
          currentUrl,
          { method: 'GET', redirect: 'manual' },
          8000,
        )
      }

      const location = response.headers.get('location')
      contentType = response.headers.get('content-type')
      const nextUrl =
        location && response.status >= 300 && response.status < 400
          ? new URL(location, currentUrl).toString()
          : null

      chain.push({
        url: currentUrl,
        status: response.status,
        location: nextUrl,
      })

      await response.body?.cancel().catch(() => {})

      if (!nextUrl) {
        return {
          url: inputUrl,
          status: response.status,
          statusText: response.statusText,
          finalUrl: currentUrl,
          redirectCount: Math.max(chain.length - 1, 0),
          chain,
          contentType,
          error: null,
        }
      }

      currentUrl = nextUrl
    }

    return {
      url: inputUrl,
      status: chain[chain.length - 1]?.status || null,
      statusText: 'Redirect limit reached',
      finalUrl: currentUrl,
      redirectCount: Math.max(chain.length - 1, 0),
      chain,
      contentType,
      error: 'Redirect limit reached',
    }
  } catch (error) {
    return {
      url: inputUrl,
      status: null,
      statusText: 'Failed',
      finalUrl: currentUrl,
      redirectCount: Math.max(chain.length - 1, 0),
      chain,
      contentType,
      error: getErrorMessage(error),
    }
  }
}

async function mapLimited<T, R>(
  items: T[],
  limit: number,
  run: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  let cursor = 0

  async function worker() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await run(items[index], index)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  )

  return results
}

function getStatusIssue(status: number | null, error: string | null): Issue {
  if (error || status === null) {
    return {
      level: 'error',
      message: 'Request failed',
      details: error || 'The URL could not be checked.',
    }
  }

  if (status >= 500) {
    return {
      level: 'error',
      message: `Server error ${status}`,
      details: 'Search engines and users may not be able to access this URL.',
    }
  }

  if (status === 404 || status === 410) {
    return {
      level: 'error',
      message: `Not found ${status}`,
      details: 'The URL is gone or missing.',
    }
  }

  if (status >= 400) {
    return {
      level: 'warning',
      message: `HTTP ${status}`,
      details: 'The response needs review.',
    }
  }

  if (status >= 300) {
    return {
      level: 'info',
      message: `Redirect ${status}`,
      details: 'The URL redirects before reaching a final destination.',
    }
  }

  return {
    level: 'good',
    message: `HTTP ${status}`,
    details: 'The URL is reachable.',
  }
}

function classifyLinkIssue(trace: StatusTrace): string {
  if (trace.error || trace.status === null) return 'Failed'
  if (trace.status >= 500) return 'Server error'
  if (trace.status === 404 || trace.status === 410) return 'Broken'
  if (trace.status >= 400) return 'HTTP error'
  if (trace.redirectCount > 0) return 'Redirect'
  return 'OK'
}

async function fetchPageHtml(input: string) {
  const url = normalizeUrl(input)
  const response = await fetchWithTimeout(url, { redirect: 'follow' }, 12000)
  const html = await readTextWithLimit(response, HTML_LIMIT)
  return { url, response, html }
}

async function checkIndexability(formData: FormData): Promise<ToolActionData> {
  let page

  try {
    page = await fetchPageHtml(getFormValue(formData))
  } catch (error) {
    return {
      error: `Indexability check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }

  try {
    const { url, response, html } = page
    const finalUrl = response.url
    const title = extractTitle(html)
    const description = findMetaContent(html, 'description')
    const metaRobots = findAllMetaContent(html, ['robots', 'googlebot']).join(
      ', ',
    )
    const xRobotsTag = response.headers.get('x-robots-tag')
    const canonical = findCanonical(html, finalUrl)
    const robots = await fetchRobotsForUrl(finalUrl)
    const path = `${new URL(finalUrl).pathname}${new URL(finalUrl).search}`
    const robotsTest = testRobotsRule(robots.data, 'Googlebot', path)
    const sitemapHint = robots.data?.sitemaps[0] || null
    const contentType = response.headers.get('content-type')
    const issues: Issue[] = []

    if (response.status < 200 || response.status >= 300) {
      issues.push({
        level: 'error',
        message: `Page returns HTTP ${response.status}`,
        details: 'Indexable pages should usually return a 200 status.',
      })
    }

    if (!contentType?.toLowerCase().includes('html')) {
      issues.push({
        level: 'warning',
        message: 'Response is not clearly HTML',
        details: `Content-Type is ${contentType || 'missing'}.`,
      })
    }

    if (!robotsTest.allowed) {
      issues.push({
        level: 'error',
        message: 'Blocked by robots.txt for Googlebot',
        details: `Matched ${robotsTest.matchedRule?.directive}: ${robotsTest.matchedRule?.path}`,
      })
    }

    if (robots.error) {
      issues.push({
        level: 'info',
        message: 'robots.txt could not be read',
        details: robots.error,
      })
    }

    if (
      hasNoDirective(metaRobots, 'noindex') ||
      hasNoDirective(xRobotsTag, 'noindex')
    ) {
      issues.push({
        level: 'error',
        message: 'Page is marked noindex',
        details:
          'A noindex directive tells search engines not to index the page.',
      })
    }

    if (
      hasNoDirective(metaRobots, 'nofollow') ||
      hasNoDirective(xRobotsTag, 'nofollow')
    ) {
      issues.push({
        level: 'warning',
        message: 'Page uses nofollow',
        details:
          'Nofollow does not always block indexing, but it changes link discovery and ranking signals.',
      })
    }

    if (!canonical.absolute) {
      issues.push({
        level: 'warning',
        message: 'Canonical URL is missing',
        details:
          'Google can index without it, but canonical clarity reduces duplicate URL risk.',
      })
    } else if (canonical.absolute !== finalUrl) {
      issues.push({
        level: 'info',
        message: 'Canonical points to a different URL',
        details: canonical.absolute,
      })
    }

    if (!title) {
      issues.push({
        level: 'warning',
        message: 'Page title is missing',
        details: 'Search snippets usually need a clear title.',
      })
    }

    if (!description) {
      issues.push({
        level: 'info',
        message: 'Meta description is missing',
        details: 'Descriptions can improve search result click-through rate.',
      })
    }

    if (issues.every((issue) => issue.level !== 'error')) {
      issues.unshift({
        level: 'good',
        message: 'No hard indexing block was detected',
        details:
          'The page is reachable, not blocked by robots.txt, and not marked noindex.',
      })
    }

    const hasHardBlock = issues.some((issue) => issue.level === 'error')

    return {
      error: null,
      result: {
        requestedUrl: url,
        finalUrl,
        status: response.status,
        indexability: hasHardBlock
          ? 'Blocked or not indexable'
          : 'Likely indexable',
        robotsTxt: {
          url: robots.robotsUrl,
          status: robots.status,
          allowed: robotsTest.allowed,
          matchedRule: robotsTest.matchedRule,
        },
        metaRobots: metaRobots || null,
        xRobotsTag,
        canonical: canonical.raw,
        absoluteCanonical: canonical.absolute,
        sitemapHint,
        title,
        description,
        issues,
      },
    }
  } catch (error) {
    return {
      error: `Indexability check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }
}

async function testRobotsTxt(formData: FormData): Promise<ToolActionData> {
  let robotsUrl: string
  const value = getFormText(formData, 'robotsUrl') || getFormValue(formData)
  const userAgent = getFormText(formData, 'userAgent') || 'Googlebot'
  const path = normalizePath(getFormText(formData, 'path') || '/')

  try {
    robotsUrl = getRobotsUrl(value)
  } catch (error) {
    return { error: getErrorMessage(error), result: null }
  }

  try {
    const response = await fetchWithTimeout(
      robotsUrl,
      { redirect: 'follow' },
      10000,
    )
    const text = await readTextWithLimit(response, SMALL_TEXT_LIMIT)

    if (!response.ok) {
      return {
        error: `robots.txt returned HTTP ${response.status}`,
        result: null,
      }
    }

    const robots = parseRobotsTxt(text)
    const tests = [
      userAgent,
      'Googlebot',
      'Bingbot',
      'GPTBot',
      'ChatGPT-User',
      'ClaudeBot',
      'PerplexityBot',
    ]
      .filter((agent, index, list) => list.indexOf(agent) === index)
      .map((agent) => ({
        userAgent: agent,
        ...testRobotsRule(robots, agent, path),
      }))

    const selected = tests[0]
    const issues: Issue[] = [
      selected.allowed
        ? {
            level: 'good',
            message: `${userAgent} can crawl this path`,
            details: selected.matchedRule
              ? `Matched ${selected.matchedRule.directive}: ${selected.matchedRule.path}`
              : 'No blocking rule matched.',
          }
        : {
            level: 'error',
            message: `${userAgent} is blocked from this path`,
            details: `Matched disallow: ${selected.matchedRule?.path}`,
          },
    ]

    if (robots.sitemaps.length) {
      issues.push({
        level: 'info',
        message: `${robots.sitemaps.length} sitemap hint(s) found`,
        details: robots.sitemaps.slice(0, 3).join(', '),
      })
    }

    return {
      error: null,
      result: {
        robotsUrl,
        path,
        userAgent,
        allowed: selected.allowed,
        matchedRule: selected.matchedRule,
        groupAgents: selected.groupAgents,
        tests,
        sitemaps: robots.sitemaps,
        issues,
      },
    }
  } catch (error) {
    return {
      error: `Robots.txt test failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }
}

function extractSitemapUrls(xml: string, baseUrl: string): string[] {
  return Array.from(xml.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi))
    .map((match) => decodeHtml(match[1]))
    .map((value) => {
      try {
        return new URL(value, baseUrl).toString()
      } catch {
        return null
      }
    })
    .filter((value): value is string => Boolean(value))
}

async function checkBrokenLinks(formData: FormData): Promise<ToolActionData> {
  let page

  try {
    page = await fetchPageHtml(getFormValue(formData))
  } catch (error) {
    return {
      error: `Broken link check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }

  try {
    const { url, response, html } = page
    const contentType = response.headers.get('content-type') || ''
    const looksLikeSitemap =
      contentType.includes('xml') ||
      url.toLowerCase().includes('sitemap') ||
      /^\s*<\?xml/i.test(html)
    const baseHost = new URL(response.url).hostname
    const invalidLinks: Array<{
      href: string | null
      anchor: string
      issue: string
    }> = []
    let anchors: AnchorEntry[] = []
    let urlsToCheck: Array<{
      url: string
      anchor: string
      kind: 'internal' | 'external'
    }> = []

    if (looksLikeSitemap) {
      urlsToCheck = extractSitemapUrls(html, response.url)
        .slice(0, LINK_CHECK_LIMIT)
        .map((sitemapUrl) => ({
          url: sitemapUrl,
          anchor: 'Sitemap URL',
          kind:
            new URL(sitemapUrl).hostname === baseHost ? 'internal' : 'external',
        }))
    } else {
      anchors = extractAnchors(html, response.url)
      invalidLinks.push(
        ...anchors
          .filter((anchor) => anchor.kind === 'invalid')
          .map((anchor) => ({
            href: anchor.href,
            anchor: anchor.anchor,
            issue: anchor.href ? 'Invalid URL' : 'Missing href',
          })),
      )

      const seen = new Set<string>()
      urlsToCheck = anchors
        .filter(
          (
            anchor,
          ): anchor is AnchorEntry & {
            url: string
            kind: 'internal' | 'external'
          } =>
            Boolean(anchor.url) &&
            (anchor.kind === 'internal' || anchor.kind === 'external'),
        )
        .filter((anchor) => {
          const key = anchor.url.split('#')[0]
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        .slice(0, LINK_CHECK_LIMIT)
        .map((anchor) => ({
          url: anchor.url.split('#')[0],
          anchor: anchor.anchor,
          kind: anchor.kind,
        }))
    }

    const checked = await mapLimited(urlsToCheck, 8, async (link) => {
      const trace = await traceStatus(link.url, 5)
      return {
        url: link.url,
        anchor: link.anchor,
        kind: link.kind,
        status: trace.status,
        finalUrl: trace.finalUrl,
        redirectCount: trace.redirectCount,
        issue: classifyLinkIssue(trace),
        error: trace.error,
      }
    })

    const brokenCount = checked.filter((link) =>
      ['Failed', 'Server error', 'Broken', 'HTTP error'].includes(link.issue),
    ).length
    const redirectCount = checked.filter(
      (link) => link.redirectCount > 0,
    ).length
    const emptyAnchorCount = anchors.filter((anchor) => anchor.isEmpty).length
    const issues: Issue[] = []

    if (brokenCount) {
      issues.push({
        level: 'error',
        message: `${brokenCount} broken or failing link(s) found`,
        details:
          'Fix 404, 410, 5xx, and failed links before search engines or users hit them.',
      })
    }

    if (redirectCount) {
      issues.push({
        level: 'info',
        message: `${redirectCount} checked link(s) redirect`,
        details:
          'Update internal links to their final destinations when possible.',
      })
    }

    if (emptyAnchorCount) {
      issues.push({
        level: 'warning',
        message: `${emptyAnchorCount} empty anchor(s) found`,
        details:
          'Empty anchor text is hard for users and crawlers to understand.',
      })
    }

    if (invalidLinks.length) {
      issues.push({
        level: 'warning',
        message: `${invalidLinks.length} invalid link(s) found`,
        details:
          'Links with missing or invalid href values should be cleaned up.',
      })
    }

    if (!issues.length) {
      issues.push({
        level: 'good',
        message: 'Checked links look healthy',
        details: 'No broken links were detected within the scan limit.',
      })
    }

    return {
      error: null,
      result: {
        sourceUrl: url,
        finalUrl: response.url,
        sourceType: looksLikeSitemap ? 'sitemap' : 'page',
        totalLinks: looksLikeSitemap
          ? extractSitemapUrls(html, response.url).length
          : anchors.length,
        checkedLinks: checked.length,
        internalCount: checked.filter((link) => link.kind === 'internal')
          .length,
        externalCount: checked.filter((link) => link.kind === 'external')
          .length,
        brokenCount,
        redirectCount,
        emptyAnchorCount,
        invalidUrlCount: invalidLinks.length,
        links: checked,
        invalidLinks: invalidLinks.slice(0, 20),
        issues,
        limit: LINK_CHECK_LIMIT,
      },
    }
  } catch (error) {
    return {
      error: `Broken link check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }
}

function extractHreflangTags(html: string, baseUrl: string) {
  return (html.match(/<link\b[^>]*>/gi) || [])
    .filter((tag) => /\brel\s*=\s*["'][^"']*\balternate\b[^"']*["']/i.test(tag))
    .map((tag) => {
      const hreflang = getAttribute(tag, 'hreflang')
      const href = getAttribute(tag, 'href')
      let absoluteUrl: string | null = null

      if (href) {
        try {
          absoluteUrl = new URL(href, baseUrl).toString()
        } catch {
          absoluteUrl = null
        }
      }

      return {
        hreflang,
        href,
        absoluteUrl,
        isAbsolute: Boolean(href && /^https?:\/\//i.test(href)),
      }
    })
    .filter((tag) => tag.hreflang || tag.href)
}

function isValidHreflang(value: string | null): boolean {
  if (!value) return false
  if (value.toLowerCase() === 'x-default') return true
  return /^[a-z]{2,3}(-[A-Za-z]{4})?(-[A-Z]{2}|-[0-9]{3})?$/i.test(value)
}

async function checkHreflang(formData: FormData): Promise<ToolActionData> {
  let page

  try {
    page = await fetchPageHtml(getFormValue(formData))
  } catch (error) {
    return {
      error: `Hreflang check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }

  try {
    const { url, response, html } = page
    const finalUrl = response.url
    const tags = extractHreflangTags(html, finalUrl)
    const canonical = findCanonical(html, finalUrl)
    const languageCounts = new Map<string, number>()
    const issues: Issue[] = []

    for (const tag of tags) {
      if (tag.hreflang) {
        languageCounts.set(
          tag.hreflang.toLowerCase(),
          (languageCounts.get(tag.hreflang.toLowerCase()) || 0) + 1,
        )
      }
    }

    const invalidTags = tags.filter((tag) => !isValidHreflang(tag.hreflang))
    const duplicateLanguages = Array.from(languageCounts.entries()).filter(
      ([, count]) => count > 1,
    )
    const relativeTags = tags.filter((tag) => tag.href && !tag.isAbsolute)

    if (!tags.length) {
      issues.push({
        level: 'info',
        message: 'No hreflang tags found',
        details:
          'This is fine for a single-language page, but international pages should declare alternates.',
      })
    }

    if (invalidTags.length) {
      issues.push({
        level: 'error',
        message: `${invalidTags.length} invalid hreflang value(s)`,
        details:
          'Use ISO language codes such as en, en-GB, fr-FR, or x-default.',
      })
    }

    if (duplicateLanguages.length) {
      issues.push({
        level: 'warning',
        message: `${duplicateLanguages.length} duplicate hreflang value(s)`,
        details: duplicateLanguages.map(([language]) => language).join(', '),
      })
    }

    if (tags.length && !languageCounts.has('x-default')) {
      issues.push({
        level: 'info',
        message: 'x-default is missing',
        details:
          'x-default helps search engines pick a fallback page for unmatched languages.',
      })
    }

    if (relativeTags.length) {
      issues.push({
        level: 'warning',
        message: `${relativeTags.length} relative hreflang URL(s)`,
        details: 'Absolute URLs are clearer for hreflang clusters.',
      })
    }

    if (canonical.absolute && canonical.absolute !== finalUrl) {
      issues.push({
        level: 'warning',
        message: 'Canonical points away from this page',
        details:
          'A hreflang page should usually canonicalize to itself, not to another language version.',
      })
    }

    const reciprocalChecks = await mapLimited(
      tags
        .filter((tag) => tag.absoluteUrl && tag.absoluteUrl !== finalUrl)
        .slice(0, 5),
      3,
      async (tag) => {
        try {
          const target = await fetchPageHtml(tag.absoluteUrl || '')
          const targetTags = extractHreflangTags(
            target.html,
            target.response.url,
          )
          const hasReturnTag = targetTags.some(
            (targetTag) => targetTag.absoluteUrl === finalUrl,
          )

          return {
            url: tag.absoluteUrl,
            status: target.response.status,
            hasReturnTag,
            error: null,
          }
        } catch (error) {
          return {
            url: tag.absoluteUrl,
            status: null,
            hasReturnTag: false,
            error: getErrorMessage(error),
          }
        }
      },
    )

    const missingReturnTags = reciprocalChecks.filter(
      (check) => !check.hasReturnTag,
    )

    if (missingReturnTags.length) {
      issues.push({
        level: 'warning',
        message: `${missingReturnTags.length} reciprocal hint(s) not confirmed`,
        details:
          'Each alternate URL should usually point back to this page in the hreflang cluster.',
      })
    }

    if (!issues.some((issue) => issue.level !== 'info')) {
      issues.unshift({
        level: 'good',
        message: 'Hreflang tags look consistent',
        details:
          'No duplicate, invalid, or conflicting hreflang signals were detected.',
      })
    }

    return {
      error: null,
      result: {
        requestedUrl: url,
        finalUrl,
        status: response.status,
        canonical: canonical.absolute,
        tags,
        invalidCount: invalidTags.length,
        duplicateCount: duplicateLanguages.length,
        hasXDefault: languageCounts.has('x-default'),
        reciprocalChecks,
        issues,
      },
    }
  } catch (error) {
    return {
      error: `Hreflang check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }
}

async function checkOnPageSeo(formData: FormData): Promise<ToolActionData> {
  let page

  try {
    page = await fetchPageHtml(getFormValue(formData))
  } catch (error) {
    return {
      error: `On-page SEO check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }

  try {
    const { url, response, html } = page
    const finalUrl = response.url
    const title = extractTitle(html)
    const description = findMetaContent(html, 'description')
    const canonical = findCanonical(html, finalUrl)
    const robots = findAllMetaContent(html, ['robots', 'googlebot']).join(', ')
    const h1 = Array.from(html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)).map(
      (match) => stripTags(match[1]),
    )
    const h2 = Array.from(html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)).map(
      (match) => stripTags(match[1]),
    )
    const text = stripTags(html)
    const words = text ? text.split(/\s+/).filter(Boolean) : []
    const images = extractImageTags(html, finalUrl)
    const anchors = extractAnchors(html, finalUrl)
    const htmlBytes = new TextEncoder().encode(html).length
    const textBytes = new TextEncoder().encode(text).length
    const textHtmlRatio = htmlBytes ? (textBytes / htmlBytes) * 100 : 0
    const structuredDataCount =
      (
        html.match(/<script\b[^>]*type=["'][^"']*ld\+json[^"']*["'][^>]*>/gi) ||
        []
      ).length + (html.match(/\sitemscope(\s|>|=)/gi) || []).length
    const openGraphCount = (
      html.match(/<meta\b[^>]*(property|name)=["']og:/gi) || []
    ).length
    const internalLinks = anchors.filter((anchor) => anchor.kind === 'internal')
    const externalLinks = anchors.filter((anchor) => anchor.kind === 'external')
    const missingAlt = images.filter((image) => !image.hasAlt).length
    const emptyAlt = images.filter(
      (image) => image.hasAlt && image.alt === '',
    ).length
    const issues: Issue[] = []

    issues.push(getStatusIssue(response.status, null))

    if (!title) {
      issues.push({
        level: 'error',
        message: 'Title tag is missing',
        details: 'Every indexable page should have a unique title.',
      })
    } else if (title.length < 20 || title.length > 65) {
      issues.push({
        level: 'warning',
        message: 'Title length needs review',
        details: `${title.length} characters. Aim for a descriptive title that fits search results.`,
      })
    }

    if (!description) {
      issues.push({
        level: 'warning',
        message: 'Meta description is missing',
        details: 'Descriptions can improve search result click-through rate.',
      })
    } else if (description.length < 70 || description.length > 165) {
      issues.push({
        level: 'info',
        message: 'Meta description length needs review',
        details: `${description.length} characters. Search engines may rewrite long or short descriptions.`,
      })
    }

    if (h1.length !== 1) {
      issues.push({
        level: h1.length === 0 ? 'warning' : 'info',
        message: h1.length === 0 ? 'H1 is missing' : 'Multiple H1 headings',
        details: `Found ${h1.length} H1 heading(s).`,
      })
    }

    if (!canonical.absolute) {
      issues.push({
        level: 'warning',
        message: 'Canonical URL is missing',
        details:
          'A self-referencing canonical helps reduce duplicate URL ambiguity.',
      })
    }

    if (hasNoDirective(robots, 'noindex')) {
      issues.push({
        level: 'error',
        message: 'Page is marked noindex',
        details: 'Search engines are instructed not to index this page.',
      })
    }

    if (words.length < 250) {
      issues.push({
        level: 'info',
        message: 'Low visible word count',
        details: `${words.length} words were detected after stripping markup.`,
      })
    }

    if (images.length && missingAlt + emptyAlt > 0) {
      issues.push({
        level: 'warning',
        message: `${missingAlt + emptyAlt} image alt issue(s)`,
        details:
          'Use descriptive alt text for meaningful images and empty alt for decorative images.',
      })
    }

    if (!structuredDataCount) {
      issues.push({
        level: 'info',
        message: 'No structured data detected',
        details: 'JSON-LD schema can help search engines understand the page.',
      })
    }

    if (!openGraphCount) {
      issues.push({
        level: 'info',
        message: 'Open Graph tags are missing',
        details: 'Open Graph tags improve social sharing previews.',
      })
    }

    return {
      error: null,
      result: {
        requestedUrl: url,
        finalUrl,
        status: response.status,
        title,
        titleLength: title?.length || 0,
        description,
        descriptionLength: description?.length || 0,
        h1,
        h2: h2.slice(0, 12),
        canonical: canonical.absolute,
        robots: robots || null,
        wordCount: words.length,
        imageCount: images.length,
        imagesMissingAlt: missingAlt,
        imagesEmptyAlt: emptyAlt,
        internalLinks: internalLinks.length,
        externalLinks: externalLinks.length,
        structuredDataCount,
        openGraphCount,
        textHtmlRatio: Number(textHtmlRatio.toFixed(1)),
        issues,
      },
    }
  } catch (error) {
    return {
      error: `On-page SEO check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }
}

async function fetchImageSize(url: string): Promise<{
  bytes: number | null
  contentType: string | null
}> {
  try {
    const response = await fetchWithTimeout(
      url,
      { method: 'HEAD', redirect: 'follow' },
      7000,
    )
    await response.body?.cancel().catch(() => {})
    const length = response.headers.get('content-length')
    const parsed = length ? parseInt(length, 10) : NaN

    return {
      bytes: Number.isFinite(parsed) ? parsed : null,
      contentType: response.headers.get('content-type'),
    }
  } catch {
    return {
      bytes: null,
      contentType: null,
    }
  }
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'Unknown'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function checkImageSeo(formData: FormData): Promise<ToolActionData> {
  let page

  try {
    page = await fetchPageHtml(getFormValue(formData))
  } catch (error) {
    return {
      error: `Image SEO check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }

  try {
    const { url, response, html } = page
    const images = extractImageTags(html, response.url)
    const headTargets = images
      .filter((image) => image.src)
      .slice(0, IMAGE_HEAD_LIMIT)
    const sizes = await mapLimited(headTargets, 6, async (image) => ({
      src: image.src,
      ...(await fetchImageSize(image.src || '')),
    }))
    const sizeMap = new Map(sizes.map((size) => [size.src, size]))
    const rows = images.slice(0, 80).map((image) => {
      const size = image.src ? sizeMap.get(image.src) : null
      return {
        ...image,
        bytes: size?.bytes ?? null,
        size: formatBytes(size?.bytes ?? null),
        contentType: size?.contentType ?? null,
        isLarge: (size?.bytes ?? 0) > 300 * 1024,
        hasDimensions: Boolean(image.width && image.height),
        isModernFormat: ['webp', 'avif', 'svg'].includes(image.format),
      }
    })
    const missingAlt = rows.filter((image) => !image.hasAlt).length
    const emptyAlt = rows.filter(
      (image) => image.hasAlt && image.alt === '',
    ).length
    const missingDimensions = rows.filter(
      (image) => !image.hasDimensions,
    ).length
    const lazyImages = rows.filter((image) => image.loading === 'lazy').length
    const largeImages = rows.filter((image) => image.isLarge).length
    const modernFormats = rows.filter((image) => image.isModernFormat).length
    const issues: Issue[] = []

    if (!rows.length) {
      issues.push({
        level: 'info',
        message: 'No image tags found',
        details: 'The scan did not detect standard img tags in the HTML.',
      })
    }

    if (missingAlt) {
      issues.push({
        level: 'warning',
        message: `${missingAlt} image(s) missing alt attributes`,
        details:
          'Meaningful images should describe their content for accessibility and SEO.',
      })
    }

    if (emptyAlt) {
      issues.push({
        level: 'info',
        message: `${emptyAlt} image(s) have empty alt text`,
        details:
          'Empty alt is correct for decorative images, but review content images.',
      })
    }

    if (missingDimensions) {
      issues.push({
        level: 'info',
        message: `${missingDimensions} image(s) missing width or height`,
        details:
          'Dimensions help browsers reserve space and reduce layout shift.',
      })
    }

    if (largeImages) {
      issues.push({
        level: 'warning',
        message: `${largeImages} large image(s) found`,
        details:
          'Images over 300 KB can slow down landing pages, especially on mobile.',
      })
    }

    if (!issues.length) {
      issues.push({
        level: 'good',
        message: 'Image basics look healthy',
        details:
          'Alt attributes, dimensions, and known image sizes look reasonable.',
      })
    }

    return {
      error: null,
      result: {
        requestedUrl: url,
        finalUrl: response.url,
        status: response.status,
        imageCount: images.length,
        checkedImages: headTargets.length,
        missingAlt,
        emptyAlt,
        missingDimensions,
        lazyImages,
        largeImages,
        modernFormats,
        images: rows
          .sort((a, b) => (b.bytes || 0) - (a.bytes || 0))
          .slice(0, 30),
        issues,
      },
    }
  } catch (error) {
    return {
      error: `Image SEO check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }
}

async function analyzeInternalLinks(
  formData: FormData,
): Promise<ToolActionData> {
  let page

  try {
    page = await fetchPageHtml(getFormValue(formData))
  } catch (error) {
    return {
      error: `Internal link analysis failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }

  try {
    const { url, response, html } = page
    const anchors = extractAnchors(html, response.url)
    const internal = anchors.filter((anchor) => anchor.kind === 'internal')
    const external = anchors.filter((anchor) => anchor.kind === 'external')
    const nofollow = anchors.filter((anchor) =>
      anchor.rel.toLowerCase().split(/\s+/).includes('nofollow'),
    )
    const sponsored = anchors.filter((anchor) =>
      anchor.rel.toLowerCase().split(/\s+/).includes('sponsored'),
    )
    const ugc = anchors.filter((anchor) =>
      anchor.rel.toLowerCase().split(/\s+/).includes('ugc'),
    )
    const fragments = anchors.filter((anchor) => anchor.kind === 'fragment')
    const mailto = anchors.filter((anchor) => anchor.kind === 'mailto')
    const tel = anchors.filter((anchor) => anchor.kind === 'tel')
    const emptyAnchors = anchors.filter((anchor) => anchor.isEmpty)
    const duplicateAnchorMap = new Map<string, Set<string>>()

    for (const anchor of anchors) {
      if (!anchor.anchor || !anchor.url) continue
      const key = anchor.anchor.toLowerCase()
      const urls = duplicateAnchorMap.get(key) || new Set<string>()
      urls.add(anchor.url)
      duplicateAnchorMap.set(key, urls)
    }

    const duplicateAnchors = Array.from(duplicateAnchorMap.entries())
      .filter(([, urls]) => urls.size > 1)
      .map(([anchor, urls]) => ({
        anchor,
        urls: Array.from(urls).slice(0, 5),
        count: urls.size,
      }))
      .slice(0, 15)
    const issues: Issue[] = []

    if (!internal.length) {
      issues.push({
        level: 'warning',
        message: 'No internal links found',
        details:
          'Internal links help crawlers discover related pages and distribute page authority.',
      })
    }

    if (emptyAnchors.length) {
      issues.push({
        level: 'warning',
        message: `${emptyAnchors.length} empty anchor(s) found`,
        details: 'Use descriptive anchor text for links that matter.',
      })
    }

    if (duplicateAnchors.length) {
      issues.push({
        level: 'info',
        message: `${duplicateAnchors.length} duplicate anchor pattern(s)`,
        details:
          'The same anchor text points to multiple URLs. This can be fine, but ambiguous anchors deserve review.',
      })
    }

    if (!issues.length) {
      issues.push({
        level: 'good',
        message: 'Internal link structure looks readable',
        details:
          'The page has internal links and no obvious empty-anchor issues.',
      })
    }

    return {
      error: null,
      result: {
        requestedUrl: url,
        finalUrl: response.url,
        status: response.status,
        totalLinks: anchors.length,
        internalCount: internal.length,
        externalCount: external.length,
        nofollowCount: nofollow.length,
        sponsoredCount: sponsored.length,
        ugcCount: ugc.length,
        fragmentCount: fragments.length,
        mailtoCount: mailto.length,
        telCount: tel.length,
        emptyAnchorCount: emptyAnchors.length,
        duplicateAnchors,
        links: anchors.slice(0, 100).map((anchor) => ({
          url: anchor.url || anchor.href || '',
          anchor: anchor.anchor,
          rel: anchor.rel,
          kind: anchor.kind,
          isEmpty: anchor.isEmpty,
        })),
        issues,
      },
    }
  } catch (error) {
    return {
      error: `Internal link analysis failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }
}

async function checkAiCrawlability(
  formData: FormData,
): Promise<ToolActionData> {
  let home

  try {
    home = await fetchPageHtml(getFormValue(formData))
  } catch (error) {
    return {
      error: `AI crawlability check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }

  try {
    const { url, response, html } = home
    const origin = getOrigin(response.url)
    const robots = await fetchRobotsForUrl(response.url)
    const path = `${new URL(response.url).pathname}${new URL(response.url).search}`
    const crawlerRules = AI_CRAWLERS.map((crawler) => ({
      crawler,
      ...testRobotsRule(robots.data, crawler, path),
    }))
    const llms = await traceStatus(`${origin}/llms.txt`, 2)
    const llmsFull = await traceStatus(`${origin}/llms-full.txt`, 2)
    const sitemapUrl = robots.data?.sitemaps[0] || `${origin}/sitemap.xml`
    const sitemap = await traceStatus(sitemapUrl, 2)
    const canonical = findCanonical(html, response.url)
    const title = extractTitle(html)
    const description = findMetaContent(html, 'description')
    const structuredDataCount =
      (
        html.match(/<script\b[^>]*type=["'][^"']*ld\+json[^"']*["'][^>]*>/gi) ||
        []
      ).length + (html.match(/\sitemscope(\s|>|=)/gi) || []).length
    const blockedCrawlers = crawlerRules.filter((rule) => !rule.allowed)
    const issues: Issue[] = []

    if (blockedCrawlers.length) {
      issues.push({
        level: 'info',
        message: `${blockedCrawlers.length} AI crawler(s) blocked by robots.txt`,
        details:
          'Blocking AI crawlers can be intentional. Review whether this matches your content strategy.',
      })
    } else {
      issues.push({
        level: 'good',
        message: 'Common AI crawler rules allow the homepage path',
        details: 'No blocking robots.txt rule matched the checked AI crawlers.',
      })
    }

    if (llms.status !== 200) {
      issues.push({
        level: 'info',
        message: 'llms.txt was not found',
        details:
          'llms.txt is an emerging convention for summarizing useful content for AI systems.',
      })
    }

    if (sitemap.status !== 200) {
      issues.push({
        level: 'warning',
        message: 'Sitemap was not confirmed',
        details: 'Sitemaps help crawlers discover canonical page URLs.',
      })
    }

    if (!canonical.absolute) {
      issues.push({
        level: 'warning',
        message: 'Canonical URL is missing',
        details:
          'Canonical clarity helps search and AI crawlers pick the main URL.',
      })
    }

    if (!title || !description) {
      issues.push({
        level: 'warning',
        message: 'Title or description is missing',
        details:
          'Readable page summaries help both search snippets and AI retrieval systems.',
      })
    }

    if (!structuredDataCount) {
      issues.push({
        level: 'info',
        message: 'No structured data detected',
        details:
          'Structured data can help machines understand entities, products, articles, and organizations.',
      })
    }

    return {
      error: null,
      result: {
        requestedUrl: url,
        finalUrl: response.url,
        status: response.status,
        robotsUrl: robots.robotsUrl,
        robotsStatus: robots.status,
        crawlerRules,
        llms: {
          url: `${origin}/llms.txt`,
          status: llms.status,
          finalUrl: llms.finalUrl,
        },
        llmsFull: {
          url: `${origin}/llms-full.txt`,
          status: llmsFull.status,
          finalUrl: llmsFull.finalUrl,
        },
        sitemap: {
          url: sitemapUrl,
          status: sitemap.status,
          finalUrl: sitemap.finalUrl,
        },
        canonical: canonical.absolute,
        title,
        description,
        structuredDataCount,
        issues,
      },
    }
  } catch (error) {
    return {
      error: `AI crawlability check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }
}

function parseUrlList(value: string, limit: number): string[] {
  const urls = value
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(normalizeUrl)

  return Array.from(new Set(urls)).slice(0, limit)
}

function csvEscape(value: unknown): string {
  const stringValue = String(value ?? '')
  if (!/[",\n]/.test(stringValue)) return stringValue
  return `"${stringValue.replace(/"/g, '""')}"`
}

function buildCsv(rows: Array<Record<string, unknown>>, columns: string[]) {
  return [
    columns.join(','),
    ...rows.map((row) =>
      columns.map((column) => csvEscape(row[column])).join(','),
    ),
  ].join('\n')
}

async function checkBulkStatuses(formData: FormData): Promise<ToolActionData> {
  let urls: string[]

  try {
    urls = parseUrlList(
      getFormText(formData, 'urls') || getFormValue(formData),
      STATUS_LIMIT,
    )
  } catch (error) {
    return { error: getErrorMessage(error), result: null }
  }

  if (!urls.length) {
    return { error: 'Please enter at least one URL', result: null }
  }

  try {
    const rows = await mapLimited(urls, 8, async (url) => {
      const trace = await traceStatus(url, 6)
      return {
        url,
        status: trace.status,
        finalUrl: trace.finalUrl,
        redirectCount: trace.redirectCount,
        contentType: trace.contentType,
        issue: classifyLinkIssue(trace),
        error: trace.error,
      }
    })
    const columns = [
      'url',
      'status',
      'finalUrl',
      'redirectCount',
      'contentType',
      'issue',
      'error',
    ]
    const errors = rows.filter((row) =>
      ['Failed', 'Server error', 'Broken', 'HTTP error'].includes(row.issue),
    ).length
    const redirects = rows.filter((row) => row.redirectCount > 0).length
    const issues: Issue[] = []

    if (errors) {
      issues.push({
        level: 'error',
        message: `${errors} URL(s) need attention`,
        details: 'Review failed, 4xx, and 5xx responses first.',
      })
    }

    if (redirects) {
      issues.push({
        level: 'info',
        message: `${redirects} URL(s) redirect`,
        details:
          'Redirects can be valid, but bulk checks are useful for spotting unexpected chains.',
      })
    }

    if (!issues.length) {
      issues.push({
        level: 'good',
        message: 'All checked URLs are reachable',
        details: 'No broken or failing statuses were detected.',
      })
    }

    return {
      error: null,
      result: {
        checked: rows.length,
        limit: STATUS_LIMIT,
        ok: rows.filter((row) => row.status && row.status < 300).length,
        redirects,
        errors,
        rows,
        csv: buildCsv(rows, columns),
        issues,
      },
    }
  } catch (error) {
    return {
      error: `Bulk status check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    const next = line[index + 1]

    if (character === '"' && quoted && next === '"') {
      current += '"'
      index += 1
      continue
    }

    if (character === '"') {
      quoted = !quoted
      continue
    }

    if (character === ',' && !quoted) {
      values.push(current.trim())
      current = ''
      continue
    }

    current += character
  }

  values.push(current.trim())
  return values
}

function parseMigrationPairs(value: string) {
  const pairs: Array<{ oldUrl: string; expectedUrl: string }> = []

  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const parsed = trimmed.includes(',')
      ? parseCsvLine(trimmed)
      : trimmed.split(/\s+/)
    const [oldValue, newValue] = parsed

    if (
      oldValue?.toLowerCase() === 'old' ||
      oldValue?.toLowerCase() === 'old url' ||
      oldValue?.toLowerCase() === 'old_url'
    ) {
      continue
    }

    if (!oldValue || !newValue) continue

    pairs.push({
      oldUrl: normalizeUrl(oldValue),
      expectedUrl: normalizeUrl(newValue),
    })

    if (pairs.length >= STATUS_LIMIT) break
  }

  return pairs
}

function normalizeForComparison(value: string): string {
  const url = new URL(value)
  url.hash = ''
  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1)
  }
  return url.toString()
}

function queryPreserved(oldUrl: string, finalUrl: string): boolean {
  const oldParams = new URL(oldUrl).searchParams
  const finalParams = new URL(finalUrl).searchParams

  for (const [key, value] of oldParams.entries()) {
    if (finalParams.get(key) !== value) return false
  }

  return true
}

async function validateMigrationRedirects(
  formData: FormData,
): Promise<ToolActionData> {
  let pairs: Array<{ oldUrl: string; expectedUrl: string }>

  try {
    pairs = parseMigrationPairs(
      getFormText(formData, 'pairs') || getFormValue(formData),
    )
  } catch (error) {
    return { error: getErrorMessage(error), result: null }
  }

  if (!pairs.length) {
    return {
      error: 'Please enter old URL and new URL pairs',
      result: null,
    }
  }

  try {
    const rows = await mapLimited(pairs, 6, async (pair) => {
      const trace = await traceStatus(pair.oldUrl, 8)
      const finalMatches =
        !trace.error &&
        normalizeForComparison(trace.finalUrl) ===
          normalizeForComparison(pair.expectedUrl)
      const firstStatus = trace.chain[0]?.status || null
      const redirectType =
        firstStatus && firstStatus >= 300 && firstStatus < 400
          ? firstStatus
          : null
      const preservesQuery = queryPreserved(pair.oldUrl, trace.finalUrl)
      const ok = Boolean(
        finalMatches &&
        redirectType &&
        [301, 308].includes(redirectType) &&
        trace.redirectCount <= 3,
      )

      return {
        oldUrl: pair.oldUrl,
        expectedUrl: pair.expectedUrl,
        finalUrl: trace.finalUrl,
        status: firstStatus,
        redirectType: redirectType || 'none',
        redirectCount: trace.redirectCount,
        finalMatches,
        preservesQuery,
        result: ok ? 'OK' : 'Review',
        error: trace.error,
      }
    })
    const columns = [
      'oldUrl',
      'expectedUrl',
      'finalUrl',
      'status',
      'redirectType',
      'redirectCount',
      'finalMatches',
      'preservesQuery',
      'result',
      'error',
    ]
    const mismatches = rows.filter((row) => !row.finalMatches).length
    const temporary = rows.filter((row) =>
      [302, 303, 307].includes(Number(row.redirectType)),
    ).length
    const longChains = rows.filter((row) => row.redirectCount > 3).length
    const queryDrops = rows.filter((row) => !row.preservesQuery).length
    const issues: Issue[] = []

    if (mismatches) {
      issues.push({
        level: 'error',
        message: `${mismatches} target mismatch(es)`,
        details:
          'The final redirected URL does not match the expected migration target.',
      })
    }

    if (temporary) {
      issues.push({
        level: 'warning',
        message: `${temporary} temporary redirect(s) found`,
        details:
          'SEO migrations usually use 301 or 308 redirects for permanent moves.',
      })
    }

    if (longChains) {
      issues.push({
        level: 'warning',
        message: `${longChains} long redirect chain(s)`,
        details: 'Short chains are faster and easier for crawlers to process.',
      })
    }

    if (queryDrops) {
      issues.push({
        level: 'info',
        message: `${queryDrops} URL(s) may drop query parameters`,
        details: 'Campaign and filter parameters can be lost during redirects.',
      })
    }

    if (!issues.length) {
      issues.push({
        level: 'good',
        message: 'Migration redirects match expectations',
        details:
          'Checked redirects are permanent, short, and reach the expected targets.',
      })
    }

    return {
      error: null,
      result: {
        checked: rows.length,
        limit: STATUS_LIMIT,
        passed: rows.filter((row) => row.result === 'OK').length,
        mismatches,
        temporary,
        longChains,
        queryDrops,
        rows,
        csv: buildCsv(rows, columns),
        issues,
      },
    }
  } catch (error) {
    return {
      error: `Migration redirect validation failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }
}

export async function runSeoToolAction(
  slug: SeoToolSlug,
  formData: FormData,
): Promise<ToolActionData> {
  if (slug === 'indexability-checker') return checkIndexability(formData)
  if (slug === 'robots-txt-tester') return testRobotsTxt(formData)
  if (slug === 'broken-link-checker') return checkBrokenLinks(formData)
  if (slug === 'hreflang-checker') return checkHreflang(formData)
  if (slug === 'on-page-seo-checker') return checkOnPageSeo(formData)
  if (slug === 'image-seo-checker') return checkImageSeo(formData)
  if (slug === 'internal-link-analyzer') return analyzeInternalLinks(formData)
  if (slug === 'ai-search-llm-crawlability-checker') {
    return checkAiCrawlability(formData)
  }
  if (slug === 'http-status-bulk-checker') return checkBulkStatuses(formData)
  if (slug === 'seo-migration-redirect-validator') {
    return validateMigrationRedirects(formData)
  }

  return { error: 'Unknown SEO tool', result: null }
}
