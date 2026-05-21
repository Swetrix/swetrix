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
  BadRequestException,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _omit from 'lodash/omit'
import _pick from 'lodash/pick'
import _round from 'lodash/round'
import dayjs from 'dayjs'

import { ProjectService } from '../project/project.service'
import { AppLoggerService } from '../logger/logger.service'
import {
  AnalyticsService,
  DataType,
  getLowestPossibleTimeBucket,
} from '../analytics/analytics.service'
import { Auth } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import {
  Goal,
  GoalType,
  GoalMatchType,
  GoalCondition,
} from './entity/goal.entity'
import { CreateGoalDto, UpdateGoalDto } from './dto/goal.dto'
import { GoalService } from './goal.service'
import { clickhouse } from '../common/integrations/clickhouse'

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

const GOAL_CONDITION_COLUMNS: Record<string, string> = {
  page: 'pg',
  pg: 'pg',
  event: 'event_name',
  event_name: 'event_name',
  host: 'host',
  ref: 'ref',
  so: 'so',
  me: 'me',
  ca: 'ca',
  te: 'te',
  co: 'co',
  cc: 'cc',
  dv: 'dv',
  br: 'br',
  os: 'os',
}

type GoalBreakdownKey =
  | 'countries'
  | 'devices'
  | 'browsers'
  | 'sources'
  | 'campaigns'
  | 'pages'
  | 'profileTypes'

type GoalBreakdowns = Record<GoalBreakdownKey, Record<string, number>>

type TimeToConvertMetric = {
  average: number | null
  median: number | null
  p75: number | null
}

@Controller('goal')
export class GoalController {
  constructor(
    private readonly goalService: GoalService,
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('/:goalId')
  @Auth()
  async getGoal(
    @CurrentUserId() userId: string,
    @Param('goalId') goalId: string,
  ) {
    this.logger.log({ userId, goalId }, 'GET /goal/:goalId')

    const goal = await this.goalService.findOne(goalId)

    if (_isEmpty(goal)) {
      throw new NotFoundException('Goal not found')
    }

    const project = await this.projectService.getFullProject(goal.projectId)

    this.projectService.allowedToView(project, userId)

    return {
      ...goal,
      pid: goal.projectId,
    }
  }

  @Get('/project/:projectId')
  @Auth()
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
      projectId,
      search,
    )

