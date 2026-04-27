import { Injectable, Logger } from '@nestjs/common'
import { WebhookAbcService } from '../webhook-abc/webhook-abc.service'

@Injectable()
export class DiscordService extends WebhookAbcService {
  private readonly logger = new Logger(DiscordService.name)

  async sendWebhook(webhookUrl: string, message: unknown): Promise<void> {
    try {
      const url = new URL(webhookUrl)
      const host = url.hostname.toLowerCase()
      if (
        url.protocol !== 'https:' ||
        (host !== 'discord.com' && !host.endsWith('.discord.com')) ||
        !url.pathname.startsWith('/api/webhooks/')
      ) {
        this.logger.warn('Refusing to send Discord webhook: invalid URL')
        return
      }

      let content: string
      if (typeof message === 'string') {
        content = message
      } else {
        try {
          content = JSON.stringify(message)
        } catch {
          content = String(message)
        }
      }

      if (content.length > 1900) {
        content = `${content.slice(0, 1900)}…`
      }

      const payload = { content }
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
        redirect: 'error',
      })

      if (!res.ok) {
        this.logger.error(
          `Error sending Discord webhook (status ${res.status})`,
        )
      }
    } catch (error) {
      const message = (error as any)?.message || String(error)
      this.logger.error(`Error sending Discord webhook: ${message}`)
    }
  }
}
