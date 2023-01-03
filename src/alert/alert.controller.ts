import {
  Controller, Get, Put, Delete, UseGuards, Query, Param, Body, NotFoundException,
} from '@nestjs/common'
import { In } from 'typeorm'
import { ApiTags, ApiResponse } from '@nestjs/swagger'
import { AlertService } from './alert.service'
import { SelfhostedGuard } from '../common/guards/selfhosted.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import * as _isEmpty from 'lodash/isEmpty'
import * as _map from 'lodash/map'
import * as _omit from 'lodash/omit'

import { UserService } from 'src/user/user.service'
import { ProjectService } from 'src/project/project.service'
import { AppLoggerService } from 'src/logger/logger.service'
import { CurrentUserId } from '../common/decorators/current-user-id.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { UserType } from 'src/user/entities/user.entity'
import { Alert } from './entity/alert.entity'
import { AlertDTO } from './dto/alert.dto'

@ApiTags('Alert')
@Controller('alert')
export class AlertController {
  constructor(
    private readonly alertService: AlertService,
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
    private readonly userService: UserService,
  ) { }

  @Get('/')
  @UseGuards(SelfhostedGuard)
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN, UserType.CUSTOMER)
  @ApiResponse({ status: 200, type: Alert })
  async getAllAlerts(
    @CurrentUserId() userId: string,
    @Query('take') take: number | undefined,
    @Query('skip') skip: number | undefined,
  ) {
    this.logger.log({ userId, take, skip }, 'GET /alert')

    const projects = await this.projectService.findWhere({ admin: userId })

    if (_isEmpty(projects)) {
      return []
    }

    const pids = _map(projects, (project) => project.id)

    return this.alertService.paginate({ take, skip }, { project: In(pids) })
  }

  @Put('/:id')
  @UseGuards(SelfhostedGuard)
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN, UserType.CUSTOMER)
  @ApiResponse({ status: 200, type: Alert })
  async updateAlert(
    @Param('id') id: string,
    @Body() alertDTO: AlertDTO,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ id, uid }, 'PUT /alert/:id')

    let alert = await this.alertService.findOneWithRelations(id)

    if (_isEmpty(alert)) {
      throw new NotFoundException()
    }

    const user = await this.userService.findOne(uid)

    this.projectService.allowedToManage(alert.project, uid, user.roles, 'You are not allowed to manage this alert')

    alert = {
      ...alert,
      ...alertDTO,
    }

    await this.alertService.update(id, _omit(alert, ['project', 'lastTriggered']))

    return alert
  }

  @Delete('/:id')
  @UseGuards(SelfhostedGuard)
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN, UserType.CUSTOMER)
  @ApiResponse({ status: 204, description: 'Empty body' })
  async deleteAlert(
    @Param('id') id: string,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ id, uid }, 'DELETE /alert/:id')

    let alert = await this.alertService.findOneWithRelations(id)

    if (_isEmpty(alert)) {
      throw new NotFoundException()
    }

    const user = await this.userService.findOne(uid)

    this.projectService.allowedToManage(alert.project, uid, user.roles, 'You are not allowed to manage this alert')

    await this.alertService.delete(id)
  }
}
