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
} from '@nestjs/common'
import {
  ApiTags,
  ApiResponse,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger'
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
import { FeatureFlag } from './entity/feature-flag.entity'
import {
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  EvaluateFeatureFlagsDto,
  FeatureFlagDto,
  FeatureFlagStatsDto,
  EvaluatedFlagsResponseDto,
} from './dto/feature-flag.dto'
import { FeatureFlagService } from './feature-flag.service'
import { clickhouse } from '../common/integrations/clickhouse'

const FEATURE_FLAGS_MAXIMUM = 100 // Maximum feature flags per project

const timeBucketConversion: Record<string, string> = {
  minute: 'toStartOfMinute',
  hour: 'toStartOfHour',
  day: 'toStartOfDay',
  month: 'toStartOfMonth',
  year: 'toStartOfYear',
}

@ApiTags('Feature Flag')
@Controller('feature-flag')
export class FeatureFlagController {
  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
    private readonly userService: UserService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  // NOTE: More specific routes must come before generic parameter routes
  // e.g., /project/:projectId must be before /:flagId

  @ApiBearerAuth()
  @Get('/project/:projectId')
  @Auth()
  @ApiResponse({ status: 200, type: [FeatureFlagDto] })
  @ApiOperation({ summary: 'Get all feature flags for a project' })
  async getProjectFeatureFlags(
    @CurrentUserId() userId: string,
    @Param('projectId') projectId: string,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
  ) {
    this.logger.log(
      { userId, projectId, take, skip },
      'GET /feature-flag/project/:projectId',
    )

    const project = await this.projectService.getFullProject(projectId)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, userId)

    const result = await this.featureFlagService.paginate(
      { take, skip },
      { project: { id: projectId } },
      ['project'],
    )

    // @ts-expect-error
    result.results = _map(result.results, flag => ({
      ..._omit(flag, ['project']),
      pid: flag.project.id,
    }))

    return result
  }

  @ApiBearerAuth()
  @Get('/:flagId')
  @Auth()
  @ApiResponse({ status: 200, type: FeatureFlagDto })
  @ApiOperation({ summary: 'Get a feature flag by ID' })
  async getFeatureFlag(
    @CurrentUserId() userId: string,
    @Param('flagId') flagId: string,
  ) {
    this.logger.log({ userId, flagId }, 'GET /feature-flag/:flagId')

    const flag = await this.featureFlagService.findOne({
      where: { id: flagId },
      relations: ['project'],
    })

    if (_isEmpty(flag)) {
      throw new NotFoundException('Feature flag not found')
    }

    const project = await this.projectService.getFullProject(flag.project.id)

    this.projectService.allowedToView(project, userId)

    return {
      ..._omit(flag, ['project']),
      pid: flag.project.id,
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

    const user = await this.userService.findOne({
      where: { id: uid },
      relations: ['projects'],
    })

    if (!user.isActive) {
      throw new ForbiddenException('Please, verify your email address first')
    }

    const project = await this.projectService.findOne({
      where: {
        id: flagDto.pid,
      },
      relations: ['featureFlags', 'admin'],
    })

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToManage(
      project,
      uid,
      'You are not allowed to add feature flags to this project',
    )

    const flagsCount = await this.featureFlagService.count({
      where: { project: { id: flagDto.pid } },
    })

    if (user.planCode === PlanCode.none) {
      throw new HttpException(
        'You cannot create new feature flags due to no active subscription. Please upgrade your account plan to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    if (user.isAccountBillingSuspended) {
      throw new HttpException(
        'The account that owns this site is currently suspended, this is because of a billing issue. Please resolve the issue to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    if (flagsCount >= FEATURE_FLAGS_MAXIMUM) {
      throw new HttpException(
        `You cannot create more than ${FEATURE_FLAGS_MAXIMUM} feature flags per project.`,
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    // Check for duplicate key
    const existingFlag = await this.featureFlagService.findOne({
      where: { project: { id: flagDto.pid }, key: flagDto.key },
    })

    if (existingFlag) {
      throw new BadRequestException(
        `A feature flag with key "${flagDto.key}" already exists in this project`,
      )
    }

    try {
      const flag = new FeatureFlag()
      flag.key = flagDto.key
      flag.description = flagDto.description || null
      flag.flagType = flagDto.flagType || flag.flagType
      flag.rolloutPercentage = flagDto.rolloutPercentage ?? 100
      flag.targetingRules = flagDto.targetingRules || null
      flag.enabled = flagDto.enabled ?? true
      flag.project = project

      const newFlag = await this.featureFlagService.create(flag)

      return {
        ..._omit(newFlag, ['project']),
        pid: flagDto.pid,
      }
    } catch (reason) {
      this.logger.error({ reason }, 'Error while creating feature flag')
      throw new BadRequestException(
        'Error occurred while creating feature flag',
      )
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

    const flag = await this.featureFlagService.findOneWithRelations(id)

    if (_isEmpty(flag)) {
      throw new NotFoundException()
    }

    this.projectService.allowedToManage(
      flag.project,
      uid,
      'You are not allowed to manage this feature flag',
    )

    // Check for duplicate key if key is being changed
    if (flagDto.key && flagDto.key !== flag.key) {
      const existingFlag = await this.featureFlagService.findOne({
        where: { project: { id: flag.project.id }, key: flagDto.key },
      })

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

    await this.featureFlagService.update(id, updatePayload)

    const updatedFlag = await this.featureFlagService.findOne({ where: { id } })
    if (!updatedFlag) {
      throw new NotFoundException('Feature flag not found after update')
    }

    return {
      ..._omit(updatedFlag, ['project']),
      pid: flag.project.id,
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

    const flag = await this.featureFlagService.findOneWithRelations(id)

    if (_isEmpty(flag)) {
      throw new NotFoundException()
    }

    this.projectService.allowedToManage(
      flag.project,
      uid,
      'You are not allowed to manage this feature flag',
    )

    await this.featureFlagService.delete(id)
  }

  @Post('/evaluate')
  @ApiResponse({ status: 200, type: EvaluatedFlagsResponseDto })
  @ApiOperation({
    summary: 'Evaluate feature flags for a visitor (public endpoint)',
    description:
      'Evaluates all enabled feature flags for a project based on visitor attributes. Does not require authentication.',
  })
  async evaluateFlags(@Body() evaluateDto: EvaluateFeatureFlagsDto) {
    this.logger.log({ pid: evaluateDto.pid }, 'POST /feature-flag/evaluate')

    const project = await this.projectService.findOne({
      where: { id: evaluateDto.pid },
    })

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    if (!project.active) {
      throw new BadRequestException('Project is not active')
    }

    const flags = await this.featureFlagService.findEnabledByProject(
      evaluateDto.pid,
    )

    const evaluatedFlags = this.featureFlagService.evaluateFlags(
      flags,
      evaluateDto.visitorId,
      evaluateDto.attributes,
    )

    // Track evaluations in ClickHouse (async, don't wait)
    this.trackEvaluations(
      evaluateDto.pid,
      flags,
      evaluatedFlags,
      evaluateDto.visitorId,
    ).catch(err => {
      this.logger.error({ err }, 'Failed to track flag evaluations')
    })

    return { flags: evaluatedFlags }
  }

  private async trackEvaluations(
    pid: string,
    flags: FeatureFlag[],
    evaluatedFlags: Record<string, boolean>,
    visitorId?: string,
  ) {
    if (flags.length === 0) return

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const vid = visitorId || 'anonymous'

    const values = flags.map(flag => ({
      pid,
      flagId: flag.id,
      flagKey: flag.key,
      result: evaluatedFlags[flag.key] ? 1 : 0,
      visitorId: vid,
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
  @Get('/:id/stats')
  @Auth()
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

    const flag = await this.featureFlagService.findOneWithRelations(id)

    if (_isEmpty(flag)) {
      throw new NotFoundException('Feature flag not found')
    }

    const project = await this.projectService.getFullProject(flag.project.id)
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
        uniqExact(visitorId) as uniqueVisitors,
        countIf(result = 1) as trueCount,
        countIf(result = 0) as falseCount
      FROM feature_flag_evaluations
      WHERE
        pid = {pid:FixedString(12)}
        AND flagId = {flagId:String}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
    `

    const queryParams = {
      pid: flag.project.id,
      flagId: flag.id,
      groupFrom: groupFromUTC,
      groupTo: groupToUTC,
    }

    try {
      const { data } = await clickhouse
        .query({ query: statsQuery, query_params: queryParams })
        .then(resultSet =>
          resultSet.json<{
            evaluations: number
            uniqueVisitors: number
            trueCount: number
            falseCount: number
          }>(),
        )

      const stats = data[0] || {
        evaluations: 0,
        uniqueVisitors: 0,
        trueCount: 0,
        falseCount: 0,
      }

      const truePercentage =
        stats.evaluations > 0
          ? _round((stats.trueCount / stats.evaluations) * 100, 2)
          : 0

      return {
        evaluations: stats.evaluations,
        uniqueVisitors: stats.uniqueVisitors,
        trueCount: stats.trueCount,
        falseCount: stats.falseCount,
        truePercentage,
      }
    } catch (err) {
      // If table doesn't exist yet, return empty stats
      this.logger.warn({ err }, 'Failed to get flag stats')
      return {
        evaluations: 0,
        uniqueVisitors: 0,
        trueCount: 0,
        falseCount: 0,
        truePercentage: 0,
      }
    }
  }
}
