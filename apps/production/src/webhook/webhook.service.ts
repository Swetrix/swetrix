/* eslint-disable no-param-reassign, no-prototype-builtins */
import * as crypto from 'crypto'
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import * as Serialize from 'php-serialize'
import * as _includes from 'lodash/includes'
import * as _keys from 'lodash/keys'
import * as _isArray from 'lodash/isArray'
import { AppLoggerService } from '../logger/logger.service'
import { PayoutsService } from '../payouts/payouts.service'
import { ProjectService } from '../project/project.service'
import { UserService } from '../user/user.service'
import { PayoutStatus } from '../payouts/entities/payouts.entity'
import { User } from '../user/entities/user.entity'
import { ReportFrequency } from '../project/enums'

const PADDLE_PUB_KEY = `-----BEGIN PUBLIC KEY-----
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

@Injectable()
export class WebhookService {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly payoutsService: PayoutsService,
    private readonly userService: UserService,
    private readonly projectService: ProjectService,
  ) {}

  public ksort(obj: Record<string, unknown>): Record<string, unknown> {
    const keys = _keys(obj).sort()
    const sortedObj: Record<string, unknown> = {}

    for (const key of keys) {
      sortedObj[key] = obj[key]
    }

    return sortedObj
  }

  public validateWebhook(data: any) {
    // Grab p_signature
    const mySig = Buffer.from(data.p_signature, 'base64')
    // Remove p_signature from object - not included in array of fields used in verification.
    delete data.p_signature
    // Need to sort array by key in ascending order
    data = this.ksort(data)
    for (const property in data) {
      if (data.hasOwnProperty(property) && typeof data[property] !== 'string') {
        if (_isArray(data[property])) {
          // is it an array
          data[property] = data[property].toString()
        } else {
          // if its not an array and not a string, then it is a JSON obj
          data[property] = JSON.stringify(data[property])
        }
      }
    }
    // Serialise remaining fields of jsonObj
    const serialized = Serialize.serialize(data)
    // verify the serialized array against the signature using SHA1 with your public key.
    const verifier = crypto.createVerify('sha1')
    verifier.update(serialized)
    verifier.end()

    const verification = verifier.verify(PADDLE_PUB_KEY, mySig)

    if (!verification) {
      this.logger.error(`Webhook signature verification failed: ${data}`)
      throw new BadRequestException('Webhook signature verification failed')
    }
  }

  public verifyIP(reqIP: string) {
    if (!_includes(paddleWhitelistIPs, reqIP)) {
      throw new ForbiddenException('You have no access to this endpoint')
    }
  }

  async addPayoutForUser(
    referrer: User,
    referralId: string,
    amount: number,
    currency: string,
  ): Promise<any> {
    return this.payoutsService.create({
      amount,
      currency,
      referralId,
      user: referrer,
    })
  }

  async setReferralPayoutsToProcessing(
    referralId: string,
    referrer: User,
  ): Promise<any> {
    return this.payoutsService.update(
      {
        referralId,
        user: referrer,
      },
      {
        status: PayoutStatus.processing,
      },
    )
  }

  async unsubscribeByEmail(email: string): Promise<void> {
    const user = await this.userService.findOneWhere({
      email,
    })

    // checking if the bounce originates from admin email reports
    if (user) {
      await this.userService.update(user.id, {
        reportFrequency: ReportFrequency.NEVER,
      })
      return
    }

    // checking if the bounce originates from project subscriber email reports
    const subscribtion = await this.projectService.findOneSubscriber({
      email,
    })

    if (subscribtion) {
      await this.projectService.removeSubscriberById(subscribtion.id)
    }

    // if it's some other kind of bounce, we can ignore it because it originates from other transactional emails
    // but I'll log it here for now
    this.logger.log(
      `Received an email notification, but it originates from other transactional emails. Email: ${email}`,
      'POST /webhook/ses',
      true,
    )
  }
}
