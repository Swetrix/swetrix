import crypto from 'crypto'
import { UnauthorizedException } from '@nestjs/common'

import { AppLoggerService } from '../logger/logger.service'
import { RankPineBlogService } from './rankpine-blog.service'

const SECRET = 'rankpine-test-secret'
const ENV_KEYS = [
  'RANKPINE_BLOG_WEBHOOK_SECRET',
  'RANKPINE_BLOG_GITHUB_TOKEN',
  'RANKPINE_BLOG_GITHUB_REPOSITORY',
  'RANKPINE_BLOG_GITHUB_BRANCH',
  'RANKPINE_BLOG_SITE_URL',
  'RANKPINE_BLOG_LANGUAGE',
  'RANKPINE_BLOG_TIME_ZONE',
  'RANKPINE_BLOG_AUTHOR',
  'RANKPINE_BLOG_TWITTER_HANDLE',
  'RANKPINE_BLOG_COMMITTER_NAME',
  'RANKPINE_BLOG_COMMITTER_EMAIL',
] as const
const ORIGINAL_ENV = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
)

function signature(body: string): string {
  return `sha256=${crypto.createHmac('sha256', SECRET).update(body).digest('hex')}`
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('RankPineBlogService', () => {
  const logger = {
    error: jest.fn(),
    log: jest.fn(),
  } as unknown as AppLoggerService
  const service = new RankPineBlogService(logger)

  beforeEach(() => {
    process.env.RANKPINE_BLOG_WEBHOOK_SECRET = SECRET
    process.env.RANKPINE_BLOG_GITHUB_TOKEN = 'github-test-token'
    process.env.RANKPINE_BLOG_GITHUB_REPOSITORY = 'Swetrix/blog-posts'
    process.env.RANKPINE_BLOG_GITHUB_BRANCH = 'main'
    process.env.RANKPINE_BLOG_SITE_URL = 'https://swetrix.com'
    process.env.RANKPINE_BLOG_LANGUAGE = 'en'
    process.env.RANKPINE_BLOG_TIME_ZONE = 'Europe/London'
    process.env.RANKPINE_BLOG_AUTHOR = 'Andrii Romasiun'
    process.env.RANKPINE_BLOG_TWITTER_HANDLE = 'andrii_rom'
    process.env.RANKPINE_BLOG_COMMITTER_NAME = 'Swetrix Content Bot'
    process.env.RANKPINE_BLOG_COMMITTER_EMAIL = 'content-bot@swetrix.com'
    jest.clearAllMocks()
  })

  afterAll(() => {
    for (const key of ENV_KEYS) {
      const value = ORIGINAL_ENV[key]

      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })

  it('accepts a signed verification ping without calling GitHub', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
    const body = JSON.stringify({
      event: 'verification',
      sentAt: '2026-08-17T08:00:00.000Z',
    })

    await expect(
      service.handle(Buffer.from(body), signature(body), 'verification'),
    ).resolves.toEqual({ ok: true, verified: true })
    expect(fetchMock).not.toHaveBeenCalled()

    fetchMock.mockRestore()
  })

  it('rejects a request whose HMAC does not match', async () => {
    const body = JSON.stringify({ event: 'verification' })

    await expect(
      service.handle(Buffer.from(body), 'sha256=wrong', 'verification'),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('creates one idempotent bot-authored post and strips the duplicate H1', async () => {
    const files = new Map<string, string>([
      [
        'posts/2026-08-01-older-automated-post.md',
        'This different slug must not be overwritten.',
      ],
    ])
    const writes: Array<Record<string, unknown>> = []
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = new URL(String(input))
        const contentsMarker = '/contents/'

        if (url.pathname.includes('/git/trees/')) {
          return response({
            truncated: false,
            tree: [...files.keys()].map((path) => ({ path, type: 'blob' })),
          })
        }

        if (!url.pathname.includes(contentsMarker)) {
          return response({ message: 'Not Found' }, 404)
        }

        const path = decodeURIComponent(
          url.pathname.slice(
            url.pathname.indexOf(contentsMarker) + contentsMarker.length,
          ),
        )

        if ((init?.method || 'GET') === 'GET') {
          const content = files.get(path)

          if (content === undefined) {
            return response({ message: 'Not Found' }, 404)
          }

          return response({
            path,
            sha: 'existing-sha',
            encoding: 'base64',
            content: Buffer.from(content).toString('base64'),
            html_url: `https://github.com/Swetrix/blog-posts/blob/main/${path}`,
          })
        }

        const request = JSON.parse(String(init?.body)) as {
          content: string
          author: { name: string; email: string }
          committer: { name: string; email: string }
        }
        files.set(path, Buffer.from(request.content, 'base64').toString('utf8'))
        writes.push(request)

        return response(
          {
            content: {
              path,
              sha: 'new-sha',
              html_url: `https://github.com/Swetrix/blog-posts/blob/main/${path}`,
            },
          },
          201,
        )
      })

    const payload = {
      event: 'article.published',
      publishedAt: '2026-08-17T08:01:00.000Z',
      site: {
        name: 'Swetrix',
        url: 'https://swetrix.com/',
        language: 'en',
      },
      article: {
        id: 'article-123',
        title: 'Automated Post',
        slug: 'automated-post',
        metaDescription: 'An automated article.',
        scheduledFor: '2026-08-17T00:30:00+01:00',
        language: 'en',
        markdown: '# Automated Post\n\nFirst paragraph.\n\n## Details\n\nBody.',
      },
    }
    const body = JSON.stringify(payload)

    const first = await service.handle(
      Buffer.from(body),
      signature(body),
      'article.published',
    )
    const second = await service.handle(
      Buffer.from(body),
      signature(body),
      'article.published',
    )

    expect(first).toEqual({
      ok: true,
      id: 'posts/2026-08-17-automated-post.md',
      url: 'https://swetrix.com/blog/automated-post',
      changed: true,
    })
    expect(second).toEqual({ ...first, changed: false })
    expect(writes).toHaveLength(1)
    expect(writes[0].author).toEqual({
      name: 'Swetrix Content Bot',
      email: 'content-bot@swetrix.com',
    })
    expect(writes[0].committer).toEqual(writes[0].author)
    expect(files.get('posts/2026-08-17-automated-post.md')).toBe(
      [
        '---',
        'title: "Automated Post"',
        'intro: "An automated article."',
        'date: August 17, 2026',
        'hidden: false',
        'author: "Andrii Romasiun"',
        'twitter_handle: "andrii_rom"',
        'rankpine_id: "article-123"',
        '---',
        '',
        'First paragraph.',
        '',
        '## Details',
        '',
        'Body.',
        '',
      ].join('\n'),
    )

    fetchMock.mockRestore()
  })
})
