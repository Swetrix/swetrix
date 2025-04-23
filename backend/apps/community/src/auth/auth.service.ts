import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { genSalt, hash } from 'bcrypt'
import _isEmpty from 'lodash/isEmpty'
import { v4 as uuidv4 } from 'uuid'

import {
  saveRefreshTokenClickhouse,
  findRefreshTokenClickhouse,
  deleteRefreshTokenClickhouse,
} from '../common/utils'
import {
  SELFHOSTED_EMAIL,
  SELFHOSTED_PASSWORD,
  JWT_ACCESS_TOKEN_SECRET,
  JWT_ACCESS_TOKEN_LIFETIME,
  JWT_REFRESH_TOKEN_LIFETIME,
  SELFHOSTED_API_KEY,
  SELFHOSTED_UUID,
  REDIS_OIDC_SESSION_KEY,
  redis,
} from '../common/constants'
import { getSelfhostedUser, SelfhostedUser } from '../user/entities/user.entity'

const REDIS_OIDC_SESSION_TIMEOUT = 60 * 5 // 5 minutes
const getOIDCRedisKey = (uuid: string) => `${REDIS_OIDC_SESSION_KEY}:${uuid}`
const generateOIDCState = () => `openid-connect:${uuidv4()}`

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  public async hashPassword(password: string): Promise<string> {
    const salt = await genSalt(10)
    return hash(password, salt)
  }

  public async generateJwtAccessToken(
    userId: string,
    isSecondFactorAuthenticated = false,
  ) {
    return this.jwtService.signAsync(
      {
        sub: userId,
        isSecondFactorAuthenticated,
      },
      {
        algorithm: 'HS256',
        expiresIn: JWT_ACCESS_TOKEN_LIFETIME,
        secret: JWT_ACCESS_TOKEN_SECRET,
      },
    )
  }

  async getBasicUser(
    email: string,
    password: string,
  ): Promise<SelfhostedUser | null> {
    if (email !== SELFHOSTED_EMAIL || password !== SELFHOSTED_PASSWORD) {
      return null
    }

    return getSelfhostedUser()
  }

  private async generateJwtRefreshToken(
    userId: string,
    isSecondFactorAuthenticated = false,
  ) {
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: userId,
        isSecondFactorAuthenticated,
      },
      {
        algorithm: 'HS256',
        expiresIn: JWT_REFRESH_TOKEN_LIFETIME,
        secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
      },
    )

    await saveRefreshTokenClickhouse(userId, refreshToken)

    return refreshToken
  }

  public async checkRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const tokens = await findRefreshTokenClickhouse(userId, refreshToken)
    return !_isEmpty(tokens)
  }

  public async generateJwtTokens(
    userId: string,
    isSecondFactorAuthenticated = false,
  ) {
    const accessToken = await this.generateJwtAccessToken(
      userId,
      isSecondFactorAuthenticated,
    )

    let refreshToken = 'NOT_AVAILABLE'

    if (isSecondFactorAuthenticated) {
      refreshToken = await this.generateJwtRefreshToken(
        userId,
        isSecondFactorAuthenticated,
      )
    }

    return { accessToken, refreshToken }
  }

  async logout(userId: string, refreshToken: string) {
    await deleteRefreshTokenClickhouse(userId, refreshToken)
  }

  isApiKeyValid(apiKey: string): boolean {
    return apiKey === SELFHOSTED_API_KEY
  }

  getOidcConfig() {
    return {
      issuer: this.configService.get('OIDC_ISSUER'),
      authorizationURL: this.configService.get('OIDC_AUTH_URL'),
      tokenURL: this.configService.get('OIDC_TOKEN_URL'),
      userInfoURL: this.configService.get('OIDC_USERINFO_URL'),
      clientID: this.configService.get('OIDC_CLIENT_ID'),
      clientSecret: this.configService.get('OIDC_CLIENT_SECRET'),
      callbackURL: this.configService.get('OIDC_CALLBACK_URL'),
      scope: this.configService.get('OIDC_SCOPE') || 'openid email profile',
    }
  }

  async generateOidcAuthUrl(redirectUrl?: string) {
    const uuid = generateOIDCState()

    await redis.set(getOIDCRedisKey(uuid), '', 'EX', REDIS_OIDC_SESSION_TIMEOUT)

    const config = this.getOidcConfig()
    const auth_url = `${config.authorizationURL}?client_id=${config.clientID}&response_type=code&scope=${encodeURIComponent(config.scope)}&redirect_uri=${encodeURIComponent(config.callbackURL)}&state=${uuid}`

    return {
      auth_url,
      uuid,
      expires_in: REDIS_OIDC_SESSION_TIMEOUT * 1000, // milliseconds
    }
  }

  async processOidcToken(code: string, state: string) {
    const config = this.getOidcConfig()

    console.log('processing oidc token')
    console.log('code:', code)
    console.log('state:', state)

    const tokenResponse = await fetch(config.tokenURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientID,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.callbackURL,
      }).toString(),
    })

    const tokenData = await tokenResponse.json()

    console.log('tokenData:', tokenData)

    const userInfoResponse = await fetch(config.userInfoURL, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    const userInfo = await userInfoResponse.json()

    console.log('userInfo:', userInfo)

    const dataToStore = JSON.stringify({ id: SELFHOSTED_UUID })

    await redis.set(
      getOIDCRedisKey(state),
      dataToStore,
      'EX',
      REDIS_OIDC_SESSION_TIMEOUT,
    )
  }

  async processHash(state: string) {
    if (!state) {
      throw new BadRequestException('Missing state parameter')
    }

    const oidcRedisKey = getOIDCRedisKey(state)
    const exists = await redis.exists(oidcRedisKey)

    if (!exists) {
      throw new BadRequestException(
        'No authentication session opened for the provided state',
      )
    }

    const data = await redis.get(oidcRedisKey)

    if (!data) {
      throw new ConflictException(
        'Authentication session is opened but no data found',
      )
    }

    let payload

    try {
      payload = JSON.parse(data)
    } catch (reason) {
      console.error(
        `[ERROR][AuthService -> authenticateGoogle -> JSON.parse]: ${reason} - ${data}`,
      )
      throw new InternalServerErrorException(
        'Session related data is corrupted',
      )
    }

    await redis.del(oidcRedisKey)

    return payload
  }

  async authenticateOidc(state: string) {
    const { id } = await this.processHash(state)

    try {
      if (id !== SELFHOSTED_UUID) {
        throw new BadRequestException('Invalid user ID')
      }

      const tokens = await this.generateJwtTokens(id, true)

      return {
        ...tokens,
        user: getSelfhostedUser(),
      }
    } catch (error) {
      console.error(`[ERROR][AuthService -> authenticateOidc]: ${error}`)
      throw new InternalServerErrorException(error)
    }
  }
}
