import {
  Controller,
  Body,
  Post,
  Headers,
  BadRequestException,
  NotFoundException,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import * as _isEmpty from 'lodash/isEmpty';
import * as _keys from 'lodash/keys';
import * as _find from 'lodash/find';

import {
  PlanCode,
  ACCOUNT_PLANS,
  BillingFrequency,
} from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { AppLoggerService } from '../logger/logger.service';
import { WebhookService } from './webhook.service';
import { SelfhostedGuard } from '../common/guards/selfhosted.guard';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly userService: UserService,
    private readonly webhookService: WebhookService,
  ) {}

  @UseGuards(SelfhostedGuard)
  @Post('/paddle')
  async paddleWebhook(
    @Body() body,
    @Headers() headers,
    @Ip() reqIP,
  ): Promise<any> {
    const ip =
      headers['cf-connecting-ip'] || headers['x-forwarded-for'] || reqIP || '';

    this.webhookService.verifyIP(ip);
    this.webhookService.validateWebhook(body);

    switch (body.alert_name) {
      case 'subscription_created':
      case 'subscription_updated': {
        const {
          passthrough,
          email,
          subscription_id,
          subscription_plan_id,
          cancel_url,
          update_url,
          next_bill_date,
        } = body;
        let uid;

        try {
          uid = JSON.parse(passthrough)?.uid;
        } catch {
          this.logger.error(
            `[${body.alert_name}] Cannot parse the uid: ${JSON.stringify(
              body,
            )}`,
          );
        }

        let monthlyBilling = true;
        let plan = _find(
          ACCOUNT_PLANS,
          ({ pid }) => pid === subscription_plan_id,
        );

        if (!plan) {
          monthlyBilling = false;
          plan = _find(
            ACCOUNT_PLANS,
            ({ ypid }) => ypid === subscription_plan_id,
          );
        }

        if (!plan) {
          throw new NotFoundException(
            `The selected account plan (${subscription_plan_id}) is not available`,
          );
        }

        const updateParams = {
          planCode: plan.id,
          subID: subscription_id,
          subUpdateURL: update_url,
          subCancelURL: cancel_url,
          nextBillDate: next_bill_date,
          billingFrequency: monthlyBilling
            ? BillingFrequency.Monthly
            : BillingFrequency.Yearly,
        };

        if (uid) {
          await this.userService.update(uid, updateParams);
        } else {
          await this.userService.updateByEmail(email, updateParams);
        }

        break;
      }

      case 'subscription_cancelled':
      case 'subscription_payment_failed':
      case 'subscription_payment_refunded': {
        const { subscription_id } = body;

        await this.userService.updateBySubID(subscription_id, {
          planCode: PlanCode.free,
          billingFrequency: BillingFrequency.Monthly,
        });

        break;
      }
      default:
        throw new BadRequestException('Unexpected event type');
    }

    return;
  }
}
