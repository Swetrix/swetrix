import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Param,
  BadRequestException,
  UseGuards,
  Ip,
  Headers,
  UnprocessableEntityException,
} from '@nestjs/common'
import { Request } from 'express'
import { ApiTags } from '@nestjs/swagger'

import { OldAuthService } from './auth.service'
import { UserLoginDTO } from './dto/user-login.dto'
import { SignupUserDTO } from './dto/user-signup.dto'
import { UserService } from '../user/user.service'
import { MailerService } from '../mailer/mailer.service'
import { ActionTokensService } from '../action-tokens/action-tokens.service'
import { ActionTokenType } from '../action-tokens/action-token.entity'
import { User, UserType } from '../user/entities/user.entity'
import { ProjectService } from '../project/project.service'
import { PasswordChangeDTO } from './dto/password-change.dto'
import { RequestPasswordChangeDTO } from './dto/request-pass-change.dto'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUserId } from '../common/decorators/current-user-id.decorator'
import { checkRateLimit } from '../common/utils'
import { LetterTemplate } from '../mailer/letter'
import { AppLoggerService } from '../logger/logger.service'
import { SelfhostedGuard } from '../common/guards/selfhosted.guard'
import {
  isSelfhosted,
  SELFHOSTED_EMAIL,
  SELFHOSTED_PASSWORD,
  SELFHOSTED_UUID,
} from '../common/constants'
import * as _pick from 'lodash/pick'
import { InjectBot } from 'nestjs-telegraf'
import { TelegrafContext } from 'src/user/user.controller'
import { Telegraf } from 'telegraf'
import * as UAParser from 'ua-parser-js'
import ct from 'countries-and-timezones'

// TODO: Add logout endpoint to invalidate the token
@ApiTags('Auth')
@Controller('auth')
export class OldAuthController {
  constructor(
    private oldAuthService: OldAuthService,
    private userService: UserService,
    private mailerService: MailerService,
    private actionTokensService: ActionTokensService,
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
    @InjectBot() private bot: Telegraf<TelegrafContext>,
  ) {}

  @Get('/me')
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async me(@CurrentUserId() user_id: string): Promise<User> {
    this.logger.log({ user_id }, 'GET /auth/me')
    let user

    if (isSelfhosted) {
      user = {
        id: SELFHOSTED_UUID,
        email: SELFHOSTED_EMAIL,
      }
    } else {
      const sharedProjects = await this.projectService.findShare({
        where: {
          user: user_id,
        },
        relations: ['project'],
      })
      user = this.oldAuthService.processUser(
        await this.userService.findOneWhere({ id: user_id }),
      )

      user.sharedProjects = sharedProjects
    }

    return this.userService.omitSensitiveData(user)
  }

  @Post('/login')
  async loginUser(
    @Body() userLoginDTO: UserLoginDTO,
    @Headers() headers,
    @Ip() reqIP,
  ): Promise<any> {
    this.logger.log({ userLoginDTO }, 'POST /auth/login')
    const ip =
      headers['cf-connecting-ip'] || headers['x-forwarded-for'] || reqIP || ''
    await checkRateLimit(ip, 'login', 10, 1800)
    const { 'user-agent': userAgent } = headers
    // await this.oldAuthService.checkCaptcha(userLoginDTO.recaptcha)

    if (isSelfhosted) {
      if (
        userLoginDTO.email !== SELFHOSTED_EMAIL ||
        userLoginDTO.password !== SELFHOSTED_PASSWORD
      ) {
        throw new UnprocessableEntityException('Email or password is incorrect')
      }
      return this.oldAuthService.login({
        email: SELFHOSTED_EMAIL,
      })
    } else {
      const user = await this.oldAuthService.validateUser(
        userLoginDTO.email,
        userLoginDTO.password,
      )

      if (user.isTwoFactorAuthenticationEnabled) {
        const processedUser = this.oldAuthService.postLoginProcess(user)
        return this.oldAuthService.login(processedUser)
      }

      const sharedProjects = await this.projectService.findShare({
        where: {
          user: user.id,
        },
        relations: ['project'],
      })

      user.sharedProjects = sharedProjects

      if (user.isTelegramChatIdConfirmed && process.env.TG_BOT_TOKEN) {
        const ua = UAParser(userAgent)
        const br = ua.browser.name || 'Unknown'
        const dv = ua.device.type || 'Desktop'
        const os = ua.os.name || 'Unknown'
        let country

        if (headers['cf-ipcountry'] === 'XX') {
          country = 'Unknown'
        } else if (headers['cf-ipcountry'] === 'T1') {
          country = 'Unknown (Tor Browser detected)'
        } else {
          ct.getCountry(headers['cf-ipcountry'])?.name || 'Unknown'
        }

        this.bot.telegram.sendMessage(
          user.telegramChatId,
          `🚨 *Someone has logged into your account!*` +
            '\n\n' +
            `Browser: \`${br}\`` +
            '\n' +
            `Device: \`${dv}\`` +
            '\n' +
            `OS: \`${os}\`` +
            '\n' +
            `Country: \`${country}\`` +
            '\n' +
            `IP: \`${ip}\`` +
            '\n\n' +
            `If it was you, ignore this message. If not, please contact customer support immediately.`,
          {
            parse_mode: 'Markdown',
          },
        )
      }

      return this.oldAuthService.login(user)
    }
  }

