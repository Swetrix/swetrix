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
} from '@nestjs/common'
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { I18nValidationExceptionFilter, I18n, I18nContext } from 'nestjs-i18n'
import { checkRateLimit } from 'src/common/utils'
import { UserService } from 'src/user/user.service'
import { AuthService } from './auth.service'
import { RegisterRequestDto, RegisterResponseDto } from './dtos'

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
}
