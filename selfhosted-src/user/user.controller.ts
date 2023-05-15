import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { JwtAccessTokenGuard } from 'selfhosted-src/auth/guards'
import {
  UserType,
  SelfhostedUser,
  generateSelfhostedUser,
} from './entities/user.entity'
import { Roles } from '../auth/decorators/roles.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { AppLoggerService } from '../logger/logger.service'

@ApiTags('User')
@Controller('user')
@UseGuards(JwtAccessTokenGuard, RolesGuard)
export class UserController {
  constructor(
    private readonly logger: AppLoggerService,
  ) {}

  @Get('/me')
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async me(@CurrentUserId() user_id: string): Promise<SelfhostedUser> {
    this.logger.log({ user_id }, 'GET /user/me')

    return generateSelfhostedUser()
  }
}
