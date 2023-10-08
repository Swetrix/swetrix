import path from 'path'
import fs from 'fs/promises'
import parseFrontMatter from 'front-matter'
import { marked } from 'marked'
import _map from 'lodash/map'
import _find from 'lodash/find'
import _includes from 'lodash/includes'
import _filter from 'lodash/filter'
import _endsWith from 'lodash/endsWith'
import _replace from 'lodash/replace'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import { LoaderFunction } from '@remix-run/node'

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

interface IParseFontMatter {
  attributes: PostMarkdownAttributes
  body: string
}

export const postsPath = path.join(__dirname, '..', 'blog-posts', 'posts')

// Removes first 10 characters from the string (i.e. 2023-10-07-)
export const getSlugFromFilename = (filename: string) => filename.substring(11)
export const getDateFromFilename = (filename: string) => filename.substring(0, 10)

const findFilenameBySlug = (list: string[], handle: string) => {
  return _find(list, (item) => _includes(item, handle))
}

export const getSitemapFileNames = async (category?: string, infiniteRecursive?: boolean): Promise<any[]> => {
  const allFiles = await fs.readdir(category ? path.join(postsPath, category) : postsPath) as string[]
  const directories = _filter(allFiles, (file) => !_endsWith(file, '.md'))

  if (_isEmpty(directories)) {
    return allFiles
  }

  const files = _filter(allFiles, (file) => _endsWith(file, '.md'))

  let filesInDirectories: any[] = []

  for (let i = 0; i < _size(directories); ++i) {
    const directory = directories[i]

    // set to true for infinite depth directory look-up
    const _files = await getSitemapFileNames(directory, infiniteRecursive)
    filesInDirectories = [
      ...filesInDirectories,
      ..._map(_files, (file) => [directory, file]),
    ]
  }

  return [
    ...files,
    ...filesInDirectories,
  ]
} 

export const getFileNames = async (category?: string): Promise<string[]> => {
  let files

  if (category) {
    files = await fs.readdir(path.join(postsPath, category)) as string[]
  } else {
    files = await fs.readdir(postsPath) as string[]
  }

  return _filter(files, (file) => _endsWith(file, '.md'))
}

export async function getPost(slug: string, category?: string) {
  const files = await getFileNames(category)
  const filename = findFilenameBySlug(files, slug)

  if (!filename) {
    return null
  }

  const filepath = category
    ? path.join(postsPath, category, filename)
    : path.join(postsPath, filename)

  const file = await fs.readFile(filepath)
  const { attributes, body }: IParseFontMatter = parseFrontMatter(file.toString())

  return {
    slug,
    title: attributes.title,
    html: marked(body, { renderer }),
    hidden: attributes.hidden,
    intro: attributes.intro,
    date: attributes.date,
    author: attributes.author,
    nickname: attributes.nickname,
  }
}

export const blogLoader: LoaderFunction = async () => {
  const dir = await fs.readdir(postsPath)
  const filtered = _filter(dir, (file) => _endsWith(file, '.md'))

  return Promise.all(
    _map(filtered, async filename => {
      const file = await fs.readFile(
        path.join(postsPath, filename)
      )
      const { attributes }: IParseFontMatter = parseFrontMatter(
        file.toString()
      )
      return {
        slug: _replace(getSlugFromFilename(filename), /\.md$/, ''),
        title: attributes.title,
        hidden: attributes.hidden,
        intro: attributes.intro,
        date: attributes.date,
        author: attributes.author,
        nickname: attributes.nickname,
      }
    })
  )
}
