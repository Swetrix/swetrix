import { Injectable, Logger } from '@nestjs/common'
import { WebhookAbcService } from '../webhook-abc/webhook-abc.service'

@Injectable()
export class SlackService extends WebhookAbcService {
  private readonly logger = new Logger(SlackService.name)

  async sendWebhook(webhookUrl: string, message: unknown): Promise<void> {
    try {
      const url = new URL(webhookUrl)
      const host = url.hostname.toLowerCase()
      if (
        url.protocol !== 'https:' ||
        host !== 'hooks.slack.com' ||
        !url.pathname.startsWith('/services/')
      ) {
        this.logger.warn('Refusing to send Slack webhook: invalid URL')
        return
      }

      let text: string
      if (typeof message === 'string') {
        text = message
      } else {
        try {
          text = JSON.stringify(message)
        } catch {
          text = String(message)
        }
      }

      if (text.length > 20_000) {
        text = `${text.slice(0, 20_000)}…`
      }

      const payload = { text }
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
        redirect: 'error',
      })

      if (!res.ok) {
        this.logger.error(`Error sending Slack webhook (status ${res.status})`)
      }
    } catch (error) {
      const message = (error as any)?.message || String(error)
      this.logger.error(`Error sending Slack webhook: ${message}`)
    }
  }
}
