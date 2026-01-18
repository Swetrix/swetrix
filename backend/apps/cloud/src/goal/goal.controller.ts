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
  Ip,
  Headers,
} from '@nestjs/common'
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _omit from 'lodash/omit'
import _pick from 'lodash/pick'
import _round from 'lodash/round'
import dayjs from 'dayjs'

import { UserService } from '../user/user.service'
import { ProjectService } from '../project/project.service'
import { AppLoggerService } from '../logger/logger.service'
import { PlanCode } from '../user/entities/user.entity'
import {
  AnalyticsService,
  getLowestPossibleTimeBucket,
} from '../analytics/analytics.service'
import { Auth } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { Goal, GoalType, GoalMatchType } from './entity/goal.entity'
import {
  CreateGoalDto,
  UpdateGoalDto,
  GoalDto,
  GoalStatsDto,
} from './dto/goal.dto'
import { GoalService } from './goal.service'
import { clickhouse } from '../common/integrations/clickhouse'
import { getIPFromHeaders } from '../common/utils'
import { trackCustom } from '../common/analytics'

const GOALS_MAXIMUM = 50 // Maximum goals per project

const timeBucketConversion: Record<string, string> = Object.assign(
  Object.create(null),
  {
    minute: 'toStartOfMinute',
    hour: 'toStartOfHour',
    day: 'toStartOfDay',
    month: 'toStartOfMonth',
    year: 'toStartOfYear',
  },
)

const DEFAULT_TAKE = 100
const MAX_TAKE = 250
const MAX_SKIP = 50_000

const clampPagination = (take?: number, skip?: number) => {
  const safeTake =
    typeof take === 'number' && Number.isFinite(take)
      ? Math.min(Math.max(take, 1), MAX_TAKE)
      : DEFAULT_TAKE
  const safeSkip =
    typeof skip === 'number' && Number.isFinite(skip)
      ? Math.min(Math.max(skip, 0), MAX_SKIP)
      : 0

  return { take: safeTake, skip: safeSkip }
}

@ApiTags('Goal')
@Controller('goal')
export class GoalController {
  constructor(
    private readonly goalService: GoalService,
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
    private readonly userService: UserService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @ApiBearerAuth()
  @Get('/:goalId')
  @Auth(true, true)
  @ApiResponse({ status: 200, type: Goal })
  async getGoal(
    @CurrentUserId() userId: string,
    @Param('goalId') goalId: string,
  ) {
    this.logger.log({ userId, goalId }, 'GET /goal/:goalId')

    const goal = await this.goalService.findOne({
      where: { id: goalId },
      relations: ['project'],
    })

    if (_isEmpty(goal)) {
      throw new NotFoundException('Goal not found')
    }

    const project = await this.projectService.getFullProject(goal.project.id)

    this.projectService.allowedToView(project, userId)

    return {
      ..._omit(goal, ['project']),
      pid: goal.project.id,
    }
  }

  @ApiBearerAuth()
  @Get('/project/:projectId')
  @Auth(true, true)
  @ApiResponse({ status: 200, type: [GoalDto] })
  async getProjectGoals(
    @CurrentUserId() userId: string,
    @Param('projectId') projectId: string,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('search') search?: string,
  ) {
    this.logger.log(
      { userId, projectId, take, skip, search },
      'GET /goal/project/:projectId',
    )

    const project = await this.projectService.getFullProject(projectId)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, userId)

    const { take: safeTake, skip: safeSkip } = clampPagination(take, skip)

    const result = await this.goalService.paginate(
      { take: safeTake, skip: safeSkip },
      { project: { id: projectId } },
      ['project'],
      search,
    )

    // @ts-expect-error
    result.results = _map(result.results, (goal) => ({
      ..._omit(goal, ['project']),
      pid: goal.project.id,
    }))

    return result
  }

