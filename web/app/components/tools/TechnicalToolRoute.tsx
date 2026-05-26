import {
  CheckCircleIcon,
  DownloadSimpleIcon,
  MagnifyingGlassIcon,
  WarningCircleIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { MetaFunction } from 'react-router'
import { redirect, useFetcher } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import type { ToolActionData } from '~/lib/freeTools.server'
import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import { ToolsNav, ToolsNavMobile } from '~/components/ToolsNav'
import { getOgImageUrl, isSelfhosted } from '~/lib/constants'
import Button from '~/ui/Button'
import CodeBlock from '~/ui/CodeBlock'
import { FAQ } from '~/ui/FAQ'
import Input from '~/ui/Input'
import Textarea from '~/ui/Textarea'
import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

type ServerToolSlug =
  | 'dns-lookup'
  | 'http-headers-checker'
  | 'ssl-certificate-checker'
  | 'redirect-checker'
  | 'cookie-checker'
  | 'csp-checker'
  | 'canonical-url-checker'
  | 'page-size-checker'
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

type CalculatorToolSlug =
  | 'uptime-sla-calculator'
  | 'website-bandwidth-calculator'

type ClientToolSlug = 'serp-snippet-preview' | 'gsc-export-analyzer'

type TechnicalToolSlug = ServerToolSlug | CalculatorToolSlug | ClientToolSlug

type IssueLevel = 'good' | 'warning' | 'error' | 'info'

interface Issue {
  level: IssueLevel
  message: string
  details?: string
}

interface ToolContent {
  title: string
  metaTitle: string
  metaDescription: string
  description: string
  inputLabel?: string
  placeholder?: string
  buttonLabel?: string
  seoTitle: string
  seoDescription: string
  sections: Array<{
    title: string
    body: string
    items?: string[]
  }>
  faq: Array<{
    question: string
    answer: string
  }>
}

interface DnsResult {
  domain: string
  records: Array<{ type: string; value: string }>
  recordTypes: string[]
}

interface HeaderResult {
  requestedUrl: string
  finalUrl: string
  status: number
  statusText: string
  responseTime: number
  importantHeaders: Array<{ name: string; value: string | null }>
  allHeaders: Array<{ name: string; value: string }>
  issues: Issue[]
}

interface SslResult {
  host: string
  authorized: boolean
  authorizationError: string | null
  subject: unknown
  issuer: unknown
  subjectAltName: string | null
  validFrom: string
  validTo: string
  daysRemaining: number
  fingerprint256: string | null
  serialNumber: string | null
  isExpired: boolean
  expiresSoon: boolean
}

interface RedirectResult {
  startUrl: string
  finalUrl: string
  redirectCount: number
  chain: Array<{
    url: string
    status: number
    statusText: string
    location: string | null
  }>
  hasLoopRisk: boolean
}

interface CookieResult {
  url: string
  finalUrl: string
  status: number
  cookies: Array<Record<string, string | boolean | null>>
  cookieCount: number
  issues: Issue[]
}

interface CspResult {
  url: string
  finalUrl: string
  status: number
  csp: string | null
  reportOnly: string | null
  directives: Record<string, string[]>
  securityHeaders: Record<string, string | null>
  issues: Issue[]
}

interface CanonicalResult {
  requestedUrl: string
  finalUrl: string
  status: number
  title: string | null
  description: string | null
  canonical: string | null
  absoluteCanonical: string | null
  robots: string | null
  ogUrl: string | null
  issues: Issue[]
}

interface PageSizeResult {
  requestedUrl: string
  finalUrl: string
  status: number
  scanTime: number
  htmlBytes: number
  htmlSize: string
  resourceCount: number
  checkedResourceCount: number
  totalKnownBytes: number
  totalKnownSize: string
  categories: Array<{
    category: string
    count: number
    bytes: number
    knownSizes: number
    size: string
  }>
  largestResources: Array<{
    url: string
    category: string
    bytes: number
    size: string
  }>
  issues: Issue[]
}

interface RobotsRuleResult {
  directive: 'allow' | 'disallow'
  path: string
}

interface IndexabilityResult {
  requestedUrl: string
  finalUrl: string
  status: number
  indexability: string
  robotsTxt: {
    url: string
    status: number | null
    allowed: boolean
    matchedRule: RobotsRuleResult | null
  }
  metaRobots: string | null
  xRobotsTag: string | null
  canonical: string | null
  absoluteCanonical: string | null
  sitemapHint: string | null
  title: string | null
  description: string | null
  issues: Issue[]
}

interface RobotsTesterResult {
  robotsUrl: string
  path: string
  userAgent: string
  allowed: boolean
  matchedRule: RobotsRuleResult | null
  groupAgents: string[]
  tests: Array<{
    userAgent: string
    allowed: boolean
    matchedRule: RobotsRuleResult | null
    groupAgents: string[]
  }>
  sitemaps: string[]
  issues: Issue[]
}

interface BrokenLinkResult {
  sourceUrl: string
  finalUrl: string
  sourceType: string
  totalLinks: number
  checkedLinks: number
  internalCount: number
  externalCount: number
  brokenCount: number
  redirectCount: number
  emptyAnchorCount: number
  invalidUrlCount: number
  limit: number
  links: Array<{
    url: string
    anchor: string
    kind: string
    status: number | null
    finalUrl: string
    redirectCount: number
    issue: string
    error: string | null
  }>
  invalidLinks: Array<{
    href: string | null
    anchor: string
    issue: string
  }>
  issues: Issue[]
}

interface HreflangResult {
  requestedUrl: string
  finalUrl: string
  status: number
  canonical: string | null
  tags: Array<{
    hreflang: string | null
    href: string | null
    absoluteUrl: string | null
    isAbsolute: boolean
  }>
  invalidCount: number
  duplicateCount: number
  hasXDefault: boolean
  reciprocalChecks: Array<{
    url: string | null
    status: number | null
    hasReturnTag: boolean
    error: string | null
  }>
  issues: Issue[]
}

interface OnPageSeoResult {
  requestedUrl: string
  finalUrl: string
  status: number
  title: string | null
  titleLength: number
  description: string | null
  descriptionLength: number
  h1: string[]
  h2: string[]
  canonical: string | null
  robots: string | null
  wordCount: number
  imageCount: number
  imagesMissingAlt: number
  imagesEmptyAlt: number
  internalLinks: number
  externalLinks: number
  structuredDataCount: number
  openGraphCount: number
  textHtmlRatio: number
  issues: Issue[]
}

interface ImageSeoResult {
  requestedUrl: string
  finalUrl: string
  status: number
  imageCount: number
  checkedImages: number
  missingAlt: number
  emptyAlt: number
  missingDimensions: number
  lazyImages: number
  largeImages: number
  modernFormats: number
  images: Array<{
    src: string | null
    alt: string | null
    hasAlt: boolean
    width: string | null
    height: string | null
    loading: string | null
    format: string
    size: string
    bytes: number | null
    isLarge: boolean
    hasDimensions: boolean
    isModernFormat: boolean
  }>
  issues: Issue[]
}

interface InternalLinkResult {
  requestedUrl: string
  finalUrl: string
  status: number
  totalLinks: number
  internalCount: number
  externalCount: number
  nofollowCount: number
  sponsoredCount: number
  ugcCount: number
  fragmentCount: number
  mailtoCount: number
  telCount: number
  emptyAnchorCount: number
  duplicateAnchors: Array<{
    anchor: string
    urls: string[]
    count: number
  }>
  links: Array<{
    url: string
    anchor: string
    rel: string
    kind: string
    isEmpty: boolean
  }>
  issues: Issue[]
}

interface AiCrawlabilityResult {
  requestedUrl: string
  finalUrl: string
  status: number
  robotsUrl: string
  robotsStatus: number | null
  crawlerRules: Array<{
    crawler: string
    allowed: boolean
    matchedRule: RobotsRuleResult | null
    groupAgents: string[]
  }>
  llms: { url: string; status: number | null; finalUrl: string }
  llmsFull: { url: string; status: number | null; finalUrl: string }
  sitemap: { url: string; status: number | null; finalUrl: string }
  canonical: string | null
  title: string | null
  description: string | null
  structuredDataCount: number
  issues: Issue[]
}

interface BulkStatusResult {
  checked: number
  limit: number
  ok: number
  redirects: number
  errors: number
  rows: Array<{
    url: string
    status: number | null
    finalUrl: string
    redirectCount: number
    contentType: string | null
    issue: string
    error: string | null
  }>
  csv: string
  issues: Issue[]
}

interface MigrationRedirectResult {
  checked: number
  limit: number
  passed: number
  mismatches: number
  temporary: number
  longChains: number
  queryDrops: number
  rows: Array<{
    oldUrl: string
    expectedUrl: string
    finalUrl: string
    status: number | null
    redirectType: number | string
    redirectCount: number
    finalMatches: boolean
    preservesQuery: boolean
    result: string
    error: string | null
  }>
  csv: string
  issues: Issue[]
}

const TOOL_CONTENT: Record<TechnicalToolSlug, ToolContent> = {
  'dns-lookup': {
    title: 'DNS Lookup',
    metaTitle: 'Free DNS Lookup Tool - Check DNS Records Online',
    metaDescription:
      'Check DNS records for any domain, including A, AAAA, MX, NS, TXT, CNAME, CAA, and SOA records. Free DNS lookup tool for website owners, developers, and hosting teams.',
    description:
      'Look up the public DNS records for any domain and verify where traffic, email, and verification records point.',
    inputLabel: 'Domain',
    placeholder: 'swetrix.com',
    buttonLabel: 'Lookup DNS',
    seoTitle: 'Free DNS Lookup Tool',
    seoDescription:
      'Use this free DNS lookup tool to inspect the records behind a domain before migrating hosting, debugging email delivery, adding analytics verification, or checking a launch configuration. It checks common record types that affect websites, email, search, and infrastructure.',
    sections: [
      {
        title: 'When to use a DNS lookup',
        body: 'DNS is the routing layer behind your website. A quick lookup helps confirm whether a domain points to the right server, whether email records are configured, and whether TXT verification records are visible to external services.',
        items: [
          'Check A and AAAA records before pointing traffic to a new host.',
          'Verify MX records when email delivery breaks after a migration.',
          'Confirm TXT records for search console, analytics, SPF, DKIM, and DMARC.',
        ],
      },
      {
        title: 'Why DNS matters for analytics',
        body: 'Analytics data quality depends on a working site, correct redirects, and stable hostnames. DNS issues can create traffic drops that look like product problems, so checking records is often the first step when visits suddenly change.',
      },
    ],
    faq: [
      {
        question: 'What DNS records does this tool check?',
        answer:
          'It checks common public DNS records including A, AAAA, MX, NS, TXT, CNAME, CAA, and SOA records when they are available for the domain.',
      },
      {
        question: 'Why are my new DNS records not showing yet?',
        answer:
          'DNS changes can take time to propagate because resolvers cache previous answers based on TTL values. Some changes appear within minutes, while others can take several hours.',
      },
      {
        question: 'What is the difference between A and AAAA records?',
        answer:
          'A records point a domain to an IPv4 address. AAAA records point a domain to an IPv6 address. Many modern sites publish both.',
      },
      {
        question: 'Can DNS problems affect website analytics?',
        answer:
          'Yes. If a domain points to the wrong host, fails intermittently, or sends users through unexpected redirects, analytics can show sudden drops, duplicate hostnames, or unusual traffic paths.',
      },
      {
        question: 'Is this DNS lookup tool free?',
        answer:
          'Yes. You can check public DNS records for any domain without creating an account.',
      },
    ],
  },
  'http-headers-checker': {
    title: 'HTTP Headers Checker',
    metaTitle: 'Free HTTP Headers Checker - Inspect Website Response Headers',
    metaDescription:
      'Check HTTP response headers for any website. Inspect status codes, cache rules, content type, server headers, HSTS, CSP, X-Frame-Options, and other security headers.',
    description:
      'Inspect a website response and see status, timing, cache headers, security headers, and exposed server details.',
    inputLabel: 'Website URL',
    placeholder: 'https://swetrix.com',
    buttonLabel: 'Check headers',
    seoTitle: 'Free HTTP Headers Checker',
    seoDescription:
      'HTTP headers explain how browsers, crawlers, CDNs, and security tools handle your pages. This checker helps website owners and developers audit cache behavior, content type, status codes, and common security headers from one clean report.',
    sections: [
      {
        title: 'Headers worth checking',
        body: 'The most useful headers for website operators are cache-control, content-type, strict-transport-security, content-security-policy, x-frame-options, x-content-type-options, and referrer-policy.',
      },
      {
        title: 'How headers affect conversions',
        body: 'Headers influence performance, browser security, indexing, and reliability. A missing cache header can slow repeat visits, while a broken content type can stop assets from loading correctly.',
      },
    ],
    faq: [
      {
        question: 'What are HTTP headers?',
        answer:
          'HTTP headers are metadata sent with a request or response. They tell browsers and crawlers how to cache, render, secure, and interpret a resource.',
      },
      {
        question: 'Which security headers should a website have?',
        answer:
          'Most production sites should consider Strict-Transport-Security, Content-Security-Policy, X-Content-Type-Options, Referrer-Policy, and frame embedding protections.',
      },
      {
        question: 'Why is cache-control important?',
        answer:
          'Cache-Control tells browsers and CDNs how long they can reuse a response. Good caching improves repeat load times and reduces hosting bandwidth.',
      },
      {
        question: 'Can response headers affect SEO?',
        answer:
          'Yes. Status codes, content type, redirects, canonical signals, and caching behavior can all affect crawlability, page speed, and search performance.',
      },
      {
        question: 'Does Swetrix use website headers in analytics?',
        answer:
          'Swetrix focuses on privacy-first analytics, but header issues can explain traffic drops or page performance changes that you see in analytics reports.',
      },
    ],
  },
  'ssl-certificate-checker': {
    title: 'SSL Certificate Checker',
    metaTitle: 'Free SSL Certificate Checker - Check HTTPS Expiry and Issuer',
    metaDescription:
      'Check an SSL certificate for any domain. See certificate issuer, subject, SANs, validity dates, expiry countdown, fingerprint, and authorization status.',
    description:
      'Check HTTPS certificate details, expiry date, issuer, subject alternative names, and validation status for any domain.',
    inputLabel: 'Domain',
    placeholder: 'swetrix.com',
    buttonLabel: 'Check SSL',
    seoTitle: 'Free SSL Certificate Checker',
    seoDescription:
      'Expired or misconfigured SSL certificates can take a website offline, trigger browser warnings, and destroy trust. This checker gives you the certificate details that matter before renewals, launches, and hosting migrations.',
    sections: [
      {
        title: 'What this SSL checker shows',
        body: 'The report includes the domain, certificate issuer, subject, subject alternative names, validity window, expiry countdown, fingerprint, and whether the certificate validates for the host.',
      },
      {
        title: 'Why certificate expiry matters',
        body: 'When HTTPS fails, visitors see browser warnings before they can reach your site. That can cause a sudden drop in traffic, conversions, and revenue that analytics will surface after the damage starts.',
      },
    ],
    faq: [
      {
        question: 'How often should I check my SSL certificate?',
        answer:
          'Check after every hosting or DNS change, and monitor expiry continuously. Many teams review certificates when they have fewer than 30 days remaining.',
      },
      {
        question: 'What does certificate issuer mean?',
        answer:
          "The issuer is the certificate authority that signed the certificate, such as Let's Encrypt, DigiCert, Google Trust Services, or Cloudflare.",
      },
      {
        question: 'What are subject alternative names?',
        answer:
          'Subject alternative names list the hostnames covered by a certificate. A certificate for example.com may also cover www.example.com if it appears in the SAN list.',
      },
      {
        question: 'Can an expired SSL certificate affect SEO?',
        answer:
          'Yes. If users and crawlers cannot access your site safely over HTTPS, search visibility, engagement, and conversions can all suffer.',
      },
      {
        question: 'Is this SSL checker free?',
        answer:
          'Yes. You can check certificate details and expiry for any public domain without signing up.',
      },
    ],
  },
  'redirect-checker': {
    title: 'Redirect Checker',
    metaTitle: 'Free Redirect Checker - Trace URL Redirect Chains',
    metaDescription:
      'Trace URL redirects and status codes. Check 301, 302, 307, 308, final URL, redirect chains, loops, and SEO redirect issues for any website.',
    description:
      'Trace every redirect from a URL to the final destination and spot long chains, temporary redirects, or loop risks.',
    inputLabel: 'Website URL',
    placeholder: 'https://example.com',
    buttonLabel: 'Trace redirects',
    seoTitle: 'Free Redirect Checker',
    seoDescription:
      'Redirect chains are easy to miss and expensive to ignore. This tool follows a URL step by step, showing every status code and destination so you can clean up migrations, canonical host redirects, campaign links, and legacy URLs.',
    sections: [
      {
        title: 'Common redirect checks',
        body: 'Use this tool to check HTTP to HTTPS redirects, non-www to www redirects, old campaign links, trailing slash behavior, and page migration rules.',
      },
      {
        title: 'Redirects and analytics attribution',
        body: 'Long or broken redirect chains can strip campaign parameters, slow landing pages, or send visitors to the wrong final URL. Clean redirects make acquisition reporting more trustworthy.',
      },
    ],
    faq: [
      {
        question: 'What is a redirect chain?',
        answer:
          'A redirect chain happens when one URL redirects to another URL, which then redirects again before reaching the final page.',
      },
      {
        question: 'Are redirect chains bad for SEO?',
        answer:
          'Short, intentional redirects are normal. Long chains can slow crawling, waste crawl budget, and make migrations harder to reason about.',
      },
      {
        question: 'What is the difference between 301 and 302 redirects?',
        answer:
          'A 301 redirect is permanent. A 302 redirect is temporary. Search engines usually treat permanent redirects as stronger canonical signals.',
      },
      {
        question: 'Can redirects break UTM tracking?',
        answer:
          'Yes. Poorly configured redirects can drop query parameters such as utm_source and utm_campaign, which makes campaign attribution incomplete.',
      },
      {
        question: 'How many redirects are too many?',
        answer:
          'Aim for one redirect before the final page whenever possible. More than two or three hops should usually be cleaned up.',
      },
    ],
  },
  'cookie-checker': {
    title: 'Cookie Checker',
    metaTitle: 'Free Cookie Checker - Inspect Website Set-Cookie Headers',
    metaDescription:
      'Check cookies set by a website response. Inspect Set-Cookie headers, Secure, HttpOnly, SameSite, expiry, domain, path, and privacy-related cookie attributes.',
    description:
      'Check which cookies a website sets in the first response and review Secure, HttpOnly, SameSite, domain, path, and expiry attributes.',
    inputLabel: 'Website URL',
    placeholder: 'https://example.com',
    buttonLabel: 'Check cookies',
    seoTitle: 'Free Website Cookie Checker',
    seoDescription:
      'Cookies affect privacy, compliance, security, and analytics accuracy. This checker inspects Set-Cookie headers from the initial page response so you can see which cookies are created before JavaScript runs.',
    sections: [
      {
        title: 'What the cookie checker audits',
        body: 'The tool reads Set-Cookie headers and highlights whether cookies use Secure, HttpOnly, SameSite, Path, Domain, Expires, and Max-Age attributes.',
      },
      {
        title: 'Privacy-first analytics angle',
        body: 'Swetrix is cookieless by design. If you are trying to reduce consent banners and privacy overhead, checking which tools set cookies is a practical first step.',
      },
    ],
    faq: [
      {
        question: 'Does this tool detect JavaScript-created cookies?',
        answer:
          'It checks cookies sent in HTTP Set-Cookie headers from the initial response. Cookies created later by JavaScript may not appear in this report.',
      },
      {
        question: 'What does SameSite do?',
        answer:
          'SameSite controls whether a browser sends a cookie with cross-site requests. It helps reduce cross-site request forgery risk.',
      },
      {
        question: 'Why should cookies use Secure?',
        answer:
          'The Secure attribute tells browsers to send the cookie only over HTTPS, which helps protect it in transit.',
      },
      {
        question: 'Why does cookie usage matter for analytics?',
        answer:
          'Cookie-based analytics often require consent in privacy-focused regions. Cookieless analytics can reduce friction while still showing useful traffic insights.',
      },
      {
        question: 'Is a website with no Set-Cookie headers always cookieless?',
        answer:
          'Not necessarily. JavaScript can create cookies after the page loads, and embedded third-party resources can set cookies in their own contexts.',
      },
    ],
  },
  'csp-checker': {
    title: 'CSP Checker',
    metaTitle: 'Free CSP Checker and Generator - Content Security Policy Tool',
    metaDescription:
      'Check Content-Security-Policy headers and generate a starter CSP for your website. Find missing directives, unsafe-inline, frame-ancestors, base-uri, and security header gaps.',
    description:
      'Check a website Content-Security-Policy header and generate a practical starter policy for scripts, styles, images, frames, and connections.',
    inputLabel: 'Website URL',
    placeholder: 'https://example.com',
    buttonLabel: 'Check CSP',
    seoTitle: 'Free Content Security Policy Checker',
    seoDescription:
      'A Content Security Policy helps reduce the blast radius of cross-site scripting and injection bugs. This tool checks the live CSP header on a site and gives you a simple generator for a starter policy.',
    sections: [
      {
        title: 'What makes a CSP useful',
        body: 'A useful CSP should include a default-src fallback, restrict script sources, control frame embedding, and avoid unsafe-inline where possible.',
      },
      {
        title: 'Roll out CSP carefully',
        body: 'Start with a report-only policy when you are unsure. Review violations, add the sources your site actually needs, then enforce the policy when critical paths are clean.',
      },
    ],
    faq: [
      {
        question: 'What is Content Security Policy?',
        answer:
          'Content Security Policy is an HTTP response header that tells browsers which sources are allowed for scripts, styles, images, frames, fonts, and other resources.',
      },
      {
        question: 'Does CSP stop all XSS attacks?',
        answer:
          'No. CSP is a defense-in-depth control. It can reduce impact, but it should be combined with output escaping, input validation, and secure coding practices.',
      },
      {
        question: 'What does unsafe-inline mean?',
        answer:
          'unsafe-inline allows inline scripts or styles. It is often convenient but weakens CSP protection, especially for script-src.',
      },
      {
        question: 'Should I use report-only first?',
        answer:
          'Yes, report-only mode is useful for testing. It reports violations without blocking resources, which helps avoid breaking production pages.',
      },
      {
        question: 'Can analytics work with CSP?',
        answer:
          'Yes. Add your analytics script and API endpoints to script-src and connect-src. Swetrix can run under CSP with the right source entries.',
      },
    ],
  },
  'canonical-url-checker': {
    title: 'Canonical URL Checker',
    metaTitle:
      'Free Canonical URL Checker - Check Canonical Tags and SEO Signals',
    metaDescription:
      'Check canonical tags, page title, meta description, robots directives, og:url, final URL, and common SEO issues for any website page.',
    description:
      'Check a page canonical URL, title, meta description, robots directives, og:url, final URL, and common indexability signals.',
    inputLabel: 'Page URL',
    placeholder: 'https://swetrix.com/tools',
    buttonLabel: 'Check canonical',
    seoTitle: 'Free Canonical URL Checker',
    seoDescription:
      'Canonical URLs help search engines understand the preferred version of a page. This checker fetches a URL and reports the canonical tag, final URL, robots meta value, title, description, and Open Graph URL.',
    sections: [
      {
        title: 'Why canonical tags matter',
        body: 'Duplicate pages can split ranking signals and make reporting messy. Canonical tags help consolidate variants such as tracking URLs, trailing slash differences, print pages, and filtered pages.',
      },
      {
        title: 'Analytics and canonical URLs',
        body: 'Clean canonical rules make analytics easier to interpret because you can compare landing page performance without accidental duplicates from URL variants.',
      },
    ],
    faq: [
      {
        question: 'What is a canonical URL?',
        answer:
          'A canonical URL is the preferred URL for a page when similar or duplicate versions exist. It is usually declared with a rel="canonical" link tag.',
      },
      {
        question: 'Should canonical URLs be absolute?',
        answer:
          'Absolute canonical URLs are recommended because they are clearer for crawlers and external tools.',
      },
      {
        question: 'Is a canonical tag required on every page?',
        answer:
          'It is not strictly required, but self-referencing canonical tags are a common best practice for indexable pages.',
      },
      {
        question: 'Can canonical tags affect analytics reports?',
        answer:
          'Indirectly, yes. Canonical discipline often matches URL discipline. Cleaner URLs reduce duplicate landing pages in reports.',
      },
      {
        question: 'What does noindex mean?',
        answer:
          'A noindex robots directive tells search engines not to index the page, even if they can crawl it.',
      },
    ],
  },
  'page-size-checker': {
    title: 'Page Size Checker',
    metaTitle: 'Free Page Size Checker - Estimate Website Page Weight',
    metaDescription:
      'Check website page size, HTML weight, linked resource count, known transfer size, largest assets, and performance budget warnings for any URL.',
    description:
      'Estimate page weight from the HTML document, linked resources, known content lengths, largest assets, and performance budget warnings.',
    inputLabel: 'Page URL',
    placeholder: 'https://swetrix.com',
    buttonLabel: 'Check page size',
    seoTitle: 'Free Website Page Size Checker',
    seoDescription:
      'Page weight affects load speed, hosting bandwidth, search performance, and conversion rate. This checker scans the HTML and linked resources to estimate how heavy a page is before a full browser audit.',
    sections: [
      {
        title: 'What this page size tool measures',
        body: 'The scan measures HTML size, linked resource count, known content-length values, largest detected resources, and totals by resource category.',
      },
      {
        title: 'Why page weight matters',
        body: 'Large pages take longer to load, especially on mobile networks. Slow pages can reduce conversion rate, increase bounce rate, and make acquisition spend less efficient.',
      },
    ],
    faq: [
      {
        question: 'Is this the same as a Lighthouse audit?',
        answer:
          'No. This is a lightweight server-side scan of HTML and linked resources. Lighthouse runs a browser and measures more detailed runtime performance metrics.',
      },
      {
        question: 'Why are some resource sizes unknown?',
        answer:
          'Some servers do not return content-length headers for resources, especially when compression or streaming is involved.',
      },
      {
        question: 'What is a good page size?',
        answer:
          'There is no universal number, but many marketing pages should aim to stay below 1 to 2 MB of critical transfer where possible.',
      },
      {
        question: 'Can page size affect conversions?',
        answer:
          'Yes. Heavier pages often load slower, and slower pages can increase abandonment before users interact with the site.',
      },
      {
        question: 'Can Swetrix monitor performance after launch?',
        answer:
          'Yes. Swetrix includes performance monitoring so you can track real user performance alongside traffic and conversion data.',
      },
    ],
  },
  'indexability-checker': {
    title: 'Indexability Checker',
    metaTitle: 'Free Indexability Checker - Can Google Index This Page?',
    metaDescription:
      'Check whether Google can index a page. Audit status code, final URL, robots.txt, meta robots, X-Robots-Tag, canonical URL, title, description, and sitemap hints.',
    description:
      'Audit one URL and answer the practical question: can Google crawl and index this page?',
    inputLabel: 'Page URL',
    placeholder: 'https://swetrix.com/tools',
    buttonLabel: 'Check indexability',
    seoTitle: 'Free Indexability Checker',
    seoDescription:
      'Indexability problems are often small technical signals with large traffic impact. This checker inspects the live response, robots.txt access, robots directives, canonical URL, and page metadata so you can see whether a page is eligible for Google indexing.',
    sections: [
      {
        title: 'What this indexability audit checks',
        body: 'The report checks the HTTP status, final redirected URL, robots.txt rule for Googlebot, meta robots, X-Robots-Tag, canonical URL, title, description, and sitemap hints from robots.txt.',
      },
      {
        title: 'How to read the result',
        body: 'A page can be reachable but still not indexable. Hard blockers include non-200 responses, robots.txt disallow rules, and noindex directives. Canonical and metadata issues are usually cleanup tasks unless they point away from the page you expect to rank.',
      },
    ],
    faq: [
      {
        question: 'Can Google index a page blocked by robots.txt?',
        answer:
          'Google generally cannot crawl the blocked page content. If the URL is discovered elsewhere, it may still appear with limited information, but blocking crawl is not the same as controlling indexing with noindex.',
      },
      {
        question: 'What is the difference between noindex and robots.txt?',
        answer:
          'Noindex is a page-level directive that tells search engines not to index the page after they crawl it. robots.txt controls whether crawlers can request a path.',
      },
      {
        question: 'Does a different canonical URL block indexing?',
        answer:
          'Not directly. A canonical pointing elsewhere tells search engines that another URL is preferred, so the checked URL may not be selected for search results.',
      },
      {
        question: 'Why does final URL matter for SEO?',
        answer:
          'Search engines evaluate the final response after redirects. Unexpected final URLs can reveal redirect mistakes, canonical host issues, or migration problems.',
      },
    ],
  },
  'robots-txt-tester': {
    title: 'Robots.txt Tester',
    metaTitle: 'Free Robots.txt Tester - Check Googlebot and AI Crawler Access',
    metaDescription:
      'Test robots.txt rules for a URL path and user agent. Check Googlebot, Bingbot, GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot, and other crawler access.',
    description:
      'Enter a site, path, and crawler user agent to see whether robots.txt allows or blocks crawling.',
    inputLabel: 'Website or robots.txt URL',
    placeholder: 'https://example.com/robots.txt',
    buttonLabel: 'Test robots.txt',
    seoTitle: 'Free Robots.txt Tester',
    seoDescription:
      'Robots.txt rules decide which crawlers can request which paths. This tester parses Allow and Disallow rules with longest-match precedence, then compares common search and AI crawlers so you can catch accidental blocks before they cost traffic.',
    sections: [
      {
        title: 'How robots.txt matching works',
        body: 'Crawlers choose the most specific matching user-agent group, then apply the longest matching Allow or Disallow rule for the requested path. If Allow and Disallow tie, Allow usually wins.',
      },
      {
        title: 'Crawler rules deserve version control',
        body: 'Robots rules change during staging launches, migrations, and AI crawler policy updates. Testing specific paths helps avoid blocking valuable pages while still protecting private or duplicate areas.',
      },
    ],
    faq: [
      {
        question: 'Does robots.txt remove pages from Google?',
        answer:
          'No. robots.txt controls crawling. To remove a page from search results, use noindex on a crawlable page or remove the URL and return an appropriate status.',
      },
      {
        question: 'What user agent should I test for Google?',
        answer:
          'Use Googlebot for general web search crawling. Some Google products use specialized crawlers, but Googlebot is the main SEO check.',
      },
      {
        question: 'Can I block AI crawlers with robots.txt?',
        answer:
          'Many AI crawlers publish user-agent names and respect robots.txt, but behavior varies by provider. Use explicit groups for the crawlers you care about.',
      },
      {
        question: 'What does an empty Disallow mean?',
        answer:
          'An empty Disallow line means crawling is allowed for that group because no path is being disallowed.',
      },
    ],
  },
  'broken-link-checker': {
    title: 'Broken Link Checker',
    metaTitle: 'Free Broken Link Checker - Find 404 and Redirect Issues',
    metaDescription:
      'Check a page or sitemap for broken links. Find internal and external 404s, 5xx errors, redirects, invalid URLs, and empty anchor text with safe request limits.',
    description:
      'Scan a page or sitemap, check linked URLs, and flag broken responses, redirects, invalid hrefs, and empty anchors.',
    inputLabel: 'Page or sitemap URL',
    placeholder: 'https://example.com/blog/post',
    buttonLabel: 'Check links',
    seoTitle: 'Free Broken Link Checker',
    seoDescription:
      'Broken links waste crawl budget, frustrate visitors, and quietly weaken internal linking. This checker scans a page or sitemap with capped requests, then separates internal and external link problems so you know what to fix first.',
    sections: [
      {
        title: 'What counts as a broken link',
        body: 'The tool flags failed requests, 404 and 410 not found responses, 5xx server errors, invalid href values, and empty anchors. Redirects are shown separately because they may be intentional but still worth cleaning up.',
      },
      {
        title: 'Why broken links affect analytics',
        body: 'Broken internal paths create dead ends in user journeys. In analytics, that can appear as high exits, failed conversions, or sudden drops on pages that used to send traffic deeper into the site.',
      },
    ],
    faq: [
      {
        question: 'Can this checker scan an entire website?',
        answer:
          'It is designed as a lightweight page or sitemap check with request limits. For full-site crawling, use a dedicated crawler and monitor the highest-value pages regularly.',
      },
      {
        question: 'Should I fix redirected internal links?',
        answer:
          'Yes, when practical. Redirects work, but linking directly to the final URL is faster and easier for crawlers to process.',
      },
      {
        question: 'Are external broken links bad for SEO?',
        answer:
          'A few external issues are normal, but many broken references create a poor user experience and can make content look neglected.',
      },
      {
        question: 'Why are some links not checked?',
        answer:
          'The tool caps requests to keep scans fast and safe. It prioritizes unique HTTP and HTTPS URLs found in the HTML or sitemap.',
      },
    ],
  },
  'hreflang-checker': {
    title: 'Hreflang Checker',
    metaTitle: 'Free Hreflang Checker - Validate International SEO Tags',
    metaDescription:
      'Check hreflang tags for any page. Validate language-region codes, x-default, duplicates, absolute URLs, canonical conflicts, and reciprocal hreflang hints.',
    description:
      'Validate hreflang tags, language codes, x-default, canonicals, duplicate alternates, and reciprocal hints.',
    inputLabel: 'Page URL',
    placeholder: 'https://example.com/en-gb/',
    buttonLabel: 'Check hreflang',
    seoTitle: 'Free Hreflang Checker',
    seoDescription:
      'Hreflang tags help search engines show the right language or regional URL to the right audience. This checker catches common international SEO mistakes such as invalid language codes, duplicate alternates, missing x-default, and canonical conflicts.',
    sections: [
      {
        title: 'Common hreflang mistakes',
        body: 'The most common issues are relative URLs, invalid language-region codes, duplicate hreflang values, missing return tags, and pages that canonicalize to a different language version.',
      },
      {
        title: 'When hreflang is useful',
        body: 'Use hreflang when similar pages target different languages or regions, such as English for the US and English for the UK. Single-language sites do not need hreflang.',
      },
    ],
    faq: [
      {
        question: 'What is x-default hreflang?',
        answer:
          'x-default marks the fallback URL for users who do not match any specific language or region alternate.',
      },
      {
        question: 'Should hreflang URLs be absolute?',
        answer:
          'Absolute URLs are recommended because they are unambiguous for crawlers and easier to validate across domains.',
      },
      {
        question: 'Can hreflang fix duplicate content?',
        answer:
          'Hreflang helps search engines serve the right regional version. It does not replace canonical tags or unique content strategy.',
      },
      {
        question: 'Do hreflang pages need return tags?',
        answer:
          'Yes. Each alternate should usually reference the other alternates in the cluster, including the page being checked.',
      },
    ],
  },
  'serp-snippet-preview': {
    title: 'SERP Snippet Preview',
    metaTitle: 'Free SERP Snippet Preview - Google Title and Description Tool',
    metaDescription:
      'Preview Google desktop and mobile search snippets. Test SEO titles, meta descriptions, URL display, pixel guidance, character length, and truncation warnings.',
    description:
      'Preview how a title, meta description, and URL may appear in Google desktop and mobile search results.',
    seoTitle: 'Free SERP Snippet Preview Tool',
    seoDescription:
      'Search snippets are not fully under your control, but better title and description drafts improve the odds of a clear result. This client-side preview estimates desktop and mobile truncation using practical pixel and character guidance.',
    sections: [
      {
        title: 'How to write snippet-friendly titles',
        body: 'Start with the page topic, keep the most important words near the front, and avoid stuffing repeated keywords. A clear title often wins more clicks than a forced exact-match phrase.',
      },
      {
        title: 'Why descriptions still matter',
        body: 'Meta descriptions are not ranking guarantees, and Google can rewrite them. They still help you draft the clearest promise for a searcher before they click.',
      },
    ],
    faq: [
      {
        question: 'Will Google always use my title tag?',
        answer:
          'No. Google may rewrite titles based on the query, page headings, anchors, or other signals. A concise, accurate title gives it a better starting point.',
      },
      {
        question: 'What is a good SEO title length?',
        answer:
          'Many titles fit best around 50 to 60 characters, but pixel width matters more than character count because letters have different widths.',
      },
      {
        question: 'What is a good meta description length?',
        answer:
          'A practical range is about 140 to 160 characters. Shorter can work when the value is clear, and longer descriptions may be truncated or rewritten.',
      },
      {
        question: 'Does meta description affect rankings?',
        answer:
          'Meta descriptions are not a direct ranking factor, but they can affect click-through rate from search results.',
      },
    ],
  },
  'on-page-seo-checker': {
    title: 'On-Page SEO Checker',
    metaTitle: 'Free On-Page SEO Checker - Audit Titles, H1s, Links and Schema',
    metaDescription:
      'Run a single-page SEO audit. Check title length, meta description, H1 and H2 structure, canonical, robots, word count, image alt text, links, structured data, Open Graph, and text-to-HTML ratio.',
    description:
      'Scan one page for core on-page SEO signals, content structure, metadata, links, images, and schema presence.',
    inputLabel: 'Page URL',
    placeholder: 'https://example.com/pricing',
    buttonLabel: 'Run SEO check',
    seoTitle: 'Free On-Page SEO Checker',
    seoDescription:
      'On-page SEO is the practical layer you control: title, description, headings, canonicals, crawl directives, content depth, images, internal links, structured data, and social metadata. This checker gives a compact page-level audit without needing a full crawler.',
    sections: [
      {
        title: 'What the on-page audit includes',
        body: 'The scan checks the live status, title and description length, H1 and H2 headings, canonical URL, robots directives, visible word count, image alt coverage, internal and external links, structured data, Open Graph tags, and text-to-HTML ratio.',
      },
      {
        title: 'Use it before publishing important pages',
        body: 'Run this check on landing pages, pricing pages, documentation, product pages, and migration targets. It catches the ordinary mistakes that are easiest to fix before launch.',
      },
    ],
    faq: [
      {
        question: 'Is on-page SEO enough to rank?',
        answer:
          'No. Rankings also depend on search intent, backlinks, content quality, technical health, competition, and brand demand. On-page SEO makes sure the page itself sends clear signals.',
      },
      {
        question: 'How many H1 tags should a page have?',
        answer:
          'One clear H1 is the simplest pattern for most pages. Multiple H1s can be valid HTML, but they often make the content outline harder to interpret.',
      },
      {
        question: 'Does word count matter for SEO?',
        answer:
          'Word count is only a rough signal. A page should be complete enough to satisfy the query, not long for its own sake.',
      },
      {
        question: 'Why check Open Graph in an SEO audit?',
        answer:
          'Open Graph tags do not directly rank pages, but they shape social sharing previews and can improve referral traffic quality.',
      },
    ],
  },
  'image-seo-checker': {
    title: 'Image SEO Checker',
    metaTitle: 'Free Image SEO Checker - Audit Alt Text, Sizes and Formats',
    metaDescription:
      'Check images on a page for missing alt text, empty alt text, large known files, missing width and height, lazy loading, modern formats, and largest image URLs.',
    description:
      'Audit page images for alt text, dimensions, lazy loading, modern formats, and large known file sizes.',
    inputLabel: 'Page URL',
    placeholder: 'https://example.com/gallery',
    buttonLabel: 'Check images',
    seoTitle: 'Free Image SEO Checker',
    seoDescription:
      'Images affect accessibility, page speed, search visibility, and layout stability. This checker extracts image tags from a page and highlights missing alt attributes, large known files, missing dimensions, lazy loading usage, and modern image formats.',
    sections: [
      {
        title: 'What good image SEO looks like',
        body: 'Meaningful images should have descriptive alt text, decorative images should use empty alt text, large images should be compressed, and dimensions should be set to reduce layout shift.',
      },
      {
        title: 'Performance and accessibility together',
        body: 'Image SEO is not only about image search. Smaller files improve load speed, and accurate alt text helps people using assistive technology understand the page.',
      },
    ],
    faq: [
      {
        question: 'Should every image have alt text?',
        answer:
          'Every img tag should have an alt attribute. Meaningful images need descriptive alt text, while decorative images should use an empty alt attribute.',
      },
      {
        question: 'Are WebP and AVIF better for SEO?',
        answer:
          'They are often smaller than JPEG or PNG, which can improve page speed. The format itself is not a ranking shortcut.',
      },
      {
        question: 'Why do width and height attributes matter?',
        answer:
          'They help browsers reserve layout space before the image loads, reducing layout shift and improving perceived quality.',
      },
      {
        question: 'Can lazy loading hurt SEO?',
        answer:
          'Native lazy loading is usually fine, but important above-the-fold images should load promptly and be available in the HTML.',
      },
    ],
  },
  'internal-link-analyzer': {
    title: 'Internal Link Analyzer',
    metaTitle:
      'Free Internal Link Analyzer - Audit Anchors and Link Attributes',
    metaDescription:
      'Analyze links on a page. Group internal and external links, anchor text, nofollow, sponsored, ugc, duplicate anchors, fragments, mailto, tel, and empty anchors.',
    description:
      'Inspect a page link graph, anchor text, internal and external links, rel attributes, fragments, and empty anchors.',
    inputLabel: 'Page URL',
    placeholder: 'https://example.com/docs',
    buttonLabel: 'Analyze links',
    seoTitle: 'Free Internal Link Analyzer',
    seoDescription:
      'Internal links help search engines discover pages and understand relationships between topics. This analyzer extracts links from a page and groups anchor text, rel attributes, fragments, mailto and tel links, and suspicious empty anchors.',
    sections: [
      {
        title: 'Why internal links matter',
        body: 'A clear internal link structure helps users keep moving and helps crawlers discover important pages. Descriptive anchors also explain what the linked page is about.',
      },
      {
        title: 'What to review first',
        body: 'Start with empty anchors, important pages with weak anchor text, repeated anchors pointing to different URLs, and internal links marked nofollow without a clear reason.',
      },
    ],
    faq: [
      {
        question: 'What is good anchor text?',
        answer:
          'Good anchor text is concise, descriptive, and specific enough that a user can understand where the link goes before clicking.',
      },
      {
        question: 'Should internal links use nofollow?',
        answer:
          'Usually no. Internal nofollow can make discovery and signal flow harder unless there is a specific technical reason.',
      },
      {
        question: 'Are duplicate anchors bad?',
        answer:
          'Not always. They are worth reviewing when the same anchor text points to multiple unrelated URLs because that can create ambiguity.',
      },
      {
        question: 'Do mailto and tel links affect SEO?',
        answer:
          'They are useful for users but are not crawlable page destinations. This tool separates them from internal and external web links.',
      },
    ],
  },
  'ai-search-llm-crawlability-checker': {
    title: 'AI Search / LLM Crawlability Checker',
    metaTitle:
      'Free AI Search Crawlability Checker - Robots.txt, llms.txt and Schema',
    metaDescription:
      'Check AI search and LLM crawlability signals. Audit robots.txt rules for common AI crawlers, llms.txt, llms-full.txt, sitemap, canonical, title, description, and structured data.',
    description:
      'Check whether common AI crawlers can access a site and whether machine-readable discovery signals are present.',
    inputLabel: 'Website URL',
    placeholder: 'https://example.com',
    buttonLabel: 'Check AI crawlability',
    seoTitle: 'Free AI Search and LLM Crawlability Checker',
    seoDescription:
      'AI search visibility depends on crawl access, clean canonical signals, readable page summaries, sitemaps, and structured data. This checker audits common robots.txt rules for AI crawlers and looks for emerging llms.txt files alongside classic SEO signals.',
    sections: [
      {
        title: 'Signals this tool checks',
        body: 'The scan checks robots.txt access for common AI crawlers, llms.txt and llms-full.txt presence, sitemap availability, canonical clarity, page title and description, and structured data presence.',
      },
      {
        title: 'What each signal means',
        body: 'Robots.txt controls crawl permission, llms.txt can summarize important content for AI tools, sitemaps help discovery, canonicals identify preferred URLs, and structured data describes entities in a machine-readable way.',
      },
    ],
    faq: [
      {
        question: 'What is llms.txt?',
        answer:
          'llms.txt is an emerging convention for publishing a concise, AI-friendly map of important site content. It is not a universal standard, but some teams use it to improve discoverability.',
      },
      {
        question: 'Should I allow AI crawlers?',
        answer:
          'That is a content and business decision. Some sites want AI visibility, while others prefer to restrict reuse. This tool shows the current technical signals.',
      },
      {
        question: 'Does structured data help AI search?',
        answer:
          'Structured data can help machines understand entities and page purpose. It is useful for classic search and may help AI retrieval systems interpret content.',
      },
      {
        question: 'Is AI crawlability the same as SEO?',
        answer:
          'They overlap, but they are not identical. AI systems may use different crawlers, retrieval pipelines, and summaries than traditional search engines.',
      },
    ],
  },
  'gsc-export-analyzer': {
    title: 'GSC Export Analyzer',
    metaTitle: 'Free GSC Export Analyzer - Find SEO CTR and Ranking Quick Wins',
    metaDescription:
      'Upload a Google Search Console CSV export and find high-impression low-CTR opportunities, declining pages, keyword cannibalization candidates, and quick-win pages.',
    description:
      'Upload a Search Console CSV export and surface CTR opportunities, declining pages, cannibalization candidates, and quick wins.',
    seoTitle: 'Free Google Search Console Export Analyzer',
    seoDescription:
      'Search Console exports are packed with useful SEO work, but raw rows are hard to prioritize. This client-side analyzer groups query and page performance to reveal high-impression low-CTR rows, declining pages when date data exists, cannibalization candidates, and ranking quick wins.',
    sections: [
      {
        title: 'What the CSV analyzer looks for',
        body: 'It supports common columns such as query, page, clicks, impressions, CTR, position, and date. Results are calculated locally in your browser so the uploaded export does not need a server action.',
      },
      {
        title: 'How to use the findings',
        body: 'Rewrite snippets for high-impression low-CTR rows, refresh declining pages, consolidate cannibalized queries, and improve pages already ranking on positions 4 to 20.',
      },
    ],
    faq: [
      {
        question: 'What Google Search Console export should I upload?',
        answer:
          'Use a CSV export from the Performance report. Query, page, clicks, impressions, CTR, and position columns are supported, with date used when available.',
      },
      {
        question: 'Is my GSC data uploaded to Swetrix?',
        answer:
          'The analyzer runs in your browser. It reads the CSV file locally and does not need to send the export to a server action.',
      },
      {
        question: 'What is a low-CTR opportunity?',
        answer:
          'It is a row with meaningful impressions but fewer clicks than expected. These are often good candidates for better titles, descriptions, or search intent alignment.',
      },
      {
        question: 'What is keyword cannibalization?',
        answer:
          'Cannibalization happens when multiple pages compete for the same query. It is not always bad, but it deserves review when impressions or clicks are split across similar pages.',
      },
    ],
  },
  'http-status-bulk-checker': {
    title: 'HTTP Status Bulk Checker',
    metaTitle: 'Free HTTP Status Bulk Checker - Check Multiple URLs Online',
    metaDescription:
      'Paste multiple URLs and check HTTP status codes, final URLs, redirect counts, content types, errors, and CSV output. Safe request limit included.',
    description:
      'Paste up to 50 URLs and check status codes, final URLs, redirect counts, content types, and CSV output.',
    inputLabel: 'URLs',
    placeholder: 'https://example.com\nhttps://example.com/pricing',
    buttonLabel: 'Check statuses',
    seoTitle: 'Free HTTP Status Bulk Checker',
    seoDescription:
      'Bulk status checks make migrations, audits, and launch QA faster. Paste a list of URLs to find 200 responses, redirects, broken pages, server errors, content types, and unexpected final destinations in one report.',
    sections: [
      {
        title: 'When to use a bulk status checker',
        body: 'Use it before and after migrations, during content pruning, after CMS changes, and when analytics shows traffic landing on old or failing URLs.',
      },
      {
        title: 'Why redirects are shown separately',
        body: 'Redirects are not always problems, but they can hide slow chains, temporary status codes, or final URLs that do not match your intended canonical structure.',
      },
    ],
    faq: [
      {
        question: 'How many URLs can I check at once?',
        answer:
          'This tool checks up to 50 unique URLs per run to keep requests fast and safe.',
      },
      {
        question: 'Does it follow redirects?',
        answer:
          'Yes. It traces redirects, reports the final URL, and counts the number of redirect hops.',
      },
      {
        question: 'Can I export the results?',
        answer:
          'Yes. The result includes CSV output that you can copy or download from the page.',
      },
      {
        question: 'Should every SEO page return 200?',
        answer:
          'Indexable canonical pages should usually return 200. Redirects, 404s, and 410s can be correct for moved or removed URLs.',
      },
    ],
  },
  'seo-migration-redirect-validator': {
    title: 'SEO Migration Redirect Validator',
    metaTitle:
      'Free SEO Migration Redirect Validator - Check Old to New URL Redirects',
    metaDescription:
      'Validate SEO migration redirects from old URL to new URL pairs. Check expected final targets, status code type, chain length, query preservation, mismatches, and CSV output.',
    description:
      'Paste old URL,new URL pairs and verify permanent redirects, final targets, chain length, and query preservation.',
    inputLabel: 'Old URL,new URL pairs',
    placeholder:
      'https://old.example.com/page,https://new.example.com/page\nhttps://old.example.com/pricing,https://new.example.com/pricing',
    buttonLabel: 'Validate redirects',
    seoTitle: 'Free SEO Migration Redirect Validator',
    seoDescription:
      'URL migrations fail when old URLs redirect to the wrong target, use temporary status codes, drop parameters, or create long chains. This validator checks old-to-new pairs so you can confirm that important pages preserve SEO signals after a migration.',
    sections: [
      {
        title: 'What a healthy migration redirect looks like',
        body: 'A healthy migration redirect uses a permanent status such as 301 or 308, reaches the expected new URL, keeps the chain short, and preserves query parameters when those parameters matter.',
      },
      {
        title: 'Use analytics to choose the URL list',
        body: 'Validate the URLs that actually receive visits, links, revenue, or search clicks first. Analytics and Search Console exports make that priority list much more useful than a raw crawl alone.',
      },
    ],
    faq: [
      {
        question: 'Should SEO migrations use 301 redirects?',
        answer:
          'Permanent migrations usually use 301 or 308 redirects. Temporary redirects can be valid for short-term tests, but they are not the usual choice for permanent URL moves.',
      },
      {
        question: 'How long is too long for a redirect chain?',
        answer:
          'Aim for one hop from old URL to new URL. More than two or three hops should usually be cleaned up.',
      },
      {
        question: 'Should query parameters be preserved?',
        answer:
          'Often yes, especially for campaign tracking and filtered landing pages. Some migrations intentionally drop parameters, but that should be explicit.',
      },
      {
        question: 'What format should I paste?',
        answer:
          'Paste one pair per line as old URL,new URL. A header row such as old,new is allowed.',
      },
    ],
  },
  'uptime-sla-calculator': {
    title: 'Uptime SLA Calculator',
    metaTitle: 'Free Uptime SLA Calculator - Downtime and Availability Tool',
    metaDescription:
      'Calculate uptime percentage, downtime allowance, monthly SLA targets, availability from incident minutes, and hosting reliability impact.',
    description:
      'Convert uptime targets into allowed downtime and calculate real availability from incident minutes across monthly, quarterly, or yearly periods.',
    seoTitle: 'Free Uptime SLA Calculator',
    seoDescription:
      'Uptime targets are easier to understand when they are converted into minutes of downtime. This calculator helps hosting teams, SaaS founders, and website owners compare promised SLA numbers with real outages.',
    sections: [
      {
        title: 'Why uptime belongs next to analytics',
        body: 'A traffic drop is not always a marketing problem. Outages, partial downtime, DNS failures, and certificate issues can all reduce visits and conversions before a campaign has a chance to work.',
      },
      {
        title: 'Common SLA targets',
        body: '99% uptime allows much more downtime than 99.9%, and 99.99% is a different operating discipline again. Use the calculator to translate each target into monthly minutes.',
      },
    ],
    faq: [
      {
        question: 'How do you calculate uptime percentage?',
        answer:
          'Uptime percentage is calculated as available minutes divided by total minutes in the period, multiplied by 100.',
      },
      {
        question: 'How much downtime does 99.9% uptime allow?',
        answer:
          'In a 30 day month, 99.9% uptime allows about 43.2 minutes of downtime.',
      },
      {
        question: 'What is the difference between uptime and availability?',
        answer:
          'They are often used together. Uptime usually refers to whether the service is reachable, while availability can include whether critical functions are working correctly.',
      },
      {
        question: 'Can downtime affect SEO?',
        answer:
          'Short outages usually have limited SEO impact, but repeated or extended downtime can affect crawling, user signals, and revenue.',
      },
      {
        question: 'Can Swetrix help explain traffic drops?',
        answer:
          'Yes. Swetrix combines traffic, performance, errors, and alerts so you can connect reliability issues with user behavior.',
      },
    ],
  },
  'website-bandwidth-calculator': {
    title: 'Website Bandwidth Calculator',
    metaTitle:
      'Free Website Bandwidth Calculator - Estimate Hosting Traffic Usage',
    metaDescription:
      'Estimate monthly website bandwidth from visits, pages per visit, page weight, cache hit rate, and traffic growth. Useful for hosting, CDN, and analytics planning.',
    description:
      'Estimate monthly hosting bandwidth from visits, pages per visit, average page weight, cache hit rate, and expected traffic growth.',
    seoTitle: 'Free Website Bandwidth Calculator',
    seoDescription:
      'Bandwidth planning helps you choose hosting plans, estimate CDN usage, and understand how growth affects infrastructure cost. This calculator turns traffic assumptions into monthly GB and average Mbps estimates.',
    sections: [
      {
        title: 'How to estimate bandwidth',
        body: 'Monthly bandwidth depends on page views, transferred page weight, caching, and growth. Use real analytics data when available, then add a growth margin for campaigns or launches.',
      },
      {
        title: 'Why analytics data helps hosting decisions',
        body: 'Traffic volume, top pages, geography, and campaign spikes all influence bandwidth. Analytics helps you size hosting from actual behavior instead of rough guesses.',
      },
    ],
    faq: [
      {
        question: 'What is website bandwidth?',
        answer:
          'Website bandwidth is the amount of data transferred from your server or CDN to visitors over a period of time.',
      },
      {
        question: 'How do I find my average page weight?',
        answer:
          'Use a page size checker, browser devtools, or a performance audit. Include HTML, CSS, JavaScript, images, fonts, and other assets that load during a visit.',
      },
      {
        question: 'Does caching reduce bandwidth?',
        answer:
          'Yes. Browser and CDN caching can reduce repeated transfers, especially for static assets such as images, scripts, and stylesheets.',
      },
      {
        question: 'How much bandwidth do I need for 100,000 visits?',
        answer:
          'It depends on pages per visit and page weight. For example, 100,000 visits with 2 pages per visit and 1 MB transferred per page uses about 195 GB before caching adjustments.',
      },
      {
        question: 'Can Swetrix provide the traffic inputs?',
        answer:
          'Yes. Swetrix shows visits, page views, top pages, referrers, countries, and campaign data that help you estimate real bandwidth needs.',
      },
    ],
  },
}

const ISSUE_STYLES: Record<IssueLevel, string> = {
  good: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/25',
  warning:
    'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25',
  error:
    'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/25',
  info: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/25',
}

function IssueIcon({ level }: { level: IssueLevel }) {
  if (level === 'good') return <CheckCircleIcon className='size-4' />
  if (level === 'error') return <XCircleIcon className='size-4' />
  return <WarningCircleIcon className='size-4' />
}

function ResultPanel({ children }: { children: ReactNode }) {
  return (
    <div className='mt-8 rounded-lg bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
      {children}
    </div>
  )
}

function MetricGrid({
  items,
}: {
  items: Array<{ label: string; value: ReactNode; hint?: ReactNode }>
}) {
  return (
    <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
      {items.map((item) => (
        <div
          key={item.label}
          className='rounded-lg bg-gray-50 p-4 ring-1 ring-gray-200/80 dark:bg-slate-900 dark:ring-slate-800'
        >
          <Text
            as='p'
            size='xs'
            weight='medium'
            colour='muted'
            className='uppercase'
          >
            {item.label}
          </Text>
          <div className='mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white'>
            {item.value}
          </div>
          {item.hint ? (
            <Text as='p' size='xs' colour='muted' className='mt-1'>
              {item.hint}
            </Text>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function KeyValueList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode; mono?: boolean }>
}) {
  return (
    <dl className='divide-y divide-gray-100 border-y border-gray-100 dark:divide-slate-800 dark:border-slate-800'>
      {items.map((item) =>
        item.value === null ||
        item.value === undefined ||
        item.value === '' ? null : (
          <div
            key={item.label}
            className='grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-6'
          >
            <dt className='text-sm text-gray-500 dark:text-slate-400'>
              {item.label}
            </dt>
            <dd
              className={cn(
                'min-w-0 text-sm font-medium wrap-break-word text-slate-900 dark:text-white',
                item.mono && 'font-mono tabular-nums',
              )}
            >
              {item.value}
            </dd>
          </div>
        ),
      )}
    </dl>
  )
}

function IssueList({ issues }: { issues: Issue[] }) {
  if (!issues.length) return null

  return (
    <div className='mt-6 space-y-3'>
      {issues.map((issue, index) => (
        <div
          key={`${issue.message}-${index}`}
          className={cn(
            'flex gap-3 rounded-lg p-3 text-sm ring-1',
            ISSUE_STYLES[issue.level],
          )}
        >
          <span className='mt-0.5 shrink-0'>
            <IssueIcon level={issue.level} />
          </span>
          <div>
            <div className='font-medium'>{issue.message}</div>
            {issue.details ? (
              <div className='mt-0.5 opacity-85'>{issue.details}</div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function DataTable({
  columns,
  rows,
}: {
  columns: string[]
  rows: ReactNode[][]
}) {
  return (
    <div className='mt-5 overflow-hidden rounded-lg ring-1 ring-gray-200 dark:ring-slate-800'>
      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y divide-gray-200 text-sm dark:divide-slate-800'>
          <thead className='bg-gray-50 dark:bg-slate-900'>
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  scope='col'
                  className='px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-slate-400'
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100 bg-white dark:divide-slate-800 dark:bg-slate-950'>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className='max-w-[360px] px-4 py-3 align-top wrap-break-word text-slate-800 dark:text-slate-200'
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function mono(value: ReactNode) {
  return <span className='font-mono text-xs tabular-nums'>{value}</span>
}

function mutedCell(value: string) {
  return <span className='text-gray-400'>{value}</span>
}

function formatHostObject(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value !== 'object') return String(value)
  return Object.entries(value as Record<string, unknown>)
    .map(([key, entry]) => `${key}: ${String(entry)}`)
    .join(', ')
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function ServerTool({
  slug,
  config,
}: {
  slug: ServerToolSlug
  config: ToolContent
}) {
  const fetcher = useFetcher()
  const data = fetcher.data as ToolActionData | undefined
  const isLoading = fetcher.state !== 'idle'
  const [bulkUrls, setBulkUrls] = useState('')
  const [migrationPairs, setMigrationPairs] = useState('')

  return (
    <div className='mt-10'>
      <div className='rounded-lg bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
        {slug === 'robots-txt-tester' ? (
          <fetcher.Form method='post' className='grid gap-4 lg:grid-cols-3'>
            <Input
              name='robotsUrl'
              type='text'
              label='Website or robots.txt URL'
              placeholder='https://example.com'
              spellCheck={false}
              autoCapitalize='off'
              autoComplete='off'
              required
            />
            <Input
              name='path'
              type='text'
              label='Path to test'
              placeholder='/blog/post'
              defaultValue='/'
              spellCheck={false}
              autoCapitalize='off'
              autoComplete='off'
              required
            />
            <Input
              name='userAgent'
              type='text'
              label='User agent'
              placeholder='Googlebot'
              defaultValue='Googlebot'
              spellCheck={false}
              autoCapitalize='off'
              autoComplete='off'
              required
            />
            <div className='lg:col-span-3'>
              <Button type='submit' loading={isLoading} disabled={isLoading}>
                {isLoading ? null : (
                  <MagnifyingGlassIcon className='mr-1.5 size-4' />
                )}
                {config.buttonLabel}
              </Button>
            </div>
          </fetcher.Form>
        ) : slug === 'http-status-bulk-checker' ? (
          <fetcher.Form method='post' className='space-y-4'>
            <Textarea
              name='urls'
              label={config.inputLabel}
              placeholder={config.placeholder}
              rows={8}
              value={bulkUrls}
              onChange={(event) => setBulkUrls(event.target.value)}
              spellCheck={false}
              autoCapitalize='off'
              autoComplete='off'
              required
            />
            <Button type='submit' loading={isLoading} disabled={isLoading}>
              {isLoading ? null : (
                <MagnifyingGlassIcon className='mr-1.5 size-4' />
              )}
              {config.buttonLabel}
            </Button>
          </fetcher.Form>
        ) : slug === 'seo-migration-redirect-validator' ? (
          <fetcher.Form method='post' className='space-y-4'>
            <Textarea
              name='pairs'
              label={config.inputLabel}
              placeholder={config.placeholder}
              rows={8}
              value={migrationPairs}
              onChange={(event) => setMigrationPairs(event.target.value)}
              spellCheck={false}
              autoCapitalize='off'
              autoComplete='off'
              required
            />
            <Button type='submit' loading={isLoading} disabled={isLoading}>
              {isLoading ? null : (
                <MagnifyingGlassIcon className='mr-1.5 size-4' />
              )}
              {config.buttonLabel}
            </Button>
          </fetcher.Form>
        ) : (
          <fetcher.Form
            method='post'
            className='flex flex-col gap-3 sm:flex-row sm:items-end'
          >
            <Input
              name='value'
              type='text'
              label={config.inputLabel}
              placeholder={config.placeholder}
              className='sm:flex-1'
              spellCheck={false}
              autoCapitalize='off'
              autoComplete='off'
              required
            />
            <Button type='submit' loading={isLoading} disabled={isLoading}>
              {isLoading ? null : (
                <MagnifyingGlassIcon className='mr-1.5 size-4' />
              )}
              {config.buttonLabel}
            </Button>
          </fetcher.Form>
        )}
      </div>

      {data?.error ? (
        <div className='mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/25'>
          {data.error}
        </div>
      ) : null}

      {data?.result ? renderServerResult(slug, data.result) : null}

      {slug === 'csp-checker' ? <CspGenerator /> : null}
    </div>
  )
}

function renderServerResult(slug: ServerToolSlug, result: unknown) {
  if (slug === 'dns-lookup')
    return <DnsResultView result={result as DnsResult} />
  if (slug === 'http-headers-checker') {
    return <HeaderResultView result={result as HeaderResult} />
  }
  if (slug === 'ssl-certificate-checker') {
    return <SslResultView result={result as SslResult} />
  }
  if (slug === 'redirect-checker') {
    return <RedirectResultView result={result as RedirectResult} />
  }
  if (slug === 'cookie-checker')
    return <CookieResultView result={result as CookieResult} />
  if (slug === 'csp-checker')
    return <CspResultView result={result as CspResult} />
  if (slug === 'canonical-url-checker') {
    return <CanonicalResultView result={result as CanonicalResult} />
  }
  if (slug === 'page-size-checker') {
    return <PageSizeResultView result={result as PageSizeResult} />
  }
  if (slug === 'indexability-checker') {
    return <IndexabilityResultView result={result as IndexabilityResult} />
  }
  if (slug === 'robots-txt-tester') {
    return <RobotsTesterResultView result={result as RobotsTesterResult} />
  }
  if (slug === 'broken-link-checker') {
    return <BrokenLinkResultView result={result as BrokenLinkResult} />
  }
  if (slug === 'hreflang-checker') {
    return <HreflangResultView result={result as HreflangResult} />
  }
  if (slug === 'on-page-seo-checker') {
    return <OnPageSeoResultView result={result as OnPageSeoResult} />
  }
  if (slug === 'image-seo-checker') {
    return <ImageSeoResultView result={result as ImageSeoResult} />
  }
  if (slug === 'internal-link-analyzer') {
    return <InternalLinkResultView result={result as InternalLinkResult} />
  }
  if (slug === 'ai-search-llm-crawlability-checker') {
    return <AiCrawlabilityResultView result={result as AiCrawlabilityResult} />
  }
  if (slug === 'http-status-bulk-checker') {
    return <BulkStatusResultView result={result as BulkStatusResult} />
  }
  if (slug === 'seo-migration-redirect-validator') {
    return (
      <MigrationRedirectResultView result={result as MigrationRedirectResult} />
    )
  }
  return null
}

function DnsResultView({ result }: { result: DnsResult }) {
  return (
    <ResultPanel>
      <MetricGrid
        items={[
          { label: 'Domain', value: result.domain },
          { label: 'Records', value: result.records.length },
          { label: 'Types found', value: result.recordTypes.length },
          { label: 'DNS types', value: result.recordTypes.join(', ') },
        ]}
      />
      <DataTable
        columns={['Type', 'Value']}
        rows={result.records.map((record) => [
          mono(record.type),
          mono(record.value),
        ])}
      />
    </ResultPanel>
  )
}

function HeaderResultView({ result }: { result: HeaderResult }) {
  return (
    <ResultPanel>
      <MetricGrid
        items={[
          { label: 'Status', value: `${result.status} ${result.statusText}` },
          { label: 'Response time', value: `${result.responseTime} ms` },
          { label: 'Headers', value: result.allHeaders.length },
          { label: 'Final URL', value: result.finalUrl },
        ]}
      />
      <IssueList issues={result.issues} />
      <DataTable
        columns={['Header', 'Value']}
        rows={result.importantHeaders.map((header) => [
          mono(header.name),
          header.value ? mono(header.value) : mutedCell('Missing'),
        ])}
      />
    </ResultPanel>
  )
}

function SslResultView({ result }: { result: SslResult }) {
  const status = result.isExpired
    ? 'Expired'
    : result.expiresSoon
      ? 'Expires soon'
      : result.authorized
        ? 'Valid'
        : 'Needs review'

  return (
    <ResultPanel>
      <MetricGrid
        items={[
          { label: 'Host', value: result.host },
          { label: 'Status', value: status },
          { label: 'Days remaining', value: result.daysRemaining },
          { label: 'Authorized', value: result.authorized ? 'Yes' : 'No' },
        ]}
      />
      <div className='mt-6'>
        <KeyValueList
          items={[
            { label: 'Valid from', value: formatDate(result.validFrom) },
            { label: 'Valid to', value: formatDate(result.validTo) },
            { label: 'Subject', value: formatHostObject(result.subject) },
            { label: 'Issuer', value: formatHostObject(result.issuer) },
            {
              label: 'Subject alternative names',
              value: result.subjectAltName,
            },
            { label: 'Authorization error', value: result.authorizationError },
            { label: 'Serial number', value: result.serialNumber, mono: true },
            {
              label: 'SHA-256 fingerprint',
              value: result.fingerprint256,
              mono: true,
            },
          ]}
        />
      </div>
    </ResultPanel>
  )
}

function RedirectResultView({ result }: { result: RedirectResult }) {
  const issues: Issue[] = result.hasLoopRisk
    ? [
        {
          level: 'warning',
          message: 'Redirect chain reached the scan limit',
          details:
            'The URL may have a loop or a very long chain. Review the redirect rules on your host or CDN.',
        },
      ]
    : result.redirectCount > 2
      ? [
          {
            level: 'warning',
            message: 'Redirect chain is longer than ideal',
            details:
              'Shorter chains are faster and easier for crawlers to follow.',
          },
        ]
      : [
          {
            level: 'good',
            message: 'Redirect chain length looks reasonable',
            details:
              'The URL reached its final destination within a short chain.',
          },
        ]

  return (
    <ResultPanel>
      <MetricGrid
        items={[
          { label: 'Redirects', value: result.redirectCount },
          { label: 'Steps', value: result.chain.length },
          { label: 'Final URL', value: result.finalUrl },
          { label: 'Loop risk', value: result.hasLoopRisk ? 'Review' : 'No' },
        ]}
      />
      <IssueList issues={issues} />
      <DataTable
        columns={['Step', 'Status', 'URL', 'Next']}
        rows={result.chain.map((step, index) => [
          mono(index + 1),
          mono(`${step.status} ${step.statusText}`),
          mono(step.url),
          step.location ? mono(step.location) : mutedCell('Final'),
        ])}
      />
    </ResultPanel>
  )
}

function CookieResultView({ result }: { result: CookieResult }) {
  return (
    <ResultPanel>
      <MetricGrid
        items={[
          { label: 'Cookies', value: result.cookieCount },
          { label: 'Status', value: result.status },
          { label: 'Final URL', value: result.finalUrl },
          {
            label: 'Secure cookies',
            value: result.cookies.filter((cookie) => cookie.secure).length,
          },
        ]}
      />
      <IssueList issues={result.issues} />
      {result.cookies.length ? (
        <DataTable
          columns={[
            'Name',
            'Secure',
            'HttpOnly',
            'SameSite',
            'Domain',
            'Expires',
          ]}
          rows={result.cookies.map((cookie) => [
            mono(String(cookie.name || '')),
            cookie.secure ? 'Yes' : 'No',
            cookie.httpOnly ? 'Yes' : 'No',
            String(cookie.sameSite || 'Missing'),
            mono(String(cookie.domain || cookie.path || 'Host only')),
            cookie.expires || cookie.maxAge || 'Session',
          ])}
        />
      ) : null}
    </ResultPanel>
  )
}

function CspResultView({ result }: { result: CspResult }) {
  return (
    <ResultPanel>
      <MetricGrid
        items={[
          { label: 'Status', value: result.status },
          { label: 'CSP header', value: result.csp ? 'Present' : 'Missing' },
          {
            label: 'Directives',
            value: Object.keys(result.directives).length,
          },
          { label: 'Report only', value: result.reportOnly ? 'Yes' : 'No' },
        ]}
      />
      <IssueList issues={result.issues} />
      {result.csp ? (
        <div className='mt-6'>
          <Text as='h3' size='lg' weight='semibold' className='mb-3'>
            Policy header
          </Text>
          <CodeBlock code={`Content-Security-Policy: ${result.csp}`} />
        </div>
      ) : null}
      <DataTable
        columns={['Header', 'Value']}
        rows={Object.entries(result.securityHeaders).map(([name, value]) => [
          mono(name),
          value ? mono(value) : mutedCell('Missing'),
        ])}
      />
    </ResultPanel>
  )
}

function CanonicalResultView({ result }: { result: CanonicalResult }) {
  return (
    <ResultPanel>
      <MetricGrid
        items={[
          { label: 'Status', value: result.status },
          {
            label: 'Canonical',
            value: result.absoluteCanonical ? 'Present' : 'Missing',
          },
          { label: 'Robots', value: result.robots || 'Default' },
          { label: 'Final URL', value: result.finalUrl },
        ]}
      />
      <IssueList issues={result.issues} />
      <div className='mt-6'>
        <KeyValueList
          items={[
            { label: 'Title', value: result.title },
            { label: 'Description', value: result.description },
            { label: 'Canonical tag', value: result.canonical, mono: true },
            {
              label: 'Canonical resolved',
              value: result.absoluteCanonical,
              mono: true,
            },
            { label: 'Open Graph URL', value: result.ogUrl, mono: true },
            { label: 'Requested URL', value: result.requestedUrl, mono: true },
          ]}
        />
      </div>
    </ResultPanel>
  )
}

function PageSizeResultView({ result }: { result: PageSizeResult }) {
  return (
    <ResultPanel>
      <MetricGrid
        items={[
          { label: 'Known size', value: result.totalKnownSize },
          { label: 'HTML size', value: result.htmlSize },
          { label: 'Resources', value: result.resourceCount },
          { label: 'Scan time', value: `${result.scanTime} ms` },
        ]}
      />
      <IssueList issues={result.issues} />
      <DataTable
        columns={['Category', 'Resources', 'Known size']}
        rows={result.categories.map((category) => [
          category.category,
          mono(category.count),
          mono(category.size),
        ])}
      />
      {result.largestResources.length ? (
        <>
          <Text as='h3' size='lg' weight='semibold' className='mt-8'>
            Largest detected resources
          </Text>
          <DataTable
            columns={['Size', 'Type', 'URL']}
            rows={result.largestResources.map((resource) => [
              mono(resource.size),
              resource.category,
              mono(resource.url),
            ])}
          />
        </>
      ) : null}
    </ResultPanel>
  )
}

function statusValue(value: number | null) {
  return value === null ? 'Failed' : value
}

function yesNo(value: boolean) {
  return value ? 'Yes' : 'No'
}

function DownloadCsvButton({
  csv,
  filename,
}: {
  csv: string
  filename: string
}) {
  const download = () => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button type='button' variant='secondary' onClick={download}>
      <DownloadSimpleIcon className='mr-1.5 size-4' />
      Download CSV
    </Button>
  )
}

function IndexabilityResultView({ result }: { result: IndexabilityResult }) {
  return (
    <ResultPanel>
      <MetricGrid
        items={[
          { label: 'Verdict', value: result.indexability },
          { label: 'Status', value: result.status },
          {
            label: 'Robots.txt',
            value: result.robotsTxt.allowed ? 'Allowed' : 'Blocked',
          },
          {
            label: 'Canonical',
            value: result.absoluteCanonical ? 'Present' : 'Missing',
          },
        ]}
      />
      <IssueList issues={result.issues} />
      <div className='mt-6'>
        <KeyValueList
          items={[
            { label: 'Final URL', value: result.finalUrl, mono: true },
            { label: 'Title', value: result.title },
            { label: 'Description', value: result.description },
            { label: 'Meta robots', value: result.metaRobots || 'Default' },
            {
              label: 'X-Robots-Tag',
              value: result.xRobotsTag || 'Not set',
            },
            {
              label: 'Canonical tag',
              value: result.canonical,
              mono: true,
            },
            {
              label: 'Canonical resolved',
              value: result.absoluteCanonical,
              mono: true,
            },
            {
              label: 'Robots.txt URL',
              value: result.robotsTxt.url,
              mono: true,
            },
            {
              label: 'Robots matched rule',
              value: result.robotsTxt.matchedRule
                ? `${result.robotsTxt.matchedRule.directive}: ${result.robotsTxt.matchedRule.path}`
                : 'No matching block',
            },
            {
              label: 'Sitemap hint',
              value: result.sitemapHint,
              mono: true,
            },
          ]}
        />
      </div>
    </ResultPanel>
  )
}

function RobotsTesterResultView({ result }: { result: RobotsTesterResult }) {
  return (
    <ResultPanel>
      <MetricGrid
        items={[
          { label: 'Result', value: result.allowed ? 'Allowed' : 'Blocked' },
          { label: 'User agent', value: result.userAgent },
          { label: 'Path', value: result.path },
          { label: 'Sitemaps', value: result.sitemaps.length },
        ]}
      />
      <IssueList issues={result.issues} />
      <DataTable
        columns={['Crawler', 'Allowed', 'Matched rule', 'Group']}
        rows={result.tests.map((test) => [
          mono(test.userAgent),
          yesNo(test.allowed),
          test.matchedRule
            ? mono(`${test.matchedRule.directive}: ${test.matchedRule.path}`)
            : mutedCell('No rule'),
          test.groupAgents.length
            ? mono(test.groupAgents.join(', '))
            : mutedCell('Default allow'),
        ])}
      />
      {result.sitemaps.length ? (
        <div className='mt-6'>
          <Text as='h3' size='lg' weight='semibold'>
            Sitemap hints
          </Text>
          <DataTable
            columns={['Sitemap URL']}
            rows={result.sitemaps
              .slice(0, 10)
              .map((sitemap) => [mono(sitemap)])}
          />
        </div>
      ) : null}
    </ResultPanel>
  )
}

function BrokenLinkResultView({ result }: { result: BrokenLinkResult }) {
  return (
    <ResultPanel>
      <MetricGrid
        items={[
          { label: 'Checked', value: result.checkedLinks },
          { label: 'Broken', value: result.brokenCount },
          { label: 'Redirects', value: result.redirectCount },
          { label: 'Empty anchors', value: result.emptyAnchorCount },
        ]}
      />
      <IssueList issues={result.issues} />
      <DataTable
        columns={['Issue', 'Status', 'Type', 'Anchor', 'URL']}
        rows={result.links
          .filter((link) => link.issue !== 'OK')
          .concat(result.links.filter((link) => link.issue === 'OK'))
          .slice(0, 40)
          .map((link) => [
            link.issue,
            mono(statusValue(link.status)),
            link.kind,
            link.anchor || mutedCell('Empty'),
            mono(link.url),
          ])}
      />
      {result.invalidLinks.length ? (
        <>
          <Text as='h3' size='lg' weight='semibold' className='mt-8'>
            Invalid links
          </Text>
          <DataTable
            columns={['Issue', 'Href', 'Anchor']}
            rows={result.invalidLinks.map((link) => [
              link.issue,
              link.href ? mono(link.href) : mutedCell('Missing'),
              link.anchor || mutedCell('Empty'),
            ])}
          />
        </>
      ) : null}
    </ResultPanel>
  )
}

function HreflangResultView({ result }: { result: HreflangResult }) {
  return (
    <ResultPanel>
      <MetricGrid
        items={[
          { label: 'Hreflang tags', value: result.tags.length },
          { label: 'Invalid', value: result.invalidCount },
          { label: 'Duplicates', value: result.duplicateCount },
          {
            label: 'x-default',
            value: result.hasXDefault ? 'Present' : 'Missing',
          },
        ]}
      />
      <IssueList issues={result.issues} />
      {result.tags.length ? (
        <DataTable
          columns={['Hreflang', 'URL', 'Absolute']}
          rows={result.tags.map((tag) => [
            tag.hreflang ? mono(tag.hreflang) : mutedCell('Missing'),
            tag.absoluteUrl ? mono(tag.absoluteUrl) : mutedCell('Invalid URL'),
            yesNo(tag.isAbsolute),
          ])}
        />
      ) : null}
      {result.reciprocalChecks.length ? (
        <>
          <Text as='h3' size='lg' weight='semibold' className='mt-8'>
            Reciprocal checks
          </Text>
          <DataTable
            columns={['URL', 'Status', 'Return tag']}
            rows={result.reciprocalChecks.map((check) => [
              check.url ? mono(check.url) : mutedCell('Missing'),
              mono(statusValue(check.status)),
              check.error
                ? check.error
                : check.hasReturnTag
                  ? 'Found'
                  : 'Missing',
            ])}
          />
        </>
      ) : null}
    </ResultPanel>
  )
}

function OnPageSeoResultView({ result }: { result: OnPageSeoResult }) {
  return (
    <ResultPanel>
      <MetricGrid
        items={[
          { label: 'Words', value: result.wordCount },
          { label: 'H1 headings', value: result.h1.length },
          { label: 'Internal links', value: result.internalLinks },
          { label: 'Text to HTML', value: `${result.textHtmlRatio}%` },
        ]}
      />
      <IssueList issues={result.issues} />
      <div className='mt-6'>
        <KeyValueList
          items={[
            {
              label: 'Title',
              value: result.title
                ? `${result.title} (${result.titleLength} characters)`
                : null,
            },
            {
              label: 'Description',
              value: result.description
                ? `${result.description} (${result.descriptionLength} characters)`
                : null,
            },
            { label: 'Canonical', value: result.canonical, mono: true },
            { label: 'Robots', value: result.robots || 'Default' },
            {
              label: 'Images',
              value: `${result.imageCount} total, ${result.imagesMissingAlt} missing alt, ${result.imagesEmptyAlt} empty alt`,
            },
            {
              label: 'Links',
              value: `${result.internalLinks} internal, ${result.externalLinks} external`,
            },
            {
              label: 'Structured data',
              value: result.structuredDataCount,
            },
            { label: 'Open Graph tags', value: result.openGraphCount },
          ]}
        />
      </div>
      <div className='mt-8 grid gap-6 md:grid-cols-2'>
        <div>
          <Text as='h3' size='lg' weight='semibold'>
            H1 headings
          </Text>
          <DataTable
            columns={['Heading']}
            rows={
              result.h1.length
                ? result.h1.map((heading) => [heading])
                : [[mutedCell('No H1 found')]]
            }
          />
        </div>
        <div>
          <Text as='h3' size='lg' weight='semibold'>
            H2 sample
          </Text>
          <DataTable
            columns={['Heading']}
            rows={
              result.h2.length
                ? result.h2.map((heading) => [heading])
                : [[mutedCell('No H2 headings found')]]
            }
          />
        </div>
      </div>
    </ResultPanel>
  )
}

function ImageSeoResultView({ result }: { result: ImageSeoResult }) {
  return (
    <ResultPanel>
      <MetricGrid
        items={[
          { label: 'Images', value: result.imageCount },
          { label: 'Missing alt', value: result.missingAlt },
          { label: 'Large images', value: result.largeImages },
          { label: 'Lazy loaded', value: result.lazyImages },
        ]}
      />
      <IssueList issues={result.issues} />
      {result.images.length ? (
        <DataTable
          columns={['Size', 'Alt', 'Dimensions', 'Loading', 'Format', 'URL']}
          rows={result.images.map((image) => [
            mono(image.size),
            !image.hasAlt ? 'Missing' : image.alt ? image.alt : 'Empty alt',
            image.hasDimensions
              ? `${image.width} x ${image.height}`
              : 'Missing',
            image.loading || 'Default',
            image.format,
            image.src ? mono(image.src) : mutedCell('Missing source'),
          ])}
        />
      ) : null}
    </ResultPanel>
  )
}

function InternalLinkResultView({ result }: { result: InternalLinkResult }) {
  return (
    <ResultPanel>
      <MetricGrid
        items={[
          { label: 'Total links', value: result.totalLinks },
          { label: 'Internal', value: result.internalCount },
          { label: 'External', value: result.externalCount },
          { label: 'Empty anchors', value: result.emptyAnchorCount },
        ]}
      />
      <IssueList issues={result.issues} />
      <div className='mt-6'>
        <MetricGrid
          items={[
            { label: 'Nofollow', value: result.nofollowCount },
            { label: 'Sponsored', value: result.sponsoredCount },
            { label: 'UGC', value: result.ugcCount },
            {
              label: 'Non-page links',
              value:
                result.fragmentCount + result.mailtoCount + result.telCount,
              hint: `${result.fragmentCount} fragments, ${result.mailtoCount} mailto, ${result.telCount} tel`,
            },
          ]}
        />
      </div>
      <DataTable
        columns={['Type', 'Anchor', 'Rel', 'URL']}
        rows={result.links
          .slice(0, 50)
          .map((link) => [
            link.kind,
            link.isEmpty ? mutedCell('Empty') : link.anchor,
            link.rel || mutedCell('None'),
            mono(link.url),
          ])}
      />
      {result.duplicateAnchors.length ? (
        <>
          <Text as='h3' size='lg' weight='semibold' className='mt-8'>
            Duplicate anchor candidates
          </Text>
          <DataTable
            columns={['Anchor', 'Distinct URLs']}
            rows={result.duplicateAnchors.map((item) => [
              item.anchor,
              item.urls.map((url) => <div key={url}>{mono(url)}</div>),
            ])}
          />
        </>
      ) : null}
    </ResultPanel>
  )
}

function AiCrawlabilityResultView({
  result,
}: {
  result: AiCrawlabilityResult
}) {
  return (
    <ResultPanel>
      <MetricGrid
        items={[
          { label: 'Page status', value: result.status },
          {
            label: 'AI crawlers allowed',
            value: result.crawlerRules.filter((rule) => rule.allowed).length,
          },
          {
            label: 'llms.txt',
            value: result.llms.status === 200 ? 'Found' : 'Missing',
          },
          {
            label: 'Structured data',
            value: result.structuredDataCount,
          },
        ]}
      />
      <IssueList issues={result.issues} />
      <DataTable
        columns={['Crawler', 'Allowed', 'Matched rule']}
        rows={result.crawlerRules.map((rule) => [
          mono(rule.crawler),
          yesNo(rule.allowed),
          rule.matchedRule
            ? mono(`${rule.matchedRule.directive}: ${rule.matchedRule.path}`)
            : mutedCell('No rule'),
        ])}
      />
      <div className='mt-8'>
        <KeyValueList
          items={[
            { label: 'Robots.txt', value: result.robotsUrl, mono: true },
            {
              label: 'llms.txt',
              value: `${statusValue(result.llms.status)} ${result.llms.url}`,
              mono: true,
            },
            {
              label: 'llms-full.txt',
              value: `${statusValue(result.llmsFull.status)} ${result.llmsFull.url}`,
              mono: true,
            },
            {
              label: 'Sitemap',
              value: `${statusValue(result.sitemap.status)} ${result.sitemap.url}`,
              mono: true,
            },
            { label: 'Canonical', value: result.canonical, mono: true },
            { label: 'Title', value: result.title },
            { label: 'Description', value: result.description },
          ]}
        />
      </div>
    </ResultPanel>
  )
}

function BulkStatusResultView({ result }: { result: BulkStatusResult }) {
  return (
    <ResultPanel>
      <MetricGrid
        items={[
          { label: 'Checked', value: result.checked },
          { label: 'OK', value: result.ok },
          { label: 'Redirects', value: result.redirects },
          { label: 'Errors', value: result.errors },
        ]}
      />
      <IssueList issues={result.issues} />
      <DataTable
        columns={['Status', 'Issue', 'Redirects', 'Content type', 'Final URL']}
        rows={result.rows.map((row) => [
          mono(statusValue(row.status)),
          row.error || row.issue,
          mono(row.redirectCount),
          row.contentType || mutedCell('Unknown'),
          mono(row.finalUrl),
        ])}
      />
      <div className='mt-8 flex items-center justify-between gap-4'>
        <Text as='h3' size='lg' weight='semibold'>
          CSV output
        </Text>
        <DownloadCsvButton csv={result.csv} filename='http-statuses.csv' />
      </div>
      <CodeBlock code={result.csv} />
    </ResultPanel>
  )
}

function MigrationRedirectResultView({
  result,
}: {
  result: MigrationRedirectResult
}) {
  return (
    <ResultPanel>
      <MetricGrid
        items={[
          { label: 'Checked', value: result.checked },
          { label: 'Passed', value: result.passed },
          { label: 'Mismatches', value: result.mismatches },
          { label: 'Query drops', value: result.queryDrops },
        ]}
      />
      <IssueList issues={result.issues} />
      <DataTable
        columns={[
          'Result',
          'Status',
          'Chain',
          'Target match',
          'Query kept',
          'Old URL',
          'Final URL',
        ]}
        rows={result.rows.map((row) => [
          row.error || row.result,
          mono(statusValue(row.status)),
          mono(row.redirectCount),
          yesNo(row.finalMatches),
          yesNo(row.preservesQuery),
          mono(row.oldUrl),
          mono(row.finalUrl),
        ])}
      />
      <div className='mt-8 flex items-center justify-between gap-4'>
        <Text as='h3' size='lg' weight='semibold'>
          CSV output
        </Text>
        <DownloadCsvButton
          csv={result.csv}
          filename='migration-redirects.csv'
        />
      </div>
      <CodeBlock code={result.csv} />
    </ResultPanel>
  )
}

function CspGenerator() {
  const [allowSwetrix, setAllowSwetrix] = useState(true)
  const [allowImagesData, setAllowImagesData] = useState(true)
  const [allowInlineStyles, setAllowInlineStyles] = useState(false)
  const [allowFrames, setAllowFrames] = useState(false)

  const policy = useMemo(() => {
    const scriptSrc = ["'self'"]
    const connectSrc = ["'self'"]
    const imgSrc = ["'self'"]
    const styleSrc = ["'self'"]

    if (allowSwetrix) {
      scriptSrc.push('https://cdn.swetrix.com')
      connectSrc.push('https://api.swetrix.com')
    }

    if (allowImagesData) imgSrc.push('data:', 'https:')
    if (allowInlineStyles) styleSrc.push("'unsafe-inline'")

    return [
      "default-src 'self'",
      `script-src ${scriptSrc.join(' ')}`,
      `connect-src ${connectSrc.join(' ')}`,
      `img-src ${imgSrc.join(' ')}`,
      `style-src ${styleSrc.join(' ')}`,
      "font-src 'self' data:",
      `frame-ancestors ${allowFrames ? "'self'" : "'none'"}`,
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  }, [allowFrames, allowImagesData, allowInlineStyles, allowSwetrix])

  const toggles = [
    {
      label: 'Allow Swetrix analytics',
      checked: allowSwetrix,
      onChange: setAllowSwetrix,
    },
    {
      label: 'Allow HTTPS and data images',
      checked: allowImagesData,
      onChange: setAllowImagesData,
    },
    {
      label: 'Allow inline styles',
      checked: allowInlineStyles,
      onChange: setAllowInlineStyles,
    },
    {
      label: 'Allow same-site framing',
      checked: allowFrames,
      onChange: setAllowFrames,
    },
  ]

  return (
    <ResultPanel>
      <Text as='h2' size='xl' weight='semibold'>
        Starter CSP generator
      </Text>
      <div className='mt-4 grid gap-3 sm:grid-cols-2'>
        {toggles.map((toggle) => (
          <label
            key={toggle.label}
            className='flex items-center gap-3 rounded-lg bg-gray-50 p-3 text-sm font-medium text-slate-800 ring-1 ring-gray-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800'
          >
            <input
              type='checkbox'
              aria-label={toggle.label}
              checked={toggle.checked}
              onChange={(event) => toggle.onChange(event.target.checked)}
              className='size-4 rounded border-gray-300 text-slate-900 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-slate-300'
            />
            {toggle.label}
          </label>
        ))}
      </div>
      <div className='mt-5'>
        <CodeBlock code={`Content-Security-Policy: ${policy}`} />
      </div>
    </ResultPanel>
  )
}

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes)) return '0 minutes'
  if (minutes < 1) return `${Math.round(minutes * 60)} seconds`
  if (minutes < 60) return `${minutes.toFixed(1)} minutes`

  const hours = minutes / 60
  if (hours < 48) return `${hours.toFixed(2)} hours`

  return `${(hours / 24).toFixed(2)} days`
}

function UptimeSlaCalculator() {
  const [periodDays, setPeriodDays] = useState('30')
  const [targetSla, setTargetSla] = useState('99.9')
  const [downtimeMinutes, setDowntimeMinutes] = useState('30')

  const totalMinutes = parseFloat(periodDays || '0') * 24 * 60
  const target = parseFloat(targetSla || '0')
  const downtime = parseFloat(downtimeMinutes || '0')
  const allowedDowntime = totalMinutes * (1 - target / 100)
  const actualUptime =
    totalMinutes > 0 ? ((totalMinutes - downtime) / totalMinutes) * 100 : 0

  return (
    <div className='mt-10 rounded-lg bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
      <div className='grid gap-4 md:grid-cols-3'>
        <Input
          type='number'
          min='1'
          label='Period length'
          value={periodDays}
          onChange={(event) => setPeriodDays(event.target.value)}
          labelCorner={<span className='text-xs text-gray-500'>days</span>}
        />
        <Input
          type='number'
          step='0.001'
          min='0'
          max='100'
          label='Target SLA'
          value={targetSla}
          onChange={(event) => setTargetSla(event.target.value)}
          labelCorner={<span className='text-xs text-gray-500'>%</span>}
        />
        <Input
          type='number'
          min='0'
          step='0.1'
          label='Actual downtime'
          value={downtimeMinutes}
          onChange={(event) => setDowntimeMinutes(event.target.value)}
          labelCorner={<span className='text-xs text-gray-500'>minutes</span>}
        />
      </div>

      <div className='mt-6'>
        <MetricGrid
          items={[
            {
              label: 'Allowed downtime',
              value: formatDuration(Math.max(allowedDowntime, 0)),
              hint: `${target || 0}% over ${periodDays || 0} days`,
            },
            {
              label: 'Actual uptime',
              value: `${Math.max(actualUptime, 0).toFixed(4)}%`,
              hint: `${formatDuration(downtime || 0)} downtime`,
            },
            {
              label: 'Monthly equivalent',
              value: formatDuration(
                Math.max(
                  allowedDowntime * (30 / (parseFloat(periodDays) || 30)),
                  0,
                ),
              ),
              hint: 'Normalized to 30 days',
            },
            {
              label: 'SLA status',
              value:
                downtime <= allowedDowntime ? 'Within target' : 'Missed target',
              hint:
                downtime <= allowedDowntime
                  ? 'Actual downtime is inside allowance'
                  : 'Actual downtime exceeds allowance',
            },
          ]}
        />
      </div>
    </div>
  )
}

function WebsiteBandwidthCalculator() {
  const [visits, setVisits] = useState('100000')
  const [pagesPerVisit, setPagesPerVisit] = useState('2')
  const [pageWeight, setPageWeight] = useState('1')
  const [cacheHitRate, setCacheHitRate] = useState('35')
  const [growth, setGrowth] = useState('20')

  const monthlyVisits = parseFloat(visits || '0')
  const pages = parseFloat(pagesPerVisit || '0')
  const weightMb = parseFloat(pageWeight || '0')
  const cacheHit = Math.min(Math.max(parseFloat(cacheHitRate || '0'), 0), 100)
  const growthRate = parseFloat(growth || '0')
  const pageViews = monthlyVisits * pages
  const transferredMb = pageViews * weightMb * (1 - cacheHit / 100)
  const transferredGb = transferredMb / 1024
  const withGrowthGb = transferredGb * (1 + growthRate / 100)
  const dailyGb = withGrowthGb / 30
  const averageMbps = (withGrowthGb * 1024 * 8) / (30 * 24 * 60 * 60)

  return (
    <div className='mt-10 rounded-lg bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-5'>
        <Input
          type='number'
          min='0'
          label='Monthly visits'
          value={visits}
          onChange={(event) => setVisits(event.target.value)}
        />
        <Input
          type='number'
          min='0'
          step='0.1'
          label='Pages per visit'
          value={pagesPerVisit}
          onChange={(event) => setPagesPerVisit(event.target.value)}
        />
        <Input
          type='number'
          min='0'
          step='0.1'
          label='Page weight'
          value={pageWeight}
          onChange={(event) => setPageWeight(event.target.value)}
          labelCorner={<span className='text-xs text-gray-500'>MB</span>}
        />
        <Input
          type='number'
          min='0'
          max='100'
          label='Cache hit rate'
          value={cacheHitRate}
          onChange={(event) => setCacheHitRate(event.target.value)}
          labelCorner={<span className='text-xs text-gray-500'>%</span>}
        />
        <Input
          type='number'
          label='Growth buffer'
          value={growth}
          onChange={(event) => setGrowth(event.target.value)}
          labelCorner={<span className='text-xs text-gray-500'>%</span>}
        />
      </div>

      <div className='mt-6'>
        <MetricGrid
          items={[
            {
              label: 'Monthly bandwidth',
              value: `${withGrowthGb.toFixed(2)} GB`,
              hint: 'Including growth buffer',
            },
            {
              label: 'Before growth',
              value: `${transferredGb.toFixed(2)} GB`,
              hint: `${pageViews.toLocaleString()} page views`,
            },
            {
              label: 'Daily average',
              value: `${dailyGb.toFixed(2)} GB`,
              hint: '30 day month',
            },
            {
              label: 'Average throughput',
              value: `${averageMbps.toFixed(3)} Mbps`,
              hint: 'Traffic averaged over the month',
            },
          ]}
        />
      </div>
    </div>
  )
}

type SerpMode = 'desktop' | 'mobile'

function estimateSnippetPixels(value: string, base = 7.2) {
  return Array.from(value).reduce((total, character) => {
    if (character === ' ') return total + base * 0.45
    if (/[A-Z0-9]/.test(character)) return total + base * 1.08
    if (/[il.,'|]/.test(character)) return total + base * 0.45
    if (/[mw@#%&]/i.test(character)) return total + base * 1.35
    return total + base
  }, 0)
}

function buildSerpDisplayUrl(value: string) {
  try {
    const url = new URL(
      (value || 'https://example.com/page').startsWith('http')
        ? value || 'https://example.com/page'
        : `https://${value}`,
    )
    return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`
  } catch {
    return value || 'example.com/page'
  }
}

function SerpSnippetPreview() {
  const [title, setTitle] = useState('Privacy-first analytics for modern teams')
  const [description, setDescription] = useState(
    'Swetrix gives you cookieless website analytics, performance monitoring, error tracking, and privacy-friendly insights without Google Analytics.',
  )
  const [url, setUrl] = useState('https://swetrix.com')
  const [mode, setMode] = useState<SerpMode>('desktop')
  const titleLimit = mode === 'desktop' ? 580 : 430
  const descriptionLimit = mode === 'desktop' ? 920 : 680
  const titlePixels = estimateSnippetPixels(title, 9.2)
  const descriptionPixels = estimateSnippetPixels(description, 7.2)
  const issues: Issue[] = []

  if (!title.trim()) {
    issues.push({
      level: 'error',
      message: 'Title is empty',
      details: 'Search snippets need a clear title candidate.',
    })
  } else if (titlePixels > titleLimit || title.length > 65) {
    issues.push({
      level: 'warning',
      message: 'Title may truncate',
      details: `${title.length} characters, about ${Math.round(titlePixels)} px.`,
    })
  } else {
    issues.push({
      level: 'good',
      message: 'Title length looks usable',
      details: `${title.length} characters, about ${Math.round(titlePixels)} px.`,
    })
  }

  if (!description.trim()) {
    issues.push({
      level: 'warning',
      message: 'Description is empty',
      details: 'Google may choose page text when no meta description exists.',
    })
  } else if (descriptionPixels > descriptionLimit || description.length > 165) {
    issues.push({
      level: 'warning',
      message: 'Description may truncate',
      details: `${description.length} characters, about ${Math.round(descriptionPixels)} px.`,
    })
  } else {
    issues.push({
      level: 'good',
      message: 'Description length looks usable',
      details: `${description.length} characters, about ${Math.round(descriptionPixels)} px.`,
    })
  }

  return (
    <div className='mt-10 space-y-8'>
      <div className='rounded-lg bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
        <div className='grid gap-4 lg:grid-cols-[1fr_1fr]'>
          <Input
            label='SEO title'
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            spellCheck={false}
          />
          <Input
            label='URL'
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            spellCheck={false}
            autoCapitalize='off'
          />
          <Textarea
            label='Meta description'
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            classes={{ container: 'lg:col-span-2' }}
          />
        </div>
        <div className='mt-5 inline-flex rounded-lg bg-gray-100 p-1 ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800'>
          {(['desktop', 'mobile'] as const).map((item) => (
            <button
              key={item}
              type='button'
              onClick={() => setMode(item)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                mode === item
                  ? 'bg-white text-slate-900 ring-1 ring-gray-200 dark:bg-slate-950 dark:text-white dark:ring-slate-700'
                  : 'text-gray-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
              )}
            >
              {item === 'desktop' ? 'Desktop' : 'Mobile'}
            </button>
          ))}
        </div>
      </div>

      <ResultPanel>
        <MetricGrid
          items={[
            {
              label: 'Title width',
              value: `${Math.round(titlePixels)} px`,
              hint: `${Math.round(titleLimit)} px guide`,
            },
            {
              label: 'Title characters',
              value: title.length,
              hint: '50 to 60 is often comfortable',
            },
            {
              label: 'Description width',
              value: `${Math.round(descriptionPixels)} px`,
              hint: `${Math.round(descriptionLimit)} px guide`,
            },
            {
              label: 'Description characters',
              value: description.length,
              hint: '140 to 160 is often comfortable',
            },
          ]}
        />
        <IssueList issues={issues} />
        <div
          className={cn(
            'mt-8 rounded-lg bg-white p-5 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800',
            mode === 'mobile' ? 'max-w-[430px]' : 'max-w-[640px]',
          )}
        >
          <div className='truncate text-sm text-gray-600 dark:text-gray-400'>
            {buildSerpDisplayUrl(url)}
          </div>
          <div className='mt-1 line-clamp-2 text-xl leading-snug text-blue-700 dark:text-blue-400'>
            {title || 'Page title'}
          </div>
          <div className='mt-1 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400'>
            {description ||
              'Meta description preview appears here when you enter one.'}
          </div>
        </div>
      </ResultPanel>
    </div>
  )
}

interface GscRow {
  query: string
  page: string
  date: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

interface GscGroup {
  key: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  pages: Set<string>
}

interface GscAnalysis {
  rowCount: number
  totalClicks: number
  totalImpressions: number
  averageCtr: number
  averagePosition: number
  issues: Issue[]
  highImpressionLowCtr: GscGroup[]
  quickWins: GscGroup[]
  cannibalization: Array<{
    query: string
    pages: string[]
    impressions: number
    clicks: number
  }>
  decliningPages: Array<{
    page: string
    previousClicks: number
    recentClicks: number
    change: number
  }>
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const next = text[index + 1]

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
      row.push(current)
      current = ''
      continue
    }

    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1
      row.push(current)
      if (row.some((cell) => cell.trim())) rows.push(row)
      row = []
      current = ''
      continue
    }

    current += character
  }

  row.push(current)
  if (row.some((cell) => cell.trim())) rows.push(row)
  return rows
}

function parseGscNumber(value: string) {
  const cleaned = value.replace(/[%,$\s]/g, '').replace(/,/g, '')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeGscHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, '')
}

function findColumn(headers: string[], names: string[]) {
  const normalized = headers.map(normalizeGscHeader)
  return normalized.findIndex((header) =>
    names.map(normalizeGscHeader).includes(header),
  )
}

function aggregateGscRows(rows: GscRow[], getKey: (row: GscRow) => string) {
  const groups = new Map<string, GscGroup>()

  for (const row of rows) {
    const key = getKey(row)
    if (!key) continue

    const group =
      groups.get(key) ||
      ({
        key,
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0,
        pages: new Set<string>(),
      } satisfies GscGroup)

    group.clicks += row.clicks
    group.impressions += row.impressions
    group.position += row.position * row.impressions
    if (row.page) group.pages.add(row.page)
    groups.set(key, group)
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    ctr: group.impressions ? (group.clicks / group.impressions) * 100 : 0,
    position: group.impressions ? group.position / group.impressions : 0,
  }))
}

function analyzeGscCsv(text: string): GscAnalysis {
  const table = parseCsvRows(text)
  if (table.length < 2) throw new Error('The CSV does not contain data rows')

  const headers = table[0]
  const queryIndex = findColumn(headers, ['query', 'queries'])
  const pageIndex = findColumn(headers, ['page', 'pages', 'url', 'landingpage'])
  const dateIndex = findColumn(headers, ['date'])
  const clicksIndex = findColumn(headers, ['clicks'])
  const impressionsIndex = findColumn(headers, ['impressions'])
  const ctrIndex = findColumn(headers, ['ctr'])
  const positionIndex = findColumn(headers, ['position', 'avgposition'])

  if (clicksIndex === -1 || impressionsIndex === -1 || positionIndex === -1) {
    throw new Error(
      'CSV must include clicks, impressions, and position columns',
    )
  }

  const rows = table.slice(1).map((cells) => {
    const impressions = parseGscNumber(cells[impressionsIndex] || '0')
    const clicks = parseGscNumber(cells[clicksIndex] || '0')
    const rawCtr = ctrIndex === -1 ? 0 : parseGscNumber(cells[ctrIndex] || '0')

    return {
      query: queryIndex === -1 ? '' : (cells[queryIndex] || '').trim(),
      page: pageIndex === -1 ? '' : (cells[pageIndex] || '').trim(),
      date: dateIndex === -1 ? '' : (cells[dateIndex] || '').trim(),
      clicks,
      impressions,
      ctr: rawCtr > 1 ? rawCtr : rawCtr * 100,
      position: parseGscNumber(cells[positionIndex] || '0'),
    }
  })

  const usableRows = rows.filter((row) => row.impressions > 0)
  if (!usableRows.length) throw new Error('No rows with impressions were found')

  const totalClicks = usableRows.reduce((total, row) => total + row.clicks, 0)
  const totalImpressions = usableRows.reduce(
    (total, row) => total + row.impressions,
    0,
  )
  const averagePosition =
    usableRows.reduce(
      (total, row) => total + row.position * row.impressions,
      0,
    ) / totalImpressions
  const primaryGroups = aggregateGscRows(
    usableRows,
    queryIndex !== -1 ? (row) => row.query : (row) => row.page,
  )
  const threshold = Math.max(100, totalImpressions * 0.002)
  const highImpressionLowCtr = primaryGroups
    .filter((group) => group.impressions >= threshold && group.ctr < 2.5)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 12)
  const quickWins = primaryGroups
    .filter(
      (group) =>
        group.impressions >= threshold &&
        group.position >= 4 &&
        group.position <= 20,
    )
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 12)
  const cannibalization =
    queryIndex === -1 || pageIndex === -1
      ? []
      : aggregateGscRows(usableRows, (row) => row.query)
          .filter(
            (group) => group.pages.size > 1 && group.impressions >= threshold,
          )
          .sort((a, b) => b.impressions - a.impressions)
          .slice(0, 10)
          .map((group) => ({
            query: group.key,
            pages: Array.from(group.pages).slice(0, 5),
            impressions: group.impressions,
            clicks: group.clicks,
          }))
  const decliningPages =
    dateIndex === -1 || pageIndex === -1
      ? []
      : getDecliningPages(usableRows).slice(0, 10)
  const issues: Issue[] = []

  if (highImpressionLowCtr.length) {
    issues.push({
      level: 'warning',
      message: `${highImpressionLowCtr.length} low-CTR opportunity row(s)`,
      details: 'Review titles, descriptions, and search intent alignment.',
    })
  }

  if (quickWins.length) {
    issues.push({
      level: 'good',
      message: `${quickWins.length} ranking quick win(s) found`,
      details:
        'These rows already have impressions and positions in striking distance.',
    })
  }

  if (cannibalization.length) {
    issues.push({
      level: 'info',
      message: `${cannibalization.length} cannibalization candidate(s)`,
      details: 'Multiple pages receive impressions for the same query.',
    })
  }

  if (decliningPages.length) {
    issues.push({
      level: 'warning',
      message: `${decliningPages.length} declining page(s) found`,
      details:
        'Recent clicks are down compared with earlier dates in the export.',
    })
  }

  if (!issues.length) {
    issues.push({
      level: 'good',
      message: 'No obvious priority issues found',
      details:
        'The export did not show clear low-CTR, decline, or cannibalization patterns.',
    })
  }

  return {
    rowCount: usableRows.length,
    totalClicks,
    totalImpressions,
    averageCtr: totalImpressions ? (totalClicks / totalImpressions) * 100 : 0,
    averagePosition,
    issues,
    highImpressionLowCtr,
    quickWins,
    cannibalization,
    decliningPages,
  }
}

function getDecliningPages(rows: GscRow[]) {
  const dates = Array.from(
    new Set(rows.map((row) => row.date).filter(Boolean)),
  ).sort()
  if (dates.length < 2) return []

  const midpoint = Math.floor(dates.length / 2)
  const earlier = new Set(dates.slice(0, midpoint))
  const later = new Set(dates.slice(midpoint))
  const pages = new Map<
    string,
    { previousClicks: number; recentClicks: number }
  >()

  for (const row of rows) {
    if (!row.page) continue

    const current = pages.get(row.page) || {
      previousClicks: 0,
      recentClicks: 0,
    }
    if (earlier.has(row.date)) current.previousClicks += row.clicks
    if (later.has(row.date)) current.recentClicks += row.clicks
    pages.set(row.page, current)
  }

  return Array.from(pages.entries())
    .map(([page, value]) => ({
      page,
      previousClicks: value.previousClicks,
      recentClicks: value.recentClicks,
      change:
        value.previousClicks > 0
          ? ((value.recentClicks - value.previousClicks) /
              value.previousClicks) *
            100
          : 0,
    }))
    .filter((row) => row.previousClicks >= 5 && row.change <= -20)
    .sort((a, b) => a.change - b.change)
}

function GscExportAnalyzer() {
  const { t } = useTranslation('common')
  const [analysis, setAnalysis] = useState<GscAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')

  const handleFile = async (file: File | undefined) => {
    setError(null)
    setAnalysis(null)

    if (!file) return

    try {
      const text = await file.text()
      setFileName(file.name)
      setAnalysis(analyzeGscCsv(text))
    } catch (err) {
      setError(getClientErrorMessage(err))
    }
  }

  return (
    <div className='mt-10 space-y-8'>
      <div className='rounded-lg bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
        <label className='block'>
          <Text as='span' size='sm' weight='medium'>
            Google Search Console CSV
          </Text>
          <input
            type='file'
            aria-label={t('ariaLabels.googleSearchConsoleCsv')}
            accept='.csv,text/csv'
            onChange={(event) => handleFile(event.target.files?.[0])}
            className='mt-2 block w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 ring-1 ring-gray-300 transition-shadow duration-150 ease-out ring-inset file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-900 hover:ring-gray-400 focus:ring-2 focus:ring-slate-900 focus:outline-hidden dark:bg-slate-950 dark:text-gray-50 dark:ring-slate-700/80 dark:file:bg-slate-800 dark:file:text-slate-100 dark:hover:ring-slate-600 dark:focus:ring-slate-300'
          />
        </label>
        {fileName ? (
          <Text as='p' size='sm' colour='muted' className='mt-3'>
            Loaded {fileName}
          </Text>
        ) : null}
      </div>

      {error ? (
        <div className='rounded-lg bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/25'>
          {error}
        </div>
      ) : null}

      {analysis ? <GscAnalysisResult analysis={analysis} /> : null}
    </div>
  )
}

function getClientErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Unexpected error'
}

function GscAnalysisResult({ analysis }: { analysis: GscAnalysis }) {
  return (
    <ResultPanel>
      <MetricGrid
        items={[
          { label: 'Rows', value: analysis.rowCount.toLocaleString() },
          { label: 'Clicks', value: analysis.totalClicks.toLocaleString() },
          {
            label: 'Impressions',
            value: analysis.totalImpressions.toLocaleString(),
          },
          {
            label: 'Average CTR',
            value: `${analysis.averageCtr.toFixed(2)}%`,
            hint: `Average position ${analysis.averagePosition.toFixed(1)}`,
          },
        ]}
      />
      <IssueList issues={analysis.issues} />
      <GscGroupTable
        title='High-impression low-CTR opportunities'
        rows={analysis.highImpressionLowCtr}
      />
      <GscGroupTable title='Quick-win rankings' rows={analysis.quickWins} />
      {analysis.cannibalization.length ? (
        <>
          <Text as='h3' size='lg' weight='semibold' className='mt-8'>
            Cannibalization candidates
          </Text>
          <DataTable
            columns={['Query', 'Impressions', 'Clicks', 'Pages']}
            rows={analysis.cannibalization.map((item) => [
              item.query,
              mono(item.impressions.toLocaleString()),
              mono(item.clicks.toLocaleString()),
              item.pages.map((page) => <div key={page}>{mono(page)}</div>),
            ])}
          />
        </>
      ) : null}
      {analysis.decliningPages.length ? (
        <>
          <Text as='h3' size='lg' weight='semibold' className='mt-8'>
            Declining pages
          </Text>
          <DataTable
            columns={['Page', 'Previous clicks', 'Recent clicks', 'Change']}
            rows={analysis.decliningPages.map((item) => [
              mono(item.page),
              mono(item.previousClicks.toLocaleString()),
              mono(item.recentClicks.toLocaleString()),
              mono(`${item.change.toFixed(1)}%`),
            ])}
          />
        </>
      ) : null}
    </ResultPanel>
  )
}

function GscGroupTable({ title, rows }: { title: string; rows: GscGroup[] }) {
  if (!rows.length) return null

  return (
    <>
      <Text as='h3' size='lg' weight='semibold' className='mt-8'>
        {title}
      </Text>
      <DataTable
        columns={['Query or page', 'Impressions', 'Clicks', 'CTR', 'Position']}
        rows={rows.map((row) => [
          row.key,
          mono(row.impressions.toLocaleString()),
          mono(row.clicks.toLocaleString()),
          mono(`${row.ctr.toFixed(2)}%`),
          mono(row.position.toFixed(1)),
        ])}
      />
    </>
  )
}

function ToolInteractive({ slug }: { slug: TechnicalToolSlug }) {
  if (slug === 'uptime-sla-calculator') return <UptimeSlaCalculator />
  if (slug === 'website-bandwidth-calculator') {
    return <WebsiteBandwidthCalculator />
  }
  if (slug === 'serp-snippet-preview') return <SerpSnippetPreview />
  if (slug === 'gsc-export-analyzer') return <GscExportAnalyzer />

  return <ServerTool slug={slug} config={TOOL_CONTENT[slug]} />
}

function TechnicalToolPage({ slug }: { slug: TechnicalToolSlug }) {
  const config = TOOL_CONTENT[slug]

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-950'>
      <main className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <ToolsNavMobile className='mb-6 lg:hidden' />

        <div className='lg:flex lg:items-start lg:gap-8'>
          <div className='min-w-0 lg:flex-1'>
            <Text as='h1' size='4xl' weight='bold' tracking='tight'>
              {config.title}
            </Text>
            <Text as='p' size='lg' colour='muted' className='mt-4 max-w-3xl'>
              {config.description}
            </Text>

            <ToolInteractive slug={slug} />

            <section className='mt-20 border-t border-gray-200 pt-16 dark:border-slate-700'>
              <Text as='h2' size='3xl' weight='bold' tracking='tight'>
                {config.seoTitle}
              </Text>
              <Text
                as='p'
                size='lg'
                colour='muted'
                className='mt-4 leading-relaxed'
              >
                {config.seoDescription}
              </Text>

              <div className='mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2'>
                {config.sections.map((section) => (
                  <div key={section.title}>
                    <Text as='h3' size='xl' weight='semibold'>
                      {section.title}
                    </Text>
                    <Text as='p' colour='muted' className='mt-3'>
                      {section.body}
                    </Text>
                    {section.items?.length ? (
                      <ul className='mt-4 space-y-2'>
                        {section.items.map((item) => (
                          <li key={item}>
                            <Text colour='muted'>- {item}</Text>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <div className='mt-16'>
              <Text
                as='h2'
                size='3xl'
                weight='bold'
                className='mb-8 text-center'
              >
                Frequently Asked Questions
              </Text>
              <FAQ items={config.faq} withStructuredData />
            </div>

            <DitchGoogle />
          </div>

          <aside className='hidden lg:sticky lg:top-12 lg:block lg:w-64 lg:shrink-0 lg:self-start'>
            <ToolsNav />
          </aside>
        </div>
      </main>
    </div>
  )
}

export function createTechnicalToolRoute(slug: TechnicalToolSlug) {
  const config = TOOL_CONTENT[slug]

  const meta: MetaFunction = () => [
    ...getTitle(config.metaTitle),
    ...getDescription(config.metaDescription),
    ...getPreviewImage(getOgImageUrl(config.metaTitle, config.metaDescription)),
  ]

  const sitemap: SitemapFunction = () => ({
    priority: 0.8,
    exclude: isSelfhosted,
  })

  async function loader() {
    if (isSelfhosted) {
      return redirect('/login', 302)
    }

    return null
  }

  function Component() {
    return <TechnicalToolPage slug={slug} />
  }

  return {
    meta,
    sitemap,
    loader,
    Component,
  }
}
