import _isEmpty from 'lodash/isEmpty'
import { marked, type Tokens } from 'marked'
import sanitizeHtml from 'sanitize-html'

import { getBlogPost, getBlogPostWithCategory } from '~/api/api.server'

import { renderTimeToSwitchCta, renderDitchGoogleCta } from './renderCtaHtml'
import {
  extractTableOfContents,
  ensureHeaderIds,
  generateSlug,
  renderTocAsHtml,
} from './toc'

const renderer = new marked.Renderer()

renderer.link = ({ href, text }: Tokens.Link) => {
  let url: URL

  try {
    url = new URL(href, 'https://swetrix.com')
  } catch {
    return text
  }

  if (url.hostname !== 'swetrix.com') {
    url.searchParams.set('utm_source', 'swetrix.com')
  }

  return `<a href="${url.toString()}" referrerpolicy="strict-origin-when-cross-origin" target="_blank" rel="noopener noreferrer">${text}</a>`
}

renderer.heading = ({ text, depth }: Tokens.Heading) => {
  const id = generateSlug(text)
  return `<h${depth} id="${id}">${text}</h${depth}>`
}

function parseInlineMarkdown(text: string): string {
  return marked.parseInline(text) as string
}

function isSectionHeaderRow(row: Tokens.TableCell[]): boolean {
  const firstCellText = row[0]?.text?.trim() || ''
  const isBold = firstCellText.startsWith('**') && firstCellText.endsWith('**')
  const otherCellsEmpty = row.slice(1).every((cell) => !cell.text?.trim())
  return isBold && otherCellsEmpty
}

renderer.table = ({ header, rows }: Tokens.Table) => {
  const headerCells = header
    .map(
      (cell) =>
        `<th class="px-4 py-3.5 text-left text-base font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 first:rounded-tl-lg last:rounded-tr-lg">${parseInlineMarkdown(cell.text)}</th>`,
    )
    .join('')

  const bodyRows = rows
    .map((row) => {
      const isHeader = isSectionHeaderRow(row)

      if (isHeader) {
        const cellContent = parseInlineMarkdown(row[0].text)
        return `<tr class="bg-slate-50 dark:bg-slate-800/70"><td colspan="${row.length}" class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">${cellContent}</td></tr>`
      }

      return `<tr class="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">${row
        .map((cell) => {
          return `<td class="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">${parseInlineMarkdown(cell.text)}</td>`
        })
        .join('')}</tr>`
    })
    .join('')

  return `<div class="not-prose my-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
    <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
      <thead><tr>${headerCells}</tr></thead>
      <tbody class="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">${bodyRows}</tbody>
    </table>
  </div>`
}

const CHECK_ICON_SVG = `<span class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 align-middle"><svg class="h-3.5 w-3.5 overflow-visible text-emerald-600 dark:text-emerald-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Yes"><path d="M20 6 9 17l-5-5"/></svg></span>`

const CROSS_ICON_SVG = `<span class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 align-middle"><svg class="h-3.5 w-3.5 overflow-visible text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="No"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></span>`

const WARNING_ICON_SVG = `<span class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 align-middle"><svg class="h-3.5 w-3.5 overflow-visible text-amber-600 dark:text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Warning"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg></span>`

const SWETRIX_LOGO_HTML = `<span class="inline-flex items-center gap-[0.15em] select-none whitespace-nowrap align-baseline"><img class="h-[0.9em] w-auto dark:hidden" src="/assets/logo/blue.png" alt="" /><img class="h-[0.9em] w-auto hidden dark:inline" src="/assets/logo/white.png" alt="" /><span class="font-bold text-indigo-950 dark:text-white">Swetrix</span></span>`

const ALERT_CONFIGS = {
  NOTE: {
    icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>`,
    bgClass: 'bg-blue-50 dark:bg-blue-950/50',
    borderClass: 'border-blue-400 dark:border-blue-500',
    iconClass: 'text-blue-500 dark:text-blue-400',
    titleClass: 'text-blue-800 dark:text-blue-200',
    contentClass: 'text-blue-700 dark:text-blue-300',
    title: 'Note',
  },
  TIP: {
    icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 16 16"><path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"/></svg>`,
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/50',
    borderClass: 'border-emerald-400 dark:border-emerald-500',
    iconClass: 'text-emerald-500 dark:text-emerald-400',
    titleClass: 'text-emerald-800 dark:text-emerald-200',
    contentClass: 'text-emerald-700 dark:text-emerald-300',
    title: 'Tip',
  },
  IMPORTANT: {
    icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 16 16"><path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>`,
    bgClass: 'bg-purple-50 dark:bg-purple-950/50',
    borderClass: 'border-purple-400 dark:border-purple-500',
    iconClass: 'text-purple-500 dark:text-purple-400',
    titleClass: 'text-purple-800 dark:text-purple-200',
    contentClass: 'text-purple-700 dark:text-purple-300',
    title: 'Important',
  },
  WARNING: {
    icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 16 16"><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>`,
    bgClass: 'bg-amber-50 dark:bg-amber-950/50',
    borderClass: 'border-amber-400 dark:border-amber-500',
    iconClass: 'text-amber-500 dark:text-amber-400',
    titleClass: 'text-amber-800 dark:text-amber-200',
    contentClass: 'text-amber-700 dark:text-amber-300',
    title: 'Warning',
  },
  CAUTION: {
    icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 16 16"><path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>`,
    bgClass: 'bg-red-50 dark:bg-red-950/50',
    borderClass: 'border-red-400 dark:border-red-500',
    iconClass: 'text-red-500 dark:text-red-400',
    titleClass: 'text-red-800 dark:text-red-200',
    contentClass: 'text-red-700 dark:text-red-300',
    title: 'Caution',
  },
} as const

