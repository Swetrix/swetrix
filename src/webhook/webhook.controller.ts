import {
  Controller, Body, Post, Headers, BadRequestException, NotFoundException,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import * as _isEmpty from 'lodash/isEmpty'
import * as _keys from 'lodash/keys'
import * as _find from 'lodash/find'

import {
  PlanCode, ACCOUNT_PLANS,
} from '../user/entities/user.entity'
import { UserService } from '../user/user.service'
import { AppLoggerService } from '../logger/logger.service'
import { STRIPE_WH_SECRET, STRIPE_SECRET } from '../common/constants'

const stripe = require('stripe')(STRIPE_SECRET)

const PLANS_LIST = _keys(ACCOUNT_PLANS)

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly userService: UserService,
  ) { }

  @Post('/')
  async stripeWebhook(@Body() body: Buffer, @Headers() headers): Promise<any> {
    let event

    try {
      event = stripe.webhooks.constructEvent(body, headers['stripe-signature'], STRIPE_WH_SECRET)
    } catch (err) {
      this.logger.error(err)
      this.logger.error('Webhook signature verification failed.')
      this.logger.error('Check the .env file and enter the correct webhook secret.')
      throw new BadRequestException('Webhook signature verification failed')
    }

    const dataObject = event.data.object

    switch (event.type) {
      case 'checkout.session.completed': {
        const { uid, planCode } = dataObject.metadata
        await this.userService.update(uid, { planCode })
        break
      }
      case 'invoice.paid': {
        if (dataObject['billing_reason'] == 'subscription_create') {
          const { uid, planCode } = dataObject.lines.data[0].metadata

          // Setting default payment method for subscription
          const subscription_id = dataObject['subscription']
          const payment_intent_id = dataObject['payment_intent']
          const payment_intent = await stripe.paymentIntents.retrieve(payment_intent_id)
          await stripe.subscriptions.update(subscription_id, {
            default_payment_method: payment_intent.payment_method,
          })
          await this.userService.update(uid, {
            planCode,
            stripeSubID: subscription_id,
          })
        }

        if (dataObject['billing_reason'] == 'subscription_update') {
          const { customer_email } = dataObject
          const { id } = dataObject.lines.data[0].price

          const planID = _find(PLANS_LIST, (pid) => ACCOUNT_PLANS[pid].priceId === id)

          if (_isEmpty(planID)) {
            throw new NotFoundException('The provided price ID seems to be incorrect..')
          }

          await this.userService.updateByEmail(customer_email, {
            planCode: planID,
          })
        }

        break
      }
      case 'invoice.payment_failed': {
        const { uid } = _isEmpty(dataObject.metadata) ? dataObject.lines.data[0].metadata : dataObject.metadata

        await this.userService.update(uid, { planCode: PlanCode.free })
        break
      }
      case 'customer.subscription.deleted': {
        const { uid } = dataObject.metadata

        await this.userService.update(uid, {
          planCode: PlanCode.free,
          stripeSubID: null,
        })
        break
      }
      default:
        throw new BadRequestException('Unexpected event type')
    }
    return
  }
}
