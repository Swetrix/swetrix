import { Injectable } from '@nestjs/common'
import * as nodemailer from 'nodemailer'
import handlebars from 'handlebars'
import { LetterTemplate } from './letter'
import fs = require('fs')
import path = require('path')
import { AppLoggerService } from 'src/logger/logger.service'

const TEMPLATES_PATH = path.join(__dirname, '..', 'common', 'templates')
const metaInfoJson = {
  [LetterTemplate.SignUp]: {
    subject: {
      en: () => 'Please verify your account registration',
    },
  },
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
  [LetterTemplate.PasswordChangeRequest]: {
    subject: {
      en: () => 'Changing your password',
    },
  },
  [LetterTemplate.PasswordChanged]: {
    subject: {
      en: () => 'Your password was successfully changed',
    },
  },
  [LetterTemplate.GDPRDataExport]: {
    subject: {
      en: () => 'Swetrix Account data export',
    },
  },
  [LetterTemplate.ProjectReport]: {
    subject: {
      en: (p: Params) => `${p.type === 'w' ? 'Weekly' : 'Monthly'} Report: ${p.date}`,
    },
  },
}

interface Params {
  [name: string]: any
}

handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this)
})

handlebars.registerHelper('greater', function (v1, v2, options) {
  if (v1 > v2) {
    return options.fn(this)
  }
  return options.inverse(this)
})

@Injectable()
export class MailerService {
  constructor(
    private readonly logger: AppLoggerService,
  ) { }

  async sendEmail(email: string, templateName: LetterTemplate, params: Params = null): Promise<void> {
    try {
      const templatePath = `${TEMPLATES_PATH}/en/${templateName}.html`
      const letter = fs.readFileSync(templatePath, { encoding: 'utf-8' })
      const subject = metaInfoJson[templateName].subject.en(params)
      const template = handlebars.compile(letter)
      const htmlToSend = template(params)

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
        headers: {
          'X-PM-Message-Stream': 'outbound',
        }
      })

      const message = {
        from: {
          name: 'Swetrix Analytics',
          address: process.env.FROM_EMAIL
        },
        to: email,
        subject,
        html: htmlToSend,
        attachments: [],
      }

      if (process.env.SMTP_MOCK) {
        this.logger.log(message, 'sendEmail')
      } else {
        transporter.sendMail(message, (err, info) => {
          if (err) {
            console.error('Error in transporter.sendMail', err)
            console.error('Info in transporter.sendMail', info)
            return process.exit(1)
          }
        })
      }
    } catch (error) {
      console.error(error)
    }
  }
}