type AlertType = keyof typeof ALERT_CONFIGS

renderer.blockquote = ({ text }: Tokens.Blockquote) => {
  const alertMatch = text.match(
    /^\s*(?:<p>)?\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:<br\s*\/?>|\n)?(?:<\/p>)?\s*/i,
  )

  if (alertMatch) {
    const alertType = alertMatch[1].toUpperCase() as AlertType
    const config = ALERT_CONFIGS[alertType]
    const rawContent = text.replace(alertMatch[0], '').trim()

    const content = marked(rawContent, { renderer }) as string

    return `<div class="not-prose my-6 rounded-lg border-l-4 ${config.borderClass} ${config.bgClass} p-4">
      <div class="flex items-start gap-3">
        <span class="${config.iconClass} shrink-0 mt-0.5">${config.icon}</span>
        <div class="min-w-0 flex-1">
          <p class="font-semibold ${config.titleClass} mb-1">${config.title}</p>
          <div class="${config.contentClass} [&>p]:my-0 [&>p:not(:last-child)]:mb-2 [&_a]:underline [&_a]:font-medium">${content}</div>
        </div>
      </div>
    </div>`
  }

  const renderedText = marked(text, { renderer }) as string
  return `<blockquote>${renderedText}</blockquote>`
}

function replaceEmojiWithIcons(html: string): string {
  return html
    .replace(/✅/g, CHECK_ICON_SVG)
    .replace(/❌/g, CROSS_ICON_SVG)
    .replace(/⚠️/g, WARNING_ICON_SVG)
}

function replaceSwetrixLogo(html: string): string {
  return html.replace(/::SWETRIX_LOGO::/g, SWETRIX_LOGO_HTML)
}

interface GetPost {
  slug: string
  title?: string
  html: string
  hidden?: boolean
  standalone?: boolean
  intro?: string
  date?: string
  author?: string
  twitter_handle?: string
}

export async function getPost(
  request: Request,
  slug: string,
  category?: string,
  tryStandalone?: boolean,
): Promise<GetPost | null> {
  let post: Awaited<ReturnType<typeof getBlogPost>> = null

  try {
    if (category) {
      post = await getBlogPostWithCategory(request, category, slug)
    } else {
      post = await getBlogPost(request, slug)
    }
  } catch {
    return null
  }

  if (!post || _isEmpty(post)) {
    return null
  }

  if (!!tryStandalone !== !!post.attributes?.standalone) {
    return null
  }

  const tocPlaceholder = '::TABLE_OF_CONTENTS::'
  const ctaTimeToSwitchPlaceholder = '::CTA:TIME_TO_SWITCH::'
  const ctaDitchGooglePlaceholder = '::CTA:TIME_TO_DITCH_GOOGLE::'
  const hasTocPlaceholder = post.body.includes(tocPlaceholder)
  const hasCtaTimeToSwitch = post.body.includes(ctaTimeToSwitchPlaceholder)
  const hasCtaDitchGoogle = post.body.includes(ctaDitchGooglePlaceholder)

  let html = marked(post.body, { renderer }) as string

  html = ensureHeaderIds(html)
  html = replaceEmojiWithIcons(html)
  html = replaceSwetrixLogo(html)

  const toc = extractTableOfContents(html)

  if (hasTocPlaceholder && toc.length > 0) {
    const tocHtml = renderTocAsHtml(toc)
    html = html.replace(new RegExp(tocPlaceholder, 'gi'), tocHtml)
  }

  if (hasCtaTimeToSwitch) {
    const ctaHtml = renderTimeToSwitchCta()
    html = html.replace(new RegExp(ctaTimeToSwitchPlaceholder, 'gi'), ctaHtml)
  }

  if (hasCtaDitchGoogle) {
    const ctaHtml = renderDitchGoogleCta()
    html = html.replace(new RegExp(ctaDitchGooglePlaceholder, 'gi'), ctaHtml)
  }

  html = sanitizeHtml(html, {
    allowedTags: [
      'p',
      'br',
      'hr',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'strong',
      'em',
      's',
      'del',
      'blockquote',
      'pre',
      'code',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'div',
      'span',
      'svg',
      'path',
    ],
    allowedAttributes: {
      '*': ['class', 'id', 'role', 'aria-label', 'aria-hidden'],
      a: ['href', 'target', 'rel', 'referrerpolicy', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
      svg: [
        'class',
        'xmlns',
        'viewbox',
        'width',
        'height',
        'fill',
        'stroke',
        'stroke-width',
        'stroke-linecap',
        'stroke-linejoin',
        'role',
        'aria-label',
      ],
      path: ['d', 'fill', 'fill-rule', 'clip-rule'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      img: ['http', 'https'],
    },
    allowProtocolRelative: false,
    allowedStyles: {},
  })

  return {
    slug,
    title: post.attributes?.title,
    html,
    hidden: post.attributes?.hidden,
    intro: post.attributes?.intro,
    date: post.attributes?.date,
    author: post.attributes?.author,
    twitter_handle: post.attributes?.twitter_handle,
    standalone: post.attributes?.standalone,
  }
}
