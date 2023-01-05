import {
  Controller, Get, Put, Delete, UseGuards, Query, Param, Body, NotFoundException, Post, ForbiddenException, BadRequestException,
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
import { AlertDTO, CreateAlertDTO } from './dto/alert.dto'
import { ACCOUNT_PLANS, PlanCode } from 'src/user/entities/user.entity'

const ALERTS_MAXIMUM = ACCOUNT_PLANS[PlanCode.free].maxAlerts

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

    const result = this.alertService.paginate({ take, skip }, { project: In(pids) }, ['project'])

    return _map(result, (alert) => ({
      ..._omit(alert, ['project']),
      pid: alert.project.id,
    }))
  }

  @Post('/')
  @UseGuards(SelfhostedGuard)
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN, UserType.CUSTOMER)
  @ApiResponse({ status: 201, type: Alert })
  async createAlert(
    @Body() alertDTO: CreateAlertDTO,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ uid }, 'POST /alert')

    const user = await this.userService.findOneWithRelations(uid, [
      'projects',
    ])

    const maxAlerts = ACCOUNT_PLANS[user.planCode]?.maxAlerts

    if (!user.isActive) {
      throw new ForbiddenException('Please, verify your email address first')
    }

    const project = await this.projectService.findOneWhere({
      id: alertDTO.pid,
    }, {
      relations: ['alerts'],
    })

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToManage(project, uid, user.roles, 'You are not allowed to manage this project')

    const pids = _map(user.projects, (project) => project.id)
    const alertsCount = await this.alertService.count({ project: In(pids) })

    if (alertsCount >= (maxAlerts || ALERTS_MAXIMUM)) {
      throw new ForbiddenException(
        `You cannot create more than ${maxAlerts} alerts on your account plan. Please upgrade to be able to create more alerts.`,
      )
    }

    try {
      let alert = new Alert()
      Object.assign(alert, alertDTO)
      alert = _omit(alert, ['pid'])

      const newAlert = await this.alertService.create(alert)

      project.alerts.push(newAlert)

      await this.projectService.create(project)

      return newAlert
    } catch (e) {
      throw new BadRequestException(e)
    }
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
