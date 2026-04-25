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
    if (!this.vapidConfigured) return
    const cfg = channel.config as {
      endpoint?: string
      keys?: { p256dh: string; auth: string }
    }
    if (!cfg?.endpoint || !cfg?.keys?.p256dh || !cfg?.keys?.auth) return

    const subscription: PushSubscription = {
      endpoint: cfg.endpoint,
      keys: cfg.keys,
    }

    const payload = JSON.stringify({
      title: message.subject || channel.name || 'Swetrix alert',
      body: message.body.replace(/[*_`]/g, '').slice(0, 240),
      url: (message.context as { dashboard_url?: string })?.dashboard_url,
    })

    try {
      await webpush.sendNotification(subscription, payload)
    } catch (reason: any) {
      // 404/410 mean the subscription is dead; keep alert links intact.
      if (reason?.statusCode === 404 || reason?.statusCode === 410) {
        this.logger.warn(
          `Disabling expired webpush channel ${channel.id} (status ${reason.statusCode})`,
        )
        await this.channelRepository.update(channel.id, {
          isVerified: false,
          disabledReason: `Expired: ${reason.statusCode} from WebPush server`,
        })
        return
      }
      this.logger.error(`Failed to send webpush: ${reason?.message || reason}`)
    }
  }
}
