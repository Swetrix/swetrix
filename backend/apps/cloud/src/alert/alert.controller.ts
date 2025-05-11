import {
  Controller,
  Get,
  Put,
  Delete,
  UseGuards,
  Query,
  Param,
  Body,
  NotFoundException,
  Post,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { In } from 'typeorm'
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _omit from 'lodash/omit'
import _pick from 'lodash/pick'

import { UserService } from '../user/user.service'
import { ProjectService } from '../project/project.service'
import { AppLoggerService } from '../logger/logger.service'
import { UserType, ACCOUNT_PLANS, PlanCode } from '../user/entities/user.entity'
import { JwtAccessTokenGuard } from '../auth/guards'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { Alert } from './entity/alert.entity'
import {
  AlertDTO,
  CreateAlertDTO,
  QueryMetric,
  QueryCondition,
  QueryTime,
} from './dto/alert.dto'
import { RolesGuard } from '../auth/guards/roles.guard'
import { AlertService } from './alert.service'

const ALERTS_MAXIMUM = ACCOUNT_PLANS[PlanCode.free].maxAlerts

@ApiTags('Alert')
@Controller('alert')
export class AlertController {
  constructor(
    private readonly alertService: AlertService,
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
    private readonly userService: UserService,
  ) {}

  @ApiBearerAuth()
  @Get('/:alertId')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.CUSTOMER)
  @ApiResponse({ status: 200, type: Alert })
  async getAlert(
    @CurrentUserId() userId: string,
    @Param('alertId') alertId: string,
  ) {
    this.logger.log({ userId, alertId }, 'GET /alert/:alertId')

    const alert = await this.alertService.findOne({
      where: { id: alertId },
      relations: ['project'],
    })

    if (_isEmpty(alert)) {
      throw new NotFoundException('Alert not found')
    }

    const project = await this.projectService.getFullProject(alert.project.id)

    this.projectService.allowedToView(project, userId)

    return _omit(alert, ['project'])
  }

  @ApiBearerAuth()
  @Get('/project/:projectId')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.CUSTOMER)
  @ApiResponse({ status: 200, type: Alert })
  async getProjectAlerts(
    @CurrentUserId() userId: string,
    @Param('projectId') projectId: string,
    @Query('take') take: number | undefined,
    @Query('skip') skip: number | undefined,
  ) {
    this.logger.log({ userId, projectId, take, skip }, 'GET /alert/:projectId')

    const project = await this.projectService.getFullProject(projectId)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, userId)

    const result = await this.alertService.paginate(
      { take, skip },
      { project: { id: projectId } },
      ['project'],
    )

    // @ts-expect-error
    result.results = _map(result.results, alert => ({
      ..._omit(alert, ['project']),
      pid: alert.project.id,
    }))

    return result
  }

  @ApiBearerAuth()
  @Post('/')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.CUSTOMER)
  @ApiResponse({ status: 201, type: Alert })
  async createAlert(
    @Body() alertDTO: CreateAlertDTO,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ uid }, 'POST /alert')

    const user = await this.userService.findOne({
      where: { id: uid },
      relations: ['projects'],
    })

    const maxAlerts = ACCOUNT_PLANS[user.planCode]?.maxAlerts

    if (!user.isActive) {
      throw new ForbiddenException('Please, verify your email address first')
    }

    const project = await this.projectService.findOne({
      where: {
        id: alertDTO.pid,
      },
      relations: ['alerts', 'admin'],
    })

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToManage(
      project,
      uid,
      user.roles,
      'You are not allowed to add alerts to this project',
    )

    const pids = _map(user.projects, userProject => userProject.id)
    const alertsCount = await this.alertService.count({
      where: { project: In(pids) },
    })

    if (user.planCode === PlanCode.none) {
      throw new HttpException(
        'You cannot create new alerts due to no active subscription. Please upgrade your account plan to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    if (user.isAccountBillingSuspended) {
      throw new HttpException(
        'The account that owns this site is currently suspended, this is because of a billing issue. Please resolve the issue to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    if (alertsCount >= (maxAlerts || ALERTS_MAXIMUM)) {
      throw new HttpException(
        `You cannot create more than ${maxAlerts} alerts on your account plan. Please upgrade to be able to create more alerts.`,
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    try {
      let alert = new Alert() as Partial<Alert>
      Object.assign(alert, alertDTO)
      alert = _omit(alert, ['pid'])

      if (alertDTO.queryMetric === QueryMetric.ERRORS) {
        alert.queryCondition = null
        alert.queryValue = null
        alert.queryTime = null
      } else {
        if (alertDTO.queryCondition === undefined)
          alert.queryCondition = QueryCondition.GREATER_THAN
        if (alertDTO.queryValue === undefined) alert.queryValue = 0
        if (alertDTO.queryTime === undefined)
          alert.queryTime = QueryTime.LAST_1_HOUR
      }

      if (alertDTO.alertOnNewErrorsOnly === undefined) {
        alert.alertOnNewErrorsOnly = true
      }

      const newAlert = await this.alertService.create(alert)

      project.alerts.push(newAlert)

      await this.projectService.create(project)

      return {
        ...newAlert,
        pid: alertDTO.pid,
      }
    } catch (reason) {
      console.error('Error while creating alert', reason)
      throw new BadRequestException('Error occured while creating alert')
    }
  }

  @ApiBearerAuth()
  @Put('/:id')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
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

    const user = await this.userService.findOne({ where: { id: uid } })

    this.projectService.allowedToManage(
      alert.project,
      uid,
      user.roles,
      'You are not allowed to manage this alert',
    )

    const updatePayload: Partial<Alert> = {
      ..._pick(alertDTO, [
        'queryMetric',
        'name',
        'queryCustomEvent',
        'alertOnNewErrorsOnly',
        'active',
      ]),
    }

    if (alertDTO.queryMetric === QueryMetric.ERRORS) {
      updatePayload.queryCondition = null
      updatePayload.queryValue = null
      updatePayload.queryTime = null
    } else {
      if (alertDTO.queryCondition !== undefined)
        updatePayload.queryCondition = alertDTO.queryCondition
      if (alertDTO.queryValue !== undefined)
        updatePayload.queryValue = alertDTO.queryValue
      if (alertDTO.queryTime !== undefined)
        updatePayload.queryTime = alertDTO.queryTime
    }

    if (alertDTO.alertOnNewErrorsOnly !== undefined) {
      updatePayload.alertOnNewErrorsOnly = alertDTO.alertOnNewErrorsOnly
    }

    await this.alertService.update(
      id,
      _omit(updatePayload, ['project', 'lastTriggered']),
    )

    const updatedAlert = await this.alertService.findOne({ where: { id } })
    if (!updatedAlert)
      throw new NotFoundException('Alert not found after update')

    return {
      ..._omit(updatedAlert, ['project']),
      pid: alert.project.id,
    }
  }

  @ApiBearerAuth()
  @Delete('/:id')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.CUSTOMER)
  @ApiResponse({ status: 204, description: 'Empty body' })
  async deleteAlert(@Param('id') id: string, @CurrentUserId() uid: string) {
    this.logger.log({ id, uid }, 'DELETE /alert/:id')

    const alert = await this.alertService.findOneWithRelations(id)

    if (_isEmpty(alert)) {
      throw new NotFoundException()
    }

    const user = await this.userService.findOne({ where: { id: uid } })

    this.projectService.allowedToManage(
      alert.project,
      uid,
      user.roles,
      'You are not allowed to manage this alert',
    )

    await this.alertService.delete(id)
  }
}
