import { Injectable } from '@nestjs/common'
import * as _find from 'lodash/find'
import * as _includes from 'lodash/includes'
import * as _endsWith from 'lodash/endsWith'
import * as _filter from 'lodash/filter'
import * as _map from 'lodash/map'
import * as _replace from 'lodash/replace'
import * as _isEmpty from 'lodash/isEmpty'
import * as _size from 'lodash/size'
import * as path from 'path'
import * as fs from 'fs/promises'
import { AppLoggerService } from '../logger/logger.service'
import { BLOG_POSTS_PATH, redis } from '../common/constants'

// eslint-disable-next-line
const parseFrontMatter = require('front-matter')

const REDIS_SITEMAP_KEY = 'blog-sitemap'
// in seconds; 3600 seconds = 1 hour
const REDIS_SITEMAP_LIFETIME = 3600

// Removes first 10 characters from the string (i.e. 2023-10-07-)
const getSlugFromFilename = (filename: string) => filename.substring(11)

const findFilenameBySlug = (list: string[], handle: string) => {
  return _find(list, item => _includes(item, handle))
}

interface IParseFontMatter {
  attributes: any
  body: string
}

const getFileNames = async (category?: string): Promise<string[]> => {
  let files

  try {
    if (category) {
      files = (await fs.readdir(
        path.join(BLOG_POSTS_PATH, category),
      )) as string[]
    } else {
      files = (await fs.readdir(BLOG_POSTS_PATH)) as string[]
    }
  } catch (reason) {
    console.error('[getFileNames]', reason)
    return []
  }

  return _filter(files, file => _endsWith(file, '.md'))
}

const getPost = async (
  slug: string,
  category?: string,
): Promise<IParseFontMatter> => {
  const files = await getFileNames(category)
  const filename = findFilenameBySlug(files, slug)

  if (!filename) {
    return null
  }

  const filepath = category
    ? path.join(BLOG_POSTS_PATH, category, filename)
    : path.join(BLOG_POSTS_PATH, filename)

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

const getArticlesMetaData = async () => {
  let dir: string[]

  try {
    dir = await fs.readdir(BLOG_POSTS_PATH)
  } catch (reason) {
    console.error('[getArticlesMetaData]', reason)
    return null
  }

  const filtered = _filter(dir, (file: string) => _endsWith(file, '.md'))

  return Promise.all(
    _map(filtered, async filename => {
      const file = await fs.readFile(path.join(BLOG_POSTS_PATH, filename))
      const { attributes }: IParseFontMatter = parseFrontMatter(file.toString())
      return {
        slug: _replace(getSlugFromFilename(filename), /\.md$/, ''),
        title: attributes.title,
        hidden: attributes.hidden,
        intro: attributes.intro,
        date: attributes.date,
        author: attributes.author,
        nickname: attributes.nickname,
      }
    }),
  )
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

    const allFiles = (await fs.readdir(
      category ? path.join(BLOG_POSTS_PATH, category) : BLOG_POSTS_PATH,
    )) as string[]
    const directories = _filter(allFiles, file => !_endsWith(file, '.md'))

    if (_isEmpty(directories)) {
      return allFiles
    }

    const files = _map(
      _filter(allFiles, file => _endsWith(file, '.md')),
      file => _replace(file, /\.md$/, ''),
    )

    let filesInDirectories: any[] = []

    for (let i = 0; i < _size(directories); ++i) {
      const directory = directories[i]

      // set to true for infinite depth directory look-up
      // eslint-disable-next-line
      const _files = await this.getSitemapFileNames(directory, infiniteRecursive)
      filesInDirectories = [
        ...filesInDirectories,
        ..._map(_files, file => [directory, _replace(file, /\.md$/, '')]),
      ]
    }

    const sitemap = [...files, ...filesInDirectories]

    await redis.set(
      REDIS_SITEMAP_KEY,
      JSON.stringify(sitemap),
      'EX',
      REDIS_SITEMAP_LIFETIME,
    )

    return sitemap
  }

  async getAll() {
    return getArticlesMetaData()
  }
}
