import {
  Controller,
  Get,
  Put,
  UseGuards,
  Body,
  BadRequestException,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import * as _omit from 'lodash/omit'

import { JwtAccessTokenGuard } from '../auth/guards'
import {
  UserType,
  SelfhostedUser,
  generateSelfhostedUser,
  getSelfhostedUser,
} from './entities/user.entity'
import { UpdateUserProfileDTO } from './dto/update-user.dto'
import { SetShowLiveVisitorsDTO } from './dto/set-show-live-visitors.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { AppLoggerService } from '../logger/logger.service'
import { updateUserClickhouse, getUserClickhouse } from '../common/utils'

@ApiTags('User')
@Controller('user')
@UseGuards(JwtAccessTokenGuard, RolesGuard)
export class UserController {
  constructor(private readonly logger: AppLoggerService) {}

  @ApiBearerAuth()
  @Get('/me')
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async me(@CurrentUserId() user_id: string): Promise<SelfhostedUser> {
    this.logger.log({ user_id }, 'GET /user/me')

    return getSelfhostedUser()
  }

  @ApiBearerAuth()
  @Put('/live-visitors')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async setShowLiveVisitors(
    @Body() body: SetShowLiveVisitorsDTO,
  ): Promise<Partial<SelfhostedUser>> {
    const { show } = body

    try {
      await updateUserClickhouse({
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
  @Put('/')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async updateCurrentUser(
    @Body() userDTO: UpdateUserProfileDTO,
    @CurrentUserId() id: string,
  ): Promise<SelfhostedUser> {
    this.logger.log({ userDTO, id }, 'PUT /user')

    try {
      await updateUserClickhouse({
        timeFormat: userDTO.timeFormat,
        timezone: userDTO.timezone,
      })

      const user = generateSelfhostedUser()
      const settings = _omit((await getUserClickhouse()) || {}, ['id'])

      return {
        ...user,
        ...settings,
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
