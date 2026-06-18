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
  User,
  getAccountPlanByPaddleProductId,
  isNextPlan,
} from '../user/entities/user.entity'
import {
  BillingDunningEmailStage,
  SubscriptionDunning,
  SubscriptionDunningStatus,
} from '../user/entities/subscription-dunning.entity'
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

const BILLING_URL = 'https://swetrix.com/user-settings?tab=billing'
const BILLING_DUNNING_GRACE_DAYS = 7
const BILLING_DUNNING_FINAL_GRACE_HOURS = 24

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

  private getPaddleDate(
    body: Record<string, unknown>,
    fields: string[],
  ): Date | null {
    const value = this.getPaddleField(body, fields)

    if (!value) {
      return null
    }

    const date = new Date(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)
        ? `${value.replace(' ', 'T')}Z`
        : value,
    )

    return isNaN(date.getTime()) ? null : date
  }

  private getPaddleNumber(
    body: Record<string, unknown>,
    fields: string[],
  ): number | null {
    const value = this.getPaddleField(body, fields)

    if (!value) {
      return null
    }

    const number = Number(value)

    return Number.isFinite(number) ? number : null
  }

  private formatDateForEmail(date?: Date | string | null): string | null {
    if (!date) {
      return null
    }

    const parsed = new Date(date)

    if (isNaN(parsed.getTime())) {
      return null
    }

    return `${parsed.toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    })} UTC`
  }

  private formatPaymentAmount(body: Record<string, unknown>): string | null {
    const amount = this.getPaddleAmount(body, [
      'amount',
      'sale_gross',
      'balance_gross',
      'unit_price',
    ])
    const currency = this.getPaddleField(body, [
      'currency',
      'balance_currency',
    ])?.toUpperCase()

    return amount && currency ? `${currency} ${amount.toFixed(2)}` : null
  }

  private getBillingUrl(user?: User | null): string {
    return user?.subUpdateURL || BILLING_URL
  }

  private getDunningSuspendsAt(
    dunning: SubscriptionDunning | null,
    nextRetryAt: Date | null,
    pausedFrom: Date | null,
    finalFailure: boolean,
  ): Date {
    const now = new Date()

    if (pausedFrom) {
      return pausedFrom
    }

    if (finalFailure) {
      return new Date(
        now.getTime() + BILLING_DUNNING_FINAL_GRACE_HOURS * 60 * 60 * 1000,
      )
    }

    const graceDate = new Date(
      now.getTime() + BILLING_DUNNING_GRACE_DAYS * 24 * 60 * 60 * 1000,
    )
    const retryDate = nextRetryAt
      ? new Date(
          nextRetryAt.getTime() +
            BILLING_DUNNING_FINAL_GRACE_HOURS * 60 * 60 * 1000,
        )
      : null
    const fallbackDate =
      retryDate && retryDate > graceDate ? retryDate : graceDate
    const existingDate = dunning?.suspendsAt
      ? new Date(dunning.suspendsAt)
      : null

    return existingDate && existingDate > fallbackDate
      ? existingDate
      : fallbackDate
  }

  private async findPaddleSubscriber(
    body: Record<string, unknown>,
  ): Promise<User | null> {
    const passthrough = this.getPaddlePassthrough(body)
    const uid = this.getPaddleField(passthrough, ['uid'])
    const subID = this.getPaddleField(body, ['subscription_id'])
    const email = this.getPaddleField(body, ['email'])

    if (subID) {
      const user = await this.userService.findOne({ where: { subID } })

      if (user) {
        return user
      }
    }

    if (uid) {
      const user = await this.userService.findOne({ where: { id: uid } })

      if (user) {
        return user
      }
    }

    return email ? this.userService.findOne({ where: { email } }) : null
  }

  private async handlePaddlePaymentIssue(
    body: Record<string, unknown>,
    knownUser?: User,
  ): Promise<void> {
    const user = knownUser || (await this.findPaddleSubscriber(body))

    if (!user) {
      this.logger.error(
        `[${body.alert_name}] Cannot find the subscriber: ${JSON.stringify(body)}`,
      )
      return
    }

    const now = new Date()
    const status = this.getPaddleField(body, ['status'])
    const isPaused = status === 'paused'
    const isPaymentFailedWebhook =
      body.alert_name === 'subscription_payment_failed'
    const dunning = await this.userService.getOpenSubscriptionDunning(user.id)
    const nextRetryAt = this.getPaddleDate(body, ['next_retry_date'])
    const pausedFrom = this.getPaddleDate(body, ['paused_from'])
    const subID = this.getPaddleField(body, ['subscription_id']) || user.subID
    const paymentId = this.getPaddleField(body, [
      'subscription_payment_id',
      'payment_id',
      'alert_id',
    ])
    const rawAttempt = this.getPaddleNumber(body, ['attempt_number'])
    const attempt = rawAttempt || dunning?.attempt || 1
    const updateUrl = this.getPaddleField(body, ['update_url'])
    const cancelUrl = this.getPaddleField(body, ['cancel_url'])
    const finalFailure = isPaused || (isPaymentFailedWebhook && !nextRetryAt)
    const suspendsAt = this.getDunningSuspendsAt(
      dunning,
      nextRetryAt,
      pausedFrom,
      finalFailure,
    )
    const isAlreadyLocked =
      dunning?.status === SubscriptionDunningStatus.locked ||
      user.dashboardBlockReason === DashboardBlockReason.payment_failed ||
      user.isAccountBillingSuspended
    const shouldSuspendNow =
      isAlreadyLocked || (isPaused && (!pausedFrom || pausedFrom <= now))
    const emailStage = shouldSuspendNow
      ? BillingDunningEmailStage.locked
      : finalFailure
        ? BillingDunningEmailStage.final_warning
        : BillingDunningEmailStage.payment_failed
    const updateParams: Partial<SubscriptionDunning> = {
      id: dunning?.id,
      userId: user.id,
      subID,
      subscriptionPaymentId: paymentId,
      status: shouldSuspendNow
        ? SubscriptionDunningStatus.locked
        : SubscriptionDunningStatus.active,
      attempt,
      emailStage,
      startedAt: dunning?.startedAt || now,
      lastFailedAt: now,
      nextRetryAt,
      suspendsAt: shouldSuspendNow ? now : suspendsAt,
      metadata: body,
    }

    if (updateUrl) {
      await this.userService.update(user.id, { subUpdateURL: updateUrl })
    }

    if (cancelUrl) {
      await this.userService.update(user.id, { subCancelURL: cancelUrl })
    }

    if (shouldSuspendNow) {
      await this.userService.update(user.id, {
        dashboardBlockReason: DashboardBlockReason.payment_failed,
        isAccountBillingSuspended: true,
      })
    }

    await this.userService.saveSubscriptionDunning(updateParams)
    await this.projectService.clearProjectsRedisCache(user.id)

    const billingUrl = updateUrl || this.getBillingUrl(user)

    if (shouldSuspendNow) {
      if (dunning?.emailStage !== BillingDunningEmailStage.locked) {
        await this.mailerService.sendEmail(
          user.email,
          LetterTemplate.DashboardLockedPaymentFailure,
          { billingUrl },
        )
      }

      return
    }

    if (emailStage === BillingDunningEmailStage.final_warning) {
      const alreadySentFinalNotice =
        dunning?.emailStage &&
        [
          BillingDunningEmailStage.final_warning,
          BillingDunningEmailStage.locked,
        ].includes(dunning.emailStage)

      if (!alreadySentFinalNotice) {
        await this.mailerService.sendEmail(
          user.email,
          LetterTemplate.SubscriptionPaymentFinalWarning,
          {
            billingUrl,
            suspendsAtFormatted: this.formatDateForEmail(suspendsAt),
          },
        )
      }

      return
    }

    const isNewFailure =
      dunning?.subscriptionPaymentId !== paymentId ||
      dunning?.attempt !== attempt ||
      dunning?.emailStage !== BillingDunningEmailStage.payment_failed

    if (isNewFailure) {
      await this.mailerService.sendEmail(
        user.email,
        LetterTemplate.SubscriptionPaymentFailed,
        {
          billingUrl,
          attempt,
          amountFormatted: this.formatPaymentAmount(body),
          nextRetryAtFormatted: this.formatDateForEmail(nextRetryAt),
        },
      )
    }
  }

  private async notifyPaymentRecovered(
    user: User,
    dunning?: SubscriptionDunning | null,
  ): Promise<void> {
    const hadBillingIssue =
      !!dunning ||
      user.dashboardBlockReason === DashboardBlockReason.payment_failed ||
      user.isAccountBillingSuspended

    if (!hadBillingIssue) {
      return
    }

    await this.mailerService.sendEmail(
      user.email,
      LetterTemplate.SubscriptionPaymentRecovered,
      {
        billingUrl: this.getBillingUrl(user),
      },
    )
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
        const isPaymentIssueStatus = ['past_due', 'paused'].includes(status)
        const shouldUnlock =
          status === 'active' ||
          body.alert_name === 'subscription_created' ||
          isNextPlan(currentUser.planCode, plan.id)
        const currentDunning = isPaymentIssueStatus
          ? null
          : await this.userService.getOpenSubscriptionDunning(currentUser.id)
        const shouldNotifyRecovered =
          !isPaymentIssueStatus &&
          (shouldUnlock || isTrialing) &&
          (!!currentDunning ||
            currentUser.dashboardBlockReason ===
              DashboardBlockReason.payment_failed ||
            currentUser.isAccountBillingSuspended)

        const statusParams =
          !isPaymentIssueStatus && (shouldUnlock || isTrialing)
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

        if (isPaymentIssueStatus) {
          await this.handlePaddlePaymentIssue(body, currentUser)
        } else if (shouldNotifyRecovered) {
          await this.userService.resolveOpenSubscriptionDunnings(
            currentUser.id,
            SubscriptionDunningStatus.recovered,
          )
          await this.notifyPaymentRecovered(currentUser, currentDunning)
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
        await this.userService.resolveSubscriptionDunningsBySubID(
          subID,
          SubscriptionDunningStatus.cancelled,
        )

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

      case 'subscription_payment_failed': {
        await this.handlePaddlePaymentIssue(body)

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

        const dunning = await this.userService.getOpenSubscriptionDunning(
          subscriber.id,
        )
        const updateParams: Record<string, any> = {}
        const shouldNotifyRecovered =
          !!dunning ||
          subscriber.dashboardBlockReason ===
            DashboardBlockReason.payment_failed ||
          subscriber.isAccountBillingSuspended

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

        if (shouldNotifyRecovered) {
          await this.userService.resolveOpenSubscriptionDunnings(
            subscriber.id,
            SubscriptionDunningStatus.recovered,
          )
          await this.notifyPaymentRecovered(subscriber, dunning)
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
