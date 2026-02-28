import crypto from 'crypto'
import Validator from 'sns-payload-validator'
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { serialize } from 'php-serialize'
import _includes from 'lodash/includes'
import _keys from 'lodash/keys'
import _isArray from 'lodash/isArray'
import { AppLoggerService } from '../logger/logger.service'
import { ProjectService } from '../project/project.service'
import { UserService } from '../user/user.service'
import { ReportFrequency } from '../project/enums'

const { PADDLE_WEBHOOK_SECRET } = process.env

// Paddle Classic public key (for legacy subscribers during transition)
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
  '34.232.58.13',
  '34.195.105.136',
  '34.237.3.244',
  '34.194.127.46',
  '54.234.237.108',
  '3.208.120.145',
]

const validator = new Validator()

@Injectable()
export class WebhookService {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly userService: UserService,
    private readonly projectService: ProjectService,
  ) {}

  public isClassicWebhook(body: any, headers: Record<string, string>): boolean {
    return !!body?.alert_name || !!body?.p_signature
  }

  // Paddle Classic signature verification
  public ksort(obj: Record<string, unknown>): Record<string, unknown> {
    const keys = _keys(obj).sort()
    const sortedObj: Record<string, unknown> = {}

    for (const key of keys) {
      sortedObj[key] = obj[key]
    }

    return sortedObj
  }

  public validateClassicWebhook(data: any) {
    const mySig = Buffer.from(data.p_signature, 'base64')
    delete data.p_signature
    data = this.ksort(data)
    for (const property in data) {
      if (data.hasOwnProperty(property) && typeof data[property] !== 'string') {
        if (_isArray(data[property])) {
          data[property] = data[property].toString()
        } else {
          data[property] = JSON.stringify(data[property])
        }
      }
    }
    const serialized = serialize(data)
    const verifier = crypto.createVerify('sha1')
    verifier.update(serialized)
    verifier.end()

    const verification = verifier.verify(PADDLE_PUB_KEY, mySig)

    if (!verification) {
      this.logger.error(`Classic webhook signature verification failed: ${data}`)
      throw new BadRequestException('Webhook signature verification failed')
    }
  }

  public verifyClassicIP(reqIP: string) {
    if (!_includes(paddleWhitelistIPs, reqIP)) {
      throw new ForbiddenException('You have no access to this endpoint')
    }
  }

  // Paddle Billing signature verification (HMAC-SHA256)
  public validateBillingWebhook(rawBody: string | Buffer, signature: string) {
    if (!PADDLE_WEBHOOK_SECRET) {
      throw new BadRequestException('Paddle webhook secret is not configured')
    }

    if (!signature) {
      throw new BadRequestException('Missing Paddle-Signature header')
    }

    const parts: Record<string, string> = {}
    for (const pair of signature.split(';')) {
      const [key, value] = pair.split('=')
      if (key && value) {
        parts[key] = value
      }
    }

    const { ts, h1 } = parts

    if (!ts || !h1) {
      throw new BadRequestException('Invalid Paddle-Signature format')
    }

    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')
    const payload = `${ts}:${body}`
    const expectedSignature = crypto
      .createHmac('sha256', PADDLE_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex')

    if (!crypto.timingSafeEqual(Buffer.from(h1), Buffer.from(expectedSignature))) {
      this.logger.error('Paddle Billing webhook signature verification failed')
      throw new BadRequestException('Webhook signature verification failed')
    }
  }

  async verifySNSRequest(payload: any): Promise<void> {
    try {
      await validator.validate(payload)
    } catch {
      throw new BadRequestException('Webhook signature verification failed')
    }
  }

  async unsubscribeByEmail(email: string): Promise<void> {
    const user = await this.userService.findOne({
      where: { email },
    })

    if (user) {
      await this.userService.update(user.id, {
        reportFrequency: ReportFrequency.NEVER,
      })
      return
    }

    const subscribtion = await this.projectService.findOneSubscriber({
      email,
    })

    if (subscribtion) {
      await this.projectService.removeSubscriberById(subscribtion.id)
    }

    this.logger.log(
      `Received an email notification, but it originates from other transactional emails. Email: ${email}`,
      'POST /webhook/ses',
      true,
    )
  }
}
