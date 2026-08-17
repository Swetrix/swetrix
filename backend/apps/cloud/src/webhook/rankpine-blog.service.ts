import crypto from 'crypto'
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { z } from 'zod'

import { AppLoggerService } from '../logger/logger.service'

const GITHUB_API_URL = 'https://api.github.com'
const GITHUB_API_VERSION = '2026-03-10'
const DEFAULT_REPOSITORY = 'Swetrix/blog-posts'
const DEFAULT_BRANCH = 'main'
const DEFAULT_SITE_URL = 'https://swetrix.com'
const DEFAULT_LANGUAGE = 'en'
const DEFAULT_TIME_ZONE = 'Europe/London'
const DEFAULT_AUTHOR = 'Andrii Romasiun'
const DEFAULT_TWITTER_HANDLE = 'andrii_rom'
const DEFAULT_COMMITTER_NAME = 'Swetrix Content Bot'
const DEFAULT_COMMITTER_EMAIL = 'content-bot@swetrix.com'

const verificationSchema = z.object({
  event: z.literal('verification'),
})

const publishedArticleSchema = z.object({
  event: z.literal('article.published'),
  publishedAt: z.string().min(1),
  site: z.object({
    name: z.string().min(1),
    url: z.string().min(1),
    language: z.string().min(1),
  }),
  article: z.object({
    id: z.union([z.string(), z.number()]).nullable().optional(),
    title: z.string().trim().min(1).max(300),
    slug: z.string().trim().min(1).max(200),
    metaDescription: z.string().trim().max(500).optional(),
    scheduledFor: z.string().nullable().optional(),
    language: z.string().min(1),
    markdown: z.string().min(1).max(900_000),
  }),
})

interface PublisherConfig {
  secret: string
  githubToken: string
  owner: string
  repository: string
  branch: string
  siteUrl: string
  language: string
  timeZone: string
  author: string
  twitterHandle: string
  committer: {
    name: string
    email: string
  }
}

interface GitHubContent {
  path: string
  sha: string
  content?: string
  encoding?: string
  html_url?: string
}

interface GitHubTree {
  truncated: boolean
  tree: Array<{
    path: string
    type: string
  }>
}

interface GitHubWriteResponse {
  content: {
    path: string
    sha: string
    html_url: string
  }
}

class GitHubApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  )
}

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '')

  if (!slug) {
    throw new BadRequestException('Article slug is invalid')
  }

  return slug
}

function encodeGitHubPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

function getDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(date)
  const byType = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  )

  return {
    year: byType.year,
    month: byType.month,
    day: byType.day,
  }
}

function formatFileDate(date: Date, timeZone: string): string {
  const { year, month, day } = getDateParts(date, timeZone)
  return `${year}-${month}-${day}`
}

function formatPostDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone,
  }).format(date)
}

