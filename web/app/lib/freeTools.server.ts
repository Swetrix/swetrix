export type ToolActionData = {
  error: string | null
  result: unknown | null
}

type ToolSlug =
  | 'dns-lookup'
  | 'http-headers-checker'
  | 'ssl-certificate-checker'
  | 'redirect-checker'
  | 'cookie-checker'
  | 'csp-checker'
  | 'canonical-url-checker'
  | 'page-size-checker'
  | 'uptime-sla-calculator'
  | 'website-bandwidth-calculator'

type IssueLevel = 'good' | 'warning' | 'error' | 'info'

interface Issue {
  level: IssueLevel
  message: string
  details?: string
}

const USER_AGENT = 'Swetrix-Free-Tools/1.0'

function getFormValue(formData: FormData): string {
  return String(formData.get('value') || '').trim()
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unexpected error'
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error('Please enter a website URL')
  }

  const url = new URL(
    /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
  )

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS URLs are supported')
  }

  return url.toString()
}

function extractHost(value: string): string {
  const url = new URL(
    /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`,
  )
  const host = url.hostname.replace(/\.$/, '').toLowerCase()

  if (!host || !/^[a-z0-9_.:-]+$/i.test(host)) {
    throw new Error('Please enter a valid domain or host name')
  }

  return host
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeout = 15000,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...init.headers,
      },
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function getHeaderEntries(headers: Headers) {
  return Array.from(headers.entries()).map(([name, value]) => ({
    name,
    value,
  }))
}

async function lookupDns(formData: FormData): Promise<ToolActionData> {
  const value = getFormValue(formData)

  if (!value) {
    return { error: 'Please enter a domain name', result: null }
  }

  let domain: string
  try {
    domain = extractHost(value)
  } catch (error) {
    return { error: getErrorMessage(error), result: null }
  }

  try {
    const dns = await import('node:dns/promises')

    const lookups: Array<{
      type: string
      run: () => Promise<string[]>
    }> = [
      { type: 'A', run: () => dns.resolve4(domain) },
      { type: 'AAAA', run: () => dns.resolve6(domain) },
      {
        type: 'MX',
        run: async () =>
          (await dns.resolveMx(domain)).map(
            (record) => `${record.exchange} (priority ${record.priority})`,
          ),
      },
      { type: 'NS', run: () => dns.resolveNs(domain) },
      {
        type: 'TXT',
        run: async () =>
          (await dns.resolveTxt(domain)).map((row) => row.join('')),
      },
      { type: 'CNAME', run: () => dns.resolveCname(domain) },
      {
        type: 'CAA',
        run: async () =>
          (await dns.resolveCaa(domain)).map((record) => {
            const [tag, value] =
              Object.entries(record).find(([key]) => key !== 'critical') || []
            return `${tag || 'issue'} ${String(value || '')} (critical ${record.critical})`
          }),
      },
      {
        type: 'SOA',
        run: async () => {
          const record = await dns.resolveSoa(domain)
          return [
            `${record.nsname}, hostmaster ${record.hostmaster}, serial ${record.serial}`,
          ]
        },
      },
    ]

    const settled = await Promise.allSettled(
      lookups.map(async (lookup) => ({
        type: lookup.type,
        values: await lookup.run(),
      })),
    )

    const records = settled.flatMap((item) => {
      if (item.status !== 'fulfilled') return []
      return item.value.values.map((value) => ({
        type: item.value.type,
        value,
      }))
    })

    if (records.length === 0) {
      return {
        error: `No DNS records were found for ${domain}`,
        result: null,
      }
    }

    return {
      error: null,
      result: {
        domain,
        records,
        recordTypes: Array.from(new Set(records.map((record) => record.type))),
      },
    }
  } catch (error) {
    return {
      error: `DNS lookup failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }
}

