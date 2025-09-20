import fs from 'fs'
import path from 'path'
import { MailerService as NodeMailerService } from '@nestjs-modules/mailer'
import { Injectable } from '@nestjs/common'
import handlebars from 'handlebars'
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

@Injectable()
export class MailerService {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly nodeMailerService: NodeMailerService,
  ) {}

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
        from: process.env.FROM_EMAIL || 'noreply@ce.swetrix.org',
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
      } else {
        await this.nodeMailerService.sendMail(message)
      }
    } catch (reason) {
      this.logger.error(reason, 'sendEmail', true)
    }
  }
}
