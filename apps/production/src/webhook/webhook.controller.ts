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
import * as _find from 'lodash/find'

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

const MAX_PAYMENT_ATTEMPTS = 5

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
          ? await this.userService.findOne(uid)
          : await this.userService.findOneWhere({ email })
        const unlockDashboardParams =
          body.alert_name === 'subscription_created' ||
          isNextPlan(currentUser.planCode, plan.id)
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
          ...unlockDashboardParams,
        }

        if (uid) {
          await this.userService.update(uid, updateParams)
          await this.projectService.clearProjectsRedisCache(uid)
        } else {
          await this.userService.updateByEmail(email, updateParams)
          await this.projectService.clearProjectsRedisCacheByEmail(email)
        }

        break
      }

      case 'subscription_cancelled': {
        const {
          subscription_id: subID,
          cancellation_effective_date: cancellationEffectiveDate,
        } = body

        await this.userService.updateBySubID(subID, {
          billingFrequency: BillingFrequency.Monthly,
          nextBillDate: null,
          cancellationEffectiveDate,
          tierCurrency: null,
        })

        break
      }

      // case 'subscription_payment_refunded': {
      //   const { subscription_id: subID } = body

      //   await this.userService.updateBySubID(subID, {
      //     planCode: PlanCode.none,
      //     billingFrequency: BillingFrequency.Monthly,
      //     nextBillDate: null,
      //     tierCurrency: null,
      //   })

      //   break
      // }

      case 'subscription_payment_succeeded': {
        const {
          subscription_id: subID,
          balance_earnings: balanceEarnings,
          balance_currency: balanceCurrency,
        } = body

        const subscriber = await this.userService.findOneWhere({ subID })

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

        const referrer = await this.userService.findOneWhere({
          id: subscriber.referrerID,
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

      case 'subscription_payment_failed': {
        const { subscription_id: subID, attempt_number: attemptNumber } = body

        if (parseInt(attemptNumber, 10) >= MAX_PAYMENT_ATTEMPTS) {
          const { email } =
            (await this.userService.findOneWhere({
              subID,
            })) || {}

          if (!email) {
            this.logger.error(
              `[subscription_payment_failed] Cannot find the subscriber with subID: ${subID}\nBody: ${JSON.stringify(
                body,
                null,
                2,
              )}`,
            )
            return
          }

          await this.userService.updateBySubID(subID, {
            dashboardBlockReason: DashboardBlockReason.payment_failed,
          })

          await this.mailerService.sendEmail(
            email,
            LetterTemplate.DashboardLockedPaymentFailure,
            {
              billingUrl: 'https://swetrix.com/billing',
            },
          )
        }

        break
      }

      default:
        throw new BadRequestException('Unexpected event type')
    }
  }
}
