import {
  Controller,
  Body,
  Post,
  Headers,
  BadRequestException,
  NotFoundException,
  HttpCode,
  Ip,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { ProjectService } from '../project/project.service'
import { getIPFromHeaders } from '../common/utils'
import {
  DashboardBlockReason,
  PlanType,
  getAccountPlanByPaddleProductId,
  isNextPlan,
} from '../user/entities/user.entity'
import { UserService } from '../user/user.service'
import { AppLoggerService } from '../logger/logger.service'
import { WebhookService } from './webhook.service'
import { LetterTemplate } from '../mailer/letter'
import { MailerService } from '../mailer/mailer.service'
import { RevenueService } from '../revenue/revenue.service'
import { CurrencyService } from '../revenue/currency.service'
import {
  RevenueProvider,
  RevenueStatus,
  RevenueType,
} from '../revenue/interfaces/revenue.interface'

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly userService: UserService,
    private readonly webhookService: WebhookService,
    private readonly projectService: ProjectService,
    private readonly mailerService: MailerService,
    private readonly revenueService: RevenueService,
    private readonly currencyService: CurrencyService,
  ) {}

  private getPaddleField(
    body: Record<string, unknown>,
    fields: string[],
  ): string | null {
    for (const field of fields) {
      const value = body[field]

      if (value !== undefined && value !== null && String(value) !== '') {
        return String(value)
      }
    }

    return null
  }

  private getPaddleAmount(
    body: Record<string, unknown>,
    fields: string[],
  ): number | null {
    const rawAmount = this.getPaddleField(body, fields)

    if (!rawAmount) {
      return null
    }

    const amount = Number(rawAmount.replace(/,/g, ''))

    return Number.isFinite(amount) && amount !== 0 ? Math.abs(amount) : null
  }

  private getPaddlePassthrough(
    body: Record<string, unknown>,
  ): Record<string, unknown> {
    const passthrough = this.getPaddleField(body, ['passthrough'])

    if (!passthrough) {
      return {}
    }

    try {
      const parsed = JSON.parse(passthrough)

      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : {}
    } catch {
      return {}
    }
  }

  private getPaddleCreatedAt(body: Record<string, unknown>): Date {
    const eventTime = this.getPaddleField(body, ['event_time'])

    if (!eventTime) {
      return new Date()
    }

    const date = new Date(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(eventTime)
        ? `${eventTime.replace(' ', 'T')}Z`
        : eventTime,
    )

    return isNaN(date.getTime()) ? new Date() : date
  }

  private getSwetrixRevenueTransactionId(
    body: Record<string, unknown>,
    type: RevenueType,
  ): string | null {
    const id =
      type === RevenueType.REFUND
        ? this.getPaddleField(body, [
            'alert_id',
            'refund_id',
            'subscription_payment_id',
            'payment_id',
            'order_id',
            'checkout_id',
          ])
        : this.getPaddleField(body, [
            'subscription_payment_id',
            'payment_id',
            'order_id',
            'checkout_id',
            'alert_id',
          ])

    if (!id) {
      return null
    }

    return `paddle:${body.alert_name}:${id}`
  }

  private async trackSwetrixRevenue(
    body: Record<string, unknown>,
    type: RevenueType,
  ): Promise<void> {
    const pid = process.env.SWETRIX_PID

    if (!pid) {
      return
    }

    try {
      const amount = this.getPaddleAmount(
        body,
        type === RevenueType.REFUND
          ? ['amount', 'refund_amount', 'sale_gross', 'balance_gross']
          : ['sale_gross', 'amount', 'balance_gross', 'unit_price'],
      )
      const originalCurrency = this.getPaddleField(body, [
        'currency',
        'balance_currency',
      ])?.toUpperCase()
      const transactionId = this.getSwetrixRevenueTransactionId(body, type)

      if (!amount || !originalCurrency || !transactionId) {
        this.logger.warn(
          {
            alertName: body.alert_name,
            hasAmount: !!amount,
            hasCurrency: !!originalCurrency,
            hasTransactionId: !!transactionId,
          },
          'Skipping Swetrix revenue tracking for Paddle webhook',
        )
        return
      }

      const project = await this.projectService.getFullProject(pid)

      if (!project) {
        this.logger.warn({ pid }, 'Skipping Swetrix revenue tracking')
        return
      }

      if (project.paddleApiKeyEnc || project.stripeApiKeyEnc) {
        this.logger.warn(
          { pid, alertName: body.alert_name },
          'Skipping Swetrix revenue webhook because a revenue provider is already connected',
        )
        return
      }

      const targetCurrency = project.revenueCurrency || originalCurrency

      if (!project.revenueApiEnabled) {
        const result = await this.revenueService.connectApi(pid, targetCurrency)

        if (!result.success) {
          this.logger.warn(
            { pid, reason: result.message },
            'Failed to enable Swetrix API revenue tracking',
          )
          return
        }
      }

      const passthrough = this.getPaddlePassthrough(body)
      const convertedAmount = await this.currencyService.convert(
        amount,
        originalCurrency,
        targetCurrency,
      )
      const isRefund = type === RevenueType.REFUND

      await this.revenueService.insertTransaction({
        pid,
        transactionId,
        provider: RevenueProvider.API,
        type,
        status: isRefund ? RevenueStatus.REFUNDED : RevenueStatus.COMPLETED,
        amount: isRefund ? -Math.abs(convertedAmount) : convertedAmount,
        originalAmount: isRefund ? -Math.abs(amount) : amount,
        originalCurrency,
        currency: targetCurrency,
        profileId:
          this.getPaddleField(passthrough, ['swetrix_profile_id']) || null,
        sessionId:
          this.getPaddleField(passthrough, ['swetrix_session_id']) || null,
        productId: this.getPaddleField(body, ['subscription_plan_id']) || null,
        productName:
          this.getPaddleField(body, [
            'plan_name',
            'product_name',
            'checkout_title',
          ]) || (isRefund ? 'Refund' : 'Swetrix subscription'),
        metadata: {
          alertName: body.alert_name,
          checkoutId: body.checkout_id,
          orderId: body.order_id,
          subscriptionId: body.subscription_id,
          subscriptionPlanId: body.subscription_plan_id,
          userId: body.user_id,
          passthrough,
        },
        created: this.getPaddleCreatedAt(body),
        syncedAt: new Date(),
      })

      await this.revenueService.updateLastSyncAt(pid)
    } catch (error) {
      this.logger.error(
        { error, alertName: body.alert_name },
        'Failed to track Swetrix revenue from Paddle webhook',
      )
    }
  }

  // AWS SNS webhook
  @Post('/sns')
  @HttpCode(200)
  async snsWebhook(@Body() body): Promise<any> {
    const json = typeof body === 'string' ? JSON.parse(body) : body

    await this.webhookService.verifySNSRequest(json)

    const { Type, Message } = json

    if (Type !== 'Notification') {
      return
    }

    const message = typeof Message === 'string' ? JSON.parse(Message) : Message

    switch (message.eventType) {
      case 'Bounce': {
        const { emailAddress } = message.bounce.bouncedRecipients[0]

        await this.webhookService.unsubscribeByEmail(emailAddress)

        break
      }

      case 'Complaint': {
        const { emailAddress } = message.complaint.complainedRecipients[0]

        await this.webhookService.unsubscribeByEmail(emailAddress)

        break
      }

      default:
    }
  }

  // Paddle - payment processor webhook
  @Post('/paddle')
  @HttpCode(200)
  async paddleWebhook(
    @Body() body,
    @Headers() headers,
    @Ip() reqIP,
  ): Promise<any> {
    const ip = getIPFromHeaders(headers) || reqIP || ''

    this.webhookService.verifyIP(ip)
    this.webhookService.validateWebhook(body)

    switch (body.alert_name) {
      case 'subscription_created':
      case 'subscription_updated': {
        const {
          passthrough,
          email,
          subscription_id: subID,
          subscription_plan_id: subscriptionPlanId,
          cancel_url: subCancelURL,
          update_url: subUpdateURL,
          next_bill_date: nextBillDate,
          currency,
          status,
        } = body
        let uid
        let requestedPlanType: PlanType | null = null

        try {
          const passthroughData = JSON.parse(passthrough)
          uid = passthroughData?.uid
          if (
            passthroughData?.planType &&
            Object.values(PlanType).includes(passthroughData.planType)
          ) {
            requestedPlanType = passthroughData.planType
          }
        } catch {
          this.logger.error(
            `[${body.alert_name}] Cannot parse the uid: ${JSON.stringify(body)}`,
          )
        }

        const planMatch = getAccountPlanByPaddleProductId(subscriptionPlanId)

        if (!planMatch) {
          throw new NotFoundException(
            `The selected account plan (${subscriptionPlanId}) is not available`,
          )
        }
        const { plan, billingFrequency, planType: resolvedPlanType } = planMatch

        let currentUser = uid
          ? await this.userService.findOne({ where: { id: uid } })
          : await this.userService.findOne({ where: { email } })

        if (!currentUser) {
          currentUser = await this.userService.findOne({ where: { subID } })

          if (!currentUser) {
            this.logger.error(
              '[PADDLE WEBHOOK / FATAL] Cannot find the webhook user',
            )
            this.logger.error(JSON.stringify(body, null, 2))
            return
          }
        }

        const isTrialing = status === 'trialing'
        const shouldUnlock =
          status === 'active' ||
          body.alert_name === 'subscription_created' ||
          isNextPlan(currentUser.planCode, plan.id)

        const statusParams =
          status === 'paused'
            ? {
                dashboardBlockReason: DashboardBlockReason.payment_failed,
                isAccountBillingSuspended: true,
              }
            : shouldUnlock || isTrialing
              ? {
                  dashboardBlockReason: null,
                  planExceedContactedAt: null,
                  isAccountBillingSuspended: false,
                }
              : {}

        const planType =
          requestedPlanType === resolvedPlanType
            ? requestedPlanType
            : resolvedPlanType
        const updateParams: Record<string, any> = {
          planCode: plan.id,
          planType,
          subID,
          subUpdateURL,
          subCancelURL,
          nextBillDate,
          billingFrequency,
          tierCurrency: currency,
          cancellationEffectiveDate: null,
          ...statusParams,
        }

        if (isTrialing && nextBillDate) {
          updateParams.trialEndDate = nextBillDate
        }

        await this.userService.update(currentUser.id, updateParams)
        await this.userService.refreshWebsiteAddonEntitlements(currentUser.id)
        await this.userService.refreshSessionReplayAddonEntitlements(
          currentUser.id,
        )
        await this.projectService.clearProjectsRedisCache(currentUser.id)

        if (body.alert_name === 'subscription_created' && isTrialing) {
          await this.mailerService.sendEmail(
            currentUser.email,
            LetterTemplate.SignUp,
          )
        }

        if (status === 'paused') {
          await this.mailerService.sendEmail(
            currentUser.email,
            LetterTemplate.DashboardLockedPaymentFailure,
            {
              billingUrl: 'https://swetrix.com/user-settings?tab=billing',
            },
          )
        }

        break
      }

      case 'subscription_cancelled': {
        const {
          subscription_id: subID,
          cancellation_effective_date: cancellationEffectiveDate,
        } = body

        await this.userService.updateBySubID(subID, {
          nextBillDate: null,
          cancellationEffectiveDate,
        })

        const user = await this.userService.findOne({
          where: { subID },
        })

        if (user?.id) {
          await this.userService.scheduleWebsiteAddonCancellation(
            user.id,
            cancellationEffectiveDate,
          )
          await this.userService.scheduleSessionReplayAddonCancellation(
            user.id,
            cancellationEffectiveDate,
          )
        }

        if (user?.email) {
          const isTrialing =
            user.trialEndDate && new Date(user.trialEndDate) > new Date()

          if (!isTrialing) {
            await this.mailerService.sendEmail(
              user.email,
              LetterTemplate.SubscriptionCancelled,
            )
          }
        }

        break
      }

      case 'payment_succeeded': {
        await this.trackSwetrixRevenue(body, RevenueType.SALE)

        break
      }

      case 'subscription_payment_succeeded': {
        const {
          passthrough,
          subscription_id: subID,
          next_bill_date: nextBillDate,
        } = body

        let uid
        try {
          uid = JSON.parse(passthrough)?.uid
        } catch {
          this.logger.error(
            `[subscription_payment_succeeded] Cannot parse the uid: ${JSON.stringify(body)}`,
          )
        }

        await this.trackSwetrixRevenue(body, RevenueType.SUBSCRIPTION)

        let subscriber = await this.userService.findOne({
          where: { subID },
        })

        if (!subscriber && uid) {
          subscriber = await this.userService.findOne({
            where: { id: uid },
          })
        }

        if (!subscriber) {
          this.logger.error(
            `[subscription_payment_succeeded] Cannot find the subscriber with subID: ${subID}\nBody: ${JSON.stringify(
              body,
              null,
              2,
            )}`,
          )
          return
        }

        const updateParams: Record<string, any> = {}

        if (nextBillDate) {
          updateParams.nextBillDate = nextBillDate
        }

        if (
          subscriber.dashboardBlockReason ===
          DashboardBlockReason.payment_failed
        ) {
          updateParams.dashboardBlockReason = null
        }

        if (subscriber.isAccountBillingSuspended) {
          updateParams.isAccountBillingSuspended = false
        }

        if (Object.keys(updateParams).length > 0) {
          await this.userService.update(subscriber.id, updateParams)
          await this.projectService.clearProjectsRedisCache(subscriber.id)
        }

        break
      }

      case 'payment_refunded':
      case 'subscription_payment_refunded': {
        await this.trackSwetrixRevenue(body, RevenueType.REFUND)

        break
      }

      default:
        throw new BadRequestException('Unexpected event type')
    }
  }
}
