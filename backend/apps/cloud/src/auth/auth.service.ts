import { createHash, randomUUID } from 'crypto'
import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import axios from 'axios'
import { genSalt, hash, compare } from 'bcrypt'
import { getCountry } from 'countries-and-timezones'
import { Auth } from 'googleapis'
import dayjs from 'dayjs'
import { UAParser } from '@ua-parser-js/pro-business'
import _pick from 'lodash/pick'
import _split from 'lodash/split'
import _isEmpty from 'lodash/isEmpty'
import _find from 'lodash/find'

import {
  ActionToken,
  ActionTokenType,
} from '../action-tokens/action-token.entity'
import { ActionTokensService } from '../action-tokens/action-tokens.service'
import { LetterTemplate } from '../mailer/letter'
import { MailerService } from '../mailer/mailer.service'
import {
  MAX_EMAIL_REQUESTS,
  User,
  TRIAL_DURATION,
} from '../user/entities/user.entity'
import { UserService } from '../user/user.service'
import { ProjectService } from '../project/project.service'
import {
  REDIS_SSO_UUID,
  redis,
  PRODUCTION_ORIGIN,
  isDevelopment,
  JWT_ACCESS_TOKEN_SECRET,
  JWT_ACCESS_TOKEN_LIFETIME,
  JWT_REFRESH_TOKEN_LIFETIME,
  JWT_REFRESH_TOKEN_SECRET,
} from '../common/constants'
import { getGeoDetails } from '../common/utils'
import { TelegramService } from '../integrations/telegram/telegram.service'
import { SSOProviders } from './dtos'
import { UserGoogleDTO } from '../user/dto/user-google.dto'
import { UserGithubDTO } from '../user/dto/user-github.dto'
import { trackCustom } from '../common/analytics'

const REDIS_SSO_SESSION_TIMEOUT = 60 * 5 // 5 minutes
const getSSORedisKey = (uuid: string) => `${REDIS_SSO_UUID}:${uuid}`
const generateSSOState = (provider: SSOProviders) =>
  `${provider}:${randomUUID()}`
const getSSOSessionProvider = (state: string): SSOProviders =>
  _split(state, ':')[0] as SSOProviders

const OAUTH_REDIRECT_URL = isDevelopment
  ? 'http://localhost:3000/socialised'
  : `${PRODUCTION_ORIGIN}/socialised`

// Action-token TTLs (in minutes)
const EMAIL_VERIFICATION_TOKEN_TTL_MINUTES = 60 * 24 // 24 hours
const PASSWORD_RESET_TOKEN_TTL_MINUTES = 60 // 1 hour
const EMAIL_CHANGE_TOKEN_TTL_MINUTES = 60 * 24 // 24 hours

const { GITHUB_OAUTH2_CLIENT_ID } = process.env
const { GITHUB_OAUTH2_CLIENT_SECRET } = process.env

@Injectable()
export class AuthService {
  oauth2Client: Auth.OAuth2Client

  githubOAuthClientID: string

  githubOAuthClientSecret: string

  constructor(
    private readonly userService: UserService,
    private readonly actionTokensService: ActionTokensService,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
    private readonly jwtService: JwtService,
    private readonly projectService: ProjectService,
    private readonly telegramService: TelegramService,
  ) {
    this.oauth2Client = new Auth.OAuth2Client(
      this.configService.get('GOOGLE_OAUTH2_CLIENT_ID'),
      this.configService.get('GOOGLE_OAUTH2_CLIENT_SECRET'),
    )
  }

  private async createSha1Hash(text: string): Promise<string> {
    return new Promise(resolve => {
      const sha1sum = createHash('sha1')
        .update(text)
        .digest('hex')
        .toUpperCase()
      resolve(sha1sum)
    })
  }

