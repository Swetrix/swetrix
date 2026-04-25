import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac } from 'crypto'
import { MailerService } from '../../mailer/mailer.service'
import {
  NotificationChannel,
  NotificationChannelType,
} from '../entity/notification-channel.entity'
import { ChannelDispatcher, RenderedAlertMessage } from './types'

const wrapEmailHtml = (
  body: string,
  unsubscribeUrl: string,
  subject: string,
) => {
  // Lightweight email shell — no template file required, easier to keep inline.
  const safeSubject = escapeHtml(subject)
  const html = simpleMarkdownToHtml(body)
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${safeSubject}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #111827; background: #ffffff;">
  <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
    ${html}
  </div>
  <p style="font-size: 12px; color: #6b7280; margin-top: 16px;">
    You received this email because a Swetrix alert you configured was triggered.
    <a href="${unsubscribeUrl}" style="color: #6b7280;">Unsubscribe from this channel</a>.
  </p>
</body></html>`
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    c === '&'
      ? '&amp;'
      : c === '<'
        ? '&lt;'
        : c === '>'
          ? '&gt;'
          : c === '"'
            ? '&quot;'
            : '&#39;',
  )

const isAllowedLinkHref = (href: string) => {
  try {
    const { protocol } = new URL(href)
    return (
      protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:'
    )
  } catch {
    return false
  }
}

const simpleMarkdownToHtml = (md: string) => {
  // Tiny converter: bold, italics, links, code, line breaks. Anything fancier
  // stays as escaped text so we never inject raw HTML from a user template.
  let out = escapeHtml(md)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, href) =>
    isAllowedLinkHref(href)
      ? `<a href="${href}" style="color: #2563eb;">${text}</a>`
      : text,
  )
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/\*(?!\*)(.+?)\*(?!\*)/g, '<em>$1</em>')
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\n/g, '<br/>')
  return out
}

@Injectable()
export class EmailChannelService implements ChannelDispatcher {
  readonly type = NotificationChannelType.EMAIL

  private readonly logger = new Logger(EmailChannelService.name)

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  private getUnsubscribeSecret(): string {
    const secret =
      this.configService.get<string>('JWT_SECRET') ||
      this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET')

    if (!secret) {
      throw new Error(
        'JWT_SECRET or JWT_ACCESS_TOKEN_SECRET is required for email unsubscribe tokens',
      )
    }

    return secret
  }

  buildUnsubscribeToken(channelId: string) {
    // Stateless one-click unsubscribe: HMAC over channel id with the JWT secret.
    // Avoids storing per-channel tokens just for unsubscribe.
    const secret = this.getUnsubscribeSecret()
    const sig = createHmac('sha256', secret).update(channelId).digest('hex')
    return `${channelId}.${sig}`
  }

  verifyUnsubscribeToken(token: string): string | null {
    const dot = token.indexOf('.')
    if (dot === -1) return null
    const channelId = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    const secret = this.getUnsubscribeSecret()
    const expected = createHmac('sha256', secret)
      .update(channelId)
      .digest('hex')
    if (sig.length !== expected.length) return null
    let mismatch = 0
    for (let i = 0; i < sig.length; i++) {
      mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
    }
    return mismatch === 0 ? channelId : null
  }

  async send(
    channel: NotificationChannel,
    message: RenderedAlertMessage,
  ): Promise<void> {
    const cfg = channel.config as { address?: string; unsubscribed?: boolean }
    if (!cfg?.address || cfg.unsubscribed) return

    try {
      const clientUrl =
        this.configService.get<string>('CLIENT_URL') || 'https://swetrix.com'
      const unsubscribeUrl = `${clientUrl}/notification-channel/unsubscribe/${this.buildUnsubscribeToken(channel.id)}`
      const subject = message.subject || 'Swetrix alert'
      const html = wrapEmailHtml(message.body, unsubscribeUrl, subject)
      await this.mailerService.sendRawEmail(cfg.address, subject, html)
    } catch (reason) {
      this.logger.error(`Failed to send email channel: ${reason}`)
    }
  }
}
