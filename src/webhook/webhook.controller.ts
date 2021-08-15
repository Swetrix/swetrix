import {
  Controller, Body, Post, Headers, BadRequestException,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { PlanCode } from '../user/entities/user.entity'
import { UserService } from '../user/user.service'
import { AppLoggerService } from '../logger/logger.service'
import { STRIPE_WH_SECRET, STRIPE_SECRET } from '../common/constants'

const stripe = require('stripe')(STRIPE_SECRET)

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
    const { uid, planCode } = dataObject['metadata']

    switch (event.type) {
      // case 'checkout.session.completed':
      //   await this.userService.update(uid, { planCode })
      //   break
      case 'invoice.paid':
        if (dataObject['billing_reason'] == 'subscription_create') {
          // Setting default payment method for subscription
          const subscription_id = dataObject['subscription']
          const payment_intent_id = dataObject['payment_intent']
          const payment_intent = await stripe.paymentIntents.retrieve(payment_intent_id)
          await stripe.subscriptions.update(subscription_id, {
            default_payment_method: payment_intent.payment_method,
          })
          await this.userService.update(uid, { planCode })
        }

        break
      case 'invoice.payment_failed':
        await this.userService.update(uid, { planCode: PlanCode.free })
        break
      case 'customer.subscription.deleted':
        await this.userService.update(uid, { planCode: PlanCode.free })
        break
      case 'customer.subscription.updated':
        // await this.userService.update(uid, { planCode: PlanCode.free })
        break
      default:
        throw new BadRequestException('Unexpected event type')
    }
    return
  }
}