  public async checkIfLeaked(potentialPassword: string): Promise<boolean> {
    const sha1Hash = await this.createSha1Hash(potentialPassword)
    const firstFiveChars = sha1Hash.slice(0, 5)
    const lastChars = sha1Hash.slice(5)

    try {
      const response = await axios.get(
        `https://api.pwnedpasswords.com/range/${firstFiveChars}`,
        {
          timeout: 5000,
          headers: {
            // Helps against traffic analysis; supported by HIBP.
            'Add-Padding': 'true',
            'User-Agent': 'Swetrix',
          },
        },
      )

      if (response.status !== 200) {
        console.error(
          `[ERROR][AuthService -> checkIfLeaked]: Failed to get pwned passwords for ${firstFiveChars}: ${response.status}`,
        )
        return false
      }

      // Response lines look like: "<HASH_SUFFIX>:<COUNT>"
      const needle = `${lastChars}:`
      return String(response.data)
        .split('\n')
        .some(line => line.startsWith(needle))
    } catch (error) {
      console.error(
        `[ERROR][AuthService -> checkIfLeaked]: ${error} (prefix ${firstFiveChars})`,
      )
      // Fail safe: do not block signup on network errors.
      return false
    }
  }

  public async hashPassword(password: string): Promise<string> {
    const salt = await genSalt(10)
    return hash(password, salt)
  }

  public async sendVerificationEmail(userId: string, email: string) {
    const actionToken = await this.actionTokensService.createActionToken(
      userId,
      ActionTokenType.EMAIL_VERIFICATION,
    )

    const user = await this.userService.findUserById(userId)

    if (user && user.emailRequests < MAX_EMAIL_REQUESTS) {
      await this.userService.updateUser(userId, {
        emailRequests: user.emailRequests + 1,
      })
    }

    const verificationLink = `${this.configService.get('CLIENT_URL')}/verify/${
      actionToken.id
    }`

    await this.mailerService.sendEmail(email, LetterTemplate.SignUp, {
      url: verificationLink,
    })
  }

  public async createUnverifiedUser(
    email: string,
    password: string,
  ): Promise<User> {
    const hashedPassword = await this.hashPassword(password)

    const user = await this.userService.createUser({
      email,
      password: hashedPassword, // Using the password field is incorrect.
    })

    await this.sendVerificationEmail(user.id, user.email)

    return user
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

  public async getBasicUser(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.userService.findUser(email)

    if (user && (await this.comparePassword(password, user.password))) {
      return user
    }

    if (user && user.isTelegramChatIdConfirmed) {
      await this.telegramService.addMessage(
        user.telegramChatId,
        '⚠️ *Someone has tried to login to their account with an incorrect password.*',
        { parse_mode: 'Markdown' },
      )
    }

    return null
  }

  async getSharedProjectsForUser(userId: string) {
    return this.projectService.findShare({
      where: {
        user: { id: userId },
      },
      relations: ['project'],
    })
  }

  private async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return compare(password, hashedPassword)
  }

  public async sendTelegramNotification(
    userId: string,
    headers: Record<string, string>,
    ip: string,
  ) {
    const user = await this.userService.findUserById(userId)

    if (!user.telegramChatId || !user.receiveLoginNotifications) {
      return
    }

    const headersInfo = await this.getHeadersInfo(headers, ip)
    const loginDate = dayjs().utc().format('YYYY-MM-DD HH:mm:ss')
    const message =
      '🚨 *Someone has logged into your account!*\n\n' +
      `*Browser:* ${headersInfo.browser}\n` +
      `*Device:* ${headersInfo.device}\n` +
      `*OS:* ${headersInfo.os}\n` +
      `*Country:* ${headersInfo.country}\n` +
      `*IP:* ${ip}\n` +
      `*Date:* ${loginDate} (UTC)\n\n` +
      'If it was not you, please change your password immediately.'
    if (user && user.isTelegramChatIdConfirmed) {
      await this.telegramService.addMessage(user.telegramChatId, message, {
        parse_mode: 'Markdown',
      })
    }
  }

  private async getHeadersInfo(headers: Record<string, string>, ip: string) {
    const ua = await UAParser(
      headers?.['user-agent'],
      undefined,
      headers,
    ).withClientHints()
    const browser = ua.browser.name || 'Unknown'
    const device = ua.device.type || 'Desktop'
    const os = ua.os.name || 'Unknown'
    let { country } = getGeoDetails(ip)

    if (country) {
      country = getCountry(country)?.name
    } else {
      country = 'Unknown'
    }

    return {
      browser,
      device,
      os,
      country,
    }
  }

