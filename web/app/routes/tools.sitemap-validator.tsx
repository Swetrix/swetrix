import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/solid'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { useState } from 'react'
import { redirect, useFetcher } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import { ToolsNav, ToolsNavMobile } from '~/components/ToolsNav'
import { isSelfhosted } from '~/lib/constants'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import { Text } from '~/ui/Text'
import Spin from '~/ui/icons/Spin'

export const sitemap: SitemapFunction = () => ({
  priority: 0.8,
  exclude: isSelfhosted,
})

export async function loader() {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  return null
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info'
  message: string
  details?: string
}

interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: string
  priority?: string
}

interface ValidationResult {
  isValid: boolean
  url: string
  encoding: string | null
  urlCount: number
  issues: ValidationIssue[]
  urls: SitemapUrl[]
  sitemapIndex: boolean
  sitemaps?: string[]
  fetchTime: number
  contentLength: number | null
}

const VALID_CHANGEFREQ = [
  'always',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'never',
]

function extractEncoding(
  contentType: string | null,
  xmlContent: string,
): string {
  if (contentType) {
    const match = contentType.match(/charset=([^;]+)/i)
    if (match) return match[1].trim().toUpperCase()
  }

  const xmlDeclMatch = xmlContent.match(/<\?xml[^>]*encoding=["']([^"']+)["']/i)
  if (xmlDeclMatch) return xmlDeclMatch[1].toUpperCase()

  return 'UTF-8'
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

function parseXml(xmlString: string): Record<string, unknown> | null {
  const validationResult = XMLValidator.validate(xmlString)
  if (validationResult !== true) {
    return null
  }

  try {
    const parser = new XMLParser({
      ignoreAttributes: true,
      ignoreDeclaration: true,
      trimValues: true,
    })

    return parser.parse(xmlString)
  } catch {
    return null
  }
}

function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function getText(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && '#text' in value) {
    const textValue = (value as { '#text'?: unknown })['#text']
    if (typeof textValue === 'string') return textValue.trim()
    if (typeof textValue === 'number') return String(textValue)
  }
  return undefined
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData()
  const sitemapUrl = formData.get('url') as string | null

  if (!sitemapUrl) {
    return {
      error: 'Please provide a sitemap URL',
      result: null,
    }
  }

  let normalizedUrl = sitemapUrl.trim()
  if (
    !normalizedUrl.startsWith('http://') &&
    !normalizedUrl.startsWith('https://')
  ) {
    normalizedUrl = `https://${normalizedUrl}`
  }

  if (!isValidUrl(normalizedUrl)) {
    return {
      error: 'Please provide a valid URL',
      result: null,
    }
  }

  const issues: ValidationIssue[] = []
  const startTime = Date.now()

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Swetrix-Sitemap-Validator/1.0',
        Accept: 'application/xml, text/xml, */*',
      },
    })

    clearTimeout(timeoutId)

    const fetchTime = Date.now() - startTime

    if (!response.ok) {
      return {
        error: `Failed to fetch sitemap: HTTP ${response.status} ${response.statusText}`,
        result: null,
      }
    }

    const contentType = response.headers.get('content-type')
    const contentLength = response.headers.get('content-length')
    const xmlContent = await response.text()

    const encoding = extractEncoding(contentType, xmlContent)

    if (!contentType?.includes('xml') && !contentType?.includes('text/plain')) {
      issues.push({
        type: 'warning',
        message: 'Content-Type header is not XML',
        details: `Expected application/xml or text/xml, got: ${contentType}`,
      })
    }

    if (!xmlContent.trim().startsWith('<?xml')) {
      issues.push({
        type: 'warning',
        message: 'Missing XML declaration',
        details:
          'Sitemap should start with <?xml version="1.0" encoding="UTF-8"?>',
      })
    }

    const parsedXml = parseXml(xmlContent)

    if (!parsedXml) {
      issues.push({
        type: 'error',
        message: 'Invalid XML structure',
        details: 'The sitemap contains malformed XML that could not be parsed',
      })

      return {
        error: null,
        result: {
          isValid: false,
          url: normalizedUrl,
          encoding,
          urlCount: 0,
          issues,
          urls: [],
          sitemapIndex: false,
          fetchTime,
          contentLength: contentLength
            ? parseInt(contentLength, 10)
            : xmlContent.length,
        } as ValidationResult,
      }
    }

    const sitemapIndex =
      (parsedXml as { sitemapindex?: unknown }).sitemapindex ?? null
    const urlset = (parsedXml as { urlset?: unknown }).urlset ?? null

    if (!sitemapIndex && !urlset) {
      issues.push({
        type: 'error',
        message: 'Invalid sitemap root element',
        details:
          'Sitemap must have either <urlset> or <sitemapindex> as root element',
      })

      return {
        error: null,
        result: {
          isValid: false,
          url: normalizedUrl,
          encoding,
          urlCount: 0,
          issues,
          urls: [],
          sitemapIndex: false,
          fetchTime,
          contentLength: contentLength
            ? parseInt(contentLength, 10)
            : xmlContent.length,
        } as ValidationResult,
      }
    }

    let urls: SitemapUrl[] = []
    let sitemaps: string[] = []
    let urlCount = 0

    if (sitemapIndex) {
      const sitemapElements = normalizeArray(
        (sitemapIndex as { sitemap?: unknown }).sitemap as
          | Record<string, unknown>
          | Record<string, unknown>[]
          | undefined,
      )

      if (sitemapElements.length === 0) {
        issues.push({
          type: 'error',
          message: 'Sitemap index contains no sitemaps',
          details:
            'A sitemap index should contain at least one <sitemap> element',
        })
      }

      sitemapElements.forEach((sitemap, index) => {
        const loc = getText(
          (sitemap as { loc?: unknown; '#text'?: unknown }).loc,
        )

        if (!loc) {
          issues.push({
            type: 'error',
            message: `Sitemap #${index + 1} missing <loc> element`,
            details:
              'Each sitemap entry must have a <loc> element with the sitemap URL',
          })
        } else {
          if (!isValidUrl(loc)) {
            issues.push({
              type: 'error',
              message: `Invalid URL in sitemap #${index + 1}`,
              details: `URL: ${loc}`,
            })
          } else {
            sitemaps.push(loc)
          }
        }
      })

      if (sitemapElements.length > 50000) {
        issues.push({
          type: 'error',
          message: 'Sitemap index exceeds maximum limit',
          details: `Contains ${sitemapElements.length} sitemaps (max 50,000)`,
        })
      }

      issues.push({
        type: 'info',
        message: 'This is a sitemap index file',
        details: `Contains ${sitemaps.length} sitemap reference(s)`,
      })
    }

    if (urlset) {
      const urlElements = normalizeArray(
        (urlset as { url?: unknown }).url as
          | Record<string, unknown>
          | Record<string, unknown>[]
          | undefined,
      )
      const seenUrls = new Set<string>()
      urlCount = urlElements.length

      if (urlElements.length === 0) {
        issues.push({
          type: 'warning',
          message: 'Sitemap contains no URLs',
          details: 'A sitemap should contain at least one <url> element',
        })
      }

      if (urlElements.length > 50000) {
        issues.push({
          type: 'error',
          message: 'Sitemap exceeds maximum URL limit',
          details: `Contains ${urlElements.length} URLs (max 50,000)`,
        })
      }

      urlElements.forEach((urlElement, index) => {
        const loc = getText((urlElement as { loc?: unknown }).loc)
        const lastmod = getText((urlElement as { lastmod?: unknown }).lastmod)
        const changefreq = getText(
          (urlElement as { changefreq?: unknown }).changefreq,
        )
        const priority = getText(
          (urlElement as { priority?: unknown }).priority,
        )

        if (!loc) {
          issues.push({
            type: 'error',
            message: `URL #${index + 1} missing <loc> element`,
            details: 'Each <url> must have a <loc> element',
          })
          return
        }

        if (!isValidUrl(loc)) {
          issues.push({
            type: 'error',
            message: `Invalid URL format at position #${index + 1}`,
            details: `URL: ${loc}`,
          })
        }

        if (seenUrls.has(loc)) {
          issues.push({
            type: 'warning',
            message: 'Duplicate URL found',
            details: `URL: ${loc}`,
          })
        } else {
          seenUrls.add(loc)
        }

        if (lastmod) {
          const isoDateRegex =
            /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)?)?$/
          if (!isoDateRegex.test(lastmod)) {
            issues.push({
              type: 'warning',
              message: `Invalid lastmod format at URL #${index + 1}`,
              details: `Expected W3C datetime format (YYYY-MM-DD), got: ${lastmod}`,
            })
          }
        }

        if (
          changefreq &&
          !VALID_CHANGEFREQ.includes(changefreq.toLowerCase())
        ) {
          issues.push({
            type: 'warning',
            message: `Invalid changefreq value at URL #${index + 1}`,
            details: `Expected one of: ${VALID_CHANGEFREQ.join(', ')}, got: ${changefreq}`,
          })
        }

        if (priority) {
          const priorityNum = parseFloat(priority)
          if (isNaN(priorityNum) || priorityNum < 0 || priorityNum > 1) {
            issues.push({
              type: 'warning',
              message: `Invalid priority value at URL #${index + 1}`,
              details: `Expected value between 0.0 and 1.0, got: ${priority}`,
            })
          }
        }

        if (urls.length < 100) {
          urls.push({ loc, lastmod, changefreq, priority })
        }
      })

      if (urlElements.length > 100) {
        issues.push({
          type: 'info',
          message: 'URL preview limited',
          details: `Showing first 100 of ${urlElements.length} URLs`,
        })
      }
    }

    const fileSizeBytes = contentLength
      ? parseInt(contentLength, 10)
      : xmlContent.length
    const fileSizeMB = fileSizeBytes / (1024 * 1024)

    if (fileSizeMB > 50) {
      issues.push({
        type: 'error',
        message: 'Sitemap exceeds maximum file size',
        details: `File size is ${fileSizeMB.toFixed(2)} MB (max 50 MB uncompressed)`,
      })
    } else if (fileSizeMB > 10) {
      issues.push({
        type: 'warning',
        message: 'Large sitemap file',
        details: `File size is ${fileSizeMB.toFixed(2)} MB. Consider splitting into multiple sitemaps.`,
      })
    }

    if (!normalizedUrl.startsWith('https://')) {
      issues.push({
        type: 'warning',
        message: 'Sitemap not served over HTTPS',
        details: 'For better security and SEO, serve your sitemap over HTTPS',
      })
    }

    const hasErrors = issues.some((issue) => issue.type === 'error')

    return {
      error: null,
      result: {
        isValid: !hasErrors,
        url: normalizedUrl,
        encoding,
        urlCount,
        issues,
        urls,
        sitemapIndex: !!sitemapIndex,
        sitemaps: sitemaps.length > 0 ? sitemaps : undefined,
        fetchTime,
        contentLength: fileSizeBytes,
      } as ValidationResult,
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          error: 'Request timed out. The sitemap took too long to fetch.',
          result: null,
        }
      }
      return {
        error: `Failed to fetch sitemap: ${error.message}`,
        result: null,
      }
    }
    return {
      error: 'An unexpected error occurred while validating the sitemap',
      result: null,
    }
  }
}

