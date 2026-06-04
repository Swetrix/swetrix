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

const sha256Hex = (value: Buffer | string) =>
  crypto.createHash('sha256').update(value).digest('hex')

const hmac = (key: Buffer | string, value: string) =>
  crypto.createHmac('sha256', key).update(value).digest()

const encodeKeyPath = (key: string) =>
  key.split('/').map(encodeURIComponent).join('/')

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
    body: Buffer,
    contentType = 'application/json',
  ): Promise<void> {
    const response = await this.signedFetch('PUT', key, body, {
      'content-type': contentType,
    })

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

  private async signedFetch(
    method: 'PUT' | 'GET' | 'DELETE',
    key: string,
    body?: Buffer,
    extraHeaders: HeaderMap = {},
  ): Promise<Response> {
    const config = this.getConfig()
    if (!config) {
      throw new Error('Hetzner S3 session replay storage is not configured')
    }

    const payloadHash = sha256Hex(body || '')
    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.slice(0, 8)
    const endpoint = new URL(config.endpoint)
    endpoint.hostname = `${config.bucket}.${endpoint.hostname}`
    endpoint.pathname = `/${encodeKeyPath(key)}`

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
      '',
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
    const requestBody = body ? new Uint8Array(body) : undefined

    return fetch(endpoint, {
      method,
      headers,
      body: requestBody,
    })
  }
}
