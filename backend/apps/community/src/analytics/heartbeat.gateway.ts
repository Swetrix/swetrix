import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import _split from 'lodash/split'

import { AnalyticsService } from './analytics.service'
import { AppLoggerService } from '../logger/logger.service'
import { isProxiedByCloudflare } from '../common/constants'

// Heartbeat interval: update session every 60 seconds
const HEARTBEAT_INTERVAL_MS = 60_000

interface WsSession {
  pid: string
  psid: string
  profileId: string
  intervalRef: ReturnType<typeof setInterval>
}

@WebSocketGateway({
  namespace: '/hb',
  cors: {
    origin: '*',
  },
})
export class HeartbeatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server

  private sessions = new Map<string, WsSession>()

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly logger: AppLoggerService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const { pid, profileId: clientProfileId } = client.handshake.query as {
        pid?: string
        profileId?: string
      }
      const userAgent = client.handshake.headers['user-agent'] || ''
      const origin = client.handshake.headers['origin'] as string

      // Extract IP from handshake
      const ip = this.getIPFromSocket(client)

      if (!pid) {
        this.logger.warn(
          `[WS HB] Connection rejected: missing pid`,
          'HeartbeatGateway',
        )
        client.disconnect()
        return
      }

      // Check if bot
      const isBot = await this.analyticsService.isBot(pid, userAgent)
      if (isBot) {
        client.disconnect()
        return
      }

      // Validate the heartbeat request (checks project active, origin, IP blacklist)
      try {
        await this.analyticsService.validateHeartbeat({ pid }, origin, ip)
      } catch (error) {
        this.logger.warn(
          `[WS HB] Connection rejected for pid ${pid}: ${error.message}`,
          'HeartbeatGateway',
        )
        client.disconnect()
        return
      }

      // Get or validate existing session
      const { exists, psid } = await this.analyticsService.getSessionId(
        pid,
        userAgent,
        ip,
      )

      if (!exists) {
        this.logger.warn(
          `[WS HB] Connection rejected: no session exists for pid ${pid}`,
          'HeartbeatGateway',
        )
        client.emit('error', {
          message:
            'No session exists. Please send a pageview or custom event first.',
        })
        client.disconnect()
        return
      }

      // Generate profile ID
      const profileId = await this.analyticsService.generateProfileId(
        pid,
        userAgent,
        ip,
        clientProfileId,
      )

      // Initial heartbeat
      await this.analyticsService.extendSessionTTL(psid)
      await this.analyticsService.recordSessionActivity(psid, pid, profileId)

      // Set up interval for periodic heartbeat
      const intervalRef = setInterval(async () => {
        try {
          await this.analyticsService.extendSessionTTL(psid)
          await this.analyticsService.recordSessionActivity(
            psid,
            pid,
            profileId,
          )
        } catch (error) {
          this.logger.error(
            `[WS HB] Heartbeat interval error for pid ${pid}: ${error.message}`,
            error.stack,
            'HeartbeatGateway',
          )
        }
      }, HEARTBEAT_INTERVAL_MS)

      // Store session data
      this.sessions.set(client.id, {
        pid,
        psid,
        profileId,
        intervalRef,
      })

      client.emit('connected', { message: 'Heartbeat session established' })
    } catch (error) {
      this.logger.error(
        `[WS HB] Connection error: ${error.message}`,
        error.stack,
        'HeartbeatGateway',
      )
      client.disconnect()
    }
  }

  async handleDisconnect(client: Socket) {
    const session = this.sessions.get(client.id)

    if (session) {
      // Clear the interval
      clearInterval(session.intervalRef)

      // Final session activity update
      try {
        await this.analyticsService.recordSessionActivity(
          session.psid,
          session.pid,
          session.profileId,
        )
      } catch (error) {
        this.logger.error(
          `[WS HB] Disconnect error for pid ${session.pid}: ${error.message}`,
          error.stack,
          'HeartbeatGateway',
        )
      }

      // Remove from sessions map
      this.sessions.delete(client.id)
    }
  }

  private getIPFromSocket(client: Socket): string {
    const headers = client.handshake.headers

    if (isProxiedByCloudflare && headers['cf-connecting-ip']) {
      const cfIP = headers['cf-connecting-ip']
      return Array.isArray(cfIP) ? cfIP[0] : cfIP
    }

    // Get IP based on the NGINX configuration
    let ip = headers['x-real-ip']

    if (ip) {
      return Array.isArray(ip) ? ip[0] : ip
    }

    ip = headers['x-forwarded-for'] || null

    if (!ip) {
      return client.handshake.address || ''
    }

    const ipStr = Array.isArray(ip) ? ip[0] : ip
    return _split(ipStr, ',')[0]
  }
}