const FAQ_ITEMS = [
  {
    question: 'What is a sitemap.xml file?',
    answer:
      'A sitemap.xml is an XML file that lists all the important URLs on your website. It helps search engines like Google, Bing, and others discover and crawl your pages more efficiently. Sitemaps can include metadata about each URL such as when it was last updated, how often it changes, and its relative priority.',
  },
  {
    question: 'Why should I validate my sitemap?',
    answer:
      'Validating your sitemap ensures that search engines can properly read and process it. Invalid sitemaps may be rejected by search engines, meaning your pages might not get indexed correctly. Common issues include malformed XML, invalid URLs, missing required tags, and exceeding size limits.',
  },
  {
    question: 'What is the maximum size for a sitemap?',
    answer:
      'According to the sitemap protocol, a sitemap file must be no larger than 50MB (uncompressed) and can contain a maximum of 50,000 URLs. If your site has more URLs, you should create multiple sitemaps and reference them using a sitemap index file.',
  },
  {
    question: 'What is a sitemap index?',
    answer:
      'A sitemap index is an XML file that references multiple sitemap files. It allows you to organize large sites by splitting URLs across several sitemaps. Search engines will process all the individual sitemaps listed in the index file.',
  },
  {
    question: 'What tags are required in a sitemap?',
    answer:
      'The only required tag for each URL entry is <loc>, which contains the absolute URL of the page. Optional tags include <lastmod> (last modification date), <changefreq> (how often the page changes), and <priority> (relative importance from 0.0 to 1.0).',
  },
  {
    question: 'What date format should I use for lastmod?',
    answer:
      'The <lastmod> tag should use the W3C Datetime format. The simplest form is YYYY-MM-DD (e.g., 2024-01-15). You can also include time with timezone: 2024-01-15T09:30:00+00:00. Always use the actual last modification date of the content.',
  },
  {
    question: 'Does Google use priority and changefreq?',
    answer:
      'Google has stated that they largely ignore the <priority> and <changefreq> tags as they rely on their own algorithms to determine crawl frequency and page importance. However, other search engines may still use these values, so including them can still be beneficial.',
  },
  {
    question: 'How do I submit my sitemap to search engines?',
    answer:
      "You can submit your sitemap through each search engine's webmaster tools: Google Search Console, Bing Webmaster Tools, etc. You can also add a Sitemap directive in your robots.txt file (Sitemap: https://example.com/sitemap.xml) to help search engines discover it automatically.",
  },
  {
    question: 'Should my sitemap use HTTPS?',
    answer:
      'Yes, your sitemap should be served over HTTPS for security and better SEO. Additionally, all URLs within your sitemap should use the same protocol (HTTP or HTTPS) as the sitemap itself. Mixing protocols can cause indexing issues.',
  },
  {
    question: 'How can I track if search engines are reading my sitemap?',
    answer:
      'Swetrix analytics can help you monitor bot traffic and crawl activity on your website. You can see when search engine bots visit your pages, track indexing progress, and identify any crawling issues—all while respecting user privacy and GDPR compliance.',
  },
]

