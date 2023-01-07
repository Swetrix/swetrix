import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import axios from 'axios'
import { genSalt, hash, compare } from 'bcrypt'
import { getCountry } from 'countries-and-timezones'
import { createHash } from 'crypto'
import * as dayjs from 'dayjs'
import { InjectBot } from 'nestjs-telegraf'
import { ActionTokenType } from 'src/action-tokens/action-token.entity'
import { ActionTokensService } from 'src/action-tokens/action-tokens.service'
import { LetterTemplate } from 'src/mailer/letter'
import { MailerService } from 'src/mailer/mailer.service'
import { User } from 'src/user/entities/user.entity'
import { TelegrafContext } from 'src/user/user.controller'
import { UserService } from 'src/user/user.service'
import { Telegraf } from 'telegraf'
import { UAParser } from 'ua-parser-js'

@Injectable()
export class AuthService {
  constructor(
    @InjectBot() private readonly telegramBot: Telegraf<TelegrafContext>,
    private readonly userService: UserService,
    private readonly actionTokensService: ActionTokensService,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
    private readonly jwtService: JwtService,
  ) {}

  private async createSha1Hash(password: string): Promise<string> {
    return new Promise(resolve => {
      const sha1sum = createHash('sha1')
        .update(password)
        .digest('hex')
        .toUpperCase()
      resolve(sha1sum)
    })
  }

  private getFirstFiveChars(hash: string): string {
    return hash.slice(0, 5)
  }

  private async sendRequestToApi(hash: string) {
    const url = `https://api.pwnedpasswords.com/range/${hash}`
    const response = await axios.get(url)

    if (response.status !== 200) {
      throw new InternalServerErrorException()
    }

    return response.data
  }

  public async checkIfLeaked(password: string): Promise<boolean> {
    const sha1Hash = await this.createSha1Hash(password)
    const firstFiveChars = this.getFirstFiveChars(sha1Hash)
    const response = await this.sendRequestToApi(firstFiveChars)

    return response.includes(firstFiveChars)
  }

  public async hashPassword(password: string): Promise<string> {
    const salt = await genSalt(10)
    return await hash(password, salt)
  }

  private async sendVerificationEmail(userId: string, email: string) {
    const actionToken = await this.actionTokensService.createActionToken(
      userId,
      ActionTokenType.EMAIL_VERIFICATION,
    )

    const verificationLink = `${this.configService.get('CLIENT_URL')}/verify/${
      actionToken.id
    }`

    await this.mailerService.sendEmail(email, LetterTemplate.SignUp, {
      url: verificationLink,
    })
  }

  public async createUnverifiedUser(email: string, password: string) {
    const hashedPassword = await this.hashPassword(password)

    const user = await this.userService.createUser({
      email,
      password: hashedPassword, // Using the password field is incorrect.
    })

    await this.sendVerificationEmail(user.id, user.email)

    return user
  }

  public async generateJwtAccessToken(
    userId: string,
    isSecondFactorAuthenticated = false,
  ) {
    return await this.jwtService.signAsync(
      {
        sub: userId,
        isSecondFactorAuthenticated,
      },
      {
        algorithm: 'HS256',
        expiresIn: 60 * 30,
        secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
      },
    )
  }

  public async validateUser(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.userService.findUser(email)

    if (user && (await this.comparePassword(password, user.password))) {
      return user
    }

    return null
  }

  private async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await compare(password, hashedPassword)
  }

  public async sendTelegramNotification(
    userId: string,
    headers: unknown,
    ip: string,
  ) {
    const user = await this.userService.findUserById(userId)

    if (!user.telegramChatId) {
      return
    }

    const chat = await this.checkTelegramChatId(user.telegramChatId)

    if (!chat) {
      return
    }

    const headersInfo = await this.getHeadersInfo(headers)
    const loginDate = dayjs().utc().format('YYYY-MM-DD HH:mm:ss')
    const message =
      '⚠️ *New login detected* ⚠️\n\n' +
      `*Browser:* ${headersInfo.browser}\n` +
      `*Device:* ${headersInfo.device}\n` +
      `*OS:* ${headersInfo.os}\n` +
      `*Country:* ${headersInfo.country}\n` +
      `*IP:* ${ip}\n` +
      `*Date:* ${loginDate} (UTC)\n\n` +
      'If this was not you, please change your password immediately.'
    await this.telegramBot.telegram.sendMessage(user.telegramChatId, message, {
      parse_mode: 'Markdown',
    })
  }

  private async getHeadersInfo(headers: unknown) {
    const ua = UAParser(headers['user-agent'])
    const browser = ua.browser.name || 'Unknown'
    const device = ua.device.type || 'Unknown'
    const os = ua.os.name || 'Unknown'
    const country =
      headers['cf-ipcountry'] === 'XX'
        ? 'Unknown'
        : headers['cf-ipcountry'] === 'T1'
        ? 'Unknown (Tor)'
        : headers['cf-ipcountry']
        ? getCountry(headers['cf-ipcountry']).name
        : 'Unknown'

    return {
      browser,
      device,
      os,
      country,
    }
  }

  public async checkTelegramChatId(chatId: string): Promise<boolean> {
    const chat = (await this.telegramBot.telegram.getChat(chatId)).id
    return Boolean(chat)
  }
}
