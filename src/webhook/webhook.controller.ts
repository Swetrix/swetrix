import {
  Controller, Body, Query, UseGuards, Get, Post, Headers, BadRequestException,
  InternalServerErrorException, NotImplementedException, UnprocessableEntityException, PreconditionFailedException,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { AppLoggerService } from '../logger/logger.service'
import { STRIPE_WH_SECRET, STRIPE_SECRET } from '../common/constants'

const stripe = require('stripe')(STRIPE_SECRET)

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly logger: AppLoggerService,
  ) { }

  @Post('/')
  async logCustom(@Body() body: Buffer, @Headers() headers): Promise<any> {
    this.logger.log({ body, headers }, 'POST /webhook')

    let event

    try {
      event = stripe.webhooks.constructEvent(body, headers['stripe-signature'], STRIPE_WH_SECRET)
    } catch (err) {
      this.logger.error(err)
      this.logger.error('Webhook signature verification failed.')
      this.logger.error('Check the .env file and enter the correct webhook secret.')
      throw new BadRequestException('Webhook signature verification failed')
    }

    // Extract the object from the event.
    const dataObject = event.data.object

    // Handle the event
    // Review important events for Billing webhooks
    // https://stripe.com/docs/billing/webhooks
    // Remove comment to see the various objects sent for this sample
    switch (event.type) {
      case 'checkout.session.completed':
        // Payment is successful and the subscription is created.
        // You should provision the subscription and save the customer ID to your database.
        break
      case 'invoice.paid':
        if (dataObject['billing_reason'] == 'subscription_create') {
          // The subscription automatically activates after successful payment
          // Set the payment method used to pay the first invoice
          // as the default payment method for that subscription
          const subscription_id = dataObject['subscription']
          const payment_intent_id = dataObject['payment_intent']

          // Retrieve the payment intent used to pay the subscription
          const payment_intent = await stripe.paymentIntents.retrieve(payment_intent_id)

          const subscription = await stripe.subscriptions.update(subscription_id, {
            default_payment_method: payment_intent.payment_method,
          })

          console.log('Default payment method set for subscription:' + payment_intent.payment_method)
        }

        break
      case 'invoice.payment_failed':
        // If the payment fails or the customer does not have a valid payment method,
        //  an invoice.payment_failed event is sent, the subscription becomes past_due.
        // Use this webhook to notify your user that their payment has
        // failed and to retrieve new card details.
        break
      case 'customer.subscription.deleted':
        if (event.request !== null) {
          // handle a subscription cancelled by your request
          // from above.
        } else {
          // handle subscription cancelled automatically based
          // upon your subscription settings.
        }
        break
      case 'customer.subscription.trial_will_end':
        // Send notification to your user that the trial will end
        break
      default:
        throw new BadRequestException('Unexpected event type')
    }
    return
  }
}
