import {
  Controller,
  Get,
  Put,
  Body,
  BadRequestException,
  Post,
  Headers,
  Ip,
  ConflictException,
  Delete,
  Param,
  HttpCode,
} from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import _isEmpty from 'lodash/isEmpty'
import _omit from 'lodash/omit'
import _isNull from 'lodash/isNull'
import _map from 'lodash/map'
import _join from 'lodash/join'
import { randomUUID } from 'crypto'

import { OnboardingStep } from './entities/user.entity'
import { UpdateUserProfileDTO } from './dto/update-user.dto'
import { SetShowLiveVisitorsDTO } from './dto/set-show-live-visitors.dto'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { AppLoggerService } from '../logger/logger.service'
import { UserService } from './user.service'
import {
  checkRateLimit,
  deleteAllRefreshTokensClickhouse,
  deleteProjectsByUserIdClickhouse,
  deleteProjectSharesByUserIdClickhouse,
  getIPFromHeaders,
  getProjectsClickhouse,
} from '../common/utils'
import {
  findProjectShareClickhouse,
  findProjectSharesByUserClickhouse,
  updateProjectShareClickhouse,
  deleteProjectShareClickhouse,
} from '../common/utils'
import { MailerService } from '../mailer/mailer.service'
import { AuthService } from '../auth/auth.service'
import { LetterTemplate } from '../mailer/letter'
//
import { Request } from 'express'
import { Req } from '@nestjs/common'
import { redis } from '../common/constants'
import { ProjectService } from '../project/project.service'
import { clickhouse } from '../common/integrations/clickhouse'
import { Auth } from '../auth/decorators'

