import {
  Controller,
  Body,
  Post,
  Headers,
  BadRequestException,
  NotFoundException,
  HttpCode,
  Ip,
  Req,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import _find from 'lodash/find'

import { ProjectService } from '../project/project.service'
import { getIPFromHeaders } from '../common/utils'
import {
  ACCOUNT_PLANS,
  BillingFrequency,
  DashboardBlockReason,
  isNextPlan,
} from '../user/entities/user.entity'
import { UserService } from '../user/user.service'
import { AppLoggerService } from '../logger/logger.service'
import { WebhookService } from './webhook.service'
import { LetterTemplate } from '../mailer/letter'
import { MailerService } from '../mailer/mailer.service'

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly userService: UserService,
    private readonly webhookService: WebhookService,
    private readonly projectService: ProjectService,
    private readonly mailerService: MailerService,
  ) {}

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

  @Post('/paddle')
  @HttpCode(200)
  async paddleWebhook(
    @Body() body,
    @Headers() headers,
    @Ip() reqIP,
    @Req() req,
  ): Promise<any> {
    if (this.webhookService.isClassicWebhook(body, headers)) {
      return this.handleClassicWebhook(body, headers, reqIP)
    }

    return this.handleBillingWebhook(body, headers, req)
  }

  // ─── Paddle Classic (legacy subscribers) ───────────────────────────

  private async handleClassicWebhook(
    body: any,
    headers: Record<string, string>,
    reqIP: string,
  ): Promise<any> {
    const ip = getIPFromHeaders(headers) || reqIP || ''
    this.webhookService.verifyClassicIP(ip)
    this.webhookService.validateClassicWebhook(body)

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

        try {
          uid = JSON.parse(passthrough)?.uid
        } catch {
          this.logger.error(
            `[${body.alert_name}] Cannot parse the uid: ${JSON.stringify(body)}`,
          )
        }

        let monthlyBilling = true
        let plan = _find(ACCOUNT_PLANS, ({ pid }) => pid === subscriptionPlanId)

        if (!plan) {
          monthlyBilling = false
          plan = _find(ACCOUNT_PLANS, ({ ypid }) => ypid === subscriptionPlanId)
        }

        if (!plan) {
          throw new NotFoundException(
            `The selected account plan (${subscriptionPlanId}) is not available`,
          )
        }

        let currentUser = uid
          ? await this.userService.findOne({ where: { id: uid } })
          : await this.userService.findOne({ where: { email } })

        if (!currentUser) {
          currentUser = await this.userService.findOne({ where: { subID } })

          if (!currentUser) {
            this.logger.error(
              '[PADDLE CLASSIC WEBHOOK / FATAL] Cannot find the webhook user',
            )
            this.logger.error(JSON.stringify(body, null, 2))
            return
          }
        }

        const isTrialing = status === 'trialing'
        const shouldUnlock =
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

        const updateParams: Record<string, any> = {
          planCode: plan.id,
          subID,
          subUpdateURL,
          subCancelURL,
          nextBillDate,
          billingFrequency: monthlyBilling
            ? BillingFrequency.Monthly
            : BillingFrequency.Yearly,
          tierCurrency: currency,
          cancellationEffectiveDate: null,
          ...statusParams,
        }

        if (isTrialing && nextBillDate) {
          updateParams.trialEndDate = nextBillDate
        }

        await this.userService.update(currentUser.id, updateParams)
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

      case 'subscription_payment_succeeded': {
        const { subscription_id: subID, next_bill_date: nextBillDate } = body

        const subscriber = await this.userService.findOne({
          where: { subID },
        })

        if (!subscriber) {
          this.logger.error(
            `[subscription_payment_succeeded] Cannot find the subscriber with subID: ${subID}\nBody: ${JSON.stringify(body, null, 2)}`,
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

        if (Object.keys(updateParams).length > 0) {
          await this.userService.updateBySubID(subID, updateParams)
          await this.projectService.clearProjectsRedisCacheBySubId(subID)
        }

        break
      }

      default:
        throw new BadRequestException('Unexpected Classic event type')
    }
  }

  // ─── Paddle Billing (new subscribers) ──────────────────────────────

  private async handleBillingWebhook(
    body: any,
    headers: Record<string, string>,
    req: any,
  ): Promise<any> {
    const rawBody = req.rawBody || JSON.stringify(body)
    const signature = headers['paddle-signature'] || ''

    this.webhookService.validateBillingWebhook(rawBody, signature)

    const { event_type: eventType, data } = body

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.updated': {
        const subscriptionId = data.id
        const status = data.status
        const customData = data.custom_data || {}
        const uid = customData.uid
        const scheduledChange = data.scheduled_change
        const currentBillingPeriod = data.current_billing_period
        const items = data.items || []
        const currencyCode = data.currency_code

        if (!items.length) {
          this.logger.error(
            `[${eventType}] No items in subscription: ${JSON.stringify(body)}`,
          )
          return
        }

        const priceId = items[0].price?.id
        if (!priceId) {
          this.logger.error(
            `[${eventType}] No price ID found: ${JSON.stringify(body)}`,
          )
          return
        }

        let monthlyBilling = true
        let plan = _find(ACCOUNT_PLANS, (p) => p.priceId === priceId)

        if (!plan) {
          monthlyBilling = false
          plan = _find(ACCOUNT_PLANS, (p) => p.yearlyPriceId === priceId)
        }

        if (!plan) {
          throw new NotFoundException(
            `The selected account plan (price: ${priceId}) is not available`,
          )
        }

        let currentUser = uid
          ? await this.userService.findOne({ where: { id: uid } })
          : null

        if (!currentUser) {
          currentUser = await this.userService.findOne({
            where: { subID: subscriptionId },
          })

          if (!currentUser) {
            this.logger.error(
              '[PADDLE BILLING WEBHOOK / FATAL] Cannot find the webhook user',
            )
            this.logger.error(JSON.stringify(body, null, 2))
            return
          }
        }

        const isTrialing = status === 'trialing'
        const shouldUnlock =
          eventType === 'subscription.created' ||
          isNextPlan(currentUser.planCode, plan.id)

        const nextBillDate = currentBillingPeriod?.ends_at
          ? new Date(currentBillingPeriod.ends_at)
          : null

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

        const cancellationEffectiveDate =
          scheduledChange?.action === 'cancel'
            ? scheduledChange.effective_at
            : null

        const updateParams: Record<string, any> = {
          planCode: plan.id,
          subID: subscriptionId,
          subUpdateURL: null,
          subCancelURL: null,
          nextBillDate,
          billingFrequency: monthlyBilling
            ? BillingFrequency.Monthly
            : BillingFrequency.Yearly,
          tierCurrency: currencyCode,
          cancellationEffectiveDate,
          ...statusParams,
        }

        if (isTrialing && nextBillDate) {
          updateParams.trialEndDate = nextBillDate
        }

        await this.userService.update(currentUser.id, updateParams)
        await this.projectService.clearProjectsRedisCache(currentUser.id)

        if (eventType === 'subscription.created' && isTrialing) {
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

      case 'subscription.canceled': {
        const subscriptionId = data.id
        const scheduledChange = data.scheduled_change
        const cancellationEffectiveDate =
          scheduledChange?.effective_at || new Date().toISOString()

        await this.userService.updateBySubID(subscriptionId, {
          nextBillDate: null,
          cancellationEffectiveDate,
        })

        const user = await this.userService.findOne({
          where: { subID: subscriptionId },
        })

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

      case 'transaction.completed': {
        const subscriptionId = data.subscription_id
        if (!subscriptionId) return

        const subscriber = await this.userService.findOne({
          where: { subID: subscriptionId },
        })

        if (!subscriber) {
          this.logger.error(
            `[transaction.completed] Cannot find the subscriber with subID: ${subscriptionId}\nBody: ${JSON.stringify(body, null, 2)}`,
          )
          return
        }

        const updateParams: Record<string, any> = {}

        if (
          subscriber.dashboardBlockReason ===
          DashboardBlockReason.payment_failed
        ) {
          updateParams.dashboardBlockReason = null
          updateParams.isAccountBillingSuspended = false
        }

        if (Object.keys(updateParams).length > 0) {
          await this.userService.updateBySubID(subscriptionId, updateParams)
          await this.projectService.clearProjectsRedisCacheBySubId(subscriptionId)
        }

        break
      }

      case 'transaction.payment_failed': {
        const subscriptionId = data.subscription_id
        if (!subscriptionId) return

        const subscriber = await this.userService.findOne({
          where: { subID: subscriptionId },
        })

        if (!subscriber) return

        await this.userService.updateBySubID(subscriptionId, {
          dashboardBlockReason: DashboardBlockReason.payment_failed,
          isAccountBillingSuspended: true,
        })

        await this.mailerService.sendEmail(
          subscriber.email,
          LetterTemplate.DashboardLockedPaymentFailure,
          {
            billingUrl: 'https://swetrix.com/user-settings?tab=billing',
          },
        )

        break
      }

      default:
        throw new BadRequestException(`Unexpected Billing event type: ${eventType}`)
    }
  }
}
