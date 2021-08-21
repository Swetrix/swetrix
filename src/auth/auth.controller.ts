import { 
  Controller, Post, Body, Req, Get, Param, BadRequestException, UseGuards,
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
import { LetterTemplate } from '../mailer/letter'
import { AppLoggerService } from '../logger/logger.service'

// TODO: Add logout endpoint to delete the token
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
  async loginUser(@Body() userLoginDTO: UserLoginDTO, @Req() request: Request): Promise<any> {
    this.logger.log({ userLoginDTO }, 'POST /auth/login')
    // await this.authService.checkCaptcha(userLoginDTO.recaptcha)

    const user = await this.authService.validateUser(userLoginDTO.email, userLoginDTO.password)
    return await this.authService.login(user, request.res)
  }

  @Post('/register')
  async register(@Body() userDTO: SignupUserDTO, /*@Body('recaptcha') recaptcha: string,*/ @Req() request: Request): Promise<any> {
    this.logger.log({ userDTO }, 'POST /auth/register')

    // await this.authService.checkCaptcha(recaptcha)
    this.userService.validatePassword(userDTO.password)
    userDTO.password = this.authService.hashPassword(userDTO.password)
    
    try {
      const user = await this.userService.create(userDTO)
      const actionToken = await this.actionTokensService.createForUser(user, ActionTokenType.EMAIL_VERIFICATION)
      const url = `${request.headers.origin}/verify/${actionToken.id}`
      await this.mailerService.sendEmail(userDTO.email, LetterTemplate.SignUp, { url })

      return await this.authService.login(user, request.res)
    } catch(e) {
      if (e.code === 'ER_DUP_ENTRY') {
        if (e.sqlMessage.includes(userDTO.email)) {
          throw new BadRequestException('A user with this email already exists')
        }
      }
    }
  }

  @Get('/verify/:id')
  async verify(@Param('id') id: string): Promise<User> {
    this.logger.log({ id }, 'GET /auth/verify/:id')
    let actionToken

    try {
      actionToken = await this.actionTokensService.find(id)
    } catch {
      throw new BadRequestException('Wrong token')
    }

    if (actionToken.action === ActionTokenType.EMAIL_VERIFICATION) {
      await this.userService.update(actionToken.user.id, { ...actionToken.user, isActive: true})
      await this.actionTokensService.delete(actionToken.id)
      return
    }
  }

  @Get('/change-email/:id')
  async changeEmail(@Param('id') id: string): Promise<User> {
    this.logger.log({ id }, 'GET /auth/change-email/:id')
    let actionToken

    try {
      actionToken = await this.actionTokensService.find(id)
    } catch {
      throw new BadRequestException('Wrong token')
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

  @Post('/reset-password')
  async requestReset(@Body() body: RequestPasswordChangeDTO, @Req() request: Request): Promise<string> {
    const user = await this.userService.findOneWhere({ email: body.email })

    if (!user) {
      return 'A password reset URL has been sent to your email'
    }

    const actionToken = await this.actionTokensService.createForUser(user, ActionTokenType.PASSWORD_RESET)
    const url = `${request.headers.origin}/password-reset/${actionToken.id}`

    await this.mailerService.sendEmail(body.email, LetterTemplate.ConfirmPasswordChange, { url })
    return 'A password reset URL has been sent to your email'
  }

  @Post('/password-reset/:id')
  async reset(@Param('id') id: string, @Body() body: PasswordChangeDTO): Promise<User> {
    this.logger.log({ id }, 'POST /auth/password-reset/:id')
    this.userService.validatePassword(body.password)
    let actionToken

    try {
      actionToken = await this.actionTokensService.find(id)
    } catch {
      throw new BadRequestException('Wrong token')
    }

    if (actionToken.action === ActionTokenType.PASSWORD_RESET) {
      const password = this.authService.hashPassword(body.password)

      await this.userService.update(actionToken.user.id, { ...actionToken.user, password })
      await this.actionTokensService.delete(actionToken.id)
      return 
    }
  }
}
