import {
  Controller,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Post,
  Body,
  Ip,
  ConflictException,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Headers,
  UnauthorizedException,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger'
import { I18nValidationExceptionFilter, I18n, I18nContext } from 'nestjs-i18n'
import { checkRateLimit } from 'src/common/utils'
import { UserService } from 'src/user/user.service'
import { AuthService } from './auth.service'
import { Public, CurrentUserId } from './decorators'
import {
  RegisterResponseDto,
  RegisterRequestDto,
  LoginResponseDto,
  LoginRequestDto,
  VerifyEmailDto,
  RequestResetPasswordDto,
  ConfirmResetPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dtos'
import { JwtAccessTokenGuard } from './guards'

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
@UseFilters(new I18nValidationExceptionFilter())
@UseGuards(JwtAccessTokenGuard)
@UsePipes(
  new ValidationPipe({
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transform: true,
    whitelist: true,
  }),
)
export class AuthController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({
    description: 'User registered',
    type: RegisterResponseDto,
  })
  @Public()
  @Post('register')
  public async register(
    @Body() body: RegisterRequestDto,
    @I18n() i18n: I18nContext,
    @Headers() headers: unknown,
    @Ip() requestIp: string,
  ): Promise<RegisterResponseDto> {
    const ip =
      headers['x-forwarded-for'] || headers['cf-connecting-ip'] || requestIp

    await checkRateLimit(ip, 'register', 5)

    const user = await this.userService.findUser(body.email)

    if (user) {
      throw new ConflictException(i18n.t('user.emailAlreadyUsed'))
    }

    if (body.checkIfLeaked) {
      const isLeaked = await this.authService.checkIfLeaked(body.password)

      if (isLeaked) {
        throw new ConflictException(i18n.t('auth.leakedPassword'))
      }
    }

    const newUser = await this.authService.createUnverifiedUser(
      body.email,
      body.password,
    )

    const accessToken = await this.authService.generateJwtAccessToken(
      newUser.id,
    )

    return { accessToken }
  }

  @ApiOperation({ summary: 'Login a user' })
  @ApiOkResponse({
    description: 'User logged in',
    type: LoginResponseDto,
  })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  public async login(
    @Body() body: LoginRequestDto,
    @I18n() i18n: I18nContext,
    @Headers() headers: unknown,
    @Ip() requestIp: string,
  ): Promise<LoginResponseDto> {
    const ip =
      headers['x-forwarded-for'] || headers['cf-connecting-ip'] || requestIp

    await checkRateLimit(ip, 'login', 10, 1800)

    const user = await this.authService.validateUser(body.email, body.password)

    if (!user) {
      throw new ConflictException(i18n.t('auth.invalidCredentials'))
    }

    await this.authService.sendTelegramNotification(user.id, headers, ip)

    const accessToken = await this.authService.generateJwtAccessToken(
      user.id,
      user.isTwoFactorAuthenticationEnabled,
    )

    return { accessToken }
  }

  @ApiOperation({ summary: 'Verify a user email' })
  @ApiOkResponse({
    description: 'User email verified',
  })
  @Public()
  @Get('verify-email/:token')
  public async verifyEmail(
    @Param() params: VerifyEmailDto,
    @I18n() i18n: I18nContext,
  ): Promise<void> {
    const actionToken = await this.authService.checkVerificationToken(
      params.token,
    )

    if (!actionToken) {
      throw new ConflictException(i18n.t('auth.invalidVerificationToken'))
    }

    await this.authService.verifyEmail(actionToken)
  }

  @ApiOperation({ summary: 'Request a password reset' })
  @ApiOkResponse({
    description: 'Password reset requested',
  })
  @Public()
  @Post('reset-password')
  public async requestResetPassword(
    @Body() body: RequestResetPasswordDto,
    @I18n() i18n: I18nContext,
    @Headers() headers: unknown,
    @Ip() requestIp: string,
  ): Promise<void> {
    const ip =
      headers['x-forwarded-for'] || headers['cf-connecting-ip'] || requestIp

    await checkRateLimit(ip, 'reset-password')
    await checkRateLimit(body.email, 'reset-password')

    const user = await this.userService.findUser(body.email)

    if (!user) {
      throw new ConflictException(i18n.t('auth.accountNotExists'))
    }

    await this.authService.sendResetPasswordEmail(user.id, user.email)
  }

  @ApiOperation({ summary: 'Reset a password' })
  @ApiOkResponse({
    description: 'Password reset',
  })
  @Public()
  @Post('reset-password/confirm/:token')
  @HttpCode(200)
  public async resetPassword(
    @Param() params: ConfirmResetPasswordDto,
    @Body() body: ResetPasswordDto,
    @I18n() i18n: I18nContext,
  ): Promise<void> {
    const actionToken = await this.authService.checkResetPasswordToken(
      params.token,
    )

    if (!actionToken) {
      throw new ConflictException(i18n.t('auth.invalidResetPasswordToken'))
    }

    await this.authService.resetPassword(actionToken, body.newPassword)
  }

  @ApiOperation({ summary: 'Change a password' })
  @ApiOkResponse({
    description: 'Password changed',
  })
  @Post('change-password')
  public async changePassword(
    @Body() body: ChangePasswordDto,
    @CurrentUserId() userId: string,
    @I18n() i18n: I18nContext,
  ): Promise<void> {
    const user = await this.userService.findUserById(userId)

    if (!user) {
      throw new UnauthorizedException()
    }

    const isPasswordValid = await this.authService.validateUser(
      user.email,
      body.oldPassword,
    )

    if (!isPasswordValid) {
      throw new ConflictException(i18n.t('auth.invalidPassword'))
    }

    await this.authService.changePassword(user.id, body.newPassword)
  }

  @ApiOperation({ summary: 'Request a resend of the verification email' })
  @ApiOkResponse({
    description: 'Resend of the verification email requested',
  })
  @Post('verify-email')
  public async requestResendVerificationEmail(
    @CurrentUserId() userId: string,
    @I18n() i18n: I18nContext,
  ): Promise<void> {
    const user = await this.userService.findUserById(userId)

    if (!user) {
      throw new UnauthorizedException()
    }

    const isMaxEmailRequestsReached =
      await this.authService.checkIfMaxEmailRequestsReached(user.id)

    if (isMaxEmailRequestsReached) {
      throw new ConflictException(i18n.t('auth.maxEmailRequestsReached'))
    }

    if (user.isActive) {
      throw new ConflictException(i18n.t('auth.emailAlreadyVerified'))
    }

    await this.authService.sendVerificationEmail(user.id, user.email)
  }
}
