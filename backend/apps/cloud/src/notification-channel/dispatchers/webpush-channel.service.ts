import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import webpush, { type PushSubscription } from 'web-push'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import {
  NotificationChannel,
  NotificationChannelType,
} from '../entity/notification-channel.entity'
import { ChannelDispatcher, RenderedAlertMessage } from './types'

@Injectable()
export class WebpushChannelService implements ChannelDispatcher {
  readonly type = NotificationChannelType.WEBPUSH

  private readonly logger = new Logger(WebpushChannelService.name)

  private vapidConfigured = false

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(NotificationChannel)
    private readonly channelRepository: Repository<NotificationChannel>,
  ) {
    this.configureVapid()
  }

  private configureVapid() {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY')
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY')
    const subject =
      this.configService.get<string>('VAPID_SUBJECT') ||
      'mailto:contact@swetrix.com'

    if (!publicKey || !privateKey) {
      this.logger.warn(
        'VAPID keys are not configured; web push notifications will be disabled.',
      )
      return
    }

    try {
      webpush.setVapidDetails(subject, publicKey, privateKey)
      this.vapidConfigured = true
    } catch (reason) {
      this.logger.error(`Failed to configure VAPID: ${reason}`)
    }
  }

  getPublicKey(): string | null {
    return this.configService.get<string>('VAPID_PUBLIC_KEY') || null
  }

  async send(
    channel: NotificationChannel,
    message: RenderedAlertMessage,
  ): Promise<void> {
    if (!this.vapidConfigured) {
      throw new Error(
        'Web push is not configured on this server (missing or invalid VAPID keys).',
      )
    }
    const cfg = channel.config as {
      endpoint?: string
      keys?: { p256dh: string; auth: string }
    }
    if (!cfg?.endpoint || !cfg?.keys?.p256dh || !cfg?.keys?.auth) {
      throw new Error(
        `Web push channel ${channel.id} is missing endpoint or keys.`,
      )
    }

    const subscription: PushSubscription = {
      endpoint: cfg.endpoint,
      keys: cfg.keys,
    }

    const context = message.context as {
      dashboard_url?: string
      errors_url?: string
    }
    const url = context?.errors_url || context?.dashboard_url

    const payload = JSON.stringify({
      title: message.subject || channel.name || 'Swetrix alert',
      body: message.body.replace(/[*_`]/g, '').slice(0, 240),
      url,
      tag: `${channel.id}:${url || message.subject || 'alert'}`,
    })

    try {
      await webpush.sendNotification(subscription, payload)
    } catch (reason: any) {
      // 404/410 mean the subscription is dead; mark it as such and rethrow.
      if (reason?.statusCode === 404 || reason?.statusCode === 410) {
        this.logger.warn(
          `Disabling expired webpush channel ${channel.id} (status ${reason.statusCode})`,
        )
        await this.channelRepository.update(channel.id, {
          isVerified: false,
          disabledReason: `Expired: ${reason.statusCode} from WebPush server`,
        })
        throw new Error(
          `Push subscription is no longer valid (HTTP ${reason.statusCode}). The channel was disabled — re-enable browser notifications to subscribe again.`,
        )
      }
      const detail =
        reason?.body ||
        reason?.message ||
        (typeof reason === 'string' ? reason : 'Unknown error')
      this.logger.error(
        `Failed to send webpush to channel ${channel.id}: ${detail}`,
      )
      throw new Error(`Web push provider rejected the notification: ${detail}`)
    }
  }
}
