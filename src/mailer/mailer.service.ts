import { Injectable } from '@nestjs/common'
import * as nodemailer from 'nodemailer'
import handlebars from 'handlebars'
import { LetterTemplate } from './lettter'
import fs = require('fs')
import path = require('path')
import { AppLoggerService } from 'src/logger/logger.service'

const TEMPLATES_PATH = path.join(__dirname, '..', 'common', 'templates')
const metaInfoJson = {
  [LetterTemplate.SignUp]: {
    subject: {
      EN: 'Please verify your account registration',
    },
  },
  [LetterTemplate.ConfirmPasswordChange]: {
    subject: {
      EN: 'Please confirm the password change',
    },
  },
  [LetterTemplate.MailAddressChangeConfirmation]: {
    subject: {
      EN: 'Please confirm the new e-mail address',
    },
  },
  [LetterTemplate.MailAddressHadChanged]: {
    subject: {
      EN: 'A new e-mail-address has been saved',
    },
  },
  [LetterTemplate.PasswordChangeRequest]: {
    subject: {
      EN: 'Changing your password',
    },
  },
  [LetterTemplate.PasswordChanged]: {
    subject: {
      EN: 'Your password was successfully changed',
    },
  },
}

interface Params {
  [name: string]: any
}

@Injectable()
export class MailerService {
  constructor(
    private readonly logger: AppLoggerService
  ) {}

  async sendEmail(email: string, templateName: LetterTemplate, params: Params = null): Promise<void> {
    try {
      // const templatePath = TEMPLATES_PATH +
      //   '/' + 'en' +
      //   '/' + templateName + '_en.html'

      // const letter = fs.readFileSync(templatePath, { encoding: 'utf-8' })
      // const subject = metaInfoJson[templateName]['subject']['EN']
      // const template = handlebars.compile(letter)
      // const htmlToSend = template(params)

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      })

      const message = {
        from: {
          name: 'Analytics',
          address: process.env.FROM_EMAIL
        },
        to: email,
        // subject,
        // html: htmlToSend,
        attachments: [],

        params, // temp var
      }
  
      if (process.env.SMTP_MOCK) {
        this.logger.log(message, 'sendEmail')
      } else {
        transporter.sendMail(message, (err, info) => {
          if (err) {
            console.log('Error in transporter.sendMail', err)
            console.log('Info in transporter.sendMail', info)

            return process.exit(1)
          }
        })
      }
    } catch (error) {
      console.log(error)
    }
  }
}