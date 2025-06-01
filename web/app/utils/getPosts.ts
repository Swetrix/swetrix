import _isEmpty from 'lodash/isEmpty'
import { marked, type Tokens } from 'marked'

import { getBlogPost, getBlogPostWithCategory } from '~/api'

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
  const hasTocPlaceholder = post.body.includes(tocPlaceholder)

  let html = marked(post.body, { renderer }) as string

  html = ensureHeaderIds(html)

  const toc = extractTableOfContents(html)

  if (hasTocPlaceholder && toc.length > 0) {
    const tocHtml = renderTocAsHtml(toc)
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
    standalone: post.attributes?.standalone,
  }
}