  @ApiBearerAuth()
  @Post('/')
  @Auth()
  @ApiResponse({ status: 201, type: GoalDto })
  async createGoal(
    @Body() goalDto: CreateGoalDto,
    @CurrentUserId() uid: string,
    @Headers() headers: Record<string, string>,
    @Ip() requestIp: string,
  ) {
    this.logger.log({ uid, pid: goalDto.pid }, 'POST /goal')

    const ip = getIPFromHeaders(headers) || requestIp || ''

    const user = await this.userService.findOne({
      where: { id: uid },
      relations: ['projects'],
    })

    if (!user.isActive) {
      throw new ForbiddenException('Please, verify your email address first')
    }

    const project = await this.projectService.findOne({
      where: {
        id: goalDto.pid,
      },
      relations: ['goals', 'admin'],
    })

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToManage(
      project,
      uid,
      'You are not allowed to add goals to this project',
    )

    const goalsCount = await this.goalService.count({
      where: { project: { id: goalDto.pid } },
    })

    if (user.planCode === PlanCode.none) {
      throw new HttpException(
        'You cannot create new goals due to no active subscription. Please upgrade your account plan to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    if (user.isAccountBillingSuspended) {
      throw new HttpException(
        'The account that owns this site is currently suspended, this is because of a billing issue. Please resolve the issue to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    if (goalsCount >= GOALS_MAXIMUM) {
      throw new HttpException(
        `You cannot create more than ${GOALS_MAXIMUM} goals per project.`,
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    try {
      const goal = new Goal()
      goal.name = goalDto.name
      goal.type = goalDto.type
      goal.matchType = goalDto.matchType
      goal.value = goalDto.value || null
      goal.metadataFilters = goalDto.metadataFilters || null
      goal.project = project

      const newGoal = await this.goalService.create(goal)

      await trackCustom(ip, headers['user-agent'], {
        ev: 'GOAL_CREATED',
        meta: {
          type: goalDto.type,
          matchType: goalDto.matchType,
          metadataFiltersExist: !!goalDto.metadataFilters?.length,
        },
      })

      return {
        ..._omit(newGoal, ['project']),
        pid: goalDto.pid,
      }
    } catch (reason) {
      this.logger.error({ reason }, 'Error while creating goal')
      throw new BadRequestException('Error occurred while creating goal')
    }
  }

  @ApiBearerAuth()
  @Put('/:id')
  @Auth()
  @ApiResponse({ status: 200, type: GoalDto })
  async updateGoal(
    @Param('id') id: string,
    @Body() goalDto: UpdateGoalDto,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ id, uid }, 'PUT /goal/:id')

    const goal = await this.goalService.findOneWithRelations(id)

    if (_isEmpty(goal)) {
      throw new NotFoundException()
    }

    this.projectService.allowedToManage(
      goal.project,
      uid,
      'You are not allowed to manage this goal',
    )

    const updatePayload: Partial<Goal> = {
      ..._pick(goalDto, [
        'name',
        'type',
        'matchType',
        'value',
        'metadataFilters',
        'active',
      ]),
    }

    await this.goalService.update(id, updatePayload)

    const updatedGoal = await this.goalService.findOne({ where: { id } })
    if (!updatedGoal) {
      throw new NotFoundException('Goal not found after update')
    }

    return {
      ..._omit(updatedGoal, ['project']),
      pid: goal.project.id,
    }
  }

  @ApiBearerAuth()
  @Delete('/:id')
  @Auth()
  @ApiResponse({ status: 204, description: 'Empty body' })
  async deleteGoal(
    @Param('id') id: string,
    @CurrentUserId() uid: string,
    @Headers() headers: Record<string, string>,
    @Ip() requestIp: string,
  ) {
    this.logger.log({ id, uid }, 'DELETE /goal/:id')

    const ip = getIPFromHeaders(headers) || requestIp || ''

    const goal = await this.goalService.findOneWithRelations(id)

    if (_isEmpty(goal)) {
      throw new NotFoundException()
    }

    this.projectService.allowedToManage(
      goal.project,
      uid,
      'You are not allowed to manage this goal',
    )

    await this.goalService.delete(id)

    await trackCustom(ip, headers['user-agent'], {
      ev: 'GOAL_DELETED',
    })
  }

  private buildGoalMatchCondition(
    goal: Goal,
    _table: 'analytics' | 'customEV',
  ): { condition: string; params: Record<string, string> } {
    const params: Record<string, string> = {}

    if (goal.type === GoalType.CUSTOM_EVENT) {
      // For custom events, match the event name
      if (goal.matchType === GoalMatchType.EXACT) {
        params.goalValue = goal.value || ''
        return { condition: `ev = {goalValue:String}`, params }
      } else {
        // Contains match
        params.goalValue = goal.value || ''
        return {
          condition: `ev ILIKE concat('%', {goalValue:String}, '%')`,
          params,
        }
      }
    } else {
      // For pageview goals, match the page path
      if (goal.matchType === GoalMatchType.EXACT) {
        params.goalValue = goal.value || ''
        return { condition: `pg = {goalValue:String}`, params }
      } else {
        // Contains match
        params.goalValue = goal.value || ''
        return {
          condition: `pg ILIKE concat('%', {goalValue:String}, '%')`,
          params,
        }
      }
    }
  }

  private buildMetadataCondition(goal: Goal): {
    condition: string
    params: Record<string, string>
  } {
    if (!goal.metadataFilters || goal.metadataFilters.length === 0) {
      return { condition: '', params: {} }
    }

    const conditions: string[] = []
    const params: Record<string, string> = {}

    goal.metadataFilters.forEach((filter, index) => {
      const keyParam = `metaKey${index}`
      const valueParam = `metaValue${index}`
      params[keyParam] = filter.key
      params[valueParam] = filter.value
      conditions.push(
        `has(meta.key, {${keyParam}:String}) AND meta.value[indexOf(meta.key, {${keyParam}:String})] = {${valueParam}:String}`,
      )
    })

    return {
      condition:
        conditions.length > 0 ? `AND (${conditions.join(' AND ')})` : '',
      params,
    }
  }

  @ApiBearerAuth()
  @Get('/:id/stats')
  @Auth(true, true)
  @ApiResponse({ status: 200, type: GoalStatsDto })
  async getGoalStats(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Query('period') period: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('timezone') timezone?: string,
  ) {
    this.logger.log({ userId, id, period, from, to }, 'GET /goal/:id/stats')

    const goal = await this.goalService.findOneWithRelations(id)

    if (_isEmpty(goal)) {
      throw new NotFoundException('Goal not found')
    }

    const project = await this.projectService.getFullProject(goal.project.id)
    this.projectService.allowedToView(project, userId)

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
    const timeBucket = getLowestPossibleTimeBucket(period, from, to)

    const { groupFromUTC, groupToUTC } = this.analyticsService.getGroupFromTo(
      from,
      to,
      timeBucket,
      period,
      safeTimezone,
    )

    const table = goal.type === GoalType.CUSTOM_EVENT ? 'customEV' : 'analytics'
    const { condition: matchCondition, params: matchParams } =
      this.buildGoalMatchCondition(goal, table)
    const { condition: metaCondition, params: metaParams } =
      this.buildMetadataCondition(goal)

    // Get conversions for current period
    const conversionsQuery = `
      SELECT 
        count(*) as conversions,
        uniqExact(psid) as uniqueSessions
      FROM ${table}
      WHERE 
        pid = {pid:FixedString(12)}
        AND ${matchCondition}
        ${metaCondition}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
    `

    const queryParams = {
      pid: goal.project.id,
      groupFrom: groupFromUTC,
      groupTo: groupToUTC,
      ...matchParams,
      ...metaParams,
    }

    const { data: conversionsData } = await clickhouse
      .query({ query: conversionsQuery, query_params: queryParams })
      .then((resultSet) =>
        resultSet.json<{ conversions: number; uniqueSessions: number }>(),
      )

    const conversions = conversionsData[0]?.conversions || 0
    const uniqueSessions = conversionsData[0]?.uniqueSessions || 0

    // Get total unique sessions for conversion rate
    const totalSessionsQuery = `
      SELECT uniqExact(psid) as totalSessions
      FROM analytics
      WHERE 
        pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
    `

    const { data: totalData } = await clickhouse
      .query({
        query: totalSessionsQuery,
        query_params: {
          pid: goal.project.id,
          groupFrom: groupFromUTC,
          groupTo: groupToUTC,
        },
      })
      .then((resultSet) => resultSet.json<{ totalSessions: number }>())

    const totalSessions = totalData[0]?.totalSessions || 1
    const conversionRate = _round((uniqueSessions / totalSessions) * 100, 2)

    // Get previous period conversions for trend
    const periodDays = dayjs(groupToUTC).diff(dayjs(groupFromUTC), 'day') || 1
    const previousFrom = dayjs(groupFromUTC)
      .subtract(periodDays, 'day')
      .format('YYYY-MM-DD HH:mm:ss')
    const previousTo = groupFromUTC

    const previousQueryParams = {
      pid: goal.project.id,
      groupFrom: previousFrom,
      groupTo: previousTo,
      ...matchParams,
      ...metaParams,
    }

    const { data: previousData } = await clickhouse
      .query({ query: conversionsQuery, query_params: previousQueryParams })
      .then((resultSet) =>
        resultSet.json<{ conversions: number; uniqueSessions: number }>(),
      )

    const previousConversions = previousData[0]?.conversions || 0
    const trend =
      previousConversions > 0
        ? _round(
            ((conversions - previousConversions) / previousConversions) * 100,
            2,
          )
        : conversions > 0
          ? 100
          : 0

    return {
      conversions,
      uniqueSessions,
      conversionRate,
      previousConversions,
      trend,
    }
  }

  private getGroupSubquery(
    timeBucket: string,
  ): [selector: string, groupBy: string] {
    if (timeBucket === 'minute') {
      return [
        'toYear(tz_created) as year, toMonth(tz_created) as month, toDayOfMonth(tz_created) as day, toHour(tz_created) as hour, toMinute(tz_created) as minute',
        'year, month, day, hour, minute',
      ]
    }

    if (timeBucket === 'hour') {
      return [
        'toYear(tz_created) as year, toMonth(tz_created) as month, toDayOfMonth(tz_created) as day, toHour(tz_created) as hour',
        'year, month, day, hour',
      ]
    }

    if (timeBucket === 'day') {
      return [
        'toYear(tz_created) as year, toMonth(tz_created) as month, toDayOfMonth(tz_created) as day',
        'year, month, day',
      ]
    }

    if (timeBucket === 'month') {
      return [
        'toYear(tz_created) as year, toMonth(tz_created) as month',
        'year, month',
      ]
    }

    // year
    return ['toYear(tz_created) as year', 'year']
  }

  private generateDateString(row: { [key: string]: number }): string {
    const { year, month, day, hour, minute } = row

    let dateString = `${year}`

    if (typeof month === 'number') {
      if (month < 10) {
        dateString += `-0${month}`
      } else {
        dateString += `-${month}`
      }
    }

    if (typeof day === 'number') {
      if (day < 10) {
        dateString += `-0${day}`
      } else {
        dateString += `-${day}`
      }
    }

    if (typeof hour === 'number') {
      const strMinute =
        typeof minute === 'number'
          ? minute < 10
            ? `0${minute}`
            : minute
          : '00'

      if (hour < 10) {
        dateString += ` 0${hour}:${strMinute}:00`
      } else {
        dateString += ` ${hour}:${strMinute}:00`
      }
    }

    return dateString
  }

  @ApiBearerAuth()
  @Get('/:id/chart')
  @Auth(true, true)
  async getGoalChart(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Query('period') period: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('timeBucket') timeBucket?: string,
    @Query('timezone') timezone?: string,
  ) {
    this.logger.log(
      { userId, id, period, from, to, timeBucket },
      'GET /goal/:id/chart',
    )

    const goal = await this.goalService.findOneWithRelations(id)

    if (_isEmpty(goal)) {
      throw new NotFoundException('Goal not found')
    }

    const project = await this.projectService.getFullProject(goal.project.id)
    this.projectService.allowedToView(project, userId)

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
    const resolvedTimeBucket =
      timeBucket || getLowestPossibleTimeBucket(period, from, to)

    const { groupFromUTC, groupToUTC } = this.analyticsService.getGroupFromTo(
      from,
      to,
      resolvedTimeBucket as any,
      period,
      safeTimezone,
    )

    // Generate complete X axis with all time buckets
    const { xShifted } = this.analyticsService.generateXAxis(
      resolvedTimeBucket as any,
      groupFromUTC,
      groupToUTC,
      safeTimezone,
    )

    const table = goal.type === GoalType.CUSTOM_EVENT ? 'customEV' : 'analytics'
    const timeBucketFunc = Object.prototype.hasOwnProperty.call(
      timeBucketConversion,
      resolvedTimeBucket,
    )
      ? timeBucketConversion[resolvedTimeBucket]
      : 'toStartOfDay'
    const [selector, groupBy] = this.getGroupSubquery(resolvedTimeBucket)

    const { condition: matchCondition, params: matchParams } =
      this.buildGoalMatchCondition(goal, table)
    const { condition: metaCondition, params: metaParams } =
      this.buildMetadataCondition(goal)

    const chartQuery = `
      SELECT
        ${selector},
        count(*) as conversions,
        uniqExact(psid) as uniqueSessions
      FROM (
        SELECT *,
          ${timeBucketFunc}(toTimeZone(created, {timezone:String})) as tz_created
        FROM ${table}
        WHERE
          pid = {pid:FixedString(12)}
          AND ${matchCondition}
          ${metaCondition}
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
      ) as subquery
      GROUP BY ${groupBy}
      ORDER BY ${groupBy}
    `

    const queryParams = {
      pid: goal.project.id,
      groupFrom: groupFromUTC,
      groupTo: groupToUTC,
      timezone: safeTimezone,
      ...matchParams,
      ...metaParams,
    }

    const { data } = await clickhouse
      .query({ query: chartQuery, query_params: queryParams })
      .then((resultSet) =>
        resultSet.json<{
          year: number
          month?: number
          day?: number
          hour?: number
          minute?: number
          conversions: number
          uniqueSessions: number
        }>(),
      )

    // Initialize arrays with zeros for all time buckets
    const conversions = Array(xShifted.length).fill(0)
    const uniqueSessions = Array(xShifted.length).fill(0)

    // Fill in actual data at the correct indices
    for (const row of data) {
      const dateString = this.generateDateString(row)
      const index = xShifted.indexOf(dateString)

      if (index !== -1) {
        conversions[index] = row.conversions
        uniqueSessions[index] = row.uniqueSessions
      }
    }

    return {
      chart: {
        x: xShifted,
        conversions,
        uniqueSessions,
      },
    }
  }
}
