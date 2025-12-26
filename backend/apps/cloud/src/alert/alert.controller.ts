import {
  Controller,
  Get,
  Put,
  Delete,
  Query,
  Param,
  Body,
  NotFoundException,
  Post,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
  ParseIntPipe,
  ParseUUIDPipe,
  Ip,
  Headers,
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
import { ACCOUNT_PLANS, PlanCode } from '../user/entities/user.entity'
import { Auth } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { Alert } from './entity/alert.entity'
import {
  AlertDTO,
  CreateAlertDTO,
  QueryMetric,
  QueryCondition,
  QueryTime,
} from './dto/alert.dto'
import { AlertService } from './alert.service'
import { getIPFromHeaders } from '../common/utils'
import { trackCustom } from '../common/analytics'

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
  @Auth()
  @ApiResponse({ status: 200, type: Alert })
  async getAlert(
    @CurrentUserId() userId: string,
    @Param('alertId', new ParseUUIDPipe({ version: '4' })) alertId: string,
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
  @Auth()
  @ApiResponse({ status: 200, type: Alert })
  async getProjectAlerts(
    @CurrentUserId() userId: string,
    @Param('projectId') projectId: string,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
  ) {
    this.logger.log(
      { userId, projectId, take, skip },
      'GET /alert/project/:projectId',
    )

    const project = await this.projectService.getFullProject(projectId)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, userId)

    const safeTake = Math.min(Math.max(take ?? 100, 1), 100)
    const safeSkip = Math.max(skip ?? 0, 0)

    const result = await this.alertService.paginate(
      { take: safeTake, skip: safeSkip },
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
  @Auth()
  @ApiResponse({ status: 201, type: Alert })
  async createAlert(
    @Body() alertDTO: CreateAlertDTO,
    @CurrentUserId() uid: string,
    @Headers() headers: Record<string, string>,
    @Ip() requestIp: string,
  ) {
    this.logger.log({ uid }, 'POST /alert')

    const ip = getIPFromHeaders(headers) || requestIp || ''

    const user = await this.userService.findOne({
      where: { id: uid },
      relations: ['projects'],
    })

    if (_isEmpty(user)) {
      throw new ForbiddenException('User not found')
    }

    const maxAlerts = ACCOUNT_PLANS[user.planCode]?.maxAlerts ?? ALERTS_MAXIMUM

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
      'You are not allowed to add alerts to this project',
    )

    const pids = _map(user.projects, userProject => userProject.id)
    const alertsCount = await this.alertService.count({
      where: { project: { id: In(pids) } },
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

    if (alertsCount >= maxAlerts) {
      throw new HttpException(
        `You cannot create more than ${maxAlerts} alerts on your account plan. Please upgrade to be able to create more alerts.`,
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    try {
      const alert: Partial<Alert> = {
        name: alertDTO.name,
        queryMetric: alertDTO.queryMetric,
        queryCondition: alertDTO.queryCondition ?? null,
        queryValue: alertDTO.queryValue ?? null,
        queryTime: alertDTO.queryTime ?? null,
        active: alertDTO.active ?? true,
        queryCustomEvent: alertDTO.queryCustomEvent ?? null,
        alertOnNewErrorsOnly: alertDTO.alertOnNewErrorsOnly ?? true,
        alertOnEveryCustomEvent: alertDTO.alertOnEveryCustomEvent ?? false,
        project,
      }

      if (alertDTO.queryMetric === QueryMetric.ERRORS) {
        alert.queryCondition = null
        alert.queryValue = null
        alert.queryTime = null
      } else if (
        alertDTO.queryMetric === QueryMetric.CUSTOM_EVENTS &&
        alertDTO.alertOnEveryCustomEvent
      ) {
        alert.queryCondition = null
        alert.queryValue = null
        alert.queryTime = null
      } else {
        if (
          alertDTO.queryMetric === QueryMetric.CUSTOM_EVENTS &&
          _isEmpty(alertDTO.queryCustomEvent)
        ) {
          throw new BadRequestException(
            'queryCustomEvent is required when queryMetric is custom_events',
          )
        }
        if (alertDTO.queryCondition === undefined)
          alert.queryCondition = QueryCondition.GREATER_THAN
        if (alertDTO.queryValue === undefined) alert.queryValue = 0
        if (alertDTO.queryTime === undefined)
          alert.queryTime = QueryTime.LAST_1_HOUR
      }

      const newAlert = await this.alertService.create(alert as Alert)

      await trackCustom(ip, headers['user-agent'], {
        ev: 'ALERT_CREATED',
        meta: {
          metric: alertDTO.queryMetric,
          condition: alertDTO.queryCondition,
          value: alertDTO.queryValue,
          time: alertDTO.queryTime,
        },
      })

      return {
        ...newAlert,
        pid: alertDTO.pid,
      }
    } catch (reason) {
      this.logger.error(
        { uid, reason },
        'Error while creating alert',
        AlertController.name,
      )
      throw new BadRequestException('Error occurred while creating alert')
    }
  }

  @ApiBearerAuth()
  @Put('/:id')
  @Auth()
  @ApiResponse({ status: 200, type: Alert })
  async updateAlert(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() alertDTO: AlertDTO,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ id, uid }, 'PUT /alert/:id')

    let alert = await this.alertService.findOneWithRelations(id)

    if (_isEmpty(alert)) {
      throw new NotFoundException()
    }

    this.projectService.allowedToManage(
      alert.project,
      uid,
      'You are not allowed to manage this alert',
    )

    const updatePayload: Partial<Alert> = {
      ..._pick(alertDTO, [
        'queryMetric',
        'name',
        'queryCustomEvent',
        'alertOnNewErrorsOnly',
        'alertOnEveryCustomEvent',
        'active',
      ]),
    }

    if (alertDTO.queryMetric === QueryMetric.ERRORS) {
      updatePayload.queryCondition = null
      updatePayload.queryValue = null
      updatePayload.queryTime = null
    } else if (
      alertDTO.queryMetric === QueryMetric.CUSTOM_EVENTS &&
      alertDTO.alertOnEveryCustomEvent
    ) {
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

    if (alertDTO.alertOnEveryCustomEvent !== undefined) {
      updatePayload.alertOnEveryCustomEvent = alertDTO.alertOnEveryCustomEvent
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
  @Auth()
  @ApiResponse({ status: 204, description: 'Empty body' })
  async deleteAlert(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUserId() uid: string,
    @Headers() headers: Record<string, string>,
    @Ip() requestIp: string,
  ) {
    this.logger.log({ id, uid }, 'DELETE /alert/:id')

    const ip = getIPFromHeaders(headers) || requestIp || ''

    const alert = await this.alertService.findOneWithRelations(id)

    if (_isEmpty(alert)) {
      throw new NotFoundException()
    }

    this.projectService.allowedToManage(
      alert.project,
      uid,
      'You are not allowed to manage this alert',
    )

    await this.alertService.delete(id)

    await trackCustom(ip, headers['user-agent'], {
      ev: 'ALERT_DELETED',
    })
  }
}