@ApiTags('User')
@Controller('user')
@Auth()
export class UserController {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly userService: UserService,
    private readonly mailerService: MailerService,
    private readonly authService: AuthService,
    private readonly projectService: ProjectService,
  ) {}

  @ApiBearerAuth()
  @Get('/me')
  async me(@CurrentUserId() uid: string) {
    this.logger.log({ uid }, 'GET /user/me')

    const [user, rawShares] = await Promise.all([
      this.userService.findOne({ id: uid }),
      findProjectSharesByUserClickhouse(uid),
    ])

    const sharedProjects = (rawShares || []).map((row: any) => ({
      id: row.id,
      confirmed: Boolean(row.confirmed),
      role: row.role,
      created: row.created,
      updated: row.updated,
      project: this.formatProjectFromRow(row),
      uiHidden: false,
    }))

    return {
      user: {
        ...this.userService.omitSensitiveData(user),
        sharedProjects,
        organisationMemberships: [],
      },
    }
  }

  private formatProjectFromRow(row: any) {
    return {
      id: row.projectId,
      name: row.projectName,
      origins: row.projectOrigins ? String(row.projectOrigins).split(',') : [],
      ipBlacklist: row.projectIpBlacklist
        ? String(row.projectIpBlacklist).split(',')
        : [],
      countryBlacklist: row.projectCountryBlacklist
        ? String(row.projectCountryBlacklist).split(',')
        : [],
      active: Boolean(row.projectActive),
      public: Boolean(row.projectPublic),
      isPasswordProtected: Boolean(row.projectIsPasswordProtected),
      botsProtectionLevel: row.projectBotsProtectionLevel,
      created: row.projectCreated,
      isAnalyticsProject: true,
      captchaSecretKey: null,
      uiHidden: false,
      funnels: [],
      isLocked: false,
      isDataExists: false,
      isErrorDataExists: false,
    }
  }

  @ApiBearerAuth()
  @Put('/live-visitors')
  async setShowLiveVisitors(
    @Body() body: SetShowLiveVisitorsDTO,
    @CurrentUserId() id: string,
  ) {
    const { show } = body

    try {
      await this.userService.update(id, {
        showLiveVisitorsInTitle: Number(show),
      })
    } catch (reason) {
      console.error(
        '[ERROR](setShowLiveVisitors) Failed to update current user',
        reason,
      )
      throw new BadRequestException(
        'An error occurred while updating live visitors user setting',
      )
    }

    return {
      showLiveVisitorsInTitle: show,
    }
  }

  @ApiBearerAuth()
  @Delete('/')
  @HttpCode(204)
  async deleteSelf(@CurrentUserId() id: string): Promise<any> {
    this.logger.log({ id }, 'DELETE /user')

    const user = await this.userService.findOne({
      id,
    })

    if (_isEmpty(user)) {
      throw new BadRequestException('User not found')
    }

    const chResults = await getProjectsClickhouse(id)
    const projects = _map(chResults, this.projectService.formatFromClickhouse)

    try {
      if (!_isEmpty(projects)) {
        const pidArray = projects.map(el => el.id)
        const queries = [
          'ALTER TABLE analytics DELETE WHERE pid IN ({pids:Array(FixedString(12))})',
          'ALTER TABLE customEV DELETE WHERE pid IN ({pids:Array(FixedString(12))})',
          'ALTER TABLE performance DELETE WHERE pid IN ({pids:Array(FixedString(12))})',
          'ALTER TABLE errors DELETE WHERE pid IN ({pids:Array(FixedString(12))})',
          'ALTER TABLE error_statuses DELETE WHERE pid IN ({pids:Array(FixedString(12))})',
        ]
        await deleteProjectsByUserIdClickhouse(id)
        const promises = _map(queries, async query =>
          clickhouse.command({
            query,
            query_params: { pids: pidArray },
          }),
        )
        await Promise.all(promises)
      }
      await deleteAllRefreshTokensClickhouse(id)
      await deleteProjectSharesByUserIdClickhouse(id)
      await this.userService.delete(id)
    } catch (reason) {
      this.logger.error(reason)
      throw new BadRequestException('accountDeleteError')
    }

    return 'accountDeleted'
  }

  @ApiBearerAuth()
  @Delete('/share/:actionId')
  @ApiResponse({ status: 204, description: 'Empty body' })
  async deleteShare(
    @CurrentUserId() uid: string,
    @Param('actionId') actionId: string,
  ) {
    this.logger.log({ uid, actionId }, 'DELETE /user/share/:actionId')

    const share = await findProjectShareClickhouse(actionId)

    if (_isEmpty(share)) {
      throw new BadRequestException(
        'This invitation does not exist or is no longer valid',
      )
    }

    if (share.userId !== uid) {
      throw new BadRequestException(
        'You are not allowed to reject this invitation',
      )
    }

    await deleteProjectShareClickhouse(actionId)
  }

  @ApiBearerAuth()
  @Get('/share/:actionId')
  @ApiResponse({ status: 204, description: 'Empty body' })
  async acceptShare(
    @CurrentUserId() uid: string,
    @Param('actionId') actionId: string,
  ) {
    this.logger.log({ uid, actionId }, 'GET /user/share/:actionId')

    const share = await findProjectShareClickhouse(actionId)

    if (_isEmpty(share)) {
      throw new BadRequestException(
        'This invitation does not exist or is no longer valid',
      )
    }

    if (share.userId !== uid) {
      throw new BadRequestException(
        'You are not allowed to accept this invitation',
      )
    }

    await updateProjectShareClickhouse(actionId, { confirmed: 1 })
  }

  @ApiBearerAuth()
  @Post('onboarding/step')
  @ApiResponse({ status: 204 })
  async updateOnboardingStep(
    @CurrentUserId() userId: string,
    @Body('step') step: OnboardingStep,
  ): Promise<void> {
    this.logger.log({ userId, step }, 'POST /user/onboarding/step')

    if (!Object.values(OnboardingStep).includes(step)) {
      throw new BadRequestException('Invalid onboarding step')
    }

    await this.userService.update(userId, {
      onboardingStep: step,
    })
  }

  @ApiBearerAuth()
  @Post('onboarding/complete')
  @ApiResponse({ status: 204 })
  async completeOnboarding(@CurrentUserId() userId: string): Promise<void> {
    this.logger.log({ userId }, 'POST /user/onboarding/complete')

    await this.userService.update(userId, {
      onboardingStep: OnboardingStep.COMPLETED,
      hasCompletedOnboarding: 1,
    })
  }

  @ApiBearerAuth()
  @Post('api-key')
  async generateApiKey(
    @CurrentUserId() userId: string,
    @Headers() headers,
    @Ip() reqIP,
  ) {
    this.logger.log({ userId }, 'POST /user/api-key')

    const ip = getIPFromHeaders(headers) || reqIP || ''

    await checkRateLimit(ip, 'generate-api-key', 5, 3600)

    const user = await this.userService.findOne({ id: userId })

    if (!user) {
      throw new BadRequestException('User not found')
    }

    if (!_isNull(user.apiKey)) {
      throw new ConflictException('You already have an API key')
    }

    const apiKey: string = randomUUID()

    await this.userService.update(userId, { apiKey })

    return { apiKey }
  }

  @ApiBearerAuth()
  @Delete('/api-key')
  async deleteApiKey(@CurrentUserId() userId: string) {
    this.logger.log({ userId }, 'DELETE /user/api-key')

    const user = await this.userService.findOne({ id: userId })

    if (!user) {
      throw new BadRequestException('User not found')
    }

    if (_isNull(user.apiKey)) {
      throw new ConflictException("You don't have an API key")
    }

    await this.userService.update(userId, { apiKey: null })
  }

  @ApiBearerAuth()
  @Put('/')
  async updateCurrentUser(
    @Body() userDTO: UpdateUserProfileDTO,
    @CurrentUserId() id: string,
    @Req() request: Request,
  ) {
    this.logger.log({ userDTO, id }, 'PUT /user')

    const originalUser = await this.userService.findOne({ id })

    if (!originalUser) {
      throw new BadRequestException('User not found')
    }

    try {
      if (userDTO.password && typeof userDTO.password === 'string') {
        this.userService.validatePassword(userDTO.password)

        const hashed = await this.authService.hashPassword(userDTO.password)
        await this.userService.update(id, { password: hashed })

        await this.mailerService.sendEmail(
          originalUser.email,
          LetterTemplate.PasswordChanged,
        )
        await this.authService.logoutAll(id)
      }

      if (userDTO.email && userDTO.email !== originalUser.email) {
        const userWithByEmail = await this.userService.findOne({
          email: userDTO.email,
        })

        if (userWithByEmail) {
          throw new BadRequestException('User with this email already exists')
        }

        await checkRateLimit(id, 'change-email', 5, 3600)

        // TODO: Change this if we introduce CLIENT_URL in CE as .env variable
        const urlBase = request.headers.origin || ''

        const token = randomUUID()
        const url = `${urlBase}/change-email/${token}`

        await this.mailerService.sendEmail(
          originalUser.email,
          LetterTemplate.MailAddressChangeConfirmation,
          { url },
        )

        await redis.set(`email_change:${token}`, userDTO.email, 'EX', 60 * 60)
      }

      await this.userService.update(id, {
        timeFormat: userDTO.timeFormat,
        timezone: userDTO.timezone,
      })

      const updated = await this.userService.findOne({ id })
      return {
        ...this.userService.omitSensitiveData(updated),
      }
    } catch (reason) {
      console.error(
        '[ERROR](updateCurrentUser) Failed to update current user',
        reason,
      )
      throw new BadRequestException('An error occurred while updating user')
    }
  }
}