  public async checkVerificationToken(
    token: string,
  ): Promise<ActionToken | null> {
    const actionToken = await this.actionTokensService.findActionToken(token)

    if (
      actionToken &&
      actionToken.action === ActionTokenType.EMAIL_VERIFICATION
    ) {
      const createdAt = dayjs(actionToken.created as unknown as Date)
      if (
        createdAt.isValid() &&
        dayjs().diff(createdAt, 'minute') > EMAIL_VERIFICATION_TOKEN_TTL_MINUTES
      ) {
        await this.actionTokensService.deleteActionToken(actionToken.id)
        return null
      }
      return actionToken
    }

    return null
  }

  public async verifyEmail(actionToken: ActionToken): Promise<void> {
    await this.userService.updateUser(actionToken.user.id, {
      isActive: true,
    })
    await this.actionTokensService.deleteActionToken(actionToken.id)
  }

  public async sendResetPasswordEmail(userId: string, email: string) {
    const actionToken = await this.actionTokensService.createActionToken(
      userId,
      ActionTokenType.PASSWORD_RESET,
    )

    const verificationLink = `${this.configService.get(
      'CLIENT_URL',
    )}/password-reset/${actionToken.id}`

    await this.mailerService.sendEmail(
      email,
      LetterTemplate.ConfirmPasswordChange,
      {
        url: verificationLink,
      },
    )
  }

  public async checkResetPasswordToken(
    token: string,
  ): Promise<ActionToken | null> {
    const actionToken = await this.actionTokensService.findActionToken(token)

    if (actionToken && actionToken.action === ActionTokenType.PASSWORD_RESET) {
      const createdAt = dayjs(actionToken.created as unknown as Date)
      if (
        createdAt.isValid() &&
        dayjs().diff(createdAt, 'minute') > PASSWORD_RESET_TOKEN_TTL_MINUTES
      ) {
        await this.actionTokensService.deleteActionToken(actionToken.id)
        return null
      }
      return actionToken
    }

    return null
  }

  public async resetPassword(
    actionToken: ActionToken,
    password: string,
  ): Promise<void> {
    const hashedPassword = await this.hashPassword(password)

    // Update user password
    await this.userService.updateUser(actionToken.user.id, {
      password: hashedPassword,
    })

    // Delete current 'reset password' action token
    await this.actionTokensService.deleteActionToken(actionToken.id)

    // Delete all user refresh tokens
    await this.logoutAll(actionToken.user.id)
  }

  public async changePassword(userId: string, password: string): Promise<void> {
    const hashedPassword = await this.hashPassword(password)
    await this.userService.updateUser(userId, {
      password: hashedPassword,
    })
  }

  public async checkIfMaxEmailRequestsReached(
    userId: string,
  ): Promise<boolean> {
    const user = await this.userService.findUserById(userId)

    if (user && user.emailRequests >= MAX_EMAIL_REQUESTS) {
      return true
    }

    return false
  }

  public async checkIfEmailTaken(email: string): Promise<boolean> {
    const user = await this.userService.findUser(email)
    return Boolean(user)
  }

  public async changeEmail(
    userId: string,
    email: string,
    newEmail: string,
  ): Promise<void> {
    const actionToken = await this.actionTokensService.createActionToken(
      userId,
      ActionTokenType.EMAIL_CHANGE,
      newEmail,
    )

    const verificationLink = `${this.configService.get(
      'CLIENT_URL',
    )}/change-email/${actionToken.id}`

    await this.mailerService.sendEmail(
      email,
      LetterTemplate.MailAddressChangeConfirmation,
      {
        url: verificationLink,
      },
    )
  }

