import { Injectable, Logger } from '@nestjs/common'
import { firstValueFrom } from 'rxjs'
import { HttpService } from '@nestjs/axios'
import { WebhookAbcService } from '../webhook-abc/webhook-abc.service'

@Injectable()
export class SlackService extends WebhookAbcService {
  private readonly logger = new Logger(SlackService.name)

  constructor(private readonly httpService: HttpService) {
    super()
  }

  async sendWebhook(webhookUrl: string, message: unknown): Promise<void> {
    try {
      // Defense-in-depth: DTO validation should already enforce Slack webhook URL format.
      // Still, validate basic URL properties here to reduce SSRF surface area.
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

      // Slack supports long messages, but keep a sane cap.
      if (text.length > 20_000) {
        text = `${text.slice(0, 20_000)}…`
      }

      const payload = { text }
      await firstValueFrom(
        this.httpService.post(webhookUrl, payload, {
          timeout: 10_000,
          maxRedirects: 0,
        }),
      )
    } catch (error) {
      const status = (error as any)?.response?.status
      const message = (error as any)?.message || String(error)
      this.logger.error(
        `Error sending Slack webhook${status ? ` (status ${status})` : ''}: ${message}`,
      )
    }
  }
}
