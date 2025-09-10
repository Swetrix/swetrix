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
} from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
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

    const user = await this.userService.findOne({ id: uid })

    return {
      user: this.userService.omitSensitiveData(user),
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
