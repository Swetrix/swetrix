import {
  Controller,
  Query,
  Req,
  Body,
  Param,
  Get,
  Post,
  Put,
  Delete,
  HttpCode,
  BadRequestException,
  UseGuards,
  MethodNotAllowedException,
  ConflictException,
  Headers,
  Ip,
  Patch,
  NotFoundException,
} from '@nestjs/common'
import { Request } from 'express'
import { ApiTags, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import _map from 'lodash/map'
import _join from 'lodash/join'
import _isNull from 'lodash/isNull'
import _isEmpty from 'lodash/isEmpty'
import _includes from 'lodash/includes'
import _isString from 'lodash/isString'
import _pick from 'lodash/pick'
import _round from 'lodash/round'
import { v4 as uuidv4 } from 'uuid'
import { HttpService } from '@nestjs/axios'
import { catchError, firstValueFrom, map, of } from 'rxjs'

import { Markup } from 'telegraf'
import { JwtAccessTokenGuard } from '../auth/guards'

import { Public, Roles, CurrentUserId, Auth } from '../auth/decorators'
import { TelegramService } from '../integrations/telegram/telegram.service'
import { UserService } from './user.service'
import { ProjectService, deleteProjectRedis } from '../project/project.service'
import {
  User,
  UserType,
  MAX_EMAIL_REQUESTS,
  PlanCode,
  Theme,
  FeatureFlag,
} from './entities/user.entity'
import { Pagination } from '../common/pagination/pagination'
import {
  GDPR_EXPORT_TIMEFRAME,
  isDevelopment,
  PRODUCTION_ORIGIN,
} from '../common/constants'
import { clickhouse } from '../common/integrations/clickhouse'
import { RolesGuard } from '../auth/guards/roles.guard'
import { UpdateUserProfileDTO } from './dto/update-user.dto'
import { IChangePlanDTO } from './dto/change-plan.dto'
import { AdminUpdateUserProfileDTO } from './dto/admin-update-user.dto'
import { SetShowLiveVisitorsDTO } from './dto/set-show-live-visitors.dto'
import { ActionTokensService } from '../action-tokens/action-tokens.service'
import { MailerService } from '../mailer/mailer.service'
import { ActionTokenType } from '../action-tokens/action-token.entity'
import { AuthService } from '../auth/auth.service'
import { LetterTemplate } from '../mailer/letter'
import { AppLoggerService } from '../logger/logger.service'
import { UserProfileDTO } from './dto/user.dto'
import { DeleteSelfDTO } from './dto/delete-self.dto'
import {
  checkRateLimit,
  getGeoDetails,
  getIPFromHeaders,
  generateRefCode,
} from '../common/utils'
import { IUsageInfo, IMetaInfo } from './interfaces'
import { ReportFrequency } from '../project/enums'
import { OrganisationService } from '../organisation/organisation.service'

dayjs.extend(utc)

const UNPAID_PLANS = [PlanCode.free, PlanCode.trial, PlanCode.none]

@ApiTags('User')
@Controller('user')
@UseGuards(JwtAccessTokenGuard, RolesGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly projectService: ProjectService,
    private readonly actionTokensService: ActionTokensService,
    private readonly mailerService: MailerService,
    private readonly logger: AppLoggerService,
    private readonly telegramService: TelegramService,
    private readonly httpService: HttpService,
    private readonly organisationService: OrganisationService,
  ) {}

  @ApiBearerAuth()
  @Get('/me')
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async me(@CurrentUserId() uid: string) {
    this.logger.log({ uid }, 'GET /user/me')

    const [sharedProjects, organisationMemberships, user, totalMonthlyEvents] =
      await Promise.all([
        this.authService.getSharedProjectsForUser(uid),
        this.userService.getOrganisationsForUser(uid),
        this.userService.findOne({ where: { id: uid } }),
        this.projectService.getRedisCount(uid),
      ])

    const sanitizedUser = this.userService.omitSensitiveData(user)

    sanitizedUser.sharedProjects = sharedProjects
    sanitizedUser.organisationMemberships = organisationMemberships

    return {
      user: sanitizedUser,
      totalMonthlyEvents,
    }
  }

  @ApiBearerAuth()
  @Get('/')
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  async get(
    @Query('take') take: number | undefined,
    @Query('skip') skip: number | undefined,
  ): Promise<Pagination<User> | User[]> {
    this.logger.log({ take, skip }, 'GET /user')
    return this.userService.paginate({ take, skip })
  }

  @ApiBearerAuth()
  @Put('/theme')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async setTheme(
    @CurrentUserId() userId: string,
    @Body('theme') theme: Theme,
  ): Promise<User> {
    return this.userService.update(userId, { theme })
  }

  @ApiBearerAuth()
  @Put('/feature-flags')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async setFeatureFlags(
    @CurrentUserId() userId: string,
    @Body('featureFlags') featureFlags: FeatureFlag[],
  ) {
    await this.userService.update(userId, { featureFlags })
  }

  @ApiBearerAuth()
  @Put('/live-visitors')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async setShowLiveVisitors(
    @CurrentUserId() userId: string,
    @Body() body: SetShowLiveVisitorsDTO,
  ): Promise<Partial<User>> {
    const { show } = body

    await this.userService.update(userId, { showLiveVisitorsInTitle: show })

    return {
      showLiveVisitorsInTitle: show,
    }
  }

  @ApiBearerAuth()
  @Get('/search')
  @ApiQuery({ name: 'query', required: false })
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  async searchUsers(
    @Query('query') query: string | undefined,
  ): Promise<User[]> {
    this.logger.log({ query }, 'GET /user/search')
    return this.userService.search(query)
  }

  @ApiBearerAuth()
  @Post('/')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  async create(@Body() userDTO: UserProfileDTO): Promise<User | null> {
    this.logger.log({ userDTO }, 'POST /user')
    this.userService.validatePassword(userDTO.password)
    userDTO.password = await this.authService.hashPassword(userDTO.password)

    try {
      const user = await this.userService.create({ ...userDTO, isActive: true })
      return user
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        if (e.sqlMessage.includes(userDTO.email)) {
          throw new BadRequestException('User with this email already exists')
        }
      }
    }

    return null
  }

  @ApiBearerAuth()
  @Post('/recieve-login-notifications')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async receiveLoginNotifications(
    @CurrentUserId() userId: string,
    @Body('receiveLoginNotifications') receiveLoginNotifications: boolean,
  ): Promise<User> {
    this.logger.log(
      { userId, receiveLoginNotifications },
      'POST /user/recieve-login-notifications',
    )

    return this.userService.update(userId, { receiveLoginNotifications })
  }

  @ApiBearerAuth()
  @Patch('/set-paypal-email')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async setPaypalEmail(
    @CurrentUserId() userId: string,
    @Body('paypalPaymentsEmail') paypalPaymentsEmail: string,
    @Headers() headers,
    @Ip() reqIP,
  ): Promise<User> {
    this.logger.log(
      { userId, paypalPaymentsEmail },
      'PATCH /user/set-paypal-email',
    )

    const ip = getIPFromHeaders(headers) || reqIP || ''

    await checkRateLimit(ip, 'set-paypal-email', 10, 3600)

    const user = await this.userService.findOne({ where: { id: userId } })

    if (!user) {
      throw new BadRequestException('User not found')
    }

    await this.mailerService.sendEmail(
      user.email,
      LetterTemplate.PayPalEmailUpdate,
    )

    return this.userService.update(userId, {
      paypalPaymentsEmail: paypalPaymentsEmail || null,
    })
  }

  @ApiBearerAuth()
  @Post('/api-key')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async generateApiKey(
    @CurrentUserId() userId: string,
    @Headers() headers,
    @Ip() reqIP,
  ): Promise<{
    apiKey: string
  }> {
    this.logger.log({ userId }, 'POST /user/api-key')

    const ip = getIPFromHeaders(headers) || reqIP || ''

    await checkRateLimit(ip, 'generate-api-key', 5, 3600)

    const user = await this.userService.findOne({ where: { id: userId } })

    if (!_isNull(user.apiKey)) {
      throw new ConflictException('You already have an API key')
    }

    const apiKey: string = uuidv4()

    await this.userService.update(userId, { apiKey })

    return { apiKey }
  }

  @ApiBearerAuth()
  @Delete('/api-key')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async deleteApiKey(@CurrentUserId() userId: string): Promise<void> {
    this.logger.log({ userId }, 'DELETE /user/api-key')

    const user = await this.userService.findOne({ where: { id: userId } })

    if (_isNull(user.apiKey)) {
      throw new ConflictException("You don't have an API key")
    }

    await this.userService.update(userId, { apiKey: null })
  }

  @ApiBearerAuth()
  @Delete('/:id')
  @HttpCode(204)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  async delete(
    @Param('id') id: string,
    @CurrentUserId() uid: string,
  ): Promise<any> {
    this.logger.log({ id, uid }, 'DELETE /user/:id')
    const user = await this.userService.findOne({
      where: { id },
      relations: ['projects'],
      select: ['id', 'planCode'],
    })

    if (_isEmpty(user)) {
      throw new BadRequestException(`User with id ${id} does not exist`)
    }

    if (!_includes(UNPAID_PLANS, user.planCode)) {
      throw new BadRequestException('cancelSubFirst')
    }

    try {
      if (!_isEmpty(user.projects)) {
        const pids = _join(
          _map(user.projects, el => `'${el.id}'`),
          ',',
        )

        const queries = [
          `DELETE FROM analytics WHERE pid IN (${pids})`,
          `DELETE FROM customEV WHERE pid IN (${pids})`,
          `DELETE FROM performance WHERE pid IN (${pids})`,
          `DELETE FROM errors WHERE pid IN (${pids})`,
          `DELETE FROM error_statuses WHERE pid IN (${pids})`,
          `DELETE FROM captcha WHERE pid IN (${pids})`,
        ]

        await this.projectService.deleteMultiple(user.projects.map(el => el.id))

        const promises = _map(queries, async query =>
          clickhouse.command({
            query,
          }),
        )
        await Promise.all(promises)
      }
      await this.actionTokensService.deleteMultiple(`userId="${id}"`)
      await this.userService.deleteAllRefreshTokens(id)
      await this.projectService.deleteMultipleShare(`userId="${id}"`)
      await this.organisationService.deleteMemberships({
        user: {
          id,
        },
      })
      await this.userService.delete(id)

      return 'accountDeleted'
    } catch (e) {
      this.logger.error(e)
      throw new BadRequestException('accountDeleteError')
    }
  }

  @ApiBearerAuth()
  @Delete('/')
  @HttpCode(204)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async deleteSelf(
    @CurrentUserId() id: string,
    @Body() deleteSelfDTO: DeleteSelfDTO,
  ): Promise<any> {
    this.logger.log({ id }, 'DELETE /user')

    const user = await this.userService.findOne({
      where: { id },
      relations: ['projects'],
      select: ['id', 'planCode'],
    })

    if (_isEmpty(user)) {
      throw new BadRequestException('User not found')
    }

    if (!_includes(UNPAID_PLANS, user.planCode)) {
      throw new BadRequestException('cancelSubFirst')
    }

    try {
      if (!_isEmpty(user.projects)) {
        const pids = _join(
          _map(user.projects, el => `'${el.id}'`),
          ',',
        )
        const queries = [
          `DELETE FROM analytics WHERE pid IN (${pids})`,
          `DELETE FROM customEV WHERE pid IN (${pids})`,
          `DELETE FROM performance WHERE pid IN (${pids})`,
          `DELETE FROM errors WHERE pid IN (${pids})`,
          `DELETE FROM error_statuses WHERE pid IN (${pids})`,
          `DELETE FROM captcha WHERE pid IN (${pids})`,
        ]
        await this.projectService.deleteMultiple(user.projects.map(el => el.id))
        const promises = _map(queries, async query =>
          clickhouse.command({
            query,
          }),
        )
        await Promise.all(promises)
      }
      await this.actionTokensService.deleteMultiple(`userId="${id}"`)
      await this.userService.deleteAllRefreshTokens(id)
      await this.projectService.deleteMultipleShare(`userId="${id}"`)
      await this.organisationService.deleteMemberships({
        user: {
          id,
        },
      })
      await this.userService.delete(id)
    } catch (e) {
      this.logger.error(e)
      throw new BadRequestException('accountDeleteError')
    }

    try {
      if (deleteSelfDTO.feedback) {
        await this.userService.saveDeleteFeedback(deleteSelfDTO.feedback)
      }
    } catch (reason) {
      this.logger.error(
        '[ERROR] Failed to save account deletion feedback:',
        reason,
      )
      this.logger.error('DeleteSelfDTO: ', deleteSelfDTO)
    }

    return 'accountDeleted'
  }

  @ApiBearerAuth()
  @Delete('/share/:actionId')
  @HttpCode(204)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @ApiResponse({ status: 204, description: 'Empty body' })
  async deleteShare(
    @Param('actionId') actionId: string,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ uid, actionId }, 'DELETE /user/share/:actionId')

    let isActionToken = false

    const actionToken = await this.actionTokensService.getActionToken(actionId)

    if (actionToken) {
      isActionToken = true
    }

    const share = await this.projectService.findOneShare({
      where: { id: actionToken?.newValue || actionId },
      relations: ['user', 'project'],
    })

    if (_isEmpty(share)) {
      throw new BadRequestException(
        'This invitation does not exist or is no longer valid',
      )
    }

    if (share.user?.id !== uid) {
      throw new BadRequestException(
        'You are not allowed to reject this invitation',
      )
    }

    await this.projectService.deleteShare(share.id)
    await deleteProjectRedis(share.project.id)

    if (isActionToken) {
      await this.actionTokensService.delete(actionId)
    }
  }

  @ApiBearerAuth()
  @Get('/share/:actionId')
  @HttpCode(204)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @ApiResponse({ status: 204, description: 'Empty body' })
  async acceptShare(
    @Param('actionId') actionId: string,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ uid, actionId }, 'GET /user/share/:actionId')

    let isActionToken = false

    const actionToken = await this.actionTokensService.getActionToken(actionId)

    if (actionToken) {
      isActionToken = true
    }

    const share = await this.projectService.findOneShare({
      where: { id: actionToken?.newValue || actionId },
      relations: ['user', 'project'],
    })

    if (_isEmpty(share)) {
      throw new BadRequestException(
        'This invitation does not exist or is no longer valid',
      )
    }

    if (share.user?.id !== uid) {
      throw new BadRequestException(
        'You are not allowed to accept this invitation',
      )
    }

    await this.projectService.updateShare(share.id, {
      confirmed: true,
    })
    await deleteProjectRedis(share.project.id)

    if (isActionToken) {
      await this.actionTokensService.delete(actionId)
    }
  }

  @ApiBearerAuth()
  @Delete('/organisation/:actionId')
  @HttpCode(204)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @ApiResponse({ status: 204, description: 'Empty body' })
  async rejectOrganisationInvitation(
    @Param('actionId') actionId: string,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ uid, actionId }, 'DELETE /user/organisation/:actionId')

    let isActionToken = false

    const actionToken = await this.actionTokensService.getActionToken(actionId)

    if (actionToken) {
      isActionToken = true
    }

    const membership = await this.organisationService.findOneMembership({
      where: { id: actionToken?.newValue || actionId },
      relations: ['user'],
    })

    if (_isEmpty(membership)) {
      throw new BadRequestException(
        'This invitation does not exist or is no longer valid',
      )
    }

    if (membership.user?.id !== uid) {
      throw new BadRequestException(
        'You are not allowed to reject this invitation from this account',
      )
    }

    await this.organisationService.deleteMembership(membership.id)

    if (isActionToken) {
      await this.actionTokensService.delete(actionId)
    }
  }

  @ApiBearerAuth()
  @Post('/organisation/:actionId')
  @HttpCode(204)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Auth([], true)
  @ApiResponse({ status: 204, description: 'Empty body' })
  async acceptOrganisationInvitation(
    @Param('actionId') actionId: string,
    @CurrentUserId() uid: string,
  ): Promise<any> {
    this.logger.log({ uid, actionId }, 'POST /user/organisation/:actionId')

    let isActionToken = false

    const actionToken = await this.actionTokensService.getActionToken(actionId)

    if (actionToken) {
      isActionToken = true
    }

    const membership = await this.organisationService.findOneMembership({
      where: { id: actionToken?.newValue || actionId },
      relations: ['user'],
    })

    if (_isEmpty(membership)) {
      throw new BadRequestException(
        'This invitation does not exist or is no longer valid',
      )
    }

    if (membership.user?.id !== uid) {
      throw new BadRequestException(
        'You are not allowed to accept this invitation from this account',
      )
    }

    await this.organisationService.updateMembership(membership.id, {
      confirmed: true,
    })

    if (isActionToken) {
      await this.actionTokensService.delete(actionId)
    }
  }

  @ApiBearerAuth()
  @Post('/confirm_email')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async sendEmailConfirmation(
    @CurrentUserId() id: string,
    @Req() request: Request,
  ): Promise<boolean> {
    this.logger.log({ id }, 'POST /user/confirm_email')

    const user = await this.userService.findOne({ where: { id } })

    if (
      !user ||
      !user.email ||
      user.isActive ||
      user.emailRequests >= MAX_EMAIL_REQUESTS
    )
      return false

    const token = await this.actionTokensService.createForUser(
      user,
      ActionTokenType.EMAIL_VERIFICATION,
      user.email,
    )
    const url = `${
      isDevelopment ? request.headers.origin : PRODUCTION_ORIGIN
    }/verify/${token.id}`

    await this.userService.update(id, { emailRequests: 1 + user.emailRequests })
    await this.mailerService.sendEmail(user.email, LetterTemplate.SignUp, {
      url,
    })
    return true
  }

  @ApiBearerAuth()
  @Put('/:id')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  async update(
    @Body() userDTO: AdminUpdateUserProfileDTO,
    @Param('id') id: string,
  ): Promise<Partial<User>> {
    this.logger.log({ userDTO, id }, 'PUT /user/:id')

    if (userDTO.password) {
      this.userService.validatePassword(userDTO.password)
      userDTO.password = await this.authService.hashPassword(userDTO.password)
    }

    const user = await this.userService.findOne({ where: { id } })

    try {
      if (!user) {
        await this.userService.create({ ...userDTO })
      }
      await this.userService.update(id, { ...user, ...userDTO })
      // omit sensitive data before returning using this.userService.omitSensitiveData function
      return this.userService.omitSensitiveData(
        await this.userService.findOne({ where: { id } }),
      )
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        if (e.sqlMessage.includes(userDTO.email)) {
          throw new BadRequestException('User with this email already exists')
        }
      }
      throw new BadRequestException(e.message)
    }
  }

  @ApiBearerAuth()
  @Delete('/tg/:id')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @HttpCode(204)
  async deleteTelegramConnection(
    @Param('id') tgID: string,
    @CurrentUserId() id: string,
  ): Promise<any> {
    this.logger.log({ tgID, id }, 'DELETE /user/tg/:id')

    const user = await this.userService.findOne({ where: { id } })

    if (tgID && user.telegramChatId === tgID) {
      await this.userService.update(id, {
        telegramChatId: null,
        isTelegramChatIdConfirmed: false,
      })
    }
  }

  @ApiBearerAuth()
  @Put('/')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async updateCurrentUser(
    @Body() userDTO: UpdateUserProfileDTO,
    @CurrentUserId() id: string,
    @Req() request: Request,
  ): Promise<Partial<User>> {
    this.logger.log({ userDTO, id }, 'PUT /user')
    const user = await this.userService.findOne({ where: { id } })

    const shouldUpdatePassword =
      !_isEmpty(userDTO.password) && _isString(userDTO.password)

    if (shouldUpdatePassword) {
      // Validate new password
      this.userService.validatePassword(userDTO.password)

      // Hash new password
      userDTO.password = await this.authService.hashPassword(userDTO.password)
    }

    try {
      if (userDTO.email && user.email !== userDTO.email) {
        const userWithByEmail = await this.userService.findOne({
          where: { email: userDTO.email },
        })

        if (userWithByEmail) {
          throw new BadRequestException('User with this email already exists')
        }

        await checkRateLimit(user.id, 'change-email', 5)

        const token = await this.actionTokensService.createForUser(
          user,
          ActionTokenType.EMAIL_CHANGE,
          userDTO.email,
        )
        const url = `${
          isDevelopment ? request.headers.origin : PRODUCTION_ORIGIN
        }/change-email/${token.id}`

        await this.mailerService.sendEmail(
          user.email,
          LetterTemplate.MailAddressChangeConfirmation,
          { url },
        )
      }

      if (
        userDTO.telegramChatId &&
        user.telegramChatId !== userDTO.telegramChatId
      ) {
        const userWithByTelegramChatId = await this.userService.findOne({
          where: { telegramChatId: userDTO.telegramChatId },
        })

        if (userWithByTelegramChatId) {
          throw new BadRequestException(
            'User with this Telegram chat ID already exists',
          )
        }

        await this.userService.update(id, {
          isTelegramChatIdConfirmed: false,
        })

        this.telegramService.addMessage(
          userDTO.telegramChatId,
          'Please confirm your Telegram chat ID',
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                '✅ Confirm',
                `link-account:confirm:${id}`,
              ),
              Markup.button.callback('❌ Cancel', `link-account:cancel:${id}`),
            ],
          ]),
        )
      }

      if (userDTO.slackWebhookUrl) {
        const slackWebhookResponse = await firstValueFrom(
          this.httpService.get<string>(userDTO.slackWebhookUrl).pipe(
            map(response => response.data),
            catchError(error => {
              if (error.response && error.response.data) {
                return of(error.response.data)
              }

              return of('Error occurred, but no response data was returned')
            }),
          ),
        )

        if (slackWebhookResponse === 'invalid_token') {
          throw new ConflictException('Invalid Slack URL.')
        }
      } else if (userDTO.slackWebhookUrl === null) {
        await this.userService.update(id, {
          slackWebhookUrl: null,
        })
      }

      if (userDTO.discordWebhookUrl) {
        const discordWebhookResponse = await firstValueFrom(
          this.httpService
            .get<{ code?: number }>(userDTO.discordWebhookUrl)
            .pipe(
              map(response => response.data),
              catchError(error => {
                if (error.response && error.response.data) {
                  return of(error.response.data)
                }

                return of('Error occurred, but no response data was returned')
              }),
            ),
        )

        if (discordWebhookResponse.code === 50027) {
          throw new ConflictException('Invalid Discord URL.')
        }
      } else if (userDTO.discordWebhookUrl === null) {
        await this.userService.update(id, {
          discordWebhookUrl: null,
        })
      }

      if (userDTO.timeFormat && user.timeFormat !== userDTO.timeFormat) {
        await this.userService.update(id, {
          timeFormat: userDTO.timeFormat,
        })
      }

      const userToUpdate = _pick(userDTO, [
        'nickname',
        'password',
        'reportFrequency',
        'timezone',
        'theme',
        'showLiveVisitorsInTitle',
        'paypalPaymentsEmail',
        'slackWebhookUrl',
        'discordWebhookUrl',
        'telegramChatId',
        'receiveLoginNotifications',
        'timeFormat',
      ])
      await this.userService.update(id, userToUpdate)

      // If password should have been updated and there were no issues doing so, then...
      if (shouldUpdatePassword) {
        // Send 'Password changed' email notification
        await this.mailerService.sendEmail(
          user.email,
          LetterTemplate.PasswordChanged,
        )

        // Log out all user sessions
        await this.authService.logoutAll(id)
      }

      const updatedUser = await this.userService.findOne({ where: { id } })
      return this.userService.omitSensitiveData(updatedUser)
    } catch (reason) {
      throw new BadRequestException(reason.message)
    }
  }

  // @ApiBearerAuth()
  // @Get('payouts/list')
  // @ApiQuery({ name: 'take', required: false })
  // @ApiQuery({ name: 'skip', required: false })
  // @UseGuards(JwtAccessTokenGuard, RolesGuard)
  // @Roles(UserType.CUSTOMER, UserType.ADMIN)
  // async getPayoutsList(
  //   @CurrentUserId() id: string,
  //   @Query('take') take: number | undefined,
  //   @Query('skip') skip: number | undefined,
  // ): Promise<Pagination<Payout> | Payout[]> {
  //   this.logger.log({ id, take, skip }, 'GET /user/payouts/list')

  //   const user = await this.userService.findOne({ where: { id } })

  //   if (!user) {
  //     throw new BadRequestException('User not found')
  //   }

  //   return this.userService.getPayoutsList(user)
  // }

  @ApiBearerAuth()
  @Get('referrals')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async getReferralsList(@CurrentUserId() id: string): Promise<any> {
    this.logger.log({ id }, 'GET /user/referrals')

    const user = await this.userService.findOne({ where: { id } })

    if (!user) {
      throw new BadRequestException('User not found')
    }

    return this.userService.getReferralsList(user)
  }

  @ApiBearerAuth()
  @Get('payouts/info')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async getPayoutsInfo(@CurrentUserId() id: string): Promise<any> {
    this.logger.log({ id }, 'GET /user/payouts/info')

    const user = await this.userService.findOne({ where: { id } })

    if (!user) {
      throw new BadRequestException('User not found')
    }

    return this.userService.getPayoutsInfo(user)
  }

  @ApiBearerAuth()
  @Post('generate-ref-code')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async generateRefCode(@CurrentUserId() id: string): Promise<any> {
    this.logger.log({ id }, 'POST /user/generate-ref-code')

    const user = await this.userService.findOne({ where: { id } })

    if (!user) {
      throw new BadRequestException('User not found')
    }

    if (user.refCode) {
      throw new BadRequestException('Referral code already exists')
    }

    let refCode = generateRefCode()

    // eslint-disable-next-line no-await-in-loop
    while (!(await this.userService.isRefCodeUnique(refCode))) {
      refCode = generateRefCode()
    }

    await this.userService.update(id, { refCode })

    return {
      refCode,
    }
  }

  @ApiBearerAuth()
  @Get('/export')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async exportUserData(@CurrentUserId() user_id: string): Promise<User> {
    this.logger.log({ user_id }, 'GET /user/export')
    const user = await this.userService.findOne({ where: { id: user_id } })
    const projects = await this.projectService.find({
      where: {
        admin: { id: user_id },
      },
      relations: ['alerts'],
    })

    if (
      !_isNull(user.exportedAt) &&
      !dayjs().isAfter(
        dayjs.utc(user.exportedAt).add(GDPR_EXPORT_TIMEFRAME, 'day'),
        'day',
      )
    ) {
      throw new MethodNotAllowedException(
        `Please, try again later. You can request a GDPR Export only once per ${GDPR_EXPORT_TIMEFRAME} days.`,
      )
    }

    const data = {
      user: {
        ...user,
        created: dayjs(user.created).format('YYYY/MM/DD HH:mm:ss'),
        updated: dayjs(user.updated).format('YYYY/MM/DD HH:mm:ss'),
        cancellationEffectiveDate: _isNull(user.cancellationEffectiveDate)
          ? '-'
          : dayjs(user.cancellationEffectiveDate).format('YYYY/MM/DD HH:mm:ss'),
        planExceedContactedAt: _isNull(user.planExceedContactedAt)
          ? '-'
          : dayjs(user.planExceedContactedAt).format('YYYY/MM/DD HH:mm:ss'),
        exportedAt: _isNull(user.exportedAt)
          ? '-'
          : dayjs(user.exportedAt).format('YYYY/MM/DD HH:mm:ss'),
        evWarningSentOn: _isNull(user.evWarningSentOn)
          ? '-'
          : dayjs(user.evWarningSentOn).format('YYYY/MM/DD HH:mm:ss'),
        subID: user.subID || '-',
        subUpdateURL: user.subUpdateURL || '-',
        subCancelURL: user.subCancelURL || '-',
        telegramChatId: user.telegramChatId || '-',
        dashboardBlockReason: user.dashboardBlockReason || '-',
        refCode: user.refCode || '-',
        referrerID: user.referrerID || '-',
        paypalPaymentsEmail: user.paypalPaymentsEmail || '-',
        tierCurrency: user.tierCurrency || '-',
        nickname: user.nickname || '-',
      },
      projects: _map(projects, project => ({
        ...project,
        created: dayjs(project.created).format('YYYY/MM/DD HH:mm:ss'),
        origins: _join(project.origins, ', '),
        ipBlacklist: _join(project.ipBlacklist, ', '),
      })),
    }

    await this.mailerService.sendEmail(
      user.email,
      LetterTemplate.GDPRDataExport,
      data,
    )
    await this.userService.update(user.id, {
      exportedAt: dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
    })

    return user
  }

  @Get('metainfo')
  @Public()
  async getMetaInfo(
    @Headers() headers,
    @Ip() reqIP: string,
  ): Promise<IMetaInfo> {
    const ip = getIPFromHeaders(headers) || reqIP || ''
    const { country, city, region } = getGeoDetails(ip)

    return {
      country,
      city,
      region,
      ...this.userService.getCurrencyByCountry(country),
    }
  }

  @Get('usageinfo')
  async getUsageInfo(@CurrentUserId() uid: string): Promise<IUsageInfo> {
    const rawInfo = await this.projectService.getRedisUsageInfo(uid)

    const info: IUsageInfo = {
      ...rawInfo,
      trafficPerc: _round((rawInfo.traffic / rawInfo.total) * 100, 2),
      customEventsPerc: _round((rawInfo.customEvents / rawInfo.total) * 100, 2),
      captchaPerc: _round((rawInfo.captcha / rawInfo.total) * 100, 2),
      errorsPerc: _round((rawInfo.errors / rawInfo.total) * 100, 2),
    }

    return info
  }

  @ApiBearerAuth()
  @Post('change-plan')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async changePlan(
    @CurrentUserId() id: string,
    @Body() body: IChangePlanDTO,
  ): Promise<void> {
    this.logger.log({ body, id }, 'POST /change-plan')
    const { planId } = body

    await this.userService.updateSubscription(id, planId)
    await this.projectService.clearProjectsRedisCache(id)
  }

  @ApiBearerAuth()
  @Post('preview-plan')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async previewPlan(
    @CurrentUserId() id: string,
    @Body() body: IChangePlanDTO,
  ): Promise<any> {
    this.logger.log({ body, id }, 'POST /preview-plan')
    const { planId } = body

    return this.userService.previewSubscription(id, planId)
  }

  // Used to unsubscribe from email reports
  @Get('/unsubscribe/:token')
  @Public()
  @ApiResponse({ status: 204 })
  async unsubscribeFromEmailReports(
    @Param('token') token: string,
  ): Promise<void> {
    this.logger.log({ token }, 'GET /project/unsubscribe/:token')

    let userId

    try {
      userId = this.userService.decryptUnsubscribeKey(token)
    } catch {
      throw new NotFoundException('Unsubscribe token is invalid')
    }

    const user = await this.userService.findOne({ where: { id: userId } })

    if (!user) {
      throw new NotFoundException('Unsubscribe token is invalid')
    }

    await this.userService.update(userId, {
      reportFrequency: ReportFrequency.NEVER,
    })
  }
}
