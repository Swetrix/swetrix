import { Injectable, Logger } from '@nestjs/common'
import { createHmac } from 'crypto'
import {
  NotificationChannel,
  NotificationChannelType,
} from '../entity/notification-channel.entity'
import { ChannelDispatcher, RenderedAlertMessage } from './types'
import { postWithFilteredAgent } from './http-client'

@Injectable()
export class WebhookChannelService implements ChannelDispatcher {
  readonly type = NotificationChannelType.WEBHOOK

  private readonly logger = new Logger(WebhookChannelService.name)

  static validateUrl(url: string): boolean {
    try {
      const u = new URL(url)
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
      const host = u.hostname.toLowerCase()
      // Block obvious internal targets so users can't probe localhost from our infra.
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host.endsWith('.local') ||
        host.endsWith('.internal')
      ) {
        return false
      }
      return true
    } catch {
      return false
    }
  }

  async send(
    channel: NotificationChannel,
    message: RenderedAlertMessage,
  ): Promise<void> {
    const cfg = channel.config as { url?: string; secret?: string | null }
    if (!cfg?.url || !WebhookChannelService.validateUrl(cfg.url)) return

    try {
      const payload = {
        type: 'alert',
        body: message.body,
        subject: message.subject,
        context: message.context,
        timestamp: new Date().toISOString(),
      }
      const bodyStr = JSON.stringify(payload)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Swetrix-Webhook/1.0',
      }
      if (cfg.secret) {
        const sig = createHmac('sha256', cfg.secret)
          .update(bodyStr)
          .digest('hex')
        headers['X-Swetrix-Signature'] = `sha256=${sig}`
      }
      const webhookUrl = cfg.url
      const res = await postWithFilteredAgent({
        url: webhookUrl,
        headers,
        body: bodyStr,
        timeoutMs: 10_000,
      })
      if (!res.ok) {
        this.logger.warn(
          `Outbound webhook ${webhookUrl} responded with status ${res.status}`,
        )
      }
    } catch (reason) {
      this.logger.error(`Failed to send outbound webhook: ${reason}`)
    }
  }

  async ping(url: string, secret?: string | null): Promise<boolean> {
    if (!WebhookChannelService.validateUrl(url)) return false
    try {
      const payload = JSON.stringify({
        type: 'verification',
        timestamp: new Date().toISOString(),
      })
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Swetrix-Webhook/1.0',
      }
      if (secret) {
        const sig = createHmac('sha256', secret).update(payload).digest('hex')
        headers['X-Swetrix-Signature'] = `sha256=${sig}`
      }
      const res = await postWithFilteredAgent({
        url,
        headers,
        body: payload,
        timeoutMs: 5_000,
      })
      return res.ok
    } catch (reason) {
      this.logger.warn(`Webhook ping failed: ${reason}`)
      return false
    }
  }
}
