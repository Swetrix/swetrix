import { Injectable } from '@nestjs/common'

import { AppLoggerService } from '../logger/logger.service'

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
const INDEXNOW_KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/
const MAX_URLS_PER_REQUEST = 10_000

@Injectable()
export class IndexNowService {
  constructor(private readonly logger: AppLoggerService) {}

  async submit(urls: string[]): Promise<boolean> {
    const key = process.env.INDEXNOW_KEY?.trim()

    if (!key) {
      this.logger.warn(
        'IndexNow URL submission is disabled because INDEXNOW_KEY is missing',
        'IndexNow',
        true,
      )
      return false
    }

    if (!INDEXNOW_KEY_PATTERN.test(key)) {
      throw new Error(
        'INDEXNOW_KEY must be 8 to 128 letters, numbers, or dashes',
      )
    }

    const uniqueUrls = [...new Set(urls)]

    if (uniqueUrls.length === 0) {
      return false
    }

    if (uniqueUrls.length > MAX_URLS_PER_REQUEST) {
      throw new Error(
        `IndexNow accepts at most ${MAX_URLS_PER_REQUEST} URLs per request`,
      )
    }

    const parsedUrls = uniqueUrls.map((url) => new URL(url))
    const host = parsedUrls[0].host

    if (
      parsedUrls.some(
        (url) =>
          !['http:', 'https:'].includes(url.protocol) || url.host !== host,
      )
    ) {
      throw new Error('IndexNow URLs must use HTTP(S) and share one host')
    }

    const keyLocation = new URL(`/${key}.txt`, parsedUrls[0].origin).toString()
    let response: Response

    try {
      response = await fetch(INDEXNOW_ENDPOINT, {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          host,
          key,
          keyLocation,
          urlList: uniqueUrls,
        }),
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`IndexNow request failed: ${reason}`)
    }

    if (!response.ok) {
      throw new Error(`IndexNow returned HTTP ${response.status}`)
    }

    this.logger.log(
      {
        status: response.status,
        urlCount: uniqueUrls.length,
        urls: uniqueUrls,
      },
      'IndexNow',
      true,
    )

    return true
  }
}