  @UseGuards(SelfhostedGuard)
  @Post('/register')
  async register(
    @Body() userDTO: SignupUserDTO,
    /*@Body('recaptcha') recaptcha: string,*/ @Req() request: Request,
    @Headers() headers,
    @Ip() reqIP,
  ): Promise<any> {
    this.logger.log({ userDTO }, 'POST /auth/register')
    const ip =
      headers['cf-connecting-ip'] || headers['x-forwarded-for'] || reqIP || ''

    if (userDTO.checkIfLeaked) {
      await this.oldAuthService.checkIfPasswordLeaked(userDTO.password)
    }

    await checkRateLimit(ip, 'register', 6)

    // await this.oldAuthService.checkCaptcha(recaptcha)
    this.userService.validatePassword(userDTO.password)

    const doesEmailExist = await this.userService.findOneWhere({
      email: userDTO.email,
    })

    if (doesEmailExist) {
      throw new BadRequestException('emailRegistered')
    }

    userDTO.password = await this.oldAuthService.hashPassword(userDTO.password)

    try {
      const userToUpdate = _pick(userDTO, ['email', 'password'])
      const user = await this.userService.create(userToUpdate)
      const actionToken = await this.actionTokensService.createForUser(
        user,
        ActionTokenType.EMAIL_VERIFICATION,
      )
      const url = `${request.headers.origin}/verify/${actionToken.id}`
      await this.mailerService.sendEmail(userDTO.email, LetterTemplate.SignUp, {
        url,
      })
      user.sharedProjects = []

      return this.oldAuthService.login(user)
    } catch (e) {
      this.logger.log(
        `[ERROR WHILE CREATING ACCOUNT]: ${e}`,
        'POST /auth/register',
        true,
      )
    }
  }

  @UseGuards(SelfhostedGuard)
  @Get('/verify/:id')
  async verify(@Param('id') id: string): Promise<User> {
    this.logger.log({ id }, 'GET /auth/verify/:id')
    let actionToken

    try {
      actionToken = await this.actionTokensService.find(id)
    } catch {
      throw new BadRequestException('Incorrect token provided')
    }

    if (actionToken.action === ActionTokenType.EMAIL_VERIFICATION) {
      await this.userService.update(actionToken.user.id, {
        ...actionToken.user,
        isActive: true,
      })
      await this.actionTokensService.delete(actionToken.id)
      return
    }
  }

  @UseGuards(SelfhostedGuard)
  @Get('/change-email/:id')
  async changeEmail(@Param('id') id: string): Promise<User> {
    this.logger.log({ id }, 'GET /auth/change-email/:id')
    let actionToken

    try {
      actionToken = await this.actionTokensService.find(id)
    } catch {
      throw new BadRequestException('Incorrect token provided')
    }

    if (actionToken.action === ActionTokenType.EMAIL_CHANGE) {
      await this.userService.update(actionToken.user.id, {
        ...actionToken.user,
        email: actionToken.newValue,
      })
      await this.mailerService.sendEmail(
        actionToken.user.email,
        LetterTemplate.MailAddressHadChanged,
        actionToken.user.locale,
      )
      await this.actionTokensService.delete(actionToken.id)
      return
    }
  }

  @UseGuards(SelfhostedGuard)
  @Post('/reset-password')
  async requestReset(
    @Body() body: RequestPasswordChangeDTO,
    @Req() request: Request,
    @Headers() headers,
    @Ip() reqIP,
  ): Promise<string> {
    this.logger.log({ body }, 'POST /auth/password-reset')
    const { email } = body
    const ip =
      headers['cf-connecting-ip'] || headers['x-forwarded-for'] || reqIP || ''
    await checkRateLimit(ip, 'reset-password')
    await checkRateLimit(email, 'reset-password')

    const user = await this.userService.findOneWhere({ email })

    if (!user) {
      return 'A password reset URL has been sent to your email'
    }

    const actionToken = await this.actionTokensService.createForUser(
      user,
      ActionTokenType.PASSWORD_RESET,
    )
    const url = `${request.headers.origin}/password-reset/${actionToken.id}`

    await this.mailerService.sendEmail(
      email,
      LetterTemplate.ConfirmPasswordChange,
      { url },
    )
    return 'A password reset URL has been sent to your email'
  }

  @UseGuards(SelfhostedGuard)
  @Post('/password-reset/:id')
  async reset(
    @Param('id') id: string,
    @Body() body: PasswordChangeDTO,
  ): Promise<User> {
    this.logger.log({ id }, 'POST /auth/password-reset/:id')
    this.userService.validatePassword(body.password)
    let actionToken

    try {
      actionToken = await this.actionTokensService.find(id)
    } catch {
      throw new BadRequestException('Incorrect token provided')
    }

    if (actionToken.action === ActionTokenType.PASSWORD_RESET) {
      const password = await this.oldAuthService.hashPassword(body.password)

      await this.userService.update(actionToken.user.id, {
        ...actionToken.user,
        password,
      })
      await this.actionTokensService.delete(actionToken.id)
      return
    }
  }
}
