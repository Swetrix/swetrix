import {
  Controller,
  Get,
  Put,
  UseGuards,
  Body,
  BadRequestException,
  Post,
  Headers,
  Ip,
  ConflictException,
  Delete,
  Param,
} from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import _isEmpty from 'lodash/isEmpty'
import _omit from 'lodash/omit'
import _isNull from 'lodash/isNull'
import { v4 as uuidv4 } from 'uuid'

import { JwtAccessTokenGuard } from '../auth/guards'
import { OnboardingStep, UserType } from './entities/user.entity'
import { UpdateUserProfileDTO } from './dto/update-user.dto'
import { SetShowLiveVisitorsDTO } from './dto/set-show-live-visitors.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { AppLoggerService } from '../logger/logger.service'
import { UserService } from './user.service'
import { checkRateLimit, getIPFromHeaders } from '../common/utils'
import {
  findProjectShareClickhouse,
  findProjectSharesByUserClickhouse,
  updateProjectShareClickhouse,
  deleteProjectShareClickhouse,
} from '../common/utils'

@ApiTags('User')
@Controller('user')
@UseGuards(JwtAccessTokenGuard, RolesGuard)
export class UserController {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly userService: UserService,
  ) {}

  @ApiBearerAuth()
  @Get('/me')
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
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
      active: Boolean(row.projectActive),
      public: Boolean(row.projectPublic),
      isPasswordProtected: Boolean(row.projectIsPasswordProtected),
      botsProtectionLevel: row.projectBotsProtectionLevel,
      created: row.projectCreated,
      isAnalyticsProject: true,
      isCaptchaProject: false,
      isCaptchaEnabled: false,
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
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
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
  @Delete('/share/:actionId')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
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
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
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
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
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
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
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
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
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

    const apiKey: string = uuidv4()

    await this.userService.update(userId, { apiKey })

    return { apiKey }
  }

  @ApiBearerAuth()
  @Delete('/api-key')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
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
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async updateCurrentUser(
    @Body() userDTO: UpdateUserProfileDTO,
    @CurrentUserId() id: string,
  ) {
    this.logger.log({ userDTO, id }, 'PUT /user')

    const originalUser = await this.userService.findOne({ id })

    if (!originalUser) {
      throw new BadRequestException('User not found')
    }

    try {
      const user = await this.userService.update(id, {
        timeFormat: userDTO.timeFormat,
        timezone: userDTO.timezone,
      })

      return {
        ...this.userService.omitSensitiveData(user),
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
