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
import _find from 'lodash/find'

import { ProjectService } from '../project/project.service'
import { getIPFromHeaders } from '../common/utils'
import { AFFILIATE_CUT } from '../common/constants'
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

        try {
          uid = JSON.parse(passthrough)?.uid
        } catch {
          this.logger.error(
            `[${body.alert_name}] Cannot parse the uid: ${JSON.stringify(
              body,
            )}`,
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

        const currentUser = uid
          ? await this.userService.findOne({ where: { id: uid } })
          : await this.userService.findOne({ where: { email } })

        if (!currentUser) {
          this.logger.error(
            '[PADDLE WEBHOOK / FATAL] Cannot find the webhook user',
          )
          this.logger.error(JSON.stringify(body, null, 2))
          return
        }

        const shouldUnlock =
          body.alert_name === 'subscription_created' ||
          isNextPlan(currentUser.planCode, plan.id)

        const statusParams =
          status === 'paused'
            ? {
                dashboardBlockReason: DashboardBlockReason.payment_failed,
                isAccountBillingSuspended: true,
              }
            : shouldUnlock
              ? {
                  dashboardBlockReason: null,
                  planExceedContactedAt: null,
                  isAccountBillingSuspended: false,
                }
              : {}

        const updateParams = {
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

        if (uid) {
          await this.userService.update(uid, updateParams)
          await this.projectService.clearProjectsRedisCache(uid)
        } else {
          await this.userService.updateByEmail(email, updateParams)
          await this.projectService.clearProjectsRedisCacheByEmail(email)
        }

        if (status === 'paused') {
          await this.mailerService.sendEmail(
            currentUser.email,
            LetterTemplate.DashboardLockedPaymentFailure,
            {
              billingUrl: 'https://swetrix.com/billing',
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

        const { email } =
          (await this.userService.findOne({
            where: { subID },
          })) || {}

        if (email) {
          await this.mailerService.sendEmail(
            email,
            LetterTemplate.SubscriptionCancelled,
          )
        }

        break
      }

      case 'subscription_payment_succeeded': {
        const {
          subscription_id: subID,
          balance_earnings: balanceEarnings,
          balance_currency: balanceCurrency,
        } = body

        const subscriber = await this.userService.findOne({
          where: { subID },
        })

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

        if (
          subscriber.dashboardBlockReason ===
          DashboardBlockReason.payment_failed
        ) {
          await this.userService.updateBySubID(subID, {
            dashboardBlockReason: null,
          })
          await this.projectService.clearProjectsRedisCacheBySubId(subID)
        }

        // That user was not referred by anyone
        if (!subscriber.referrerID) {
          return
        }

        const referrer = await this.userService.findOne({
          where: { id: subscriber.referrerID },
        })

        if (!referrer) {
          this.logger.error(
            `[subscription_payment_succeeded] Cannot find the referrer with ID: ${subscriber.referrerID}`,
          )
          return
        }

        await this.webhookService.setReferralPayoutsToProcessing(
          subscriber.id,
          referrer,
        )

        await this.webhookService.addPayoutForUser(
          referrer,
          subscriber.id,
          Number(balanceEarnings) * AFFILIATE_CUT,
          balanceCurrency,
        )

        break
      }

      default:
        throw new BadRequestException('Unexpected event type')
    }
  }
}
