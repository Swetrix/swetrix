import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { Injectable, Logger } from '@nestjs/common'
import { WebhookAbcService } from '../webhook-abc/webhook-abc.service'

@Injectable()
export class DiscordService extends WebhookAbcService {
  private readonly logger = new Logger(DiscordService.name)

  constructor(private readonly httpService: HttpService) {
    super()
  }

  async sendWebhook(webhookUrl: string, message: unknown): Promise<void> {
    try {
      // Defense-in-depth: DTO validation should already enforce Discord webhook URL format.
      // Still, validate basic URL properties here to reduce SSRF surface area.
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

      // Discord content max length is 2000 chars; keep some buffer.
      if (content.length > 1900) {
        content = `${content.slice(0, 1900)}…`
      }

      const payload = { content }
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
        `Error sending Discord webhook${status ? ` (status ${status})` : ''}: ${message}`,
      )
    }
  }
}
