export interface BlogMetadata {
  title?: string
  intro?: string
  date?: string
  modified?: string
  image?: string
  author?: string
  twitter_handle?: string
  standalone?: boolean
}

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

export function blogDateToIso(value: unknown): string | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString()
  }
  if (typeof value !== 'string') return undefined

  const input = value.trim()
  const written = /^([a-z]+) (\d{1,2}), (\d{4})$/i.exec(input)
  const iso = /^(\d{4})-(\d{2})-(\d{2})(T.*)?$/.exec(input)
  if (!written && !iso) return undefined

  const year = Number(written ? written[3] : iso![1])
  const month = written
    ? MONTHS.indexOf(written[1].toLowerCase()) + 1
    : Number(iso![2])
  const day = Number(written ? written[2] : iso![3])
  const calendarDate = new Date(0)
  calendarDate.setUTCFullYear(year, month - 1, day)
  calendarDate.setUTCHours(0, 0, 0, 0)
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  )
    return undefined

  if (iso?.[4]) {
    if (!/T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(iso[4]))
      return undefined
    const parsed = new Date(input)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
  }
  return calendarDate.toISOString().slice(0, 10)
}

export function blogImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined
  } catch {
    return undefined
  }
}

function blogModifiedDate(post: BlogMetadata): string | undefined {
  const published = blogDateToIso(post.date)
  const modified = blogDateToIso(post.modified)
  return modified &&
    (!published || Date.parse(modified) >= Date.parse(published))
    ? modified
    : undefined
}

export function blogBreadcrumbs(title?: string, url?: string) {
  const items = [
    { name: 'Home', item: 'https://swetrix.com/' },
    { name: 'Blog', item: 'https://swetrix.com/blog' },
    ...(title && url ? [{ name: title, item: url }] : []),
  ]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      ...item,
    })),
  }
}

export function blogPostSchema(
  post: BlogMetadata,
  pathname: string,
  fallbackImageUrl: string,
) {
  const url = new URL(pathname, 'https://swetrix.com')
  url.search = ''
  url.hash = ''
  const published = blogDateToIso(post.date)
  const modified = blogModifiedDate(post)
  const image = blogImageUrl(post.image) || blogImageUrl(fallbackImageUrl)
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url.href}#article`,
    url: url.href,
    headline: post.title,
    ...(post.intro && { description: post.intro }),
    ...(published && { datePublished: published }),
    ...(modified && { dateModified: modified }),
    ...(image && { image }),
    ...(post.author && {
      author: {
        '@type': 'Person',
        name: post.author,
        ...(post.twitter_handle && {
          url: `https://x.com/${post.twitter_handle}`,
        }),
      },
    }),
    publisher: {
      '@type': 'Organization',
      name: 'Swetrix',
      url: 'https://swetrix.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://swetrix.com/assets/logo_blue.png',
      },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url.href },
  }
}

export function blogArticleMeta(post?: BlogMetadata | null) {
  if (!post?.title) return []
  const published = blogDateToIso(post.date)
  const modified = blogModifiedDate(post)
  return [
    ...(published
      ? [{ property: 'article:published_time', content: published }]
      : []),
    ...(modified
      ? [{ property: 'article:modified_time', content: modified }]
      : []),
    ...(post.author ? [{ name: 'author', content: post.author }] : []),
  ]
}

export function serializeBlogSchema(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028|\u2029/g, '')
}
