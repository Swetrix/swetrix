import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiResponse } from '@nestjs/swagger'
import type { Response } from 'express'

import { Auth } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { Public } from '../auth/decorators/public.decorator'
import { AppLoggerService } from '../logger/logger.service'
import { ConfigService } from '@nestjs/config'

import {
  NotificationChannel,
  NotificationChannelType,
} from './entity/notification-channel.entity'
import { NotificationChannelService } from './notification-channel.service'
import {
  CreateChannelDTO,
  UpdateChannelDTO,
  WebpushSubscribeDTO,
} from './dto/notification-channel.dto'
import { ChannelDispatcherService } from './dispatchers/channel-dispatcher.service'
import { EmailChannelService } from './dispatchers/email-channel.service'
import { WebhookChannelService } from './dispatchers/webhook-channel.service'
import { WebpushChannelService } from './dispatchers/webpush-channel.service'
import { MailerService } from '../mailer/mailer.service'
import { buildNotificationChannelVerifyUrl } from './notification-channel.paths'

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) =>
    char === '&'
      ? '&amp;'
      : char === '<'
        ? '&lt;'
        : char === '>'
          ? '&gt;'
          : char === '"'
            ? '&quot;'
            : '&#39;',
  )

@ApiTags('NotificationChannel')
@Controller('notification-channel')
export class NotificationChannelController {
  constructor(
    private readonly channelService: NotificationChannelService,
    private readonly dispatcherService: ChannelDispatcherService,
    private readonly emailDispatcher: EmailChannelService,
    private readonly webhookDispatcher: WebhookChannelService,
    private readonly webpushDispatcher: WebpushChannelService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {}

  @ApiBearerAuth()
  @Get('/')
  @Auth()
  @ApiResponse({ status: 200, type: [NotificationChannel] })
  async list(
    @CurrentUserId() userId: string,
    @Query('projectId') projectId?: string,
    @Query('organisationId') organisationId?: string,
    @Query('scope') scope?: 'user' | 'organisation' | 'project',
  ) {
    if (projectId) {
      const channels = await this.channelService.getChannelsForProject(
        projectId,
        userId,
      )
      return channels.map((c) => this.serialise(c))
    }
    if (organisationId) {
      const channels = await this.channelService.getChannelsForOrganisation(
        organisationId,
        userId,
      )
      return channels.map((c) => this.serialise(c))
    }
    const channels = await this.channelService.getVisibleChannels(userId)
    const serialised = channels.map((c) => this.serialise(c))
    if (scope) {
      return serialised.filter((c) => c.scope === scope)
    }
    return serialised
  }

  @ApiBearerAuth()
  @Get('/webpush/public-key')
  @Auth()
  async getWebpushPublicKey() {
    return { publicKey: this.webpushDispatcher.getPublicKey() }
  }

  @ApiBearerAuth()
  @Post('/')
  @Auth()
  async create(@Body() dto: CreateChannelDTO, @CurrentUserId() userId: string) {
    this.logger.log({ userId, type: dto.type }, 'POST /notification-channel')
    const channel = await this.channelService.create(dto, userId)
    if (channel.type === NotificationChannelType.EMAIL) {
      await this.sendEmailVerification(channel)
    }
    return this.serialise(channel)
  }

  @ApiBearerAuth()
  @Patch('/:id')
  @Auth()
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateChannelDTO,
    @CurrentUserId() userId: string,
  ) {
    const channel = await this.channelService.update(id, dto, userId)
    if (channel.type === NotificationChannelType.EMAIL && !channel.isVerified) {
      await this.sendEmailVerification(channel)
    }
    return this.serialise(channel)
  }

