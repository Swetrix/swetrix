// FIX: I18nValidationExceptionFilter is not working

import {
  Controller,
  UseFilters,
  UsePipes,
  ValidationPipe,
  Post,
  Body,
  Ip,
  ConflictException,
  Headers,
  HttpCode,
  Param,
  Get,
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
import {
  RegisterResponseDto,
  RegisterRequestDto,
  LoginResponseDto,
  LoginRequestDto,
  VerifyEmailDto,
} from './dtos'

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
@UseFilters(new I18nValidationExceptionFilter())
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
  @Post('login')
  @HttpCode(200)
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
}
