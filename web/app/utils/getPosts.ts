import _isEmpty from 'lodash/isEmpty'
import { marked, type Tokens } from 'marked'

import { getBlogPost, getBlogPostWithCategory } from '~/api'

import { renderTimeToSwitchCta } from './renderCtaHtml'
import { extractTableOfContents, ensureHeaderIds, generateSlug, renderTocAsHtml } from './toc'

const renderer = new marked.Renderer()

renderer.link = ({ href, text }: Tokens.Link) => {
  const url = new URL(href, 'https://swetrix.com')

  if (url.hostname !== 'swetrix.com') {
    url.searchParams.set('utm_source', 'swetrix.com')
  }

  return `<a href="${url.toString()}" referrerpolicy="strict-origin-when-cross-origin" target="_blank" rel="noopener noreferrer">${text}</a>`
}

// Add automatic ID generation to headers
renderer.heading = ({ text, depth }: Tokens.Heading) => {
  const id = generateSlug(text)
  return `<h${depth} id="${id}">${text}</h${depth}>`
}

// Helper to parse inline markdown in table cells
function parseInlineMarkdown(text: string): string {
  return marked.parseInline(text) as string
}

// Check if a row is a section header (first cell is bold, other cells are empty)
function isSectionHeaderRow(row: Tokens.TableCell[]): boolean {
  const firstCellText = row[0]?.text?.trim() || ''
  const isBold = firstCellText.startsWith('**') && firstCellText.endsWith('**')
  const otherCellsEmpty = row.slice(1).every((cell) => !cell.text?.trim())
  return isBold && otherCellsEmpty
}

// Custom table rendering with improved styling
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
        // Section header row - spans all columns with background
        const cellContent = parseInlineMarkdown(row[0].text)
        return `<tr class="bg-slate-50 dark:bg-slate-800/70"><td colspan="${row.length}" class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">${cellContent}</td></tr>`
      }

      // Regular row
      return `<tr class="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">${row
        .map(
          (cell) =>
            `<td class="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">${parseInlineMarkdown(cell.text)}</td>`,
        )
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

// SVG icons for checkmark and cross
const CHECK_ICON_SVG = `<span class="inline-flex items-center justify-center size-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30"><svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Yes"><path d="M20 6 9 17l-5-5"/></svg></span>`

const CROSS_ICON_SVG = `<span class="inline-flex items-center justify-center size-6 rounded-full bg-red-100 dark:bg-red-900/30"><svg class="w-4 h-4 text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="No"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></span>`

// Inline Swetrix logo that inherits font size
const SWETRIX_LOGO_HTML = `<span class="inline-flex items-center gap-[0.15em] select-none whitespace-nowrap align-baseline"><img class="h-[0.9em] w-auto dark:hidden" src="/assets/logo/blue.png" alt="" /><img class="h-[0.9em] w-auto hidden dark:inline" src="/assets/logo/white.png" alt="" /><span class="font-bold text-indigo-950 dark:text-white">Swetrix</span></span>`

// Function to replace emoji with styled icons
function replaceEmojiWithIcons(html: string): string {
  return html.replace(/✅/g, CHECK_ICON_SVG).replace(/❌/g, CROSS_ICON_SVG)
}

// Function to replace ::SWETRIX_LOGO:: placeholder
function replaceSwetrixLogo(html: string): string {
  return html.replace(/::SWETRIX_LOGO::/g, SWETRIX_LOGO_HTML)
}

// Removes first 10 characters from the string (i.e. 2023-10-07-)
export const getSlugFromFilename = (filename: string) => filename.substring(11)
export const getDateFromFilename = (filename: string) => filename.substring(0, 10)

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

export async function getPost(slug: string, category?: string, tryStandalone?: boolean): Promise<GetPost | null> {
  let post: any = null

  try {
    if (category) {
      post = await getBlogPostWithCategory(category, slug)
    } else {
      post = await getBlogPost(slug)
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
  const hasTocPlaceholder = post.body.includes(tocPlaceholder)
  const hasCtaTimeToSwitch = post.body.includes(ctaTimeToSwitchPlaceholder)

  let html = marked(post.body, { renderer }) as string

  html = ensureHeaderIds(html)

  // Replace emoji icons with styled SVG icons
  html = replaceEmojiWithIcons(html)

  // Replace ::SWETRIX_LOGO:: with inline logo
  html = replaceSwetrixLogo(html)

  const toc = extractTableOfContents(html)

  if (hasTocPlaceholder && toc.length > 0) {
    const tocHtml = renderTocAsHtml(toc)
    html = html.replace(new RegExp(tocPlaceholder, 'gi'), tocHtml)
  }

  // Handle CTA:TIME_TO_SWITCH placeholder
  if (hasCtaTimeToSwitch) {
    const ctaHtml = renderTimeToSwitchCta()
    html = html.replace(new RegExp(ctaTimeToSwitchPlaceholder, 'gi'), ctaHtml)
  }

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
