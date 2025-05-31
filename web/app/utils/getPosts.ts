import _isEmpty from 'lodash/isEmpty'
import { marked, type Tokens } from 'marked'

import { getBlogPost, getBlogPostWithCategory } from '~/api'

import { extractTableOfContents, ensureHeaderIds, generateSlug, renderTocAsHtml, type TocItem } from './toc'

const renderer = new marked.Renderer()

renderer.link = ({ href, text }: Tokens.Link) => {
  const url = new URL(href)

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

// Removes first 10 characters from the string (i.e. 2023-10-07-)
export const getSlugFromFilename = (filename: string) => filename.substring(11)
export const getDateFromFilename = (filename: string) => filename.substring(0, 10)

interface GetPost {
  slug: string
  title?: string
  html: string
  hidden?: boolean
  intro?: string
  date?: string
  author?: string
  twitter_handle?: string
  toc: TocItem[]
  tocEmbedded: boolean // Flag to track if TOC was embedded in content
}

export async function getPost(slug: string, category?: string): Promise<GetPost | null> {
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

  const tocPlaceholder = '::TABLE_OF_CONTENTS::'
  const hasTocPlaceholder = post.body.includes(tocPlaceholder)

  // Convert markdown to HTML
  let html = marked(post.body, { renderer }) as string

  // Ensure all headers have IDs for linking
  html = ensureHeaderIds(html)

  // Extract table of contents from the HTML
  const toc = extractTableOfContents(html)

  // If TOC placeholder exists and we have TOC items, replace it with actual TOC HTML
  if (hasTocPlaceholder && toc.length > 0) {
    const tocHtml = renderTocAsHtml(toc)
    // Replace the placeholder with the actual TOC HTML
    html = html.replace(new RegExp(tocPlaceholder, 'gi'), tocHtml)
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
    toc,
    tocEmbedded: hasTocPlaceholder && toc.length > 0,
  }
}
