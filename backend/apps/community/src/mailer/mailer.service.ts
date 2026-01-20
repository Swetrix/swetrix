import fs from 'fs'
import path from 'path'
import { MailerService as NodeMailerService } from '@nestjs-modules/mailer'
import { Injectable } from '@nestjs/common'
import handlebars from 'handlebars'
import nodemailer from 'nodemailer'
import dns from 'dns/promises'
import { LetterTemplate } from './letter'
import { AppLoggerService } from '../logger/logger.service'

const TEMPLATES_PATH = path.join(__dirname, '..', 'common', 'templates')
const metaInfoJson = {
  [LetterTemplate.ConfirmPasswordChange]: {
    subject: {
      en: () => 'Please confirm the password change',
    },
  },
  [LetterTemplate.MailAddressChangeConfirmation]: {
    subject: {
      en: () => 'Please confirm the new e-mail address',
    },
  },
  [LetterTemplate.MailAddressHadChanged]: {
    subject: {
      en: () => 'A new e-mail-address has been saved',
    },
  },
  [LetterTemplate.PasswordChanged]: {
    subject: {
      en: () => 'Your password was successfully changed',
    },
  },
  [LetterTemplate.ProjectInvitation]: {
    subject: {
      en: () => 'You have been invited to join the project',
    },
  },
}

interface Params {
  [name: string]: any
}

handlebars.registerHelper('ifEquals', function ifEquals(arg1, arg2, options) {
  return arg1 == arg2 ? options.fn(this) : options.inverse(this)
})

handlebars.registerHelper(
  'ifNotEquals',
  function ifNotEquals(arg1, arg2, options) {
    return arg1 != arg2 ? options.fn(this) : options.inverse(this)
  },
)

handlebars.registerHelper('greater', function greater(v1, v2, options) {
  if (v1 > v2) {
    return options.fn(this)
  }
  return options.inverse(this)
})

handlebars.registerHelper('less', function less(v1, v2, options) {
  if (v1 < v2) {
    return options.fn(this)
  }
  return options.inverse(this)
})

@Injectable()
export class MailerService {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly nodeMailerService: NodeMailerService,
  ) {}

  private hasSmtpConfig(): boolean {
    return (
      !!process.env.SMTP_HOST &&
      !!process.env.SMTP_PORT &&
      !!process.env.SMTP_USER &&
      !!process.env.SMTP_PASSWORD
    )
  }

  private async sendDirect(message: {
    from: string
    to: string
    subject: string
    html: string
  }): Promise<boolean> {
    try {
      const to = message.to
      const domain = (to.split('@')[1] || '').trim().toLowerCase()
      if (!domain) {
        this.logger.error(
          'Invalid recipient e-mail address',
          'sendDirect',
          true,
        )
        return false
      }

      let mxRecords: Array<{ exchange: string; priority: number }> = []
      try {
        mxRecords = await dns.resolveMx(domain)
      } catch (err) {
        this.logger.error(err, 'resolveMx', true)
      }

      // Sort by priority ascending
      mxRecords.sort((a, b) => a.priority - b.priority)

      const targets = mxRecords.length
        ? mxRecords.map((mx) => mx.exchange)
        : [domain]

      for (const host of targets) {
        try {
          const transporter = nodemailer.createTransport({
            host,
            port: 25,
            secure: false,
            name: process.env.SMTP_HELO_NAME || 'swetrix-ce',
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 15_000,
            tls: {
              rejectUnauthorized: false,
            },
          })

          await transporter.sendMail({
            ...message,
            envelope: {
              from: message.from,
              to: [to],
            },
            disableFileAccess: true,
            disableUrlAccess: true,
          })

          return true
        } catch (reason) {
          this.logger.error(
            { host, err: (reason as Error)?.message || reason },
            'sendDirectAttempt',
            true,
          )
          continue
        }
      }

      return false
    } catch (reason) {
      this.logger.error(reason, 'sendDirect', true)
      return false
    }
  }

  async sendEmail(
    email: string,
    templateName: LetterTemplate,
    params: Params = null,
  ): Promise<void> {
    try {
      const templatePath = `${TEMPLATES_PATH}/en/${templateName}.html`
      const letter = fs.readFileSync(templatePath, { encoding: 'utf-8' })
      const subject = metaInfoJson[templateName].subject.en()
      const template = handlebars.compile(letter)
      const html = template(params)

      const message = {
        from: `Swetrix CE <${process.env.FROM_EMAIL || 'noreply@ce.swetrix.org'}>`,
        to: email,
        subject,
        html,
      }

      if (process.env.SMTP_MOCK) {
        this.logger.log(
          {
            ...message,
            params,
          },
          'sendEmail',
          true,
        )
      } else if (this.hasSmtpConfig()) {
        await this.nodeMailerService.sendMail(message)
      } else {
        const ok = await this.sendDirect(message)
        if (!ok) {
          throw new Error('All direct delivery attempts failed')
        }
      }
    } catch (reason) {
      this.logger.error(reason, 'sendEmail', true)
    }
  }
}
