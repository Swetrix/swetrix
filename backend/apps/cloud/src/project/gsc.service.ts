import _isEmpty from 'lodash/isEmpty'
import dayjs from 'dayjs'
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { google } from 'googleapis'
import CryptoJS from 'crypto-js'

import { isDevelopment, PRODUCTION_ORIGIN, redis } from '../common/constants'
import { ProjectService } from './project.service'
import { deriveKey } from '../common/utils'

type StoredTokens = {
  access_token?: string
  refresh_token?: string
  scope?: string
  expiry_date?: number
  property_uri?: string | null
}

const REDIS_STATE_PREFIX = 'gsc:state:'

const GSC_REDIRECT_URL = isDevelopment
  ? 'http://localhost:3000/gsc-connected'
  : `${PRODUCTION_ORIGIN}/gsc-connected`

const ENCRYPTION_KEY = deriveKey('gsc-token')

@Injectable()
export class GSCService {
  constructor(
    private readonly configService: ConfigService,
    private readonly projectService: ProjectService,
  ) {}

  private getOAuthClient() {
    const clientId = this.configService.get<string>('GOOGLE_GSC_CLIENT_ID')
    const clientSecret = this.configService.get<string>(
      'GOOGLE_GSC_CLIENT_SECRET',
    )

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        'Google GSC Client is not configured',
      )
    }

    return new google.auth.OAuth2(clientId, clientSecret, GSC_REDIRECT_URL)
  }

  async generateConnectURL(uid: string, pid: string): Promise<{ url: string }> {
    const oauth2Client = this.getOAuthClient()

    const state = `${pid}:${uid}:${Date.now()}`
    await redis.set(
      REDIS_STATE_PREFIX + state,
      JSON.stringify({ uid, pid }),
      'EX',
      600,
    )

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/webmasters.readonly'],
      prompt: 'consent',
      state,
    })

    return { url }
  }

  async handleOAuthCallback(code: string, state: string) {
    const cached = await redis.get(REDIS_STATE_PREFIX + state)
    if (!cached) {
      throw new BadRequestException('Invalid or expired OAuth state')
    }

    const { pid } = JSON.parse(cached)

    const oauth2Client = this.getOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)

    const toStore: StoredTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
      // preserve previously selected property if any
      ...(await this.getStoredTokens(pid)),
    }

    await this.setStoredTokens(pid, toStore)

    // One-time state
    await redis.del(REDIS_STATE_PREFIX + state)

    return { pid }
  }

  private async getStoredTokens(pid: string): Promise<StoredTokens> {
    const project = await this.projectService.findOne({
      where: { id: pid },
      select: [
        'gscAccessTokenEnc',
        'gscRefreshTokenEnc',
        'gscTokenExpiry',
        'gscScope',
        'gscPropertyUri',
      ],
    })

    if (!project) return {}

    const decrypt = (val?: string | null) => {
      if (!val) return undefined
      try {
        const bytes = CryptoJS.Rabbit.decrypt(val, ENCRYPTION_KEY)
        return bytes.toString(CryptoJS.enc.Utf8) || undefined
      } catch {
        return undefined
      }
    }

    const expiry = project.gscTokenExpiry
      ? Number(project.gscTokenExpiry)
      : undefined

    return {
      access_token: decrypt(project.gscAccessTokenEnc),
      refresh_token: decrypt(project.gscRefreshTokenEnc),
      expiry_date: expiry,
      scope: project.gscScope || undefined,
      property_uri: project.gscPropertyUri || null,
    }
  }

  private async setStoredTokens(pid: string, tokens: StoredTokens) {
    const encrypt = (val?: string) =>
      val ? CryptoJS.Rabbit.encrypt(val, ENCRYPTION_KEY).toString() : null

    await this.projectService.update({ id: pid }, {
      gscAccessTokenEnc: encrypt(tokens.access_token),
      gscRefreshTokenEnc: encrypt(tokens.refresh_token),
      gscTokenExpiry: tokens.expiry_date as any,
      gscScope: tokens.scope || null,
      gscPropertyUri: tokens.property_uri ?? null,
    } as any)
  }

  async disconnect(pid: string) {
    await this.projectService.update({ id: pid }, {
      gscAccessTokenEnc: null,
      gscRefreshTokenEnc: null,
      gscTokenExpiry: null,
      gscScope: null,
      gscPropertyUri: null,
    } as any)
  }

  async isConnected(pid: string) {
    const tokens = await this.getStoredTokens(pid)
    return !_isEmpty(tokens?.refresh_token || tokens?.access_token)
  }

  private async getAuthedClientForPid(pid: string) {
    const tokens = await this.getStoredTokens(pid)
    if (_isEmpty(tokens)) {
      throw new BadRequestException(
        'Search Console is not connected for this project',
      )
    }
    const oauth2Client = this.getOAuthClient()
    oauth2Client.setCredentials(tokens)

    // Refresh if expired
    if (tokens.expiry_date && tokens.expiry_date <= Date.now()) {
      const refreshed = await oauth2Client.getAccessToken()
      const newAccess =
        typeof refreshed === 'string' ? refreshed : refreshed?.token
      if (newAccess) {
        const updated: StoredTokens = {
          ...tokens,
          access_token: newAccess,
          expiry_date: Date.now() + 55 * 60 * 1000,
        }
        await this.setStoredTokens(pid, updated)
        oauth2Client.setCredentials({ ...updated })
      }
    }

    return oauth2Client
  }

  async listSites(
    pid: string,
  ): Promise<{ siteUrl: string; permissionLevel?: string }[]> {
    const auth = await this.getAuthedClientForPid(pid)
    const sc = google.searchconsole({ version: 'v1', auth })
    try {
      const { data } = await sc.sites.list({})
      // @ts-ignore
      const sites = (data?.siteEntry || data?.siteEntries || []) as any[]
      return sites.map((s: any) => ({
        siteUrl: s.siteUrl,
        permissionLevel: s.permissionLevel,
      }))
    } catch {
      throw new InternalServerErrorException(
        'Failed to fetch Search Console sites',
      )
    }
  }

  async setProperty(pid: string, propertyUri: string) {
    const tokens = await this.getStoredTokens(pid)
    if (_isEmpty(tokens)) {
      throw new BadRequestException(
        'Search Console is not connected for this project',
      )
    }
    await this.projectService.update({ id: pid }, {
      gscPropertyUri: propertyUri ?? null,
    } as any)
  }

  async getKeywords(
    pid: string,
    from: string,
    to: string,
  ): Promise<
    {
      name: string
      count: number
      impressions: number
      position: number
      ctr: number
    }[]
  > {
    const tokens = await this.getStoredTokens(pid)
    if (_isEmpty(tokens) || _isEmpty(tokens.property_uri)) {
      throw new BadRequestException(
        'Search Console property is not linked for this project',
      )
    }

    const auth = await this.getAuthedClientForPid(pid)
    const sc = google.searchconsole({ version: 'v1', auth })

    // Dates must be YYYY-MM-DD
    const startDate = dayjs(from).format('YYYY-MM-DD')
    const endDate = dayjs(to).format('YYYY-MM-DD')

    try {
      const { data } = await sc.searchanalytics.query({
        siteUrl: tokens.property_uri as string,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['query'],
          rowLimit: 250, // enough for UI panel
          dataState: 'final',
        },
      })

      const rows = (data.rows || []) as Array<{
        keys: string[]
        clicks?: number
        impressions?: number
        ctr?: number
        position?: number
      }>
      return rows
        .map(row => ({
          name: row.keys?.[0] || '(not set)',
          count: Math.round(row.clicks || 0),
          impressions: Math.round(row.impressions || 0),
          position: Number(Number(row.position || 0).toFixed(2)),
          ctr: Number(Number((row.ctr || 0) * 100).toFixed(2)), // return CTR in percent
        }))
        .filter(Boolean)
    } catch {
      throw new InternalServerErrorException(
        'Failed to fetch keywords from Search Console',
      )
    }
  }
}
