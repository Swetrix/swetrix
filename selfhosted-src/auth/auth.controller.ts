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
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger'
import { I18nValidationExceptionFilter, I18n, I18nContext } from 'nestjs-i18n'

import { checkRateLimit } from 'selfhosted-src/common/utils'
import {
  generateSelfhostedUser,
} from 'selfhosted-src/user/entities/user.entity'
import { AuthService } from './auth.service'
import { Public, CurrentUserId, CurrentUser } from './decorators'
import {
  LoginResponseDto,
  LoginRequestDto,
} from './dtos'
import { JwtAccessTokenGuard, JwtRefreshTokenGuard } from './guards'

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
  ) {}

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

    let user = await this.authService.validateUser(body.email, body.password)

    if (!user) {
      throw new ConflictException(i18n.t('auth.invalidCredentials'))
    }

    const jwtTokens = await this.authService.generateJwtTokens(
      user.id,
      !user.isTwoFactorAuthenticationEnabled,
    )

      return {
        ...jwtTokens,
        user,
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
    const user = generateSelfhostedUser()

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
    const user = generateSelfhostedUser()

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
}
