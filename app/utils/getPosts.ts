import { marked } from 'marked'
import _isEmpty from 'lodash/isEmpty'
import { LoaderFunction } from '@remix-run/node'
import { getBlogPosts, getBlogPost, getBlogPostWithCategory } from 'api'

const renderer = new marked.Renderer()

renderer.link = (href: string, title: string | null | undefined, text: string) => {
  const url = new URL(href)
  
  if (url.hostname !== 'swetrix.com') {
    url.searchParams.append('utm_source', 'swetrix.com')
  }

  return `<a href="${url.toString()}" referrerpolicy="strict-origin-when-cross-origin" target="_blank" rel="noopener noreferrer">${text}</a>`
}

export type PostMarkdownAttributes = {
  title: string
  intro?: string
  date: string
  author: string
  nickname: string
  hidden?: boolean
}

// Removes first 10 characters from the string (i.e. 2023-10-07-)
export const getSlugFromFilename = (filename: string) => filename.substring(11)
export const getDateFromFilename = (filename: string) => filename.substring(0, 10)

export async function getPost(slug: string, category?: string) {
  let post: any = null

  if (category) {
    await getBlogPostWithCategory(category, slug)
      .then((data) => {
        post = data
      })
      .catch((error) => {
        console.error(error)
      })
  } else {
    await getBlogPost(slug)
      .then((data) => {
        post = data
      })
      .catch((error) => {
        console.error(error)
      })
  }

  if (!post || _isEmpty(post)) {
    return null
  }

  return {
    slug,
    title: post.attributes?.title,
    html: marked(post.body, { renderer }),
    hidden: post.attributes?.hidden,
    intro: post.attributes?.intro,
    date: post.attributes?.date,
    author: post.attributes?.author,
    nickname: post.attributes?.nickname,
  }
}

export const blogLoader: LoaderFunction = async () => {
  const data = await getBlogPosts()
    .then((data) => {
      return data
    })
    .catch((error) => {
      console.error(error)
    })

  if (!data || _isEmpty(data)) {
    return null
  }

  return data
}
