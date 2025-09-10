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
  UnauthorizedException,
  Headers,
  Res,
  BadRequestException,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger'
import { I18nValidationExceptionFilter, I18n, I18nContext } from 'nestjs-i18n'
import { Response } from 'express'

import { checkRateLimit, getIPFromHeaders } from '../common/utils'
import { AuthService } from './auth.service'
import { Public, CurrentUserId, CurrentUser } from './decorators'
import {
  LoginResponseDto,
  LoginRequestDto,
  OIDCInitiateDto,
  OIDCProcessTokenDto,
  OIDCGetJWTByHashDto,
  RegisterRequestDto,
  RegisterResponseDto,
} from './dtos'
import { JwtAccessTokenGuard, JwtRefreshTokenGuard } from './guards'
import { OIDC_ENABLED, OIDC_ONLY_AUTH } from '../common/constants'
import { UserService } from '../user/user.service'

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
    private readonly authService: AuthService,
    private readonly userService: UserService,
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
    @Headers() headers: Record<string, string>,
    @Ip() requestIp: string,
  ) {
    const ip = getIPFromHeaders(headers) || requestIp || ''

    await checkRateLimit(ip, 'register', 5)

    const isRegistrationDisabled =
      await this.authService.isRegistrationDisabled()

    if (isRegistrationDisabled) {
      throw new BadRequestException('Registration is disabled')
    }

    const user = await this.userService.findOne({ email: body.email })

    if (user) {
      throw new ConflictException(i18n.t('user.emailAlreadyUsed'))
    }

    if (body.checkIfLeaked) {
      const isLeaked = await this.authService.checkIfLeaked(body.password)

      if (isLeaked) {
        throw new ConflictException(i18n.t('auth.leakedPassword'))
      }
    }

    if (body.email === body.password) {
      throw new ConflictException(i18n.t('auth.passwordSameAsEmail'))
    }

    const newUser = await this.authService.createUser(body.email, body.password)

    const jwtTokens = await this.authService.generateJwtTokens(newUser.id, true)

    await this.authService.assignUnassignedProjectsToUser(newUser.id)

    return {
      ...jwtTokens,
      user: this.userService.omitSensitiveData(newUser),
    }
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
    @Headers() headers: Record<string, string>,
    @Ip() reqIP: string,
  ): Promise<LoginResponseDto> {
    // If OIDC-only mode is enabled, disable traditional login
    if (OIDC_ONLY_AUTH) {
      throw new ConflictException(i18n.t('auth.oidcOnlyMode'))
    }

    const ip = getIPFromHeaders(headers) || reqIP || ''

    await checkRateLimit(ip, 'login', 10, 1800)

    const user = await this.authService.getBasicUser(body.email, body.password)

    if (!user) {
      throw new ConflictException(i18n.t('auth.invalidCredentials'))
    }

    const jwtTokens = await this.authService.generateJwtTokens(user.id, true)

    return {
      ...jwtTokens,
      user: this.userService.omitSensitiveData(user),
    }
  }

  @ApiOperation({ summary: 'Refresh a token' })
  @ApiOkResponse({
    description: 'Token refreshed',
  })
  @Public()
  @UseGuards(JwtRefreshTokenGuard)
  @Post('refresh-token')
  @HttpCode(200)
  public async refreshToken(
    @CurrentUserId() userId: string,
    @CurrentUser('refreshToken') refreshToken: string,
    @I18n() i18n: I18nContext,
  ): Promise<{ accessToken: string }> {
    const user = await this.userService.findOne({ id: userId })

    if (!user) {
      throw new UnauthorizedException()
    }

    const isRefreshTokenValid = await this.authService.checkRefreshToken(
      user.id,
      refreshToken,
    )

    if (!isRefreshTokenValid) {
      throw new ConflictException(i18n.t('auth.invalidRefreshToken'))
    }

    const accessToken = await this.authService.generateJwtAccessToken(user.id)

    return { accessToken }
  }

  @ApiOperation({ summary: 'Logout' })
  @ApiOkResponse({
    description: 'Logged out',
  })
  @Public()
  @UseGuards(JwtRefreshTokenGuard)
  @Post('logout')
  @HttpCode(200)
  public async logout(
    @CurrentUserId() userId: string,
    @CurrentUser('refreshToken') refreshToken: string,
    @I18n() i18n: I18nContext,
  ): Promise<void> {
    const user = await this.userService.findOne({ id: userId })

    if (!user) {
      throw new UnauthorizedException()
    }

    const isRefreshTokenValid = await this.authService.checkRefreshToken(
      user.id,
      refreshToken,
    )

    if (!isRefreshTokenValid) {
      throw new ConflictException(i18n.t('auth.invalidRefreshToken'))
    }

    await this.authService.logout(user.id, refreshToken)
  }

  @ApiOperation({ summary: 'Initiate OIDC authentication' })
  @ApiOkResponse({
    description: 'OIDC authentication initiated',
  })
  @Public()
  @Post('oidc/initiate')
  @HttpCode(HttpStatus.OK)
  async initiateOidc(
    @Body() body: OIDCInitiateDto,
    @Headers() headers: Record<string, string>,
    @Ip() reqIP: string,
  ) {
    if (!OIDC_ENABLED) {
      throw new BadRequestException('OIDC authentication is not enabled')
    }

    const ip = getIPFromHeaders(headers) || reqIP || ''
    await checkRateLimit(ip, 'oidc-initiate', 15, 1800)

    return this.authService.generateOidcAuthUrl(body.redirectUrl)
  }

  @ApiOperation({ summary: 'OIDC callback handler' })
  @ApiOkResponse({
    description: 'OIDC authentication completed',
  })
  @Public()
  @Post('oidc/process-token')
  @HttpCode(HttpStatus.CREATED)
  async oidcProcessToken(
    @Body() body: OIDCProcessTokenDto,
    @Headers() headers: Record<string, string>,
    @Ip() reqIP: string,
    @Res() res: Response,
  ) {
    if (!OIDC_ENABLED) {
      return res
        .status(HttpStatus.CONFLICT)
        .json({ error: 'OIDC authentication is not enabled' })
    }

    const ip = getIPFromHeaders(headers) || reqIP || ''
    await checkRateLimit(ip, 'oidc-process-token', 15, 1800)

    const { code, hash, redirectUrl } = body

    try {
      await this.authService.processOidcToken(code, hash, redirectUrl)
    } catch (reason) {
      console.error('[ERROR] OIDC Callback Error:', reason)
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: 'Authentication failed' })
    }
  }

  @ApiOperation({ summary: 'Get JWT access tokens by OIDC initiated hash' })
  @Post('oidc/hash')
  @Public()
  async getJWTByHash(@Body() body: OIDCGetJWTByHashDto): Promise<any> {
    const { hash } = body

    return this.authService.authenticateOidc(hash)
  }
}
