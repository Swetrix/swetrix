import { Injectable } from '@nestjs/common'
import _find from 'lodash/find'
import _sortBy from 'lodash/sortBy'
import _includes from 'lodash/includes'
import _endsWith from 'lodash/endsWith'
import _filter from 'lodash/filter'
import _map from 'lodash/map'
import _replace from 'lodash/replace'
import _isEmpty from 'lodash/isEmpty'
import _last from 'lodash/last'
import _size from 'lodash/size'
import path from 'path'
import fs from 'fs/promises'
import { AppLoggerService } from '../logger/logger.service'
import { BLOG_POSTS_PATH, redis } from '../common/constants'

const parseFrontMatter = require('front-matter')

const REDIS_SITEMAP_KEY = 'blog-sitemap'
// in seconds; 3600 seconds = 1 hour
const REDIS_SITEMAP_LIFETIME = 3600

// Removes first 10 characters from the string (i.e. 2023-10-07-)
const getSlugFromFilename = (filename: string) => filename.substring(11)

const getDateFromFilename = (filename: string) => filename.substring(0, 10)

const findFilenameBySlug = (list: string[], handle: string) => {
  return _find(list, (item) => getSlugFromFilename(item) === `${handle}.md`)
}

interface IParseFontMatter {
  attributes: any
  body: string
}

const BLOG_POSTS_BASE = path.resolve(BLOG_POSTS_PATH)

const isSafePathSegment = (segment: string) => {
  // Express/Nest will decode URL params; explicitly disallow separators/traversal.
  return (
    typeof segment === 'string' &&
    !_isEmpty(segment) &&
    !segment.includes('\0') &&
    !segment.includes('/') &&
    !segment.includes('\\') &&
    segment !== '.' &&
    segment !== '..' &&
    !segment.includes('..')
  )
}

const resolveBlogPostsPath = (...segments: string[]) => {
  const resolved = path.resolve(BLOG_POSTS_BASE, ...segments)
  if (resolved === BLOG_POSTS_BASE) {
    return resolved
  }

  // Ensure resolved path stays within BLOG_POSTS_BASE.
  if (!resolved.startsWith(`${BLOG_POSTS_BASE}${path.sep}`)) {
    throw new Error('You are not allowed to access this file')
  }

  return resolved
}

const isValidCategoryPath = (category: string): boolean => {
  return category.split('/').every(isSafePathSegment)
}

const categorySegments = (category: string): string[] => category.split('/')

const getFileNames = async (category?: string): Promise<string[]> => {
  try {
    if (category && !isValidCategoryPath(category)) {
      return []
    }

    const pathToRead = category
      ? resolveBlogPostsPath(...categorySegments(category))
      : resolveBlogPostsPath()

    const dirents = await fs.readdir(pathToRead, { withFileTypes: true })
    return _map(
      _filter(dirents, (d) => d.isFile() && _endsWith(d.name, '.md')),
      (d) => d.name,
    )
  } catch {
    return []
  }
}

const getPost = async (
  slug: string,
  category?: string,
): Promise<IParseFontMatter> => {
  if (!isSafePathSegment(slug)) {
    return null
  }
  if (category && !isValidCategoryPath(category)) {
    return null
  }

  const files = await getFileNames(category)
  const filename = findFilenameBySlug(files, slug)

  if (!filename) {
    return null
  }

  const filepath = category
    ? resolveBlogPostsPath(...categorySegments(category), filename)
    : resolveBlogPostsPath(filename)

  let file: Buffer

  try {
    file = await fs.readFile(filepath)
  } catch (reason) {
    console.error('[getPost]', reason)
    return null
  }

  const { attributes, body }: IParseFontMatter = parseFrontMatter(
    file.toString(),
  )
  return { attributes, body }
}

const getArticlesFromDir = async (category?: string): Promise<any[]> => {
  try {
    const dirPath = category
      ? resolveBlogPostsPath(category)
      : resolveBlogPostsPath()

    const dirents = await fs.readdir(dirPath, { withFileTypes: true })

    const mdFiles = _filter(
      dirents,
      (d) => d.isFile() && _endsWith(d.name, '.md'),
    )

    const articles = await Promise.all(
      _map(mdFiles, async (d) => {
        try {
          const filePath = category
            ? resolveBlogPostsPath(category, d.name)
            : resolveBlogPostsPath(d.name)

          const file = await fs.readFile(filePath)
          const { attributes }: IParseFontMatter = parseFrontMatter(
            file.toString(),
          )

          const baseSlug = _replace(getSlugFromFilename(d.name), /\.md$/, '')

          return {
            slug: category ? `${category}/${baseSlug}` : baseSlug,
            title: attributes.title,
            hidden: attributes.hidden,
            standalone: attributes.standalone,
            intro: attributes.intro,
            date: attributes.date,
            _date: getDateFromFilename(d.name),
            author: attributes.author,
            nickname: attributes.nickname,
          }
        } catch {
          return null
        }
      }),
    )

    const subdirs = _filter(dirents, (d) => d.isDirectory())
    let subArticles: any[] = []

    for (const sub of subdirs) {
      const subName = sub.name
      if (!isSafePathSegment(subName)) continue
      const nested = await getArticlesFromDir(
        category ? `${category}/${subName}` : subName,
      )
      subArticles = [...subArticles, ...nested]
    }

    return [..._filter(articles, (a) => !!a), ...subArticles]
  } catch {
    return []
  }
}

