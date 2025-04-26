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
import { decode, JwtPayload, verify } from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

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
      discoveryURL: this.configService.get('OIDC_DISCOVERY_URL'),
      clientID: this.configService.get('OIDC_CLIENT_ID'),
      clientSecret: this.configService.get('OIDC_CLIENT_SECRET'),
      scope: 'openid email profile',
    }
  }

  async getOidcDiscovery() {
    const config = this.getOidcConfig()
    const discoveryURL = config.discoveryURL
    const response = await fetch(discoveryURL)

    if (!response.ok) {
      throw new BadRequestException('Failed to fetch OIDC discovery document')
    }

    return response.json()
  }

  async generateOidcAuthUrl(redirectUrl: string) {
    try {
      const uuid = generateOIDCState()

      await redis.set(
        getOIDCRedisKey(uuid),
        '',
        'EX',
        REDIS_OIDC_SESSION_TIMEOUT,
      )

      const discovery = await this.getOidcDiscovery()

      const config = this.getOidcConfig()

      return {
        auth_url: `${discovery.authorization_endpoint}?client_id=${config.clientID}&response_type=code&scope=${encodeURIComponent(config.scope)}&redirect_uri=${encodeURIComponent(redirectUrl)}&state=${uuid}`,
        uuid,
        expires_in: REDIS_OIDC_SESSION_TIMEOUT * 1000, // milliseconds
      }
    } catch (reason) {
      console.error(`[ERROR][AuthService -> generateOidcAuthUrl]: ${reason}`)
      throw new InternalServerErrorException(
        'Something went wrong, please try again',
      )
    }
  }

  async getIdToken(tokenData: any, discovery: any): Promise<JwtPayload> {
    if (!tokenData || !tokenData.id_token) {
      throw new BadRequestException('ID token missing in token response')
    }

    const decoded = decode(tokenData.id_token, {
      complete: true,
    })

    if (!decoded?.payload || typeof decoded.payload === 'string') {
      throw new InternalServerErrorException(
        'Failed to decode ID token or invalid payload format',
      )
    }

    const idToken = decoded.payload as JwtPayload

    // 1. Verify signature (jwks_uri from discovery)
    await this.verifySignature(
      tokenData.id_token,
      discovery.jwks_uri,
      decoded.header.kid,
    )

    // 2. Verify claims
    const config = this.getOidcConfig()
    const now = Math.floor(Date.now() / 1000)

    // Verify Issuer (iss)
    if (idToken.iss !== discovery.issuer) {
      throw new BadRequestException('Invalid issuer in ID token')
    }

    // Verify Audience (aud)
    const audience = Array.isArray(idToken.aud) ? idToken.aud : [idToken.aud]
    if (!audience.includes(config.clientID)) {
      throw new BadRequestException('Invalid audience in ID token')
    }

    // Verify Expiration (exp)
    if (idToken.exp < now) {
      throw new BadRequestException('ID token has expired')
    }

    // Verify Issued At (iat) - Allow for some clock skew (e.g., 5 minutes)
    const maxClockSkew = 300 // 5 minutes in seconds
    // Verify iat is present and is a number before checking
    if (typeof idToken.iat !== 'number' || idToken.iat > now + maxClockSkew) {
      throw new BadRequestException(
        'ID token issued in the future or invalid iat (check clock skew)',
      )
    }

    return idToken
  }

  private async verifySignature(
    token: string,
    jwksUri: string,
    kid: string,
  ): Promise<void> {
    try {
      const client = jwksClient({
        jwksUri,
        cache: true,
      })

      const key = await client.getSigningKey(kid)
      const signingKey = key.getPublicKey()

      verify(token, signingKey)
    } catch (reason) {
      console.error(`[ERROR][AuthService -> verifySignature]: ${reason}`)
      throw new BadRequestException('Invalid token signature')
    }
  }

  async processOidcToken(code: string, state: string, redirectUrl: string) {
    const config = this.getOidcConfig()

    const discovery = await this.getOidcDiscovery()

    const tokenResponse = await fetch(discovery.token_endpoint, {
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
        redirect_uri: redirectUrl,
      }).toString(),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      throw new BadRequestException(
        tokenData.error_description || 'Unknown error',
      )
    }

    // Ideally we want to use id/email from this id token, but for now we only support one user in the system
    await this.getIdToken(tokenData, discovery)

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
