import { createHash, randomBytes, randomUUID } from 'crypto'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { genSalt, hash, compare } from 'bcrypt'
import axios from 'axios'
import _isEmpty from 'lodash/isEmpty'
import { decode, JwtPayload, verify } from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

import {
  saveRefreshTokenClickhouse,
  findRefreshTokenClickhouse,
  deleteRefreshTokenClickhouse,
  assignUnassignedProjectsToUserClickhouse,
  deleteAllRefreshTokensClickhouse,
} from '../common/utils'
import {
  JWT_ACCESS_TOKEN_SECRET,
  JWT_ACCESS_TOKEN_LIFETIME,
  JWT_REFRESH_TOKEN_LIFETIME,
  REDIS_OIDC_SESSION_KEY,
  redis,
  IS_REGISTRATION_DISABLED,
  JWT_REFRESH_TOKEN_SECRET,
} from '../common/constants'
import { UserService } from '../user/user.service'
import { User } from '../common/types'
import { MailerService } from '../mailer/mailer.service'
import { LetterTemplate } from '../mailer/letter'

const REDIS_OIDC_SESSION_TIMEOUT = 60 * 5 // 5 minutes
const getOIDCRedisKey = (uuid: string) => `${REDIS_OIDC_SESSION_KEY}:${uuid}`
const generateOIDCState = () => `openid-connect:${randomUUID()}`

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly mailerService: MailerService,
  ) {}

  private async createSha1Hash(text: string): Promise<string> {
    return new Promise(resolve => {
      const sha1sum = createHash('sha1')
        .update(text)
        .digest('hex')
        .toUpperCase()
      resolve(sha1sum)
    })
  }

  private getFirstFiveChars(passwordHash: string): string {
    return passwordHash.slice(0, 5)
  }

  private async sendRequestToApi(passwordHash: string) {
    const url = `https://api.pwnedpasswords.com/range/${passwordHash}`
    const response = await axios.get(url)

    if (response.status !== 200) {
      throw new InternalServerErrorException()
    }

    return response.data
  }

  public async checkIfLeaked(password: string): Promise<boolean> {
    const sha1Hash = await this.createSha1Hash(password)
    const firstFiveChars = this.getFirstFiveChars(sha1Hash)
    const response = await this.sendRequestToApi(firstFiveChars)

    return response.includes(firstFiveChars)
  }

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

  public async createUser(email: string, password: string) {
    const hashedPassword = await this.hashPassword(password)

    return this.userService.create({
      email,
      password: hashedPassword, // Using the password field is incorrect.
    })
  }

  private generateRandomPassword(length = 48): string {
    return randomBytes(64).toString('hex').slice(0, length)
  }

  private async getOrCreateUserByEmail(email: string) {
    const existingUser = await this.userService.findOne({ email })

    if (existingUser && existingUser.id) {
      return existingUser
    }

    // Treat as registration attempt; respect registration-disabled setting
    const isRegistrationDisabled = await this.isRegistrationDisabled()

    if (isRegistrationDisabled) {
      throw new BadRequestException('Registration is disabled')
    }

    const randomPassword = this.generateRandomPassword(48)
    const hashedPassword = await this.hashPassword(randomPassword)

    const createdUser = await this.userService.create({
      email,
      password: hashedPassword,
    })

    // Assign any pre-v4 unassigned projects to the newly registered user
    await this.assignUnassignedProjectsToUser(createdUser.id)

    return createdUser
  }

  async isRegistrationDisabled() {
    const usersCount = await this.userService.count()

    if (usersCount === 0) {
      return false
    }

    return IS_REGISTRATION_DISABLED
  }

  // Before Swetrix CE v4 there could only be a single user, with login / password set in .env file
  // Because of that, projects were stored without an adminId as it was not needed
  // Unassigned projects are only possible when migrating from Swetrix CE v3 to v4, so people who migrated are
  // going to create an account anyway, so it's safe to assign them to the user
  async assignUnassignedProjectsToUser(userId: string) {
    return assignUnassignedProjectsToUserClickhouse(userId)
  }

  public async sendResetPasswordEmail(
    userId: string,
    email: string,
    headers: Record<string, string>,
  ) {
    const urlBase = headers.origin || ''

    const token = randomUUID()
    const url = `${urlBase}/password-reset/${token}`

    await redis.set(`password_reset:${token}`, userId, 'EX', 60 * 60 * 12)

    await this.mailerService.sendEmail(
      email,
      LetterTemplate.ConfirmPasswordChange,
      {
        url,
      },
    )
  }

  public async resetPassword(userId: string, password: string): Promise<void> {
    const hashedPassword = await this.hashPassword(password)

    await this.userService.update(userId, {
      password: hashedPassword,
    })

    await this.logoutAll(userId)
  }

  async getBasicUser(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findOne({ email })

    if (user && (await this.comparePassword(password, user.password))) {
      return user
    }

    return null
  }

  private async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return compare(password, hashedPassword)
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
        secret: JWT_REFRESH_TOKEN_SECRET,
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

  async logoutAll(userId: string) {
    await deleteAllRefreshTokensClickhouse(userId)
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
        auth_url: `${discovery.authorization_endpoint}?client_id=${config.clientID}&response_type=code&scope=${encodeURIComponent(config.scope)}&redirect_uri=${encodeURIComponent(redirectUrl)}&state=${uuid}&prompt=select_account`,
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

    // Ensure the state corresponds to an initiated session
    const oidcRedisKey = getOIDCRedisKey(state)
    const sessionExists = await redis.exists(oidcRedisKey)

    if (!sessionExists) {
      throw new BadRequestException(
        'No authentication session opened for the provided state',
      )
    }

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

    // Extract and validate ID token claims
    const idToken = await this.getIdToken(tokenData, discovery)

    const emailClaimRaw = (idToken as any).email

    if (!emailClaimRaw || typeof emailClaimRaw !== 'string') {
      throw new BadRequestException('Email claim missing in ID token')
    }

    const email = emailClaimRaw.trim().toLowerCase()

    // Find or create user by email
    const user = await this.getOrCreateUserByEmail(email)

    // Store resolved user id in the existing OIDC session
    const dataToStore = JSON.stringify({ id: user.id })

    await redis.set(oidcRedisKey, dataToStore, 'EX', REDIS_OIDC_SESSION_TIMEOUT)
  }

  /**
   * Checks whether the OIDC session identified by the provided state already contains
   * resolved user data. This is used to gracefully handle duplicate callback deliveries
   * or double-invocation scenarios in the client where the same code might be posted twice.
   */
  async isOidcSessionReady(state: string): Promise<boolean> {
    const oidcRedisKey = getOIDCRedisKey(state)
    const data = await redis.get(oidcRedisKey)

    return Boolean(data && data.length > 0)
  }

  async doesOidcSessionExist(state: string): Promise<boolean> {
    const oidcRedisKey = getOIDCRedisKey(state)
    const exists = await redis.exists(oidcRedisKey)
    return Boolean(exists)
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
      const user = await this.userService.findOne({ id })

      if (!user) {
        throw new BadRequestException('Invalid user ID')
      }

      const tokens = await this.generateJwtTokens(id, true)

      return {
        ...tokens,
        user: this.userService.omitSensitiveData(user),
      }
    } catch (error) {
      console.error(`[ERROR][AuthService -> authenticateOidc]: ${error}`)
      throw new InternalServerErrorException(error)
    }
  }
}
