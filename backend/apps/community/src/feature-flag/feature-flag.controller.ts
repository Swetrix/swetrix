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
  ParseIntPipe,
  Headers,
  Ip,
} from '@nestjs/common'
import {
  ApiTags,
  ApiResponse,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _pick from 'lodash/pick'
import _round from 'lodash/round'

import { ProjectService } from '../project/project.service'
import { AppLoggerService } from '../logger/logger.service'
import {
  AnalyticsService,
  getLowestPossibleTimeBucket,
} from '../analytics/analytics.service'
import { Auth } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { FeatureFlag } from './entity/feature-flag.entity'
import {
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  EvaluateFeatureFlagsDto,
  FeatureFlagDto,
  FeatureFlagStatsDto,
  EvaluatedFlagsResponseDto,
  FeatureFlagProfilesResponseDto,
} from './dto/feature-flag.dto'
import { FeatureFlagService } from './feature-flag.service'
import { clickhouse } from '../common/integrations/clickhouse'
import { getIPFromHeaders, getGeoDetails } from '../common/utils'

const FEATURE_FLAGS_MAXIMUM = 50 // Maximum feature flags per project
const FEATURE_FLAGS_PAGINATION_MAX_TAKE = 100

@ApiTags('Feature Flag')
@Controller(['feature-flag', 'v1/feature-flag'])
export class FeatureFlagController {
  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @ApiBearerAuth()
  @Get('/project/:projectId')
  @Auth(false, true)
  @ApiResponse({ status: 200, type: [FeatureFlagDto] })
  @ApiOperation({ summary: 'Get all feature flags for a project' })
  async getProjectFeatureFlags(
    @CurrentUserId() userId: string,
    @Param('projectId') projectId: string,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('search') search?: string,
  ) {
    this.logger.log(
      { userId, projectId, take, skip, search },
      'GET /feature-flag/project/:projectId',
    )

    const project = await this.projectService.getFullProject(projectId)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, userId)

    const safeTake =
      typeof take === 'number' && Number.isFinite(take)
        ? Math.min(Math.max(take, 0), FEATURE_FLAGS_PAGINATION_MAX_TAKE)
        : undefined
    const safeSkip =
      typeof skip === 'number' && Number.isFinite(skip) ? Math.max(skip, 0) : 0

    const result = await this.featureFlagService.paginate(
      { take: safeTake, skip: safeSkip },
      projectId,
      search,
    )

    result.results = _map(result.results, (flag) => ({
      ...flag,
      pid: flag.projectId,
    })) as any

    return result
  }

  @ApiBearerAuth()
  @Get('/:flagId')
  @Auth(false, true)
  @ApiResponse({ status: 200, type: FeatureFlagDto })
  @ApiOperation({ summary: 'Get a feature flag by ID' })
  async getFeatureFlag(
    @CurrentUserId() userId: string,
    @Param('flagId') flagId: string,
  ) {
    this.logger.log({ userId, flagId }, 'GET /feature-flag/:flagId')

    const flag = await this.featureFlagService.findOne(flagId)

    if (_isEmpty(flag)) {
      throw new NotFoundException('Feature flag not found')
    }

    const project = await this.projectService.getFullProject(flag.projectId)

    this.projectService.allowedToView(project, userId)

    return {
      ...flag,
      pid: flag.projectId,
    }
  }

  @ApiBearerAuth()
  @Post('/')
  @Auth()
  @ApiResponse({ status: 201, type: FeatureFlagDto })
  @ApiOperation({ summary: 'Create a new feature flag' })
  async createFeatureFlag(
    @Body() flagDto: CreateFeatureFlagDto,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ uid, pid: flagDto.pid }, 'POST /feature-flag')

    const project = await this.projectService.getFullProject(flagDto.pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToManage(
      project,
      uid,
      'You are not allowed to add feature flags to this project',
    )

    const flagsCount = await this.featureFlagService.count(flagDto.pid)

    if (flagsCount >= FEATURE_FLAGS_MAXIMUM) {
      throw new BadRequestException(
        `You cannot create more than ${FEATURE_FLAGS_MAXIMUM} feature flags per project.`,
      )
    }

    // Check for duplicate key
    const existingFlag = await this.featureFlagService.findByKey(
      flagDto.pid,
      flagDto.key,
    )

    if (existingFlag) {
      throw new BadRequestException(
        `A feature flag with key "${flagDto.key}" already exists in this project`,
      )
    }

    try {
      const newFlag = await this.featureFlagService.create({
        key: flagDto.key,
        description: flagDto.description || null,
        flagType: flagDto.flagType,
        rolloutPercentage: flagDto.rolloutPercentage ?? 100,
        targetingRules: flagDto.targetingRules || null,
        enabled: flagDto.enabled ?? true,
        projectId: flagDto.pid,
      })

      return {
        ...newFlag,
        pid: flagDto.pid,
      }
    } catch (reason) {
      this.logger.error({ reason }, 'Error while creating feature flag')
      throw new BadRequestException(
        'Error occurred while creating feature flag',
      )
    }
  }

  @Post('/evaluate')
  @ApiResponse({ status: 200, type: EvaluatedFlagsResponseDto })
  @ApiOperation({
    summary: 'Evaluate feature flags for a visitor (public endpoint)',
    description:
      'Evaluates all enabled feature flags for a project based on visitor attributes derived from the request. Does not require authentication.',
  })
  async evaluateFlags(
    @Body() evaluateDto: EvaluateFeatureFlagsDto,
    @Headers() headers: Record<string, string>,
    @Ip() reqIP: string,
  ) {
    this.logger.log({ pid: evaluateDto.pid }, 'POST /feature-flag/evaluate')

    const ip = getIPFromHeaders(headers) || reqIP || ''

    const project = await this.projectService.getRedisProject(evaluateDto.pid)

    // Return empty flags instead of revealing whether a project exists
    // This prevents project ID enumeration attacks
    if (_isEmpty(project) || !project.active) {
      return { flags: {} }
    }

    const flags = await this.featureFlagService.findEnabledByProject(
      evaluateDto.pid,
    )

    // Derive attributes from request headers (like analytics does)
    const userAgent = headers['user-agent'] || ''
    const { country, city, region } = getGeoDetails(ip)
    const { deviceType, browserName, osName } =
      await this.analyticsService.getRequestInformation(headers)

    // Generate profileId using the same method as analytics:
    // - If user provides profileId, use it (with usr_ prefix)
    // - Otherwise, generate anonymous profileId from monthly salt + ip + useragent (with anon_ prefix)
    const profileId = await this.analyticsService.generateProfileId(
      evaluateDto.pid,
      userAgent,
      ip,
      evaluateDto.profileId,
    )

    // Build attributes from derived values
    const derivedAttributes: Record<string, string> = {}

    if (country) {
      derivedAttributes.cc = country
    }
    if (city) {
      derivedAttributes.ct = city
    }
    if (region) {
      derivedAttributes.rg = region
    }
    if (deviceType) {
      derivedAttributes.dv = deviceType
    }
    if (browserName) {
      derivedAttributes.br = browserName
    }
    if (osName) {
      derivedAttributes.os = osName
    }

    const evaluatedFlags = this.featureFlagService.evaluateFlags(
      flags,
      profileId,
      derivedAttributes,
    )

    // Track evaluations in ClickHouse (async, don't wait)
    this.trackEvaluations(
      evaluateDto.pid,
      flags,
      evaluatedFlags,
      profileId,
    ).catch((err) => {
      this.logger.error({ err }, 'Failed to track flag evaluations')
    })

    return { flags: evaluatedFlags }
  }

  private async trackEvaluations(
    pid: string,
    flags: FeatureFlag[],
    evaluatedFlags: Record<string, boolean>,
    profileId: string,
  ) {
    if (flags.length === 0) return

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    const values = flags.map((flag) => ({
      pid,
      flagId: flag.id,
      flagKey: flag.key,
      result: evaluatedFlags[flag.key] ? 1 : 0,
      profileId,
      created: now,
    }))

    try {
      await clickhouse.insert({
        table: 'feature_flag_evaluations',
        values,
        format: 'JSONEachRow',
      })
    } catch (err) {
      // Log error but don't fail the request
      this.logger.error({ err }, 'Failed to insert flag evaluations')
    }
  }

  @ApiBearerAuth()
  @Put('/:id')
  @Auth()
  @ApiResponse({ status: 200, type: FeatureFlagDto })
  @ApiOperation({ summary: 'Update a feature flag' })
  async updateFeatureFlag(
    @Param('id') id: string,
    @Body() flagDto: UpdateFeatureFlagDto,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ id, uid }, 'PUT /feature-flag/:id')

    const flag = await this.featureFlagService.findOne(id)

    if (_isEmpty(flag)) {
      throw new NotFoundException()
    }

    const project = await this.projectService.getFullProject(flag.projectId)

    this.projectService.allowedToManage(
      project,
      uid,
      'You are not allowed to manage this feature flag',
    )

    // Check for duplicate key if key is being changed
    if (flagDto.key && flagDto.key !== flag.key) {
      const existingFlag = await this.featureFlagService.findByKey(
        flag.projectId,
        flagDto.key,
      )

      if (existingFlag) {
        throw new BadRequestException(
          `A feature flag with key "${flagDto.key}" already exists in this project`,
        )
      }
    }

    const updatePayload: Partial<FeatureFlag> = {
      ..._pick(flagDto, [
        'key',
        'description',
        'flagType',
        'rolloutPercentage',
        'targetingRules',
        'enabled',
      ]),
    }

    const updatedFlag = await this.featureFlagService.update(id, updatePayload)

    if (!updatedFlag) {
      throw new NotFoundException('Feature flag not found after update')
    }

    return {
      ...updatedFlag,
      pid: flag.projectId,
    }
  }

  @ApiBearerAuth()
  @Delete('/:id')
  @Auth()
  @ApiResponse({ status: 204, description: 'Empty body' })
  @ApiOperation({ summary: 'Delete a feature flag' })
  async deleteFeatureFlag(
    @Param('id') id: string,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ id, uid }, 'DELETE /feature-flag/:id')

    const flag = await this.featureFlagService.findOne(id)

    if (_isEmpty(flag)) {
      throw new NotFoundException()
    }

    const project = await this.projectService.getFullProject(flag.projectId)

    this.projectService.allowedToManage(
      project,
      uid,
      'You are not allowed to manage this feature flag',
    )

    await this.featureFlagService.delete(id)
  }

  @ApiBearerAuth()
  @Get('/:id/stats')
  @Auth(false, true)
  @ApiResponse({ status: 200, type: FeatureFlagStatsDto })
  @ApiOperation({ summary: 'Get statistics for a feature flag' })
  async getFeatureFlagStats(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Query('period') period: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('timezone') timezone?: string,
  ) {
    this.logger.log(
      { userId, id, period, from, to },
      'GET /feature-flag/:id/stats',
    )

    const flag = await this.featureFlagService.findOne(id)

    if (_isEmpty(flag)) {
      throw new NotFoundException('Feature flag not found')
    }

    const project = await this.projectService.getFullProject(flag.projectId)
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

    const statsQuery = `
      SELECT
        count(*) as evaluations,
        uniqExact(profileId) as profileCount,
        countIf(result = 1) as trueCount,
        countIf(result = 0) as falseCount
      FROM feature_flag_evaluations
      WHERE
        pid = {pid:FixedString(12)}
        AND flagId = {flagId:String}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
    `

    const queryParams = {
      pid: flag.projectId,
      flagId: flag.id,
      groupFrom: groupFromUTC,
      groupTo: groupToUTC,
    }

    try {
      const { data } = await clickhouse
        .query({ query: statsQuery, query_params: queryParams })
        .then((resultSet) =>
          resultSet.json<{
            evaluations: number
            profileCount: number
            trueCount: number
            falseCount: number
          }>(),
        )

      const stats = data[0] || {
        evaluations: 0,
        profileCount: 0,
        trueCount: 0,
        falseCount: 0,
      }

      const truePercentage =
        stats.evaluations > 0
          ? _round((stats.trueCount / stats.evaluations) * 100, 2)
          : 0

      return {
        evaluations: stats.evaluations,
        profileCount: stats.profileCount,
        trueCount: stats.trueCount,
        falseCount: stats.falseCount,
        truePercentage,
      }
    } catch (err) {
      // If table doesn't exist yet, return empty stats
      this.logger.warn({ err }, 'Failed to get flag stats')
      return {
        evaluations: 0,
        profileCount: 0,
        trueCount: 0,
        falseCount: 0,
        truePercentage: 0,
      }
    }
  }

  @ApiBearerAuth()
  @Get('/:id/profiles')
  @Auth(false, true)
  @ApiResponse({ status: 200, type: FeatureFlagProfilesResponseDto })
  @ApiOperation({
    summary: 'Get profiles who have evaluated a feature flag',
    description:
      'Returns a list of profiles ordered by most recent evaluation time',
  })
  async getFeatureFlagProfiles(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Query('period') period: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('timezone') timezone?: string,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('result') result?: 'true' | 'false',
  ) {
    this.logger.log(
      { userId, id, period, from, to, take, skip, result },
      'GET /feature-flag/:id/profiles',
    )

    const flag = await this.featureFlagService.findOne(id)

    if (_isEmpty(flag)) {
      throw new NotFoundException('Feature flag not found')
    }

    const project = await this.projectService.getFullProject(flag.projectId)
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

    const safeTake = Math.min(take || 15, 50)
    const safeSkip = skip || 0

    // Build HAVING clause for result filter
    let resultHavingClause = ''
    if (result === 'true') {
      resultHavingClause = 'HAVING lastResult = 1'
    } else if (result === 'false') {
      resultHavingClause = 'HAVING lastResult = 0'
    }

    // Query to get profiles with their most recent evaluation
    const profilesQuery = `
      SELECT
        profileId,
        max(created) as lastEvaluated,
        argMax(result, created) as lastResult,
        count(*) as evaluationCount
      FROM feature_flag_evaluations
      WHERE
        pid = {pid:FixedString(12)}
        AND flagId = {flagId:String}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
      GROUP BY profileId
      ${resultHavingClause}
      ORDER BY lastEvaluated DESC
      LIMIT {take:UInt32} OFFSET {skip:UInt32}
    `

    const countQuery = `
      SELECT count() as total FROM (
        SELECT
          profileId,
          argMax(result, created) as lastResult
        FROM feature_flag_evaluations
        WHERE
          pid = {pid:FixedString(12)}
          AND flagId = {flagId:String}
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        GROUP BY profileId
        ${resultHavingClause}
      )
    `

    const queryParams = {
      pid: flag.projectId,
      flagId: flag.id,
      groupFrom: groupFromUTC,
      groupTo: groupToUTC,
      take: safeTake,
      skip: safeSkip,
    }

    try {
      const [profilesResult, countResult] = await Promise.all([
        clickhouse
          .query({ query: profilesQuery, query_params: queryParams })
          .then((resultSet) =>
            resultSet.json<{
              profileId: string
              lastEvaluated: string
              lastResult: number
              evaluationCount: number
            }>(),
          ),
        clickhouse
          .query({ query: countQuery, query_params: queryParams })
          .then((resultSet) => resultSet.json<{ total: number }>()),
      ])

      const profiles = profilesResult.data.map((row) => ({
        profileId: row.profileId,
        isIdentified: row.profileId.startsWith('usr_'),
        lastResult: row.lastResult === 1,
        evaluationCount: Number(row.evaluationCount),
        lastEvaluated: row.lastEvaluated,
      }))

      return {
        profiles,
        total: Number(countResult.data[0]?.total || 0),
      }
    } catch (err) {
      this.logger.warn({ err }, 'Failed to get flag profiles')
      return {
        profiles: [],
        total: 0,
      }
    }
  }
}