    return {
      ...result,
      results: _map(result.results, (goal) => ({
        ...goal,
        pid: goal.projectId,
      })),
    }
  }

  @Post('/')
  @Auth()
  async createGoal(
    @Body() goalDto: CreateGoalDto,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ uid, pid: goalDto.pid }, 'POST /goal')

    const project = await this.projectService.getFullProject(goalDto.pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToManage(
      project,
      uid,
      'You are not allowed to add goals to this project',
    )

    const goalsCount = await this.goalService.count(goalDto.pid)

    if (goalsCount >= GOALS_MAXIMUM) {
      throw new BadRequestException(
        `You cannot create more than ${GOALS_MAXIMUM} goals per project.`,
      )
    }

    try {
      const newGoal = await this.goalService.create({
        name: goalDto.name,
        type: goalDto.type,
        matchType: goalDto.matchType,
        value: goalDto.value || null,
        metadataFilters: goalDto.metadataFilters || null,
        conditions: goalDto.conditions || null,
        projectId: goalDto.pid,
      })

      return {
        ...newGoal,
        pid: goalDto.pid,
      }
    } catch (reason) {
      this.logger.log({ reason }, 'Error while creating goal')
      throw new BadRequestException('Error occurred while creating goal')
    }
  }

  @Put('/:id')
  @Auth()
  async updateGoal(
    @Param('id') id: string,
    @Body() goalDto: UpdateGoalDto,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ id, uid }, 'PUT /goal/:id')

    const goal = await this.goalService.findOne(id)

    if (_isEmpty(goal)) {
      throw new NotFoundException()
    }

    const project = await this.projectService.getFullProject(goal.projectId)

    this.projectService.allowedToManage(
      project,
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
        'conditions',
        'active',
      ]),
    }

    const updatedGoal = await this.goalService.update(id, updatePayload)

    if (!updatedGoal) {
      throw new NotFoundException('Goal not found after update')
    }

    return {
      ...updatedGoal,
      pid: goal.projectId,
    }
  }

  @Delete('/:id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGoal(@Param('id') id: string, @CurrentUserId() uid: string) {
    this.logger.log({ id, uid }, 'DELETE /goal/:id')

    const goal = await this.goalService.findOne(id)

    if (_isEmpty(goal)) {
      throw new NotFoundException()
    }

    const project = await this.projectService.getFullProject(goal.projectId)

    this.projectService.allowedToManage(
      project,
      uid,
      'You are not allowed to manage this goal',
    )

    await this.goalService.delete(id)
  }

  private buildGoalMatchCondition(goal: Goal): {
    condition: string
    params: Record<string, string>
  } {
    const params: Record<string, string> = {}

    if (goal.type === GoalType.CUSTOM_EVENT) {
      if (goal.matchType === GoalMatchType.EXACT) {
        params.goalValue = goal.value || ''
        return { condition: `event_name = {goalValue:String}`, params }
      }
      if ((goal.value || '').trim() === '') {
        return { condition: '1=0', params: {} }
      }
      params.goalValue = goal.value || ''
      return {
        condition: `event_name ILIKE concat('%', {goalValue:String}, '%')`,
        params,
      }
    }

    if (goal.matchType === GoalMatchType.EXACT) {
      params.goalValue = goal.value || ''
      return { condition: `pg = {goalValue:String}`, params }
    }
    if ((goal.value || '').trim() === '') {
      return { condition: '1=0', params: {} }
    }
    params.goalValue = goal.value || ''
    return {
      condition: `pg ILIKE concat('%', {goalValue:String}, '%')`,
      params,
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

  private buildConditionExpression(
    condition: GoalCondition,
    index: number,
  ): { condition: string; params: Record<string, string> } {
    const params: Record<string, string> = {}
    const eventType = condition.eventType || 'any'
    const parts: string[] = []

    if (
      eventType === GoalType.PAGEVIEW ||
      eventType === GoalType.CUSTOM_EVENT
    ) {
      params[`conditionType${index}`] = eventType
      parts.push(`type = {conditionType${index}:String}`)
    } else if (condition.field === 'pg' || condition.field === 'page') {
      parts.push(`type = 'pageview'`)
    } else if (
      condition.field === 'event' ||
      condition.field === 'event_name'
    ) {
      parts.push(`type = 'custom_event'`)
    } else {
      parts.push(`type IN ('pageview', 'custom_event')`)
    }

    if (condition.field === 'metadata') {
      const keyParam = `conditionMetaKey${index}`
      params[keyParam] = condition.metadataKey || ''

      if (!params[keyParam]) {
        return { condition: '1=0', params: {} }
      }

      if (condition.operator === 'exists') {
        parts.push(`indexOf(meta.key, {${keyParam}:String}) > 0`)
      } else if (condition.operator === 'not_exists') {
        parts.push(`indexOf(meta.key, {${keyParam}:String}) = 0`)
      } else {
        const valueParam = `conditionValue${index}`
        params[valueParam] = condition.value || ''
        const valueExpression = `meta.value[indexOf(meta.key, {${keyParam}:String})]`
        parts.push(`indexOf(meta.key, {${keyParam}:String}) > 0`)

        if (condition.operator === 'contains') {
          parts.push(
            `${valueExpression} ILIKE concat('%', {${valueParam}:String}, '%')`,
          )
        } else if (condition.operator === 'not_contains') {
          parts.push(
            `NOT (${valueExpression} ILIKE concat('%', {${valueParam}:String}, '%'))`,
          )
        } else {
          parts.push(
            `${valueExpression} ${condition.operator === 'not_equals' ? '!=' : '='} {${valueParam}:String}`,
          )
        }
      }

      return { condition: `(${parts.join(' AND ')})`, params }
    }

    const column = GOAL_CONDITION_COLUMNS[condition.field]
    if (!column) {
      return { condition: '1=0', params: {} }
    }

    if (condition.operator === 'exists') {
      parts.push(`${column} IS NOT NULL AND ${column} != ''`)
    } else if (condition.operator === 'not_exists') {
      parts.push(`(${column} IS NULL OR ${column} = '')`)
    } else {
      const valueParam = `conditionValue${index}`
      params[valueParam] = condition.value || ''

      if (!params[valueParam]) {
        return { condition: '1=0', params: {} }
      }

      if (condition.operator === 'contains') {
        parts.push(`${column} ILIKE concat('%', {${valueParam}:String}, '%')`)
      } else if (condition.operator === 'not_contains') {
        parts.push(
          `NOT (${column} ILIKE concat('%', {${valueParam}:String}, '%'))`,
        )
      } else {
        parts.push(
          `${column} ${condition.operator === 'not_equals' ? '!=' : '='} {${valueParam}:String}`,
        )
      }
    }

    return { condition: `(${parts.join(' AND ')})`, params }
  }

  private buildGoalEventCondition(goal: Goal): {
    condition: string
    params: Record<string, string>
  } {
    if (goal.conditions?.conditions?.length) {
      const relation = goal.conditions.relation === 'OR' ? ' OR ' : ' AND '
      const builtConditions = goal.conditions.conditions.map(
        (condition, index) => this.buildConditionExpression(condition, index),
      )

      return {
        condition: `(${builtConditions
          .map((condition) => condition.condition)
          .join(relation)})`,
        params: Object.assign(
          {},
          ...builtConditions.map((condition) => condition.params),
        ),
      }
    }

    const goalType =
      goal.type === GoalType.CUSTOM_EVENT ? 'custom_event' : 'pageview'
    const { condition: matchCondition, params: matchParams } =
      this.buildGoalMatchCondition(goal)
    const { condition: metaCondition, params: metaParams } =
      this.buildMetadataCondition(goal)

    return {
      condition: `(type = '${goalType}' AND ${matchCondition} ${metaCondition})`,
      params: { ...matchParams, ...metaParams },
    }
  }

  private buildGoalConversionsSubquery(
    goal: Goal,
    filtersQuery: string,
  ): {
    query: string
    params: Record<string, string | number>
  } {
    const conditions = goal.conditions?.conditions || []

    if (conditions.length > 1 && goal.conditions?.relation === 'AND') {
      const builtConditions = conditions.map((condition, index) =>
        this.buildConditionExpression(condition, index),
      )

      return {
        query: `
          SELECT psid, max(matchedAt) AS conversionAt, 1 AS conversions
          FROM (
            SELECT psid, conditionIndex, min(created) AS matchedAt
            FROM (
              ${builtConditions
                .map(
                  (condition, index) => `
                    SELECT psid, created, ${index} AS conditionIndex
                    FROM events
                    WHERE pid = {pid:FixedString(12)}
                      AND (${condition.condition})
                      ${filtersQuery}
                      AND psid != 0
                      AND created BETWEEN {groupFrom:String} AND {groupTo:String}
                  `,
                )
                .join(' UNION ALL ')}
            )
            GROUP BY psid, conditionIndex
          )
          GROUP BY psid
          HAVING countDistinct(conditionIndex) = {conditionsCount:UInt32}
        `,
        params: {
          ...Object.assign(
            {},
            ...builtConditions.map((condition) => condition.params),
          ),
          conditionsCount: conditions.length,
        },
      }
    }

    const { condition: goalCondition, params: goalParams } =
      this.buildGoalEventCondition(goal)

    return {
      query: `
        SELECT psid, min(created) AS conversionAt, count() AS conversions
        FROM events
        WHERE pid = {pid:FixedString(12)}
          AND (${goalCondition})
          ${filtersQuery}
          AND psid != 0
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        GROUP BY psid
      `,
      params: goalParams,
    }
  }

  private async getGoalBreakdowns(
    projectId: string,
    groupFrom: string,
    groupTo: string,
    conversionsSubquery: string,
    queryParams: Record<string, unknown>,
  ): Promise<GoalBreakdowns> {
    const emptyBreakdowns: GoalBreakdowns = {
      countries: {},
      devices: {},
      browsers: {},
      sources: {},
      campaigns: {},
      pages: {},
      profileTypes: {},
    }

    const query = `
      WITH conversions AS (
        ${conversionsSubquery}
      ),
      session_info AS (
        SELECT
          c.psid AS psid,
          argMin(e.cc, e.created) AS cc,
          argMin(e.dv, e.created) AS dv,
          argMin(e.br, e.created) AS br,
          argMin(if(e.so IS NOT NULL AND e.so != '', e.so, if(domain(e.ref) != '', domain(e.ref), 'Direct / None')), e.created) AS source,
          argMin(e.ca, e.created) AS campaign,
          argMin(e.pg, e.created) AS page,
          argMax(e.profileId, e.created) AS profileId
        FROM conversions c
        INNER JOIN events e ON c.psid = e.psid
        WHERE e.pid = {pid:FixedString(12)}
          AND e.type IN ('pageview', 'custom_event')
          AND e.created BETWEEN {groupFrom:String} AND {groupTo:String}
          AND e.created <= c.conversionAt
        GROUP BY c.psid
      )
      SELECT kind, val, cnt FROM (
        SELECT 'countries' AS kind, cc AS val, count() AS cnt
        FROM session_info
        WHERE cc IS NOT NULL AND cc != ''
        GROUP BY cc

        UNION ALL

        SELECT 'devices' AS kind, dv AS val, count() AS cnt
        FROM session_info
        WHERE dv IS NOT NULL AND dv != ''
        GROUP BY dv

        UNION ALL

        SELECT 'browsers' AS kind, br AS val, count() AS cnt
        FROM session_info
        WHERE br IS NOT NULL AND br != ''
        GROUP BY br

        UNION ALL

        SELECT 'sources' AS kind, source AS val, count() AS cnt
        FROM session_info
        GROUP BY val

        UNION ALL

        SELECT 'campaigns' AS kind, campaign AS val, count() AS cnt
        FROM session_info
        WHERE campaign IS NOT NULL AND campaign != ''
        GROUP BY campaign

        UNION ALL

        SELECT 'pages' AS kind, page AS val, count() AS cnt
        FROM session_info
        WHERE page IS NOT NULL AND page != ''
        GROUP BY page

        UNION ALL

        SELECT 'profileTypes' AS kind, if(startsWith(profileId, {profilePrefixUser:String}), 'identified', 'anonymous') AS val, count() AS cnt
        FROM session_info
        WHERE profileId IS NOT NULL AND profileId != ''
        GROUP BY val
      )
      ORDER BY kind, cnt DESC, val ASC
      LIMIT 5 BY kind
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          ...queryParams,
          pid: projectId,
          groupFrom,
          groupTo,
          profilePrefixUser: AnalyticsService.PROFILE_PREFIX_USER,
        },
      })
      .then((resultSet) =>
        resultSet.json<{
          kind: GoalBreakdownKey
          val: string
          cnt: number
        }>(),
      )

    for (const row of data) {
      if (!emptyBreakdowns[row.kind] || !row.val) {
        continue
      }

      emptyBreakdowns[row.kind][row.val] = row.cnt
    }

    return emptyBreakdowns
  }

  private async getGoalTimeToConvert(
    projectId: string,
    groupFrom: string,
    groupTo: string,
    conversionsSubquery: string,
    queryParams: Record<string, unknown>,
  ): Promise<{
    fromSessionStart: TimeToConvertMetric
    fromFirstPage: TimeToConvertMetric
  }> {
    const emptyMetric: TimeToConvertMetric = {
      average: null,
      median: null,
      p75: null,
    }

    const query = `
      WITH conversions AS (
        ${conversionsSubquery}
      ),
      session_starts AS (
        SELECT psid, min(firstSeen) AS sessionStart
        FROM sessions FINAL
        WHERE pid = {pid:FixedString(12)}
        GROUP BY psid
      ),
      first_pages AS (
        SELECT psid, min(created) AS firstPageAt
        FROM events
        WHERE pid = {pid:FixedString(12)}
          AND type = 'pageview'
          AND psid != 0
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        GROUP BY psid
      )
      SELECT
        round(avgOrNull(if(sessionStart > toDateTime(0) AND sessionStart <= conversionAt, dateDiff('second', sessionStart, conversionAt), NULL)), 2) AS averageSession,
        quantileExactOrNull(0.5)(if(sessionStart > toDateTime(0) AND sessionStart <= conversionAt, dateDiff('second', sessionStart, conversionAt), NULL)) AS medianSession,
        quantileExactOrNull(0.75)(if(sessionStart > toDateTime(0) AND sessionStart <= conversionAt, dateDiff('second', sessionStart, conversionAt), NULL)) AS p75Session,
        round(avgOrNull(if(firstPageAt > toDateTime(0) AND firstPageAt <= conversionAt, dateDiff('second', firstPageAt, conversionAt), NULL)), 2) AS averageFirstPage,
        quantileExactOrNull(0.5)(if(firstPageAt > toDateTime(0) AND firstPageAt <= conversionAt, dateDiff('second', firstPageAt, conversionAt), NULL)) AS medianFirstPage,
        quantileExactOrNull(0.75)(if(firstPageAt > toDateTime(0) AND firstPageAt <= conversionAt, dateDiff('second', firstPageAt, conversionAt), NULL)) AS p75FirstPage
      FROM conversions c
      LEFT JOIN session_starts ss ON c.psid = ss.psid
      LEFT JOIN first_pages fp ON c.psid = fp.psid
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { ...queryParams, pid: projectId, groupFrom, groupTo },
      })
      .then((resultSet) =>
        resultSet.json<{
          averageSession: number | null
          medianSession: number | null
          p75Session: number | null
          averageFirstPage: number | null
          medianFirstPage: number | null
          p75FirstPage: number | null
        }>(),
      )

    const row = data[0]

    if (!row) {
      return {
        fromSessionStart: emptyMetric,
        fromFirstPage: emptyMetric,
      }
    }

    return {
      fromSessionStart: {
        average: row.averageSession,
        median: row.medianSession,
        p75: row.p75Session,
      },
      fromFirstPage: {
        average: row.averageFirstPage,
        median: row.medianFirstPage,
        p75: row.p75FirstPage,
      },
    }
  }

  @Get('/:id/stats')
  @Auth()
  async getGoalStats(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Query('period') period: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('timezone') timezone?: string,
    @Query('filters') filters?: string,
  ) {
    this.logger.log({ userId, id, period, from, to }, 'GET /goal/:id/stats')

    const goal = await this.goalService.findOne(id)

    if (_isEmpty(goal)) {
      throw new NotFoundException('Goal not found')
    }

    const project = await this.projectService.getFullProject(goal.projectId)
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

    const [filtersQuery, filtersParams] = this.analyticsService.getFiltersQuery(
      filters || '[]',
      DataType.ANALYTICS,
    )
    const { query: conversionsSubquery, params: goalParams } =
      this.buildGoalConversionsSubquery(goal, filtersQuery)

    const conversionsQuery = `
      WITH conversions AS (
        ${conversionsSubquery}
      )
      SELECT 
        sum(conversions) as conversions,
        count() as uniqueSessions
      FROM conversions
    `

    const queryParams = {
      pid: goal.projectId,
      groupFrom: groupFromUTC,
      groupTo: groupToUTC,
      ...goalParams,
      ...filtersParams,
    }

    const { data: conversionsData } = await clickhouse
      .query({ query: conversionsQuery, query_params: queryParams })
      .then((resultSet) =>
        resultSet.json<{ conversions: number; uniqueSessions: number }>(),
      )

    const conversions = conversionsData[0]?.conversions || 0
    const uniqueSessions = conversionsData[0]?.uniqueSessions || 0

    const totalSessionsQuery = `
      SELECT uniqExact(psid) as totalSessions
      FROM events
      WHERE 
        pid = {pid:FixedString(12)}
        AND type IN ('pageview', 'custom_event')
        AND psid != 0
        ${filtersQuery}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
    `

    const { data: totalData } = await clickhouse
      .query({
        query: totalSessionsQuery,
        query_params: {
          pid: goal.projectId,
          groupFrom: groupFromUTC,
          groupTo: groupToUTC,
          ...filtersParams,
        },
      })
      .then((resultSet) => resultSet.json<{ totalSessions: number }>())

    const totalSessions = totalData[0]?.totalSessions || 1
    const conversionRate = _round((uniqueSessions / totalSessions) * 100, 2)

    const periodDays = dayjs(groupToUTC).diff(dayjs(groupFromUTC), 'day') || 1
    const previousFrom = dayjs(groupFromUTC)
      .subtract(periodDays, 'day')
      .format('YYYY-MM-DD HH:mm:ss')
    const previousTo = groupFromUTC

    const previousQueryParams = {
      pid: goal.projectId,
      groupFrom: previousFrom,
      groupTo: previousTo,
      ...goalParams,
      ...filtersParams,
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

    const [breakdowns, timeToConvert] = await Promise.all([
      this.getGoalBreakdowns(
        goal.projectId,
        groupFromUTC,
        groupToUTC,
        conversionsSubquery,
        { ...goalParams, ...filtersParams },
      ),
      this.getGoalTimeToConvert(
        goal.projectId,
        groupFromUTC,
        groupToUTC,
        conversionsSubquery,
        { ...goalParams, ...filtersParams },
      ),
    ])

    return {
      conversions,
      uniqueSessions,
      conversionRate,
      previousConversions,
      trend,
      breakdowns,
      timeToConvert,
    }
  }

  @Get('/:id/sessions')
  @Auth()
  async getGoalSessions(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Query('period') period = '7d',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('timezone') timezone?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    this.logger.log({ userId, id, period, from, to }, 'GET /goal/:id/sessions')

    const goal = await this.goalService.findOne(id)

    if (_isEmpty(goal)) {
      throw new NotFoundException('Goal not found')
    }

    const project = await this.projectService.getFullProject(goal.projectId)
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

    const goalType =
      goal.type === GoalType.CUSTOM_EVENT ? 'custom_event' : 'pageview'
    const { condition: matchCondition, params: matchParams } =
      this.buildGoalMatchCondition(goal)
    const { condition: metaCondition, params: metaParams } =
      this.buildMetadataCondition(goal)
    const { take: safeTake, skip: safeSkip } = clampPagination(
      Number(take) || 30,
      Number(skip) || 0,
    )

    const sessions = await this.analyticsService.getSessionsList(
      '',
      {
        params: {
          pid: goal.projectId,
          groupFrom: groupFromUTC,
          groupTo: groupToUTC,
          ...matchParams,
          ...metaParams,
        },
      },
      safeTimezone,
      Math.min(safeTake, 150),
      safeSkip,
      false,
      goalType,
      `AND ${matchCondition} ${metaCondition}`,
    )

    return { sessions, take: Math.min(safeTake, 150), skip: safeSkip }
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

  @Get('/:id/chart')
  @Auth()
  async getGoalChart(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Query('period') period: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('timeBucket') timeBucket?: string,
    @Query('timezone') timezone?: string,
    @Query('filters') filters?: string,
  ) {
    this.logger.log(
      { userId, id, period, from, to, timeBucket },
      'GET /goal/:id/chart',
    )

    const goal = await this.goalService.findOne(id)

    if (_isEmpty(goal)) {
      throw new NotFoundException('Goal not found')
    }

    const project = await this.projectService.getFullProject(goal.projectId)
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

    const { xShifted } = this.analyticsService.generateXAxis(
      resolvedTimeBucket as any,
      groupFromUTC,
      groupToUTC,
      safeTimezone,
    )

    const timeBucketFunc = Object.prototype.hasOwnProperty.call(
      timeBucketConversion,
      resolvedTimeBucket,
    )
      ? timeBucketConversion[resolvedTimeBucket]
      : 'toStartOfDay'
    const [selector, groupBy] = this.getGroupSubquery(resolvedTimeBucket)

    const [filtersQuery, filtersParams] = this.analyticsService.getFiltersQuery(
      filters || '[]',
      DataType.ANALYTICS,
    )
    const { query: conversionsSubquery, params: goalParams } =
      this.buildGoalConversionsSubquery(goal, filtersQuery)

    const chartQuery = `
      SELECT
        ${selector},
        sum(conversions) as conversions,
        count() as uniqueSessions
      FROM (
        SELECT
          psid,
          conversions,
          ${timeBucketFunc}(toTimeZone(conversionAt, {timezone:String})) as tz_created
        FROM (
          ${conversionsSubquery}
        )
      ) as subquery
      GROUP BY ${groupBy}
      ORDER BY ${groupBy}
    `

    const queryParams = {
      pid: goal.projectId,
      groupFrom: groupFromUTC,
      groupTo: groupToUTC,
      timezone: safeTimezone,
      ...goalParams,
      ...filtersParams,
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