  @ApiBearerAuth()
  @Delete('/:id')
  @Auth()
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUserId() userId: string,
  ) {
    await this.channelService.delete(id, userId)
    return { ok: true }
  }

  @ApiBearerAuth()
  @Post('/:id/test')
  @Auth()
  async sendTest(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUserId() userId: string,
  ) {
    const channel = await this.channelService.findById(id)
    if (!channel) throw new NotFoundException('Channel not found')
    await this.channelService.ensureCallerCanManage(channel, userId)
    try {
      await this.dispatcherService.sendOne(channel, {
        body: 'This is a test notification from Swetrix. Your channel is wired up correctly!',
        subject: 'Swetrix test notification',
        context: { test: true },
      })
    } catch (reason: any) {
      throw new BadRequestException(
        `Failed to send test notification: ${reason?.message || reason}`,
      )
    }
    return { ok: true }
  }

  @ApiBearerAuth()
  @Post('/:id/verify')
  @Auth()
  async kickoffVerification(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUserId() userId: string,
  ) {
    const channel = await this.channelService.findById(id)
    if (!channel) throw new NotFoundException('Channel not found')
    await this.channelService.ensureCallerCanManage(channel, userId)

    if (channel.type === NotificationChannelType.EMAIL) {
      await this.sendEmailVerification(channel)
      return { ok: true }
    }

    if (channel.type === NotificationChannelType.WEBHOOK) {
      const cfg = channel.config as { url: string; secret?: string | null }
      const ok = await this.webhookDispatcher.ping(cfg.url, cfg.secret)
      if (!ok) {
        throw new BadRequestException(
          'Webhook did not respond with 2xx within 5s',
        )
      }
      await this.channelService.markVerified(channel.id)
      return { ok: true }
    }

    throw new BadRequestException(
      `Verification not supported for channel type ${channel.type}`,
    )
  }

  @Public()
  @Get('/verify/:token')
  async completeVerification(
    @Param('token') token: string,
    @Res() res: Response,
  ) {
    const channel = await this.channelService.findByVerificationToken(token)
    if (channel) {
      await this.channelService.markVerified(channel.id)
    }
    const clientUrl =
      this.configService.get<string>('CLIENT_URL') || 'https://swetrix.com'
    res.redirect(
      HttpStatus.FOUND,
      `${clientUrl}/notification-channels?verified=${channel ? '1' : '0'}`,
    )
  }

  @Public()
  @Get('/unsubscribe/:token')
  async unsubscribeEmail(@Param('token') token: string, @Res() res: Response) {
    let channelId: string | null
    try {
      channelId = this.emailDispatcher.verifyUnsubscribeToken(token)
    } catch (reason) {
      if (reason instanceof Error) {
        throw new HttpException(
          {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: reason.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        )
      }
      throw reason
    }
    if (channelId) {
      await this.channelService.setEmailUnsubscribed(channelId, true)
    }
    const clientUrl =
      this.configService.get<string>('CLIENT_URL') || 'https://swetrix.com'
    res.redirect(
      HttpStatus.FOUND,
      `${clientUrl}/notification-channels/unsubscribed?ok=${channelId ? '1' : '0'}`,
    )
  }

  @ApiBearerAuth()
  @Post('/webpush/subscribe')
  @Auth()
  async subscribeWebpush(
    @Body() dto: WebpushSubscribeDTO,
    @CurrentUserId() userId: string,
  ) {
    const channel = await this.channelService.create(
      {
        name: dto.name || 'Browser notifications',
        type: NotificationChannelType.WEBPUSH,
        config: {
          endpoint: dto.endpoint,
          keys: dto.keys,
          userAgent: dto.userAgent,
        },
        userScoped: true,
      },
      userId,
    )
    // Web push channels are verified on subscribe.
    await this.channelService.markVerified(channel.id)
    return this.serialise({ ...channel, isVerified: true })
  }

  private async sendEmailVerification(channel: NotificationChannel) {
    const cfg = channel.config as { address: string }
    if (!channel.verificationToken) return
    const clientUrl =
      this.configService.get<string>('CLIENT_URL') || 'https://swetrix.com'
    const url = buildNotificationChannelVerifyUrl(
      clientUrl,
      channel.verificationToken,
    )
    const safeAddress = escapeHtml(cfg.address)
    const safeUrl = escapeHtml(url)
    const html = `<!DOCTYPE html><html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #111827;">
      <h2>Confirm your Swetrix notification channel</h2>
      <p>Click the button below to confirm we can send alerts to <strong>${safeAddress}</strong>.</p>
      <p><a href="${safeUrl}" style="display:inline-block; padding: 10px 18px; background: #2563eb; color: #fff; border-radius: 6px; text-decoration: none;">Confirm channel</a></p>
      <p style="color: #6b7280; font-size: 12px;">If you didn't set this up, ignore this email.</p>
    </body></html>`
    await this.mailerService.sendRawEmail(
      cfg.address,
      'Confirm your Swetrix notification channel',
      html,
    )
  }

  private serialise(channel: NotificationChannel) {
    return {
      id: channel.id,
      name: channel.name,
      type: channel.type,
      config: this.redactConfig(channel),
      isVerified: channel.isVerified,
      disabledReason: channel.disabledReason,
      created: channel.created,
      updated: channel.updated,
      scope: channel.user
        ? 'user'
        : channel.organisation
          ? 'organisation'
          : 'project',
      userId: channel.user?.id,
      organisationId: channel.organisation?.id,
      projectId: channel.project?.id,
    }
  }

  private redactConfig(channel: NotificationChannel) {
    // Don't leak secrets / endpoints back to the dashboard.
    if (channel.type === NotificationChannelType.WEBHOOK) {
      const cfg = channel.config as { url: string; secret?: string | null }
      return { url: cfg.url, hasSecret: !!cfg.secret }
    }
    if (channel.type === NotificationChannelType.WEBPUSH) {
      const cfg = channel.config as {
        endpoint: string
        userAgent?: string | null
      }
      return {
        endpoint:
          cfg.endpoint.length > 64
            ? cfg.endpoint.slice(0, 64) + '…'
            : cfg.endpoint,
        userAgent: cfg.userAgent,
      }
    }
    if (channel.type === NotificationChannelType.SLACK) {
      const cfg = channel.config as { url: string }
      return { url: this.maskUrl(cfg.url) }
    }
    if (channel.type === NotificationChannelType.DISCORD) {
      const cfg = channel.config as { url: string }
      return { url: this.maskUrl(cfg.url) }
    }
    return channel.config
  }

  private maskUrl(url: string) {
    try {
      const u = new URL(url)
      return `${u.protocol}//${u.host}${u.pathname.split('/').slice(0, 3).join('/')}/…`
    } catch {
      return url
    }
  }
}