  public async checkChangeEmailToken(
    token: string,
  ): Promise<ActionToken | null> {
    const actionToken = await this.actionTokensService.findActionToken(token)

    if (actionToken && actionToken.action === ActionTokenType.EMAIL_CHANGE) {
      const createdAt = dayjs(actionToken.created as unknown as Date)
      if (
        createdAt.isValid() &&
        dayjs().diff(createdAt, 'minute') > EMAIL_CHANGE_TOKEN_TTL_MINUTES
      ) {
        await this.actionTokensService.deleteActionToken(actionToken.id)
        return null
      }
      return actionToken
    }

    return null
  }

  public async confirmChangeEmail(actionToken: ActionToken): Promise<void> {
    await this.userService.updateUser(actionToken.user.id, {
      email: actionToken.newValue,
    })
    await this.actionTokensService.deleteActionToken(actionToken.id)
    await this.mailerService.sendEmail(
      actionToken.newValue,
      LetterTemplate.MailAddressHadChanged,
    )
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

    await this.userService.saveRefreshToken(userId, refreshToken)

    return refreshToken
  }

  public async checkRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const token = await this.userService.findRefreshToken(userId, refreshToken)
    return Boolean(token)
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
    await this.userService.deleteRefreshToken(userId, refreshToken)
  }

  async logoutAll(userId: string) {
    await this.userService.deleteAllRefreshTokens(userId)
  }

  async findUserByApiKey(apiKey: string): Promise<User | null> {
    return this.userService.findUserByApiKey(apiKey)
  }

  /*
    --------------------------------
    Google SSO section
    --------------------------------
  */
  async handleExistingUserGoogle(
    user: User,
    headers: Record<string, string>,
    ip: string,
  ) {
    if (!user.googleId) {
      throw new BadRequestException()
    }

    await this.sendTelegramNotification(user.id, headers, ip)

    const jwtTokens = await this.generateJwtTokens(
      user.id,
      !user.isTwoFactorAuthenticationEnabled,
    )

    const meta = {
      totalMonthlyEvents: undefined,
    }

    if (user.isTwoFactorAuthenticationEnabled) {
      // @ts-expect-error
      user = _pick(user, ['isTwoFactorAuthenticationEnabled', 'email'])
    } else {
      const [sharedProjects, organisationMemberships] = await Promise.all([
        this.getSharedProjectsForUser(user.id),
        this.userService.getOrganisationsForUser(user.id),
      ])

      user.sharedProjects = sharedProjects
      user.organisationMemberships = organisationMemberships

      meta.totalMonthlyEvents = await this.projectService.getRedisCount(user.id)
    }

    return {
      ...jwtTokens,
      ...meta,
      user: this.userService.omitSensitiveData(user),
    }
  }

  async registerUserGoogle(sub: string, email: string) {
    const query: UserGoogleDTO = {
      googleId: sub,
      trialEndDate: dayjs
        .utc()
        .add(TRIAL_DURATION, 'day')
        .format('YYYY-MM-DD HH:mm:ss'),
      registeredWithGoogle: true,
      isActive: true,
      emailRequests: 0,
      email,
    }

    const userWithSameEmail = await this.userService.findOne({
      where: { email },
    })

    if (userWithSameEmail) {
      console.error(
        `[ERROR][AuthService -> registerUserGoogle] User with email ${email} already exists`,
      )
      throw new BadRequestException(
        'There is already an account associated with this email address',
      )
    }

    const user = await this.userService.create(query)

    const jwtTokens = await this.generateJwtTokens(user.id, true)

    return {
      ...jwtTokens,
      user: this.userService.omitSensitiveData(user),
      totalMonthlyEvents: 0,
    }
  }

  async processHash(ssoHash: string) {
    if (!ssoHash) {
      throw new BadRequestException('Missing hash parameter')
    }

    const ssoRedisKey = getSSORedisKey(ssoHash)
    const exists = await redis.exists(ssoRedisKey)

    if (!exists) {
      throw new BadRequestException(
        'No authentication session opened for this hash',
      )
    }

    const data = await redis.get(ssoRedisKey)

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

    await redis.del(ssoRedisKey)

    return payload
  }

  async authenticateSSO(
    ssoHash: string,
    headers: Record<string, string>,
    ip: string,
    provider: SSOProviders,
  ) {
    this.assertSSOProviderMatchesHash(provider, ssoHash)

    if (provider === SSOProviders.GOOGLE) {
      return this.authenticateGoogle(ssoHash, headers, ip)
    }

    if (provider === SSOProviders.GITHUB) {
      return this.authenticateGithub(ssoHash, headers, ip)
    }

    throw new BadRequestException('Unknown SSO provider supplied')
  }

  async authenticateGoogle(
    ssoHash: string,
    headers: Record<string, string>,
    ip: string,
  ) {
    const { sub, email } = await this.processHash(ssoHash)

    if (!sub || typeof sub !== 'string') {
      throw new BadRequestException('Invalid Google authentication session')
    }
    if (!email || typeof email !== 'string') {
      throw new BadRequestException('Invalid Google authentication session')
    }

    try {
      const user = await this.userService.findOne({
        where: { googleId: sub },
      })

      if (!user) {
        const data = await this.registerUserGoogle(sub, email)

        trackCustom(ip, headers['user-agent'], {
          ev: 'SIGNUP',
          meta: {
            method: 'google',
          },
        })

        return data
      }

      return await this.handleExistingUserGoogle(user, headers, ip)
    } catch (error) {
      console.error(`[ERROR][AuthService -> authenticateGoogle]: ${error}`)

      if (error === 'invalid_token') {
        throw new BadRequestException('Google token is expired')
      }

      throw new InternalServerErrorException(error)
    }
  }

  async generateGoogleURL() {
    // Generating SSO session identifier and authorisation URL
    const uuid = generateSSOState(SSOProviders.GOOGLE)
    const authUrl = await this.oauth2Client.generateAuthUrl({
      state: uuid,
      redirect_uri: OAUTH_REDIRECT_URL,
      scope: 'email',
      response_type: 'token',
      prompt: 'select_account',
    })

    // Storing the session identifier in redis
    await redis.set(getSSORedisKey(uuid), '', 'EX', REDIS_SSO_SESSION_TIMEOUT)

    return {
      uuid,
      auth_url: authUrl,
      expires_in: REDIS_SSO_SESSION_TIMEOUT * 1000, // milliseconds
    }
  }

  async processSSOToken(token: string, ssoHash: string) {
    const provider = getSSOSessionProvider(ssoHash)

    if (provider === SSOProviders.GOOGLE) {
      return this.processGoogleToken(token, ssoHash)
    }

    if (provider === SSOProviders.GITHUB) {
      return this.processGithubCode(token, ssoHash)
    }

    throw new BadRequestException('Unknown SSO provider supplied')
  }

  private assertSSOProviderMatchesHash(
    provider: SSOProviders,
    ssoHash: string,
  ): SSOProviders {
    const derivedProvider = getSSOSessionProvider(ssoHash)

    if (
      derivedProvider !== SSOProviders.GOOGLE &&
      derivedProvider !== SSOProviders.GITHUB
    ) {
      throw new BadRequestException('Invalid SSO session identifier')
    }

    if (provider !== derivedProvider) {
      throw new BadRequestException('SSO provider does not match session hash')
    }

    return derivedProvider
  }

  async processGoogleToken(token: string, ssoHash: string) {
    let tokenInfo

    try {
      tokenInfo = await this.oauth2Client.getTokenInfo(token)
    } catch (reason) {
      console.error(
        `[ERROR][AuthService -> processGoogleCode -> oauth2Client.getTokenInfo]: ${reason}`,
      )
      throw new BadRequestException('Invalid Google token supplied')
    }

    const { sub, email } = tokenInfo

    const dataToStore = JSON.stringify({ sub, email })

    // Storing the session identifier in redis
    await redis.set(
      getSSORedisKey(ssoHash),
      dataToStore,
      'EX',
      REDIS_SSO_SESSION_TIMEOUT,
    )
  }

  async linkSSOAccount(
    userId: string,
    ssoHash: string,
    provider: SSOProviders,
  ) {
    this.assertSSOProviderMatchesHash(provider, ssoHash)

    if (provider === SSOProviders.GOOGLE) {
      return this.linkGoogleAccount(userId, ssoHash)
    }

    if (provider === SSOProviders.GITHUB) {
      return this.linkGithubAccount(userId, ssoHash)
    }

    throw new BadRequestException('Unknown SSO provider supplied')
  }

  async linkGoogleAccount(userId: string, ssoHash: string) {
    const { sub } = await this.processHash(ssoHash)

    if (!sub) {
      throw new BadRequestException(
        'Google ID is missing in the authentication session',
      )
    }

    const subUser = await this.userService.findOne({
      where: { googleId: sub },
    })

    if (subUser) {
      throw new BadRequestException(
        'This Google account is already linked to another user',
      )
    }

    const user = await this.userService.findUserById(userId)

    if (!user) {
      throw new BadRequestException('User not found')
    }

    await this.userService.updateUser(userId, {
      googleId: sub,
    })
  }

  async unlinkSSOAccount(userId: string, provider: SSOProviders) {
    if (provider === SSOProviders.GOOGLE) {
      return this.unlinkGoogleAccount(userId)
    }

    if (provider === SSOProviders.GITHUB) {
      return this.unlinkGithubAccount(userId)
    }

    throw new BadRequestException('Unknown SSO provider supplied')
  }

  async unlinkGoogleAccount(userId: string) {
    const user = await this.userService.findUserById(userId)

    if (!user) {
      throw new BadRequestException('User not found')
    }

    if (user.registeredWithGoogle) {
      throw new BadRequestException(
        'You cannot unlink your Google account if you registered with it',
      )
    }

    await this.userService.updateUser(userId, {
      googleId: null,
    })
  }

  /*
    --------------------------------
    Github SSO section
    --------------------------------
  */
  async generateGithubURL() {
    // Generating SSO session identifier and authorisation URL
    const uuid = generateSSOState(SSOProviders.GITHUB)
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_OAUTH2_CLIENT_ID}&state=${uuid}&redirect_uri=${OAUTH_REDIRECT_URL}&scope=user:email&prompt=select_account`

    // Storing the session identifier in redis
    await redis.set(getSSORedisKey(uuid), '', 'EX', REDIS_SSO_SESSION_TIMEOUT)

    return {
      uuid,
      auth_url: authUrl,
      expires_in: REDIS_SSO_SESSION_TIMEOUT * 1000, // milliseconds
    }
  }

  async processGithubCode(code: string, ssoHash: string) {
    let token
    let tokenInfo

    try {
      const response = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: GITHUB_OAUTH2_CLIENT_ID,
          client_secret: GITHUB_OAUTH2_CLIENT_SECRET,
          code,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        },
      )

      token = response.data.access_token
    } catch (reason) {
      console.error(
        `[ERROR][AuthService -> processGithubCode -> axios.post]: ${reason}`,
      )
      throw new BadRequestException('Invalid Github code supplied')
    }

    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `token ${token}`,
        },
      })

      tokenInfo = response.data
    } catch (reason) {
      console.error(
        `[ERROR][AuthService -> processGithubCode -> axios.get]: ${reason}`,
      )
      throw new BadRequestException('Invalid Github token')
    }

    const { id } = tokenInfo
    let { email } = tokenInfo

    if (!email) {
      try {
        const response = await axios.get('https://api.github.com/user/emails', {
          headers: {
            Authorization: `token ${token}`,
          },
        })

        const emails = response.data

        if (_isEmpty(emails)) {
          console.error(
            '[ERROR][AuthService -> processGithubCode]: No email address found',
          )
          throw new BadRequestException('No email address found')
        }

        email = _find(emails, e => e.primary).email
      } catch (reason) {
        console.error(
          `[ERROR][AuthService -> processGithubCode -> axios.get (emails)]: ${reason}`,
        )
        throw new BadRequestException('Invalid Github token')
      }
    }

    const dataToStore = JSON.stringify({ id, email })

    // Storing the session identifier in redis
    await redis.set(
      getSSORedisKey(ssoHash),
      dataToStore,
      'EX',
      REDIS_SSO_SESSION_TIMEOUT,
    )
  }

  async registerUserGithub(id: number, email: string) {
    const query: UserGithubDTO = {
      githubId: id,
      trialEndDate: dayjs
        .utc()
        .add(TRIAL_DURATION, 'day')
        .format('YYYY-MM-DD HH:mm:ss'),
      registeredWithGithub: true,
      isActive: true,
      emailRequests: 0,
      email,
    }

    const userWithSameEmail = await this.userService.findOne({
      where: { email },
    })

    if (userWithSameEmail) {
      console.error(
        `[ERROR][AuthService -> registerUserGithub] User with email ${email} already exists`,
      )
      throw new BadRequestException(
        'There is already an account associated with this email address',
      )
    }

    const user = await this.userService.create(query)

    const jwtTokens = await this.generateJwtTokens(user.id, true)

    return {
      ...jwtTokens,
      user: this.userService.omitSensitiveData(user),
      totalMonthlyEvents: 0,
    }
  }

  async handleExistingUserGithub(
    user: User,
    headers: Record<string, string>,
    ip: string,
  ) {
    if (!user.githubId) {
      throw new BadRequestException()
    }

    await this.sendTelegramNotification(user.id, headers, ip)

    const jwtTokens = await this.generateJwtTokens(
      user.id,
      !user.isTwoFactorAuthenticationEnabled,
    )

    const meta = {
      totalMonthlyEvents: undefined,
    }

    if (user.isTwoFactorAuthenticationEnabled) {
      // @ts-expect-error
      user = _pick(user, ['isTwoFactorAuthenticationEnabled', 'email'])
    } else {
      const [sharedProjects, organisationMemberships] = await Promise.all([
        this.getSharedProjectsForUser(user.id),
        this.userService.getOrganisationsForUser(user.id),
      ])

      user.sharedProjects = sharedProjects
      user.organisationMemberships = organisationMemberships
      meta.totalMonthlyEvents = await this.projectService.getRedisCount(user.id)
    }

    return {
      ...jwtTokens,
      ...meta,
      user: this.userService.omitSensitiveData(user),
    }
  }

  async unlinkGithubAccount(userId: string) {
    const user = await this.userService.findUserById(userId)

    if (!user) {
      throw new BadRequestException('User not found')
    }

    if (user.registeredWithGithub) {
      throw new BadRequestException(
        'You cannot unlink your Google account if you registered with it',
      )
    }

    await this.userService.updateUser(userId, {
      githubId: null,
    })
  }

  async linkGithubAccount(userId: string, ssoHash: string) {
    const { id } = await this.processHash(ssoHash)

    if (!id) {
      throw new BadRequestException(
        'Github ID is missing in the authentication session',
      )
    }

    const subUser = await this.userService.findOne({
      where: { githubId: id },
    })

    if (subUser) {
      throw new BadRequestException(
        'This Github account is already linked to another user',
      )
    }

    const user = await this.userService.findUserById(userId)

    if (!user) {
      throw new BadRequestException('User not found')
    }

    await this.userService.updateUser(userId, {
      githubId: id,
    })
  }

  async authenticateGithub(
    ssoHash: string,
    headers: Record<string, string>,
    ip: string,
  ) {
    const { id, email } = await this.processHash(ssoHash)

    if (typeof id !== 'number' || !Number.isFinite(id)) {
      throw new BadRequestException('Invalid Github authentication session')
    }
    if (!email || typeof email !== 'string') {
      throw new BadRequestException('Invalid Github authentication session')
    }

    try {
      const user = await this.userService.findOne({
        where: { githubId: id },
      })

      if (!user) {
        const data = await this.registerUserGithub(id, email)

        trackCustom(ip, headers['user-agent'], {
          ev: 'SIGNUP',
          meta: {
            method: 'github',
          },
        })

        return data
      }

      return await this.handleExistingUserGithub(user, headers, ip)
    } catch (error) {
      console.error(`[ERROR][AuthService -> authenticateGithub]: ${error}`)
      throw new InternalServerErrorException(error)
    }
  }
}