const getArticlesMetaData = async () => {
  const articles = await getArticlesFromDir()

  if (_isEmpty(articles)) return null

  return _sortBy(articles, ['_date']).reverse()
}

@Injectable()
export class BlogService {
  constructor(private readonly logger: AppLoggerService) {}

  async getArticleBySlug(slug: string, category?: string) {
    if (!slug) {
      return null
    }

    const post = await getPost(slug, category)

    if (!post) {
      return null
    }

    return post
  }

  async getSitemapFileNames(
    category?: string,
    infiniteRecursive?: boolean,
  ): Promise<any> {
    // Only check/use cache at root level (when category is undefined)
    if (!category) {
      try {
        const rawRedisSitemap = await redis.get(REDIS_SITEMAP_KEY)

        if (rawRedisSitemap) {
          try {
            return JSON.parse(rawRedisSitemap)
          } catch (reason) {
            this.logger.error(
              `[getSitemapFileNames][JSON.parse] An error occured: ${reason}`,
            )
          }
        }
      } catch (reason) {
        this.logger.warn(
          `[getSitemapFileNames][redis.get] Unable to read cache: ${reason}`,
        )
      }
    }

    if (category && !isValidCategoryPath(category)) {
      return []
    }

    let dirents: any[]

    try {
      const dirPath = category
        ? resolveBlogPostsPath(...categorySegments(category))
        : BLOG_POSTS_BASE
      dirents = await fs.readdir(dirPath, { withFileTypes: true })
    } catch (reason) {
      this.logger.warn(
        `[getSitemapFileNames][readdir] Unable to read directory: ${reason}`,
      )
      return []
    }

    const directories = _filter(dirents, (d) => d.isDirectory())
    const markdownFiles = _filter(
      dirents,
      (d) => d.isFile() && _endsWith(d.name, '.md'),
    )

    const processedFiles = await Promise.all(
      _map(markdownFiles, async (filename) => {
        const actualFilename = filename.name ?? filename
        const slug = _replace(actualFilename, /\.md$/, '')

        try {
          const filePath = category
            ? resolveBlogPostsPath(
                ...categorySegments(category),
                actualFilename,
              )
            : resolveBlogPostsPath(actualFilename)

          const file = await fs.readFile(filePath)
          const { attributes }: IParseFontMatter = parseFrontMatter(
            file.toString(),
          )

          if (attributes.standalone === true) {
            if (category) {
              return [category, slug]
            }
            return slug
          }

          if (category) {
            return ['blog', category, slug]
          } else {
            return ['blog', slug]
          }
        } catch {
          if (category) {
            return ['blog', category, slug]
          } else {
            return ['blog', slug]
          }
        }
      }),
    )

    let filesInDirectories: any[] = []

    if (infiniteRecursive) {
      for (let i = 0; i < _size(directories); ++i) {
        const directory = directories[i]
        const directoryName = directory.name ?? directory

        if (!isSafePathSegment(directoryName)) {
          continue
        }

        const fullCategory = category
          ? `${category}/${directoryName}`
          : directoryName

        const _files = await this.getSitemapFileNames(
          fullCategory,
          infiniteRecursive,
        )
        filesInDirectories = [...filesInDirectories, ..._files]
      }
    }

    const sitemap = [...processedFiles, ...filesInDirectories]

    // Only cache at root level (when category is undefined)
    if (!category) {
      try {
        await redis.set(
          REDIS_SITEMAP_KEY,
          JSON.stringify(sitemap),
          'EX',
          REDIS_SITEMAP_LIFETIME,
        )
      } catch (reason) {
        this.logger.warn(
          `[getSitemapFileNames][redis.set] Unable to write cache: ${reason}`,
        )
      }
    }

    return sitemap
  }

  async getAll() {
    return getArticlesMetaData()
  }
}
