import {
  Controller,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Post,
  Delete,
  Body,
  Ip,
  ConflictException,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  UnauthorizedException,
  BadRequestException,
  Headers,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { I18nValidationExceptionFilter, I18n, I18nContext } from 'nestjs-i18n'
import _pick from 'lodash/pick'

import { checkRateLimit, getIPFromHeaders } from '../common/utils'
import { UserType, User } from '../user/entities/user.entity'
import { UserService } from '../user/user.service'
import { AuthService } from './auth.service'
import { Public, CurrentUserId, CurrentUser, Roles } from './decorators'
import {
  RegisterResponseDto,
  RegisterRequestDto,
  LoginResponseDto,
  LoginRequestDto,
  VerifyEmailDto,
  RequestResetPasswordDto,
  ConfirmResetPasswordDto,
  ResetPasswordDto,
  ConfirmChangeEmailDto,
  RequestChangeEmailDto,
  SSOGetJWTByHashDto,
  ProcessSSOCodeDto,
  SSOGenerateDto,
  SSOLinkDto,
  SSOUnlinkDto,
  SSOProviders,
} from './dtos'
import { JwtAccessTokenGuard, JwtRefreshTokenGuard, RolesGuard } from './guards'
import { ProjectService } from '../project/project.service'

const OAUTH_RATE_LIMIT = 15

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
    private readonly projectService: ProjectService,
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

    if (body.email === body.password) {
      throw new ConflictException(i18n.t('auth.passwordSameAsEmail'))
    }

    const referrerID = await this.authService.getReferrerId(body.refCode)

    const newUser = await this.authService.createUnverifiedUser(
      body.email,
      body.password,
      referrerID,
    )

    const jwtTokens = await this.authService.generateJwtTokens(newUser.id, true)

    return {
      ...jwtTokens,
      user: this.userService.omitSensitiveData(newUser),
      totalMonthlyEvents: 0,
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
    @Ip() requestIp: string,
  ): Promise<LoginResponseDto> {
    const ip = getIPFromHeaders(headers) || requestIp || ''

    await checkRateLimit(ip, 'login', 10, 1800)

    let user = await this.authService.getBasicUser(body.email, body.password)

    if (!user) {
      throw new ConflictException(i18n.t('auth.invalidCredentials'))
    }

    const jwtTokens = await this.authService.generateJwtTokens(
      user.id,
      !user.isTwoFactorAuthenticationEnabled,
    )

    const meta = {
      totalMonthlyEvents: undefined,
    }

    await this.authService.sendTelegramNotification(user.id, headers, ip)

    if (user.isTwoFactorAuthenticationEnabled) {
      // @ts-expect-error
      user = _pick(user, ['isTwoFactorAuthenticationEnabled', 'email'])
    } else {
      const [sharedProjects, organisationMemberships] = await Promise.all([
        this.authService.getSharedProjectsForUser(user.id),
        this.userService.getOrganisationsForUser(user.id),
      ])

      user.sharedProjects = sharedProjects
      user.organisationMemberships = organisationMemberships
      meta.totalMonthlyEvents = await this.projectService.getRedisCount(user.id)
    }

    return {
      ...jwtTokens,
      ...meta,
      user: this.userService.omitSensitiveData(user as User),
    }
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
    @Headers() headers: Record<string, string>,
    @Ip() requestIp: string,
  ): Promise<void> {
    const ip = getIPFromHeaders(headers) || requestIp || ''

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

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a resend of the verification email' })
  @ApiOkResponse({
    description: 'Resend of the verification email requested',
  })
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
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

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change a user email' })
  @ApiOkResponse({
    description: 'User email changed',
  })
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @Post('change-email')
  public async requestChangeEmail(
    @Body() body: RequestChangeEmailDto,
    @CurrentUserId() userId: string,
    @I18n() i18n: I18nContext,
  ): Promise<void> {
    const user = await this.userService.findUserById(userId)

    if (!user) {
      throw new UnauthorizedException()
    }

    const isPasswordValid = await this.authService.getBasicUser(
      user.email,
      body.password,
    )

    if (!isPasswordValid) {
      throw new ConflictException(i18n.t('auth.invalidPassword'))
    }

    const isEmailTaken = await this.authService.checkIfEmailTaken(body.newEmail)

    if (isEmailTaken) {
      throw new ConflictException(i18n.t('auth.emailAlreadyTaken'))
    }

    await this.authService.changeEmail(user.id, user.email, body.newEmail)
  }

  @ApiOperation({ summary: 'Confirm a user email change' })
  @ApiOkResponse({
    description: 'User email confirmed',
  })
  @Public()
  @Get('change-email/confirm/:token')
  public async confirmChangeEmail(
    @Param() params: ConfirmChangeEmailDto,
    @I18n() i18n: I18nContext,
  ): Promise<void> {
    const actionToken = await this.authService.checkChangeEmailToken(
      params.token,
    )

    if (!actionToken) {
      throw new ConflictException(i18n.t('auth.invalidChangeEmailToken'))
    }

    await this.authService.confirmChangeEmail(actionToken)
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
    const user = await this.userService.findUserById(userId)

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

    const accessToken = await this.authService.generateJwtAccessToken(
      user.id,
      user.isTwoFactorAuthenticationEnabled,
    )

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
    const user = await this.userService.findUserById(userId)

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

  @ApiOperation({ summary: 'Log out from all devices' })
  @ApiOkResponse({
    description: 'Logged out from all devices',
  })
  @UseGuards(JwtRefreshTokenGuard)
  @Post('logout-all')
  @HttpCode(200)
  public async logoutAll(@CurrentUserId() userId: string): Promise<void> {
    const user = await this.userService.findUserById(userId)

    if (!user) {
      throw new UnauthorizedException()
    }

    await this.authService.logoutAll(user.id)
  }

  // SSO section
  @ApiOperation({ summary: 'Generate SSO authentication URL' })
  @Post('sso/generate')
  @Public()
  async generateAuthURL(
    @Body() body: SSOGenerateDto,
    @Headers() headers: Record<string, string>,
    @Ip() reqIP: string,
  ): Promise<any> {
    const ip = getIPFromHeaders(headers) || reqIP || ''

    await checkRateLimit(ip, 'sso-generate', OAUTH_RATE_LIMIT, 1800)

    const { provider } = body

    if (provider === SSOProviders.GOOGLE) {
      return this.authService.generateGoogleURL()
    }

    if (provider === SSOProviders.GITHUB) {
      return this.authService.generateGithubURL()
    }

    throw new BadRequestException('Unknown SSO provider supplied')
  }

  @ApiOperation({ summary: 'Process authentication token (or code)' })
  @Post('sso/process-token')
  @Public()
  async processSSOToken(
    @Body() body: ProcessSSOCodeDto,
    @Headers() headers: Record<string, string>,
    @Ip() reqIP: string,
  ): Promise<any> {
    const ip = getIPFromHeaders(headers) || reqIP || ''

    await checkRateLimit(ip, 'sso-process', OAUTH_RATE_LIMIT, 1800)

    const { token, hash } = body

    return this.authService.processSSOToken(token, hash)
  }

  @ApiOperation({ summary: 'Auth user' })
  @Post('sso/hash')
  @Public()
  // Validates the authorisation code and returns the JWT tokens
  async getJWTByHash(
    @Body() body: SSOGetJWTByHashDto,
    @Headers() headers: Record<string, string>,
    @Ip() reqIP: string,
  ): Promise<any> {
    const ip = getIPFromHeaders(headers) || reqIP || ''

    const { hash, provider, refCode } = body

    return this.authService.authenticateSSO(
      hash,
      headers,
      ip,
      provider,
      refCode,
    )
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link SSO provider to an existing account' })
  @ApiOkResponse({
    description: 'SSO provider linked to an existing account',
  })
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @Post('sso/link_by_hash')
  public async linkGoogleToAccount(
    @Body() body: SSOLinkDto,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    const { hash, provider } = body

    await this.authService.linkSSOAccount(userId, hash, provider)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlink SSO provider from an existing account' })
  @ApiOkResponse({
    description: 'SSO provider unlinked from an existing account',
  })
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @Delete('sso/unlink')
  public async unlinkSSOFromAccount(
    @Body() body: SSOUnlinkDto,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    const { provider } = body

    await this.authService.unlinkSSOAccount(userId, provider)
  }
}
