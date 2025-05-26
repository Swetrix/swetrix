import _isEmpty from 'lodash/isEmpty'
import { marked, type Tokens } from 'marked'

import { getBlogPost, getBlogPostWithCategory } from '~/api'

const renderer = new marked.Renderer()

renderer.link = ({ href, text }: Tokens.Link) => {
  const url = new URL(href)

  if (url.hostname !== 'swetrix.com') {
    url.searchParams.set('utm_source', 'swetrix.com')
  }

  return `<a href="${url.toString()}" referrerpolicy="strict-origin-when-cross-origin" target="_blank" rel="noopener noreferrer">${text}</a>`
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
  nickname?: string
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

  return {
    slug,
    title: post.attributes?.title,
    html: marked(post.body, { renderer }) as string,
    hidden: post.attributes?.hidden,
    intro: post.attributes?.intro,
    date: post.attributes?.date,
    author: post.attributes?.author,
    nickname: post.attributes?.nickname,
  }
}