function stripLeadingTitle(markdown: string): string {
  return markdown.trim().replace(/^#(?!#)\s+[^\r\n]+(?:\r?\n)+/, '')
}

function quoteYaml(value: string): string {
  return JSON.stringify(value)
}

function parseRepository(value: string): { owner: string; repository: string } {
  const [owner, repository, ...rest] = value.split('/')

  if (
    rest.length > 0 ||
    !owner ||
    !repository ||
    !/^[a-z0-9_.-]+$/i.test(owner) ||
    !/^[a-z0-9_.-]+$/i.test(repository)
  ) {
    throw new Error('RANKPINE_BLOG_GITHUB_REPOSITORY must use owner/repository')
  }

  return { owner, repository }
}

function validDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function articleMarkdown(
  article: z.infer<typeof publishedArticleSchema>['article'],
  publishedDate: Date,
  config: PublisherConfig,
): string {
  const body = stripLeadingTitle(article.markdown)

  if (!body) {
    throw new BadRequestException('Article markdown has no body')
  }

  const intro = article.metaDescription || article.title
  const rankPineId =
    article.id == null ? [] : [`rankpine_id: ${quoteYaml(String(article.id))}`]
  const twitterHandle = config.twitterHandle
    ? [`twitter_handle: ${quoteYaml(config.twitterHandle)}`]
    : []

  return [
    '---',
    `title: ${quoteYaml(article.title)}`,
    `intro: ${quoteYaml(intro)}`,
    `date: ${formatPostDate(publishedDate, config.timeZone)}`,
    'hidden: false',
    `author: ${quoteYaml(config.author)}`,
    ...twitterHandle,
    ...rankPineId,
    '---',
    '',
    body,
    '',
  ].join('\n')
}

@Injectable()
export class RankPineBlogService {
  constructor(private readonly logger: AppLoggerService) {}

  private getConfig(): PublisherConfig {
    const secret = process.env.RANKPINE_BLOG_WEBHOOK_SECRET?.trim()
    const githubToken = process.env.RANKPINE_BLOG_GITHUB_TOKEN?.trim()

    if (!secret || !githubToken) {
      this.logger.error(
        'RankPine blog publishing is disabled because its secret or GitHub token is missing',
      )
      throw new ServiceUnavailableException(
        'RankPine blog publishing is not configured',
      )
    }

    const { owner, repository } = parseRepository(
      process.env.RANKPINE_BLOG_GITHUB_REPOSITORY || DEFAULT_REPOSITORY,
    )

    return {
      secret,
      githubToken,
      owner,
      repository,
      branch: process.env.RANKPINE_BLOG_GITHUB_BRANCH || DEFAULT_BRANCH,
      siteUrl: process.env.RANKPINE_BLOG_SITE_URL || DEFAULT_SITE_URL,
      language: process.env.RANKPINE_BLOG_LANGUAGE || DEFAULT_LANGUAGE,
      timeZone: process.env.RANKPINE_BLOG_TIME_ZONE || DEFAULT_TIME_ZONE,
      author: process.env.RANKPINE_BLOG_AUTHOR || DEFAULT_AUTHOR,
      twitterHandle:
        process.env.RANKPINE_BLOG_TWITTER_HANDLE ?? DEFAULT_TWITTER_HANDLE,
      committer: {
        name:
          process.env.RANKPINE_BLOG_COMMITTER_NAME || DEFAULT_COMMITTER_NAME,
        email:
          process.env.RANKPINE_BLOG_COMMITTER_EMAIL || DEFAULT_COMMITTER_EMAIL,
      },
    }
  }

  private verifySignature(
    rawBody: string,
    signature: string | undefined,
    secret: string,
  ): void {
    const expected = `sha256=${crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex')}`

    if (!signature || !safeEqual(signature, expected)) {
      throw new UnauthorizedException('Invalid RankPine webhook signature')
    }
  }

  private async githubRequest<T>(
    path: string,
    config: PublisherConfig,
    init: RequestInit = {},
  ): Promise<T> {
    let response: Response

    try {
      response = await fetch(`${GITHUB_API_URL}${path}`, {
        ...init,
        signal: AbortSignal.timeout(10_000),
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${config.githubToken}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': GITHUB_API_VERSION,
          ...init.headers,
        },
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new GitHubApiError(502, `GitHub request failed: ${reason}`)
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string
      } | null
      throw new GitHubApiError(
        response.status,
        payload?.message || `GitHub returned ${response.status}`,
      )
    }

    return (await response.json()) as T
  }

  private async getContent(
    path: string,
    config: PublisherConfig,
  ): Promise<GitHubContent | null> {
    try {
      return await this.githubRequest<GitHubContent>(
        `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(
          config.repository,
        )}/contents/${encodeGitHubPath(path)}?ref=${encodeURIComponent(
          config.branch,
        )}`,
        config,
      )
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 404) {
        return null
      }

      throw error
    }
  }

  private async findExistingPath(
    slug: string,
    desiredPath: string,
    config: PublisherConfig,
  ): Promise<string> {
    if (await this.getContent(desiredPath, config)) {
      return desiredPath
    }

    const tree = await this.githubRequest<GitHubTree>(
      `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(
        config.repository,
      )}/git/trees/${encodeURIComponent(config.branch)}?recursive=1`,
      config,
    )
    const pathPattern = new RegExp(`^posts/\\d{4}-\\d{2}-\\d{2}-${slug}\\.md$`)
    const existing = tree.tree.find(
      (entry) => entry.type === 'blob' && pathPattern.test(entry.path),
    )

    return existing?.path || desiredPath
  }

  private async writeContent(
    path: string,
    content: string,
    slug: string,
    config: PublisherConfig,
  ): Promise<{ changed: boolean; htmlUrl: string }> {
    const existing = await this.getContent(path, config)

    if (existing?.encoding === 'base64' && existing.content) {
      const current = Buffer.from(
        existing.content.replace(/\s/g, ''),
        'base64',
      ).toString('utf8')

      if (current === content) {
        return {
          changed: false,
          htmlUrl:
            existing.html_url ||
            `https://github.com/${config.owner}/${config.repository}/blob/${config.branch}/${path}`,
        }
      }
    }

    const body = {
      message: existing
        ? `Update blog post: ${slug}`
        : `Publish blog post: ${slug}`,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch: config.branch,
      author: config.committer,
      committer: config.committer,
      ...(existing ? { sha: existing.sha } : {}),
    }

    const result = await this.githubRequest<GitHubWriteResponse>(
      `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(
        config.repository,
      )}/contents/${encodeGitHubPath(path)}`,
      config,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      },
    )

    return { changed: true, htmlUrl: result.content.html_url }
  }

  private async publish(
    payload: z.infer<typeof publishedArticleSchema>,
    config: PublisherConfig,
  ) {
    let incomingOrigin: string
    let expectedOrigin: string

    try {
      incomingOrigin = new URL(payload.site.url).origin
      expectedOrigin = new URL(config.siteUrl).origin
    } catch {
      throw new BadRequestException('Webhook site URL is invalid')
    }

    if (incomingOrigin !== expectedOrigin) {
      throw new BadRequestException('Webhook is for a different site')
    }

    if (payload.article.language !== config.language) {
      throw new BadRequestException('Webhook article language is not supported')
    }

    const publishedDate =
      validDate(payload.article.scheduledFor) || validDate(payload.publishedAt)

    if (!publishedDate) {
      throw new BadRequestException('Webhook publication date is invalid')
    }

    const slug = slugify(payload.article.slug || payload.article.title)
    const desiredPath = `posts/${formatFileDate(
      publishedDate,
      config.timeZone,
    )}-${slug}.md`
    const path = await this.findExistingPath(slug, desiredPath, config)
    const content = articleMarkdown(payload.article, publishedDate, config)

    let result: { changed: boolean; htmlUrl: string }

    try {
      result = await this.writeContent(path, content, slug, config)
    } catch (error) {
      if (
        !(error instanceof GitHubApiError) ||
        ![409, 422].includes(error.status)
      ) {
        throw error
      }

      result = await this.writeContent(path, content, slug, config)
    }

    this.logger.log(
      {
        articleId: payload.article.id ?? null,
        path,
        changed: result.changed,
        commitUrl: result.htmlUrl,
      },
      'POST /webhook/rankpine',
      true,
    )

    return {
      ok: true,
      id: path,
      url: new URL(`/blog/${slug}`, expectedOrigin).toString(),
      changed: result.changed,
    }
  }

  async handle(
    body: Buffer,
    signature: string | undefined,
    eventHeader: string | undefined,
  ) {
    const config = this.getConfig()

    if (!Buffer.isBuffer(body)) {
      throw new BadRequestException('Webhook body must be raw JSON')
    }

    const rawBody = body.toString('utf8')
    this.verifySignature(rawBody, signature, config.secret)

    let json: unknown

    try {
      json = JSON.parse(rawBody)
    } catch {
      throw new BadRequestException('Webhook body is invalid JSON')
    }

    const verification = verificationSchema.safeParse(json)

    if (verification.success) {
      if (eventHeader && eventHeader !== 'verification') {
        throw new BadRequestException(
          'Webhook event header does not match body',
        )
      }

      return { ok: true, verified: true }
    }

    const published = publishedArticleSchema.safeParse(json)

    if (!published.success) {
      throw new BadRequestException('Webhook payload is invalid')
    }

    if (eventHeader && eventHeader !== published.data.event) {
      throw new BadRequestException('Webhook event header does not match body')
    }

    try {
      return await this.publish(published.data, config)
    } catch (error) {
      if (error instanceof GitHubApiError) {
        this.logger.error(
          {
            status: error.status,
            reason: error.message,
            articleId: published.data.article.id ?? null,
          },
          'POST /webhook/rankpine',
          true,
        )
        throw new BadGatewayException('Could not publish the article to GitHub')
      }

      throw error
    }
  }
}
