import {
  CheckCircleIcon,
  MagnifyingGlassIcon,
  WarningCircleIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import { useMemo, useState, type ReactNode } from 'react'
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

type CalculatorToolSlug =
  | 'uptime-sla-calculator'
  | 'website-bandwidth-calculator'

type TechnicalToolSlug = ServerToolSlug | CalculatorToolSlug

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

  return (
    <div className='mt-10'>
      <div className='rounded-lg bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
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

function ToolInteractive({ slug }: { slug: TechnicalToolSlug }) {
  if (slug === 'uptime-sla-calculator') return <UptimeSlaCalculator />
  if (slug === 'website-bandwidth-calculator') {
    return <WebsiteBandwidthCalculator />
  }

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
