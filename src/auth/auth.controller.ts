import { 
  Controller, Post, Body, Req, Get, Param, BadRequestException, UseGuards, Ip, Headers, UnprocessableEntityException,
} from '@nestjs/common'
import { Request } from 'express'
import { ApiTags } from '@nestjs/swagger'

import { AuthService } from './auth.service'
import { UserLoginDTO } from './dto/user-login.dto'
import { SignupUserDTO } from './dto/user-signup.dto'
import { UserService } from '../user/user.service'
import { MailerService } from '../mailer/mailer.service'
import { ActionTokensService } from '../action-tokens/action-tokens.service'
import { ActionTokenType } from '../action-tokens/action-token.entity'
import { User, UserType } from '../user/entities/user.entity'
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
  isSelfhosted, SELFHOSTED_EMAIL, SELFHOSTED_PASSWORD,
} from 'src/common/constants'

// TODO: Add logout endpoint to invalidate the token
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private mailerService: MailerService,
    private actionTokensService: ActionTokensService,
    private readonly logger: AppLoggerService
  ) {}

  @Get('/me')
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async me(@CurrentUserId() user_id: string): Promise<User> {
    this.logger.log({ user_id }, 'GET /auth/me')

    const user = await this.userService.findOneWhere({ id: user_id })
    delete user.password

    return user
  }

  @Post('/login')
  async loginUser(@Body() userLoginDTO: UserLoginDTO, @Headers() headers, @Ip() reqIP): Promise<any> {
    this.logger.log({ userLoginDTO }, 'POST /auth/login')
    const ip = headers['cf-connecting-ip'] || headers['x-forwarded-for'] || reqIP || ''
    await checkRateLimit(ip, 'login', 10, 3600)
    // await this.authService.checkCaptcha(userLoginDTO.recaptcha)

    if (isSelfhosted) {
      if (userLoginDTO.email !== SELFHOSTED_EMAIL || userLoginDTO.password !== SELFHOSTED_PASSWORD) {
        throw new UnprocessableEntityException('Email or password is incorrect')
      }
      return await this.authService.login(SELFHOSTED_EMAIL)
    } else {
      const user = await this.authService.validateUser(userLoginDTO.email, userLoginDTO.password)
      return await this.authService.login(user)
    }
  }

  @UseGuards(SelfhostedGuard)
  @Post('/register')
  async register(@Body() userDTO: SignupUserDTO, /*@Body('recaptcha') recaptcha: string,*/ @Req() request: Request, @Headers() headers, @Ip() reqIP): Promise<any> {
    this.logger.log({ userDTO }, 'POST /auth/register')
    const ip = headers['cf-connecting-ip'] || headers['x-forwarded-for'] || reqIP || ''
    await checkRateLimit(ip, 'register')

    // await this.authService.checkCaptcha(recaptcha)
    this.userService.validatePassword(userDTO.password)
    userDTO.password = await this.authService.hashPassword(userDTO.password)

    try {
      const user = await this.userService.create(userDTO)
      const actionToken = await this.actionTokensService.createForUser(user, ActionTokenType.EMAIL_VERIFICATION)
      const url = `${request.headers.origin}/verify/${actionToken.id}`
      await this.mailerService.sendEmail(userDTO.email, LetterTemplate.SignUp, { url })

      return await this.authService.login(user)
    } catch(e) {
      if (e.code === 'ER_DUP_ENTRY') {
        if (e.sqlMessage.includes(userDTO.email)) {
          throw new BadRequestException('A user with this email already exists')
        }
      }
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
      await this.userService.update(actionToken.user.id, { ...actionToken.user, isActive: true})
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
      await this.userService.update(actionToken.user.id,
        { ...actionToken.user, email: actionToken.newValue })
      await this.mailerService.sendEmail(actionToken.user.email,
        LetterTemplate.MailAddressHadChanged, actionToken.user.locale)
      await this.actionTokensService.delete(actionToken.id)
      return
    }
  }

  @UseGuards(SelfhostedGuard)
  @Post('/reset-password')
  async requestReset(@Body() body: RequestPasswordChangeDTO, @Req() request: Request, @Headers() headers, @Ip() reqIP): Promise<string> {
    this.logger.log({ body }, 'POST /auth/password-reset')
    const { email } = body
    const ip = headers['cf-connecting-ip'] || headers['x-forwarded-for'] || reqIP || ''
    await checkRateLimit(ip, 'reset-password')
    await checkRateLimit(email, 'reset-password')

    const user = await this.userService.findOneWhere({ email })

    if (!user) {
      return 'A password reset URL has been sent to your email'
    }

    const actionToken = await this.actionTokensService.createForUser(user, ActionTokenType.PASSWORD_RESET)
    const url = `${request.headers.origin}/password-reset/${actionToken.id}`

    await this.mailerService.sendEmail(email, LetterTemplate.ConfirmPasswordChange, { url })
    return 'A password reset URL has been sent to your email'
  }

  @UseGuards(SelfhostedGuard)
  @Post('/password-reset/:id')
  async reset(@Param('id') id: string, @Body() body: PasswordChangeDTO): Promise<User> {
    this.logger.log({ id }, 'POST /auth/password-reset/:id')
    this.userService.validatePassword(body.password)
    let actionToken

    try {
      actionToken = await this.actionTokensService.find(id)
    } catch {
      throw new BadRequestException('Incorrect token provided')
    }

    if (actionToken.action === ActionTokenType.PASSWORD_RESET) {
      const password = await this.authService.hashPassword(body.password)

      await this.userService.update(actionToken.user.id, { ...actionToken.user, password })
      await this.actionTokensService.delete(actionToken.id)
      return 
    }
  }
}
