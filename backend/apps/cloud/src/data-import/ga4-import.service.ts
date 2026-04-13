import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OAuth2Client } from 'google-auth-library'
import * as crypto from 'crypto'

import { isDevelopment, PRODUCTION_ORIGIN, redis } from '../common/constants'
import { ProjectService } from '../project/project.service'
import { deriveKey } from '../common/utils'

const REDIS_STATE_PREFIX = 'ga4-import:state:'
const REDIS_TOKEN_PREFIX = 'ga4-import:token:'
const REDIS_TOKEN_TTL = 600 // 10 minutes

const GA4_REDIRECT_URL = isDevelopment
  ? 'http://localhost:3000/ga4-import-connected'
  : `${PRODUCTION_ORIGIN}/ga4-import-connected`

const ENCRYPTION_KEY = Buffer.from(deriveKey('ga4-token', 32), 'hex')

function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`
}

function decryptToken(ciphertext: string): string {
  const parts = ciphertext.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format')
  }
  const [ivHex, encHex, tagHex] = parts
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    ENCRYPTION_KEY,
    Buffer.from(ivHex, 'hex'),
  )
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}

const GA4_SCOPES = ['https://www.googleapis.com/auth/analytics.readonly']

export interface Ga4Property {
  propertyId: string
  displayName: string
}

@Injectable()
export class Ga4ImportService {
  constructor(
    private readonly configService: ConfigService,
    private readonly projectService: ProjectService,
  ) {}

  private getCredentials() {
    const clientId = this.configService.get<string>('GOOGLE_GA4_CLIENT_ID')
    const clientSecret = this.configService.get<string>(
      'GOOGLE_GA4_CLIENT_SECRET',
    )

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        'Google Analytics import is not configured on this instance',
      )
    }

    return { clientId, clientSecret }
  }

  private getOAuthClient() {
    const { clientId, clientSecret } = this.getCredentials()
    return new OAuth2Client(clientId, clientSecret, GA4_REDIRECT_URL)
  }

  async generateConnectURL(uid: string, pid: string): Promise<{ url: string }> {
    const project = await this.projectService.getFullProject(pid)
    this.projectService.allowedToManage(project, uid)

    const oauth2Client = this.getOAuthClient()

    const state = `${pid}:${uid}:${Date.now()}`
    await redis.set(
      REDIS_STATE_PREFIX + state,
      JSON.stringify({ uid, pid }),
      'EX',
      REDIS_TOKEN_TTL,
    )

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GA4_SCOPES,
      prompt: 'consent',
      state,
    })

    return { url }
  }

  async handleOAuthCallback(
    uid: string,
    code: string,
    state: string,
  ): Promise<{ pid: string }> {
    const cached = await redis.get(REDIS_STATE_PREFIX + state)
    if (!cached) {
      throw new BadRequestException('Invalid or expired OAuth state')
    }

    const { pid, uid: stateUid } = JSON.parse(cached) as {
      pid: string
      uid: string
    }

    if (stateUid !== uid) {
      throw new BadRequestException('OAuth state mismatch')
    }

    const project = await this.projectService.getFullProject(pid)
    this.projectService.allowedToManage(project, uid)

    const oauth2Client = this.getOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.refresh_token) {
      throw new BadRequestException(
        'Google did not return a refresh token. Please try connecting again.',
      )
    }

    const encrypted = encryptToken(tokens.refresh_token)

    await redis.set(
      REDIS_TOKEN_PREFIX + `${uid}:${pid}`,
      encrypted,
      'EX',
      REDIS_TOKEN_TTL,
    )

    await redis.del(REDIS_STATE_PREFIX + state)

    return { pid }
  }

  async listProperties(uid: string, pid: string): Promise<Ga4Property[]> {
    const project = await this.projectService.getFullProject(pid)
    this.projectService.allowedToManage(project, uid)

    const encrypted = await redis.get(REDIS_TOKEN_PREFIX + `${uid}:${pid}`)
    if (!encrypted) {
      throw new BadRequestException(
        'Google Analytics connection expired. Please connect again.',
      )
    }

    const refreshToken = decryptToken(encrypted)

    const oauth2Client = this.getOAuthClient()
    oauth2Client.setCredentials({ refresh_token: refreshToken })

    const { token } = await oauth2Client.getAccessToken()
    if (!token) {
      throw new InternalServerErrorException(
        'Failed to obtain access token from Google',
      )
    }

    // Refresh the TTL since the user is actively using the connection
    await redis.expire(REDIS_TOKEN_PREFIX + `${uid}:${pid}`, REDIS_TOKEN_TTL)

    try {
      const url = new URL(
        'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
      )
      url.searchParams.set('pageSize', '200')

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.status === 403) {
        const body = await response.json()
        throw new BadRequestException(
          body?.error?.message ||
            'Access denied by Google. Please ensure the "Google Analytics Admin API" is enabled in your Google Cloud project and that your Google account has access to at least one GA4 property.',
        )
      }

      if (!response.ok) {
        throw new Error(`Google API responded with status ${response.status}`)
      }

      const data = await response.json()
      const properties: Ga4Property[] = []

      for (const account of data.accountSummaries || []) {
        for (const prop of account.propertySummaries || []) {
          properties.push({
            propertyId: prop.property?.replace('properties/', '') || '',
            displayName: prop.displayName || prop.property || 'Unknown',
          })
        }
      }

      return properties
    } catch (error) {
      if (error instanceof BadRequestException) throw error

      throw new InternalServerErrorException(
        'Failed to fetch Google Analytics properties. Please try again.',
      )
    }
  }

  consumeTokenForImport(
    uid: string,
    pid: string,
  ): Promise<{
    encryptedRefreshToken: string
    clientId: string
    clientSecret: string
  }> {
    return this.getAndDeleteToken(uid, pid)
  }

  private async getAndDeleteToken(
    uid: string,
    pid: string,
  ): Promise<{
    encryptedRefreshToken: string
    clientId: string
    clientSecret: string
  }> {
    const key = REDIS_TOKEN_PREFIX + `${uid}:${pid}`
    const encrypted = await redis.getdel(key)

    if (!encrypted) {
      throw new BadRequestException(
        'Google Analytics connection expired. Please connect again.',
      )
    }

    const { clientId, clientSecret } = this.getCredentials()

    return { encryptedRefreshToken: encrypted, clientId, clientSecret }
  }

  isConfigured(): boolean {
    const clientId = this.configService.get<string>('GOOGLE_GA4_CLIENT_ID')
    const clientSecret = this.configService.get<string>(
      'GOOGLE_GA4_CLIENT_SECRET',
    )
    return !!(clientId && clientSecret)
  }
}