async function checkHttpHeaders(formData: FormData): Promise<ToolActionData> {
  let url: string
  try {
    url = normalizeUrl(getFormValue(formData))
  } catch (error) {
    return { error: getErrorMessage(error), result: null }
  }

  const start = Date.now()

  try {
    const response = await fetchWithTimeout(url, { redirect: 'follow' })
    const responseTime = Date.now() - start
    await response.body?.cancel().catch(() => {})

    const headerMap = Object.fromEntries(response.headers.entries())
    const importantHeaders = [
      'content-type',
      'content-length',
      'cache-control',
      'etag',
      'last-modified',
      'server',
      'x-powered-by',
      'strict-transport-security',
      'content-security-policy',
      'x-frame-options',
      'x-content-type-options',
      'referrer-policy',
      'permissions-policy',
    ].map((name) => ({
      name,
      value: headerMap[name] || null,
    }))

    const issues: Issue[] = []

    if (
      !headerMap['strict-transport-security'] &&
      response.url.startsWith('https://')
    ) {
      issues.push({
        level: 'warning',
        message: 'Missing Strict-Transport-Security',
        details: 'HSTS tells browsers to keep using HTTPS for future visits.',
      })
    }

    if (!headerMap['content-security-policy']) {
      issues.push({
        level: 'warning',
        message: 'Missing Content-Security-Policy',
        details:
          'A CSP helps reduce the impact of cross-site scripting and injection bugs.',
      })
    }

    if (!headerMap['x-content-type-options']) {
      issues.push({
        level: 'warning',
        message: 'Missing X-Content-Type-Options',
        details:
          'Add X-Content-Type-Options: nosniff to reduce MIME sniffing risk.',
      })
    }

    if (headerMap['x-powered-by']) {
      issues.push({
        level: 'info',
        message: 'Technology header is exposed',
        details: `X-Powered-By is set to "${headerMap['x-powered-by']}".`,
      })
    }

    if (issues.length === 0) {
      issues.push({
        level: 'good',
        message: 'Key response headers look healthy',
        details: 'No common header issues were detected in the first response.',
      })
    }

    return {
      error: null,
      result: {
        requestedUrl: url,
        finalUrl: response.url,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        importantHeaders,
        allHeaders: getHeaderEntries(response.headers),
        issues,
      },
    }
  } catch (error) {
    return {
      error: `Header check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }
}

async function checkSslCertificate(
  formData: FormData,
): Promise<ToolActionData> {
  const value = getFormValue(formData)

  if (!value) {
    return { error: 'Please enter a domain name', result: null }
  }

  let host: string
  try {
    host = extractHost(value)
  } catch (error) {
    return { error: getErrorMessage(error), result: null }
  }

  try {
    const tls = await import('node:tls')

    const result = await new Promise<Record<string, unknown>>(
      (resolve, reject) => {
        let settled = false
        const socket = tls.connect(
          {
            host,
            port: 443,
            servername: host,
            rejectUnauthorized: false,
          },
          () => {
            const cert = socket.getPeerCertificate()
            const validTo = new Date(cert.valid_to)
            const validFrom = new Date(cert.valid_from)
            const now = Date.now()
            const daysRemaining = Math.ceil(
              (validTo.getTime() - now) / (1000 * 60 * 60 * 24),
            )

            settled = true
            socket.end()
            resolve({
              host,
              authorized: socket.authorized,
              authorizationError: socket.authorizationError || null,
              subject: cert.subject || null,
              issuer: cert.issuer || null,
              subjectAltName: cert.subjectaltname || null,
              validFrom: validFrom.toISOString(),
              validTo: validTo.toISOString(),
              daysRemaining,
              fingerprint256: cert.fingerprint256 || null,
              serialNumber: cert.serialNumber || null,
              isExpired: daysRemaining < 0,
              expiresSoon: daysRemaining >= 0 && daysRemaining <= 30,
            })
          },
        )

        socket.setTimeout(10000, () => {
          if (settled) return
          settled = true
          socket.destroy()
          reject(new Error('Connection timed out'))
        })

        socket.on('error', (error) => {
          if (settled) return
          settled = true
          reject(error)
        })
      },
    )

    return { error: null, result }
  } catch (error) {
    return {
      error: `SSL certificate check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }
}

async function checkRedirects(formData: FormData): Promise<ToolActionData> {
  let currentUrl: string
  try {
    currentUrl = normalizeUrl(getFormValue(formData))
  } catch (error) {
    return { error: getErrorMessage(error), result: null }
  }

  const chain: Array<{
    url: string
    status: number
    statusText: string
    location: string | null
  }> = []

  try {
    for (let index = 0; index < 10; index += 1) {
      const response = await fetchWithTimeout(
        currentUrl,
        { redirect: 'manual' },
        12000,
      )
      const location = response.headers.get('location')
      const nextUrl =
        location && response.status >= 300 && response.status < 400
          ? new URL(location, currentUrl).toString()
          : null

      chain.push({
        url: currentUrl,
        status: response.status,
        statusText: response.statusText,
        location: nextUrl,
      })

      await response.body?.cancel().catch(() => {})

      if (!nextUrl) break
      currentUrl = nextUrl
    }

    return {
      error: null,
      result: {
        startUrl: chain[0]?.url || currentUrl,
        finalUrl: chain[chain.length - 1]?.url || currentUrl,
        redirectCount: Math.max(chain.length - 1, 0),
        chain,
        hasLoopRisk: chain.length >= 10,
      },
    }
  } catch (error) {
    return {
      error: `Redirect check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }
}

function getSetCookieHeaders(headers: Headers): string[] {
  const extendedHeaders = headers as Headers & {
    getSetCookie?: () => string[]
  }
  const directCookies = extendedHeaders.getSetCookie?.()
  if (directCookies?.length) return directCookies

  const combined = headers.get('set-cookie')
  if (!combined) return []

  return combined
    .split(/,(?=\s*[^;,=\s]+=[^;,]+)/g)
    .map((cookie) => cookie.trim())
    .filter(Boolean)
}

function parseCookieHeader(header: string) {
  const parts = header.split(';').map((part) => part.trim())
  const [name, ...valueParts] = parts[0].split('=')

  if (!name) return null

  const cookie: Record<string, string | boolean | null> = {
    name,
    value: valueParts.join('=') || '',
    secure: false,
    httpOnly: false,
    sameSite: null,
    path: null,
    domain: null,
    expires: null,
    maxAge: null,
  }

  for (const part of parts.slice(1)) {
    const [rawKey, ...rawValueParts] = part.split('=')
    const key = rawKey.toLowerCase()
    const value = rawValueParts.join('=')

    if (key === 'secure') cookie.secure = true
    if (key === 'httponly') cookie.httpOnly = true
    if (key === 'samesite') cookie.sameSite = value || 'set'
    if (key === 'path') cookie.path = value || '/'
    if (key === 'domain') cookie.domain = value || null
    if (key === 'expires') cookie.expires = value || null
    if (key === 'max-age') cookie.maxAge = value || null
  }

  return cookie
}

async function checkCookies(formData: FormData): Promise<ToolActionData> {
  let url: string
  try {
    url = normalizeUrl(getFormValue(formData))
  } catch (error) {
    return { error: getErrorMessage(error), result: null }
  }

  try {
    const response = await fetchWithTimeout(url, { redirect: 'follow' })
    await response.body?.cancel().catch(() => {})

    const cookieHeaders = getSetCookieHeaders(response.headers)
    const cookies = cookieHeaders
      .map(parseCookieHeader)
      .filter((cookie): cookie is Record<string, string | boolean | null> =>
        Boolean(cookie),
      )

    const issues: Issue[] = []

    if (cookies.length === 0) {
      issues.push({
        level: 'good',
        message: 'No Set-Cookie headers detected',
        details:
          'The initial page response did not set cookies. JavaScript may still create cookies later in the browser.',
      })
    }

    const missingSecure = cookies.filter((cookie) => !cookie.secure)
    const missingHttpOnly = cookies.filter((cookie) => !cookie.httpOnly)
    const missingSameSite = cookies.filter((cookie) => !cookie.sameSite)

    if (missingSecure.length > 0) {
      issues.push({
        level: 'warning',
        message: `${missingSecure.length} cookie(s) missing Secure`,
        details: 'Secure cookies are only sent over HTTPS connections.',
      })
    }

    if (missingHttpOnly.length > 0) {
      issues.push({
        level: 'info',
        message: `${missingHttpOnly.length} cookie(s) readable by JavaScript`,
        details:
          'HttpOnly is recommended for session cookies that do not need client-side access.',
      })
    }

    if (missingSameSite.length > 0) {
      issues.push({
        level: 'warning',
        message: `${missingSameSite.length} cookie(s) missing SameSite`,
        details: 'SameSite helps reduce cross-site request risks.',
      })
    }

    return {
      error: null,
      result: {
        url,
        finalUrl: response.url,
        status: response.status,
        cookies,
        cookieCount: cookies.length,
        issues,
      },
    }
  } catch (error) {
    return {
      error: `Cookie check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }
}

function parseCspDirectives(csp: string) {
  return Object.fromEntries(
    csp
      .split(';')
      .map((directive) => directive.trim())
      .filter(Boolean)
      .map((directive) => {
        const [name, ...values] = directive.split(/\s+/)
        return [name, values]
      }),
  ) as Record<string, string[]>
}

async function checkCsp(formData: FormData): Promise<ToolActionData> {
  let url: string
  try {
    url = normalizeUrl(getFormValue(formData))
  } catch (error) {
    return { error: getErrorMessage(error), result: null }
  }

  try {
    const response = await fetchWithTimeout(url, { redirect: 'follow' })
    await response.body?.cancel().catch(() => {})

    const csp = response.headers.get('content-security-policy')
    const reportOnly = response.headers.get(
      'content-security-policy-report-only',
    )
    const issues: Issue[] = []
    const directives = csp ? parseCspDirectives(csp) : {}

    if (!csp) {
      issues.push({
        level: 'error',
        message: 'No Content-Security-Policy header found',
        details:
          'A CSP helps limit where scripts, styles, frames, images, and other resources can load from.',
      })
    } else {
      if (!directives['default-src']) {
        issues.push({
          level: 'warning',
          message: 'Missing default-src directive',
          details:
            'default-src is the fallback policy for most resource types.',
        })
      }

      if (csp.includes("'unsafe-inline'")) {
        issues.push({
          level: 'warning',
          message: 'Policy allows unsafe-inline',
          details: 'Inline scripts and styles weaken CSP protection.',
        })
      }

      if (!directives['frame-ancestors']) {
        issues.push({
          level: 'info',
          message: 'Missing frame-ancestors directive',
          details: 'frame-ancestors controls which sites can embed your pages.',
        })
      }

      if (!directives['base-uri']) {
        issues.push({
          level: 'info',
          message: 'Missing base-uri directive',
          details:
            'base-uri prevents attackers from changing the base URL for relative links.',
        })
      }
    }

    if (reportOnly) {
      issues.push({
        level: 'info',
        message: 'Report-only CSP is present',
        details:
          'Report-only mode is useful for testing, but it does not enforce restrictions.',
      })
    }

    if (csp && issues.length === 0) {
      issues.push({
        level: 'good',
        message: 'CSP includes the main baseline directives',
        details: 'No common CSP gaps were detected from the response header.',
      })
    }

    return {
      error: null,
      result: {
        url,
        finalUrl: response.url,
        status: response.status,
        csp,
        reportOnly,
        directives,
        securityHeaders: {
          hsts: response.headers.get('strict-transport-security'),
          xFrameOptions: response.headers.get('x-frame-options'),
          referrerPolicy: response.headers.get('referrer-policy'),
          permissionsPolicy: response.headers.get('permissions-policy'),
        },
        issues,
      },
    }
  } catch (error) {
    return {
      error: `CSP check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }
}

function getAttribute(tag: string, attribute: string): string | null {
  const match = tag.match(
    new RegExp(`\\s${attribute}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'),
  )
  return (match?.[2] || match?.[3] || match?.[4] || '').trim() || null
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
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

async function checkCanonicalUrl(formData: FormData): Promise<ToolActionData> {
  let url: string
  try {
    url = normalizeUrl(getFormValue(formData))
  } catch (error) {
    return { error: getErrorMessage(error), result: null }
  }

  try {
    const response = await fetchWithTimeout(url, { redirect: 'follow' })
    const html = await response.text()
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const canonicalTag = (html.match(/<link\b[^>]*>/gi) || []).find((tag) =>
      /\brel\s*=\s*["'][^"']*\bcanonical\b[^"']*["']/i.test(tag),
    )
    const canonical = canonicalTag ? getAttribute(canonicalTag, 'href') : null
    const absoluteCanonical = canonical
      ? new URL(canonical, response.url).toString()
      : null
    const robots = findMetaContent(html, 'robots')
    const description = findMetaContent(html, 'description')
    const ogUrl = findMetaContent(html, 'og:url')
    const contentType = response.headers.get('content-type')
    const issues: Issue[] = []

    if (!contentType?.includes('html')) {
      issues.push({
        level: 'warning',
        message: 'Response is not marked as HTML',
        details: `Content-Type is ${contentType || 'missing'}.`,
      })
    }

    if (!canonical) {
      issues.push({
        level: 'warning',
        message: 'Canonical URL is missing',
        details:
          'A canonical link helps search engines pick the preferred URL for duplicate or similar pages.',
      })
    }

    if (canonical && !/^https?:\/\//i.test(canonical)) {
      issues.push({
        level: 'info',
        message: 'Canonical URL is relative',
        details:
          'Absolute canonical URLs are easier for crawlers and tools to interpret.',
      })
    }

    if (!titleMatch?.[1]) {
      issues.push({
        level: 'warning',
        message: 'Page title is missing',
        details: 'A clear title helps both search results and browser tabs.',
      })
    }

    if (!description) {
      issues.push({
        level: 'info',
        message: 'Meta description is missing',
        details:
          'Descriptions do not guarantee rankings, but they can improve search result click-through rate.',
      })
    }

    if (robots?.toLowerCase().includes('noindex')) {
      issues.push({
        level: 'warning',
        message: 'Page is marked noindex',
        details: 'Search engines are instructed not to index this page.',
      })
    }

    if (absoluteCanonical && absoluteCanonical !== response.url) {
      issues.push({
        level: 'info',
        message: 'Canonical points to a different URL',
        details: `Canonical target: ${absoluteCanonical}`,
      })
    }

    if (issues.length === 0) {
      issues.push({
        level: 'good',
        message: 'Canonical and core SEO tags look good',
        details: 'The page has a title, description, and canonical URL.',
      })
    }

    return {
      error: null,
      result: {
        requestedUrl: url,
        finalUrl: response.url,
        status: response.status,
        title: titleMatch?.[1] ? decodeHtml(titleMatch[1]) : null,
        description,
        canonical,
        absoluteCanonical,
        robots,
        ogUrl,
        issues,
      },
    }
  } catch (error) {
    return {
      error: `Canonical URL check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }
}

type ResourceCategory =
  | 'HTML'
  | 'JavaScript'
  | 'CSS'
  | 'Images'
  | 'Fonts'
  | 'Other'

function getResourceCategory(
  tagName: string,
  tag: string,
  url: string,
): ResourceCategory {
  const rel = getAttribute(tag, 'rel')?.toLowerCase() || ''
  const as = getAttribute(tag, 'as')?.toLowerCase() || ''
  const lowerUrl = url.toLowerCase()

  if (tagName === 'script') return 'JavaScript'
  if (tagName === 'img' || tagName === 'source') return 'Images'
  if (rel.includes('stylesheet')) return 'CSS'
  if (as === 'font' || /\.(woff2?|ttf|otf)(\?|$)/.test(lowerUrl)) return 'Fonts'
  if (/\.(png|jpe?g|gif|webp|avif|svg|ico)(\?|$)/.test(lowerUrl)) {
    return 'Images'
  }
  if (/\.(js|mjs)(\?|$)/.test(lowerUrl)) return 'JavaScript'
  if (/\.css(\?|$)/.test(lowerUrl)) return 'CSS'
  return 'Other'
}

function extractResources(html: string, baseUrl: string) {
  const resources: Array<{ url: string; category: ResourceCategory }> = []
  const seen = new Set<string>()
  const tagRegex = /<(script|link|img|source|video|audio|iframe)\b[^>]*>/gi
  let match: RegExpExecArray | null

  while ((match = tagRegex.exec(html))) {
    const tagName = match[1].toLowerCase()
    const tag = match[0]
    const attr = getAttribute(tag, tagName === 'link' ? 'href' : 'src')

    if (!attr || attr.startsWith('data:') || attr.startsWith('#')) continue

    try {
      const absolute = new URL(attr, baseUrl).toString()
      if (!absolute.startsWith('http') || seen.has(absolute)) continue
      seen.add(absolute)
      resources.push({
        url: absolute,
        category: getResourceCategory(tagName, tag, absolute),
      })
    } catch {
      continue
    }
  }

  return resources
}

async function fetchResourceSize(url: string): Promise<number | null> {
  try {
    const response = await fetchWithTimeout(
      url,
      { method: 'HEAD', redirect: 'follow' },
      8000,
    )
    await response.body?.cancel().catch(() => {})
    const length = response.headers.get('content-length')
    if (!length) return null
    const parsed = parseInt(length, 10)
    return Number.isFinite(parsed) ? parsed : null
  } catch {
    return null
  }
}

async function checkPageSize(formData: FormData): Promise<ToolActionData> {
  let url: string
  try {
    url = normalizeUrl(getFormValue(formData))
  } catch (error) {
    return { error: getErrorMessage(error), result: null }
  }

  try {
    const start = Date.now()
    const response = await fetchWithTimeout(url, { redirect: 'follow' }, 15000)
    const html = await response.text()
    const htmlBytes = new TextEncoder().encode(html).length
    const resources = extractResources(html, response.url).slice(0, 60)
    const resourceSizes = await Promise.all(
      resources.map(async (resource) => ({
        ...resource,
        bytes: await fetchResourceSize(resource.url),
      })),
    )

    const categories = new Map<
      ResourceCategory,
      { count: number; bytes: number; knownSizes: number }
    >()

    categories.set('HTML', { count: 1, bytes: htmlBytes, knownSizes: 1 })

    for (const resource of resourceSizes) {
      const current = categories.get(resource.category) || {
        count: 0,
        bytes: 0,
        knownSizes: 0,
      }
      current.count += 1
      if (resource.bytes !== null) {
        current.bytes += resource.bytes
        current.knownSizes += 1
      }
      categories.set(resource.category, current)
    }

    const knownResourceBytes = resourceSizes.reduce(
      (total, resource) => total + (resource.bytes || 0),
      0,
    )
    const totalKnownBytes = htmlBytes + knownResourceBytes
    const issues: Issue[] = []

    if (htmlBytes > 200 * 1024) {
      issues.push({
        level: 'warning',
        message: 'HTML document is large',
        details: `The base HTML is ${formatBytes(htmlBytes)}. Heavy HTML can slow first render and crawling.`,
      })
    }

    if (resources.length > 40) {
      issues.push({
        level: 'info',
        message: 'Many page resources detected',
        details: `${resources.length} linked resources were found in the HTML. Fewer critical requests usually improve load time.`,
      })
    }

    if (totalKnownBytes > 3 * 1024 * 1024) {
      issues.push({
        level: 'warning',
        message: 'Known transfer size is over 3 MB',
        details:
          'Large pages can reduce conversion rates, especially on mobile networks.',
      })
    }

    if (issues.length === 0) {
      issues.push({
        level: 'good',
        message: 'Page weight looks reasonable from the HTML scan',
        details:
          'The detected HTML and known resource sizes are within common performance budgets.',
      })
    }

    return {
      error: null,
      result: {
        requestedUrl: url,
        finalUrl: response.url,
        status: response.status,
        scanTime: Date.now() - start,
        htmlBytes,
        htmlSize: formatBytes(htmlBytes),
        resourceCount: resources.length,
        checkedResourceCount: resourceSizes.length,
        totalKnownBytes,
        totalKnownSize: formatBytes(totalKnownBytes),
        categories: Array.from(categories.entries()).map(
          ([category, value]) => ({
            category,
            count: value.count,
            bytes: value.bytes,
            knownSizes: value.knownSizes,
            size: formatBytes(value.bytes),
          }),
        ),
        largestResources: resourceSizes
          .filter((resource) => resource.bytes !== null)
          .sort((a, b) => (b.bytes || 0) - (a.bytes || 0))
          .slice(0, 8)
          .map((resource) => ({
            url: resource.url,
            category: resource.category,
            bytes: resource.bytes,
            size: formatBytes(resource.bytes || 0),
          })),
        issues,
      },
    }
  } catch (error) {
    return {
      error: `Page size check failed: ${getErrorMessage(error)}`,
      result: null,
    }
  }
}

export async function runTechnicalToolAction(
  slug: ToolSlug,
  formData: FormData,
): Promise<ToolActionData> {
  if (slug === 'dns-lookup') return lookupDns(formData)
  if (slug === 'http-headers-checker') return checkHttpHeaders(formData)
  if (slug === 'ssl-certificate-checker') return checkSslCertificate(formData)
  if (slug === 'redirect-checker') return checkRedirects(formData)
  if (slug === 'cookie-checker') return checkCookies(formData)
  if (slug === 'csp-checker') return checkCsp(formData)
  if (slug === 'canonical-url-checker') return checkCanonicalUrl(formData)
  if (slug === 'page-size-checker') return checkPageSize(formData)

  return { error: 'This tool does not require a server action', result: null }
}
