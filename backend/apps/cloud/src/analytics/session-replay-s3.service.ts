import crypto from 'crypto'
import { Readable } from 'stream'
import { Injectable } from '@nestjs/common'

interface S3Config {
  endpoint: string
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
}

type HeaderMap = Record<string, string>
type PutObjectBody = Buffer | Readable

const SESSION_REPLAY_STORAGE_TIMEOUT_MS = 30_000
// Hetzner object storage intermittently returns 503s; dropped replay chunks
// are unrecoverable, so transient failures get a couple of retries.
const SESSION_REPLAY_STORAGE_MAX_ATTEMPTS = 3
const SESSION_REPLAY_STORAGE_RETRY_BASE_DELAY_MS = 300
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

const sha256Hex = (value: Buffer | string) =>
  crypto.createHash('sha256').update(value).digest('hex')

const hmac = (key: Buffer | string, value: string) =>
  crypto.createHmac('sha256', key).update(value).digest()

const encodeKeyPath = (key: string) =>
  key.split('/').map(encodeURIComponent).join('/')

const encodeQueryValue = (value: string) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )

const normalizeEndpoint = (endpoint: string) => {
  const value = endpoint.trim().replace(/\/+$/, '')

  return /^https?:\/\//.test(value) ? value : `https://${value}`
}

const inferHetznerRegion = (endpoint: string) => {
  const suffix = '.your-objectstorage.com'
  const hostname = new URL(endpoint).hostname

  if (!hostname.endsWith(suffix)) {
    return ''
  }

  return hostname.slice(0, -suffix.length).split('.')[0] || ''
}

const decodeXmlValue = (value: string) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')

@Injectable()
export class SessionReplayS3Service {
  private getConfig(): S3Config | null {
    const endpointValue =
      process.env.SESSION_REPLAY_S3_ENDPOINT || process.env.HETZNER_S3_ENDPOINT
    const endpoint = endpointValue ? normalizeEndpoint(endpointValue) : ''
    const region = endpoint ? inferHetznerRegion(endpoint) : ''
    const bucket =
      process.env.SESSION_REPLAY_S3_BUCKET || process.env.HETZNER_S3_BUCKET
    const accessKeyId =
      process.env.SESSION_REPLAY_S3_ACCESS_KEY_ID ||
      process.env.HETZNER_S3_ACCESS_KEY_ID
    const secretAccessKey =
      process.env.SESSION_REPLAY_S3_SECRET_ACCESS_KEY ||
      process.env.HETZNER_S3_SECRET_ACCESS_KEY

    if (!endpoint || !bucket || !region || !accessKeyId || !secretAccessKey) {
      return null
    }

    return {
      endpoint,
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
    }
  }

  isConfigured(): boolean {
    return Boolean(this.getConfig())
  }

  async putObject(
    key: string,
    body: PutObjectBody,
    contentType = 'application/json',
    options: { contentLength?: number; payloadHash?: string } = {},
  ): Promise<void> {
    const headers: HeaderMap = {
      'content-type': contentType,
    }

    if (typeof options.contentLength === 'number') {
      headers['content-length'] = String(options.contentLength)
    }

    const response = await this.signedFetch(
      'PUT',
      key,
      body,
      headers,
      options.payloadHash,
    )

    if (!response.ok) {
      throw new Error(`Hetzner S3 PUT failed with status ${response.status}`)
    }
  }

  async getObject(key: string): Promise<Buffer | null> {
    const response = await this.signedFetch('GET', key)

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      throw new Error(`Hetzner S3 GET failed with status ${response.status}`)
    }