function IssueIcon({ type }: { type: 'error' | 'warning' | 'info' }) {
  switch (type) {
    case 'error':
      return <XCircleIcon className='h-5 w-5 shrink-0 text-red-500' />
    case 'warning':
      return (
        <ExclamationTriangleIcon className='h-5 w-5 shrink-0 text-amber-500' />
      )
    case 'info':
      return (
        <InformationCircleIcon className='h-5 w-5 shrink-0 text-blue-500' />
      )
  }
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string
  value: string | number
  subtext?: string
}) {
  return (
    <div className='rounded-lg bg-gray-50 p-4 dark:bg-slate-700/50'>
      <Text size='sm' colour='muted'>
        {label}
      </Text>
      <Text as='p' size='2xl' weight='bold' className='mt-1'>
        {value}
      </Text>
      {subtext && (
        <Text size='sm' colour='muted'>
          {subtext}
        </Text>
      )}
    </div>
  )
}

export default function SitemapValidator() {
  const fetcher = useFetcher<typeof action>()

  const [urlInput, setUrlInput] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  const isLoading =
    fetcher.state === 'submitting' || fetcher.state === 'loading'
  const result = fetcher.data?.result
  const apiError = fetcher.data?.error

  const [showAllIssues, setShowAllIssues] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setInputError(null)

    if (!urlInput.trim()) {
      setInputError('Please enter a sitemap URL')
      return
    }

    fetcher.submit({ url: urlInput }, { method: 'post' })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrlInput(e.target.value)
    if (inputError) {
      setInputError(null)
    }
  }

  const displayError = inputError || apiError

  const errorCount =
    result?.issues.filter((i) => i.type === 'error').length || 0
  const warningCount =
    result?.issues.filter((i) => i.type === 'warning').length || 0
  const infoCount = result?.issues.filter((i) => i.type === 'info').length || 0
  const issuesLimit = 50
  const displayedIssues =
    result?.issues && !showAllIssues
      ? result.issues.slice(0, issuesLimit)
      : result?.issues

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-900'>
      <main className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <ToolsNavMobile className='mb-6 lg:hidden' />

        <div className='lg:flex lg:items-start lg:gap-8'>
          <div className='min-w-0 lg:flex-1'>
            <Text as='h1' size='4xl' weight='bold' tracking='tight'>
              Sitemap Validator
            </Text>
            <Text as='p' size='lg' colour='muted' className='mt-4'>
              Validate your sitemap.xml file for errors, warnings, and SEO best
              practices.
            </Text>

            <div className='mt-10'>
              <form onSubmit={handleSubmit} className='flex items-start gap-3'>
                <Input
                  type='text'
                  placeholder='https://example.com/sitemap.xml'
                  value={urlInput}
                  onChange={handleInputChange}
                  error={displayError}
                  className='flex-1'
                />
                <Button
                  type='submit'
                  primary
                  regular
                  disabled={isLoading}
                  className='mt-px'
                  loading={isLoading}
                >
                  {isLoading ? null : (
                    <>
                      <MagnifyingGlassIcon className='mr-1.5 h-4 w-4' />
                    </>
                  )}
                  Validate
                </Button>
              </form>
            </div>

            {result && (
              <div className='mt-8 space-y-6'>
                <section className='overflow-hidden rounded-xl bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700'>
                  <div className='mb-6 flex items-center gap-4'>
                    {result.isValid ? (
                      <div className='flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30'>
                        <CheckCircleIcon className='h-7 w-7 text-emerald-600 dark:text-emerald-400' />
                      </div>
                    ) : (
                      <div className='flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30'>
                        <XCircleIcon className='h-7 w-7 text-red-600 dark:text-red-400' />
                      </div>
                    )}
                    <div>
                      <Text as='h2' size='xl' weight='semibold'>
                        {result.isValid
                          ? 'Sitemap is Valid'
                          : 'Sitemap Has Errors'}
                      </Text>
                      <Text colour='muted' className='break-all'>
                        {result.url}
                      </Text>
                    </div>
                  </div>

                  <div className='mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4'>
                    <StatCard
                      label={result.sitemapIndex ? 'Sitemaps' : 'URLs'}
                      value={
                        result.sitemapIndex
                          ? result.sitemaps?.length || 0
                          : result.urlCount
                      }
                    />
                    <StatCard
                      label='Encoding'
                      value={result.encoding || 'Unknown'}
                    />
                    <StatCard
                      label='File Size'
                      value={
                        result.contentLength
                          ? formatBytes(result.contentLength)
                          : 'Unknown'
                      }
                    />
                    <StatCard
                      label='Fetch Time'
                      value={`${result.fetchTime}ms`}
                    />
                  </div>

                  {result.issues.length > 0 && (
                    <div>
                      <div className='mb-3 flex flex-wrap items-center gap-4'>
                        <Text weight='medium'>Validation Results</Text>
                        <div className='flex gap-3 text-sm'>
                          {errorCount > 0 && (
                            <span className='flex items-center gap-1 text-red-600 dark:text-red-400'>
                              <XCircleIcon className='h-4 w-4' />
                              {errorCount} error{errorCount !== 1 ? 's' : ''}
                            </span>
                          )}
                          {warningCount > 0 && (
                            <span className='flex items-center gap-1 text-amber-600 dark:text-amber-400'>
                              <ExclamationTriangleIcon className='h-4 w-4' />
                              {warningCount} warning
                              {warningCount !== 1 ? 's' : ''}
                            </span>
                          )}
                          {infoCount > 0 && (
                            <span className='flex items-center gap-1 text-blue-600 dark:text-blue-400'>
                              <InformationCircleIcon className='h-4 w-4' />
                              {infoCount} info
                            </span>
                          )}
                        </div>
                      </div>

                      <div className='space-y-2'>
                        {displayedIssues?.map((issue, index) => (
                          <div
                            key={index}
                            className={`flex gap-3 rounded-lg p-3 ${
                              issue.type === 'error'
                                ? 'bg-red-50 dark:bg-red-900/20'
                                : issue.type === 'warning'
                                  ? 'bg-amber-50 dark:bg-amber-900/20'
                                  : 'bg-blue-50 dark:bg-blue-900/20'
                            }`}
                          >
                            <IssueIcon type={issue.type} />
                            <div className='min-w-0 flex-1'>
                              <Text as='p' weight='medium' className='text-sm'>
                                {issue.message}
                              </Text>
                              {issue.details && (
                                <Text
                                  as='p'
                                  size='sm'
                                  colour='muted'
                                  className='mt-0.5 break-all'
                                >
                                  {issue.details}
                                </Text>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {result.issues.length > issuesLimit && (
                        <div className='mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-slate-700/40 dark:text-gray-300'>
                          <span>
                            Showing {displayedIssues?.length ?? 0} of{' '}
                            {result.issues.length} issues
                          </span>
                          <button
                            type='button'
                            className='text-indigo-600 hover:underline dark:text-indigo-400'
                            onClick={() => setShowAllIssues((prev) => !prev)}
                          >
                            {showAllIssues ? 'Show fewer' : 'Show all'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {result.urls.length > 0 && (
                  <section className='overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700'>
                    <div className='border-b border-gray-200 px-6 py-4 dark:border-slate-700'>
                      <Text weight='medium'>
                        URL Preview ({result.urls.length} of {result.urlCount})
                      </Text>
                    </div>
                    <div className='max-h-96 overflow-y-auto'>
                      <table className='w-full text-left text-sm'>
                        <thead className='sticky top-0 bg-gray-50 dark:bg-slate-700'>
                          <tr>
                            <th className='px-4 py-2 font-medium'>URL</th>
                            <th className='hidden px-4 py-2 font-medium sm:table-cell'>
                              Last Modified
                            </th>
                            <th className='hidden px-4 py-2 font-medium md:table-cell'>
                              Priority
                            </th>
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-100 dark:divide-slate-700'>
                          {result.urls.map((url, index) => (
                            <tr key={index}>
                              <td className='max-w-xs truncate px-4 py-2'>
                                <a
                                  href={url.loc}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='text-indigo-600 hover:underline dark:text-indigo-400'
                                >
                                  {url.loc}
                                </a>
                              </td>
                              <td className='hidden px-4 py-2 text-gray-500 sm:table-cell dark:text-gray-400'>
                                {url.lastmod || '—'}
                              </td>
                              <td className='hidden px-4 py-2 text-gray-500 md:table-cell dark:text-gray-400'>
                                {url.priority || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {result.sitemaps && result.sitemaps.length > 0 && (
                  <section className='overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700'>
                    <div className='border-b border-gray-200 px-6 py-4 dark:border-slate-700'>
                      <Text weight='medium'>
                        Referenced Sitemaps ({result.sitemaps.length})
                      </Text>
                    </div>
                    <div className='max-h-64 overflow-y-auto'>
                      <ul className='divide-y divide-gray-100 dark:divide-slate-700'>
                        {result.sitemaps.map((sitemap, index) => (
                          <li key={index} className='px-4 py-3'>
                            <a
                              href={sitemap}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='text-sm break-all text-indigo-600 hover:underline dark:text-indigo-400'
                            >
                              {sitemap}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}
              </div>
            )}

            <section className='mt-20 border-t border-gray-200 pt-16 dark:border-slate-700'>
              <Text as='h2' size='3xl' weight='bold' tracking='tight'>
                Free XML Sitemap Validator Tool
              </Text>
              <Text
                as='p'
                size='lg'
                colour='muted'
                className='mt-4 leading-relaxed'
              >
                Our free sitemap validator checks your sitemap.xml file for
                compliance with the sitemap protocol, identifies errors and
                warnings, and helps ensure search engines can properly crawl and
                index your website. Simply enter your sitemap URL to get instant
                validation results with detailed feedback.
              </Text>

              <div className='mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2'>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    What This Validator Checks
                  </Text>
                  <ul className='mt-3 space-y-2'>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          XML Structure
                        </Text>{' '}
                        - Validates that your sitemap is well-formed XML
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Character Encoding
                        </Text>{' '}
                        - Detects and verifies UTF-8 or other encodings
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Required Tags
                        </Text>{' '}
                        - Checks for urlset, url, and loc elements
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          URL Validation
                        </Text>{' '}
                        - Verifies all URLs are properly formatted
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Duplicate Detection
                        </Text>{' '}
                        - Identifies duplicate URL entries
                      </Text>
                    </li>
                  </ul>
                </div>

                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    Additional Validations
                  </Text>
                  <ul className='mt-3 space-y-2'>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Date Formats
                        </Text>{' '}
                        - Validates lastmod dates use W3C format
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Priority Values
                        </Text>{' '}
                        - Checks priority is between 0.0 and 1.0
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Change Frequency
                        </Text>{' '}
                        - Verifies changefreq uses valid values
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Size Limits
                        </Text>{' '}
                        - Warns about file size and URL count limits
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Sitemap Index
                        </Text>{' '}
                        - Supports validation of sitemap index files
                      </Text>
                    </li>
                  </ul>
                </div>

                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    Why Sitemaps Matter for SEO
                  </Text>
                  <Text as='p' colour='muted' className='mt-3'>
                    A properly formatted sitemap helps search engines discover
                    all the important pages on your website. It's especially
                    valuable for new websites, sites with deep page hierarchies,
                    or pages that aren't well linked internally. Search engines
                    use sitemaps to understand your site structure and
                    prioritize crawling.
                  </Text>
                </div>

                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    Best Practices for Sitemaps
                  </Text>
                  <Text as='p' colour='muted' className='mt-3'>
                    Keep your sitemap updated whenever you add or remove pages.
                    Only include canonical URLs that return 200 status codes.
                    Split large sitemaps into multiple files using a sitemap
                    index. Submit your sitemap to Google Search Console and Bing
                    Webmaster Tools for faster indexing.
                  </Text>
                </div>
              </div>

              <div className='mt-12'>
                <Text as='h3' size='xl' weight='semibold'>
                  How to Use This Sitemap Checker
                </Text>
                <Text as='p' colour='muted' className='mt-3'>
                  Enter your sitemap URL in the input field above (e.g.,
                  https://example.com/sitemap.xml) and click "Validate." The
                  tool will fetch your sitemap, parse the XML, and display
                  detailed validation results including any errors, warnings,
                  and informational messages. You'll see statistics about your
                  sitemap, a preview of the URLs it contains, and specific
                  guidance on how to fix any issues found.
                </Text>
              </div>
            </section>

            <section className='mt-16'>
              <Text as='h2' size='2xl' weight='bold' className='mb-6'>
                FAQ
              </Text>

              <div className='space-y-3'>
                {FAQ_ITEMS.map((item, index) => (
                  <details
                    key={index}
                    className='group rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                  >
                    <summary className='flex cursor-pointer items-center justify-between px-5 py-4 text-left'>
                      <Text weight='medium'>{item.question}</Text>
                      <ChevronDownIcon className='h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180' />
                    </summary>
                    <div className='border-t border-gray-200 px-5 py-4 dark:border-slate-700'>
                      <Text as='p' colour='muted'>
                        {item.answer}
                      </Text>
                    </div>
                  </details>
                ))}
              </div>
            </section>

            <script
              type='application/ld+json'
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'FAQPage',
                  mainEntity: FAQ_ITEMS.map((item) => ({
                    '@type': 'Question',
                    name: item.question,
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: item.answer,
                    },
                  })),
                })
                  .replace(/</g, '\\u003c')
                  .replace(/\u2028|\u2029/g, ''),
              }}
            />

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
