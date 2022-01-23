import {
  Controller, Body, Post, Headers, BadRequestException, NotFoundException, UseGuards, Ip,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import * as _isEmpty from 'lodash/isEmpty'
import * as _keys from 'lodash/keys'
import * as _find from 'lodash/find'
import { verifyPaddleWebhook } from 'verify-paddle-webhook'

import {
  PlanCode, ACCOUNT_PLANS,
} from '../user/entities/user.entity'
import { UserService } from '../user/user.service'
import { AppLoggerService } from '../logger/logger.service'
import { SelfhostedGuard } from '../common/guards/selfhosted.guard'
import { STRIPE_WH_SECRET, STRIPE_SECRET } from '../common/constants'

const stripe = require('stripe')(STRIPE_SECRET)

const PLANS_LIST = _keys(ACCOUNT_PLANS)

const paddleWhitelistIPs = [
  // Production IPs
  '34.232.58.13',
  '34.195.105.136',
  '34.237.3.244',
  // Sandbox IPs
  '34.194.127.46',
  '54.234.237.108',
  '3.208.120.145',
]

const PADDLE_PUB_KEY = ` -----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAqFcHslKkXcJlTYg4FL6j
XIKu0jM8PUMHRNbseLVqXS81DX7C5rZbacs6mU9MpyZv0QEXjiyZ9zXbQH5200Nx
7Jv/e5ZdXwIZc6jIMSdxY5Oxuw3ZSRZnHxZp3CD56QfbtnzKsvgRYKMfwdiYE9iC
7glB5Q++GHmfvgGKHqQtXaSpgYIREMO3XMYTBX2lqkdUZKnFFGEsL1ZgCiPGZjw8
DLVNrDAfDsPBy/hubZnrs3wFuP4ZywDG7vNU5nLCOt7nx5IiCBvlOcFpfYxpyV7+
OXLlANuYY6fM1PNjnAt6Eo8R+2bZcB9Xn2JusiS7NQavVbSHsvuZsI+6Q2T3dEr7
TAqkc4JDL/AjZcbJW2EGU9RakZ0lgj5aAwAMxn/s1mQ6s+UCe9S8fJnsbu07tRY8
oTrbUhdemtk1I+n2OWYJttsL2wLf8ppiJ3cer2h/3KB5JhSRbsjhz5sqYNe9D6j/
mx7yrcfyeObxKGhLoGiwcTwmeK1OnCQSgrCkEBjtCTqlqiYvBfXO4vuqBRmpCgZC
0p7cqvGNvtO+OupqNImTb0sNVk8oeVBpqsQzlI5lN2FdA5FRUYtgodT09rPFleX+
PFP+Wo9wV4n1J8KYm8nfpOiSCrPKT9XktsWhAneg6Obzy+LdDM3m2w2/pk+Ja4AO
ThpjdAzyWEhdnTyWWbxeoxsCAwEAAQ==
-----END PUBLIC KEY-----`

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly userService: UserService,
  ) { }

  @UseGuards(SelfhostedGuard)
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

  @UseGuards(SelfhostedGuard)
  @Post('/paddle')
  async paddleWebhook(@Body() body, @Headers() headers, @Ip() reqIP): Promise<any> {
    const ip = headers['cf-connecting-ip'] || headers['x-forwarded-for'] || reqIP || ''

    if (verifyPaddleWebhook(PADDLE_PUB_KEY, body)) {
      console.log(body, headers, ip)
    }

    this.logger.error('Webhook signature verification failed.')
    this.logger.error('Check the .env file and enter the correct webhook secret.')
    throw new BadRequestException('Webhook signature verification failed')
  }
}