    return Buffer.from(await response.arrayBuffer())
  }

  async getObjectStream(key: string): Promise<{
    body: Readable
    contentLength?: string
    contentType?: string
  } | null> {
    const response = await this.signedFetch('GET', key)

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      throw new Error(`Hetzner S3 GET failed with status ${response.status}`)
    }

    if (!response.body) {
      return null
    }

    return {
      body: Readable.fromWeb(response.body as any),
      contentLength: response.headers.get('content-length') || undefined,
      contentType: response.headers.get('content-type') || undefined,
    }
  }

  async deleteObject(key: string): Promise<void> {
    const response = await this.signedFetch('DELETE', key)

    if (!response.ok && response.status !== 404) {
      throw new Error(`Hetzner S3 DELETE failed with status ${response.status}`)
    }
  }

  async listObjects(prefix: string): Promise<string[]> {
    const keys: string[] = []
    let continuationToken: string | undefined

    do {
      const response = await this.signedFetch(
        'GET',
        '',
        undefined,
        {},
        undefined,
        {
          'list-type': '2',
          prefix,
          'max-keys': '1000',
          'continuation-token': continuationToken,
        },
      )

      if (!response.ok) {
        throw new Error(`Hetzner S3 LIST failed with status ${response.status}`)
      }

      const xml = await response.text()
      const keyRegex = /<Key>([\s\S]*?)<\/Key>/g
      let keyMatch = keyRegex.exec(xml)

      while (keyMatch) {
        keys.push(decodeXmlValue(keyMatch[1]))
        keyMatch = keyRegex.exec(xml)
      }

      continuationToken = xml.match(
        /<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/,
      )?.[1]

      if (continuationToken) {
        continuationToken = decodeXmlValue(continuationToken)
      }
    } while (continuationToken)

    return keys
  }

  private async signedFetch(
    method: 'PUT' | 'GET' | 'DELETE',
    key: string,
    body?: PutObjectBody,
    extraHeaders: HeaderMap = {},
    payloadHashOverride?: string,
    queryParams: Record<string, string | undefined> = {},
  ): Promise<Response> {
    // Stream bodies can only be read once, so they get a single attempt.
    const attempts =
      body instanceof Readable ? 1 : SESSION_REPLAY_STORAGE_MAX_ATTEMPTS
    let lastError: unknown

    for (let attempt = 0; attempt < attempts; attempt++) {
      if (attempt > 0) {
        await sleep(
          SESSION_REPLAY_STORAGE_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
        )
      }

      try {
        const response = await this.signedFetchOnce(
          method,
          key,
          body,
          extraHeaders,
          payloadHashOverride,
          queryParams,
        )

        if (
          RETRYABLE_STATUS_CODES.has(response.status) &&
          attempt < attempts - 1
        ) {
          lastError = new Error(
            `Hetzner S3 ${method} failed with status ${response.status}`,
          )
          continue
        }

        return response
      } catch (reason) {
        lastError = reason
      }
    }

    throw lastError
  }

  private async signedFetchOnce(
    method: 'PUT' | 'GET' | 'DELETE',
    key: string,
    body?: PutObjectBody,
    extraHeaders: HeaderMap = {},
    payloadHashOverride?: string,
    queryParams: Record<string, string | undefined> = {},
  ): Promise<Response> {
    const config = this.getConfig()
    if (!config) {
      throw new Error('Hetzner S3 session replay storage is not configured')
    }

    const hasStreamBody = body instanceof Readable
    if (hasStreamBody && !payloadHashOverride) {
      throw new Error('Stream uploads require a payload hash')
    }

    const payloadHash =
      payloadHashOverride ||
      sha256Hex(body instanceof Readable ? '' : body || '')
    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.slice(0, 8)
    const endpoint = new URL(config.endpoint)
    const canonicalQuery = Object.entries(queryParams)
      .filter(([, value]) => value !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, value]) =>
          `${encodeQueryValue(key)}=${encodeQueryValue(value || '')}`,
      )
      .join('&')

    endpoint.hostname = `${config.bucket}.${endpoint.hostname}`
    endpoint.pathname = `/${encodeKeyPath(key)}`
    endpoint.search = canonicalQuery ? `?${canonicalQuery}` : ''

    const headers: HeaderMap = {
      host: endpoint.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      ...extraHeaders,
    }
    const signedHeaderKeys = Object.keys(headers)
      .map((header) => header.toLowerCase())
      .sort()
    const canonicalHeaders = signedHeaderKeys
      .map((header) => `${header}:${headers[header].trim()}\n`)
      .join('')
    const signedHeaders = signedHeaderKeys.join(';')
    const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`
    const canonicalRequest = [
      method,
      endpoint.pathname,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n')
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join('\n')
    const dateKey = hmac(`AWS4${config.secretAccessKey}`, dateStamp)
    const regionKey = hmac(dateKey, config.region)
    const serviceKey = hmac(regionKey, 's3')
    const signingKey = hmac(serviceKey, 'aws4_request')
    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(stringToSign)
      .digest('hex')

    headers.authorization = [
      `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(', ')
    const requestBody = body
      ? hasStreamBody
        ? (body as any)
        : new Uint8Array(body)
      : undefined
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      SESSION_REPLAY_STORAGE_TIMEOUT_MS,
    )
    const request: RequestInit & { duplex?: 'half' } = {
      method,
      headers,
      signal: controller.signal,
    }

    if (requestBody) {
      request.body = requestBody
      if (hasStreamBody) {
        request.duplex = 'half'
      }
    }

    try {
      return await fetch(endpoint, request)
    } finally {
      clearTimeout(timeout)
    }
  }
}
