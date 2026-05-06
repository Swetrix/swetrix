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
  HttpCode,
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
import _sum from 'lodash/sum'

import { ProjectService } from '../project/project.service'
import { AppLoggerService } from '../logger/logger.service'
import {
  AnalyticsService,
  getLowestPossibleTimeBucket,
} from '../analytics/analytics.service'
import { TimeBucketType } from '../analytics/dto/getData.dto'
import { Auth } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { checkRateLimit, getIPFromHeaders } from '../common/utils'
import {
  Experiment,
  ExperimentStatus,
  ExposureTrigger,
  MultipleVariantHandling,
  FeatureFlagMode,
} from './entity/experiment.entity'
import { ExperimentVariant } from './entity/experiment-variant.entity'
import {
  CreateExperimentDto,
  UpdateExperimentDto,
  ExperimentDto,
  ExperimentResultsDto,
  VariantResultDto,
} from './dto/experiment.dto'
import { ExperimentService } from './experiment.service'
import { GoalService } from '../goal/goal.service'
import { Goal, GoalMatchType, GoalType } from '../goal/entity/goal.entity'
import { FeatureFlagService } from '../feature-flag/feature-flag.service'
import { FeatureFlagType } from '../feature-flag/entity/feature-flag.entity'
import { clickhouse } from '../common/integrations/clickhouse'
import { calculateBayesianProbabilities } from './bayesian'
import { Pagination } from '../common/pagination/pagination'

const EXPERIMENTS_MAXIMUM = 20
const FEATURE_FLAG_KEY_REGEX = /^[a-zA-Z0-9_-]+$/
const ROLLOUT_PERCENTAGE_EPSILON = 1e-6

const validateUniqueVariantKeys = (variants: Array<{ key: string }>): void => {
  const seen = new Set<string>()

  for (const variant of variants) {
    if (seen.has(variant.key)) {
      throw new BadRequestException('Variant keys must be unique')
    }
    seen.add(variant.key)
  }
}

type GoalEventConditions = {
  eventType: 'pageview' | 'custom_event'
  matchColumn: 'pg' | 'event_name'
  matchCondition: string
  metaCondition: string
  metaParams: Record<string, string>
  goalValue: string
}

@ApiTags('Experiment')
@Controller(['experiment', 'v1/experiment'])
export class ExperimentController {
  constructor(
    private readonly experimentService: ExperimentService,
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
    private readonly analyticsService: AnalyticsService,
    private readonly goalService: GoalService,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  @ApiBearerAuth()
  @Get('/project/:projectId')
  @Auth(false, true)
  @ApiResponse({ status: 200, type: [ExperimentDto] })
  @ApiOperation({ summary: 'Get all experiments for a project' })
  async getProjectExperiments(
    @CurrentUserId() userId: string,
    @Param('projectId') projectId: string,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('search') search?: string,
  ) {
    this.logger.log(
      { userId, projectId, take, skip, search },
      'GET /experiment/project/:projectId',
    )

    const project = await this.projectService.getFullProject(projectId)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, userId)

    const result = await this.experimentService.paginate(
      { take, skip },
      projectId,
      search,
    )

    return new Pagination<ExperimentDto>({
      results: _map(result.results, (experiment) => this.toDto(experiment)),
      total: result.total,
    })
  }

  @ApiBearerAuth()
  @Get('/:id')
  @Auth(false, true)
  @ApiResponse({ status: 200, type: ExperimentDto })
  @ApiOperation({ summary: 'Get an experiment by ID' })
  async getExperiment(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    this.logger.log({ userId, id }, 'GET /experiment/:id')

    const experiment = await this.experimentService.findOneWithRelations(id)

    if (_isEmpty(experiment)) {
      throw new NotFoundException('Experiment not found')
    }

    const project = await this.projectService.getFullProject(
      experiment.projectId,
    )
    this.projectService.allowedToView(project, userId)

    return this.toDto(experiment)
  }

  @ApiBearerAuth()
  @Post('/')
  @Auth()
  @ApiResponse({ status: 201, type: ExperimentDto })
  @ApiOperation({ summary: 'Create a new experiment' })
  async createExperiment(
    @Body() experimentDto: CreateExperimentDto,
    @CurrentUserId() uid: string,
    @Headers() headers: Record<string, string>,
    @Ip() reqIP: string,
  ) {
    this.logger.log({ uid, pid: experimentDto.pid }, 'POST /experiment')

    const ip = getIPFromHeaders(headers) || reqIP
    await checkRateLimit(ip, 'experiment-create', 20, 3600)
    await checkRateLimit(uid, 'experiment-create', 20, 3600)

    const project = await this.projectService.getFullProject(experimentDto.pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToManage(
      project,
      uid,
      'You are not allowed to add experiments to this project',
    )

    const experimentsCount = await this.experimentService.count(
      experimentDto.pid,
    )

    if (experimentsCount >= EXPERIMENTS_MAXIMUM) {
      throw new BadRequestException(
        `You cannot create more than ${EXPERIMENTS_MAXIMUM} experiments per project.`,
      )
    }

    this.validateVariants(experimentDto.variants)

    const goalId = await this.validateGoal(
      experimentDto.goalId,
      experimentDto.pid,
    )
    this.validateCustomEventTrigger(
      experimentDto.exposureTrigger,
      experimentDto.customEventName,
    )

    let featureFlagId: string | null = null
    if (experimentDto.featureFlagMode === FeatureFlagMode.LINK) {
      const featureFlag = await this.validateLinkedFeatureFlag(
        experimentDto.existingFeatureFlagId,
        experimentDto.pid,
      )
      featureFlagId = featureFlag.id
    }

    try {
      const newExperiment = await this.experimentService.create({
        name: experimentDto.name,
        description: experimentDto.description || null,
        hypothesis: experimentDto.hypothesis || null,
        status: ExperimentStatus.DRAFT,
        projectId: experimentDto.pid,
        goalId,
        exposureTrigger:
          experimentDto.exposureTrigger || ExposureTrigger.FEATURE_FLAG,
        customEventName: experimentDto.customEventName || null,
        multipleVariantHandling:
          experimentDto.multipleVariantHandling ||
          MultipleVariantHandling.EXCLUDE,
        filterInternalUsers: experimentDto.filterInternalUsers !== false,
        featureFlagMode:
          experimentDto.featureFlagMode || FeatureFlagMode.CREATE,
        featureFlagKey: experimentDto.featureFlagKey || null,
        featureFlagId,
        variants: experimentDto.variants as ExperimentVariant[],
      })

      if (featureFlagId) {
        await this.featureFlagService.update(featureFlagId, {
          experimentId: newExperiment.id,
        })
      }

      return this.toDto(newExperiment)
    } catch (reason) {
      this.logger.error({ reason }, 'Error while creating experiment')
      throw new BadRequestException('Error occurred while creating experiment')
    }
  }

  @ApiBearerAuth()
  @Put('/:id')
  @Auth()
  @ApiResponse({ status: 200, type: ExperimentDto })
  @ApiOperation({ summary: 'Update an experiment' })
  async updateExperiment(
    @Param('id') id: string,
    @Body() experimentDto: UpdateExperimentDto,
    @CurrentUserId() uid: string,
    @Headers() headers: Record<string, string>,
    @Ip() reqIP: string,
  ) {
    this.logger.log({ id, uid }, 'PUT /experiment/:id')

    const ip = getIPFromHeaders(headers) || reqIP
    await checkRateLimit(ip, 'experiment-update', 30, 3600)
    await checkRateLimit(uid, 'experiment-update', 30, 3600)

    const experiment = await this.experimentService.findOneWithRelations(id)

    if (_isEmpty(experiment)) {
      throw new NotFoundException()
    }

    const project = await this.projectService.getFullProject(
      experiment.projectId,
    )
    this.projectService.allowedToManage(
      project,
      uid,
      'You are not allowed to manage this experiment',
    )

    if (experiment.status === ExperimentStatus.RUNNING) {
      throw new BadRequestException(
        'Cannot update a running experiment. Pause it first.',
      )
    }

    if (experiment.status === ExperimentStatus.COMPLETED) {
      throw new BadRequestException('Cannot update a completed experiment')
    }

    const updatePayload: Partial<Experiment> = {
      ..._pick(experimentDto, [
        'name',
        'description',
        'hypothesis',
        'exposureTrigger',
        'customEventName',
        'multipleVariantHandling',
        'filterInternalUsers',
        'featureFlagMode',
        'featureFlagKey',
      ]),
    }

    if (experimentDto.goalId !== undefined) {
      updatePayload.goalId = await this.validateGoal(
        experimentDto.goalId,
        experiment.projectId,
      )
    }

    const exposureTrigger =
      experimentDto.exposureTrigger ?? experiment.exposureTrigger
    const customEventName =
      experimentDto.customEventName ?? experiment.customEventName
    this.validateCustomEventTrigger(exposureTrigger, customEventName)

    if (experimentDto.variants) {
      this.validateVariants(experimentDto.variants)
    }

    updatePayload.featureFlagId = await this.resolveFeatureFlagForUpdate(
      experiment,
      experimentDto,
    )

    const updatedExperiment = await this.experimentService.update(
      id,
      updatePayload,
    )

    if (!updatedExperiment) {
      throw new NotFoundException('Experiment not found after update')
    }

    if (experimentDto.variants) {
      updatedExperiment.variants =
        await this.experimentService.recreateVariants(
          id,
          experimentDto.variants as ExperimentVariant[],
        )
    }

    return this.toDto(updatedExperiment)
  }

  @ApiBearerAuth()
  @Delete('/:id')
  @Auth()
  @ApiResponse({ status: 204, description: 'Empty body' })
  @ApiOperation({ summary: 'Delete an experiment' })
  @HttpCode(204)
  async deleteExperiment(
    @Param('id') id: string,
    @CurrentUserId() uid: string,
    @Headers() headers: Record<string, string>,
    @Ip() reqIP: string,
  ) {
    this.logger.log({ id, uid }, 'DELETE /experiment/:id')

    const ip = getIPFromHeaders(headers) || reqIP
    await checkRateLimit(ip, 'experiment-delete', 20, 3600)
    await checkRateLimit(uid, 'experiment-delete', 20, 3600)

    const experiment = await this.experimentService.findOneWithRelations(id)

    if (_isEmpty(experiment)) {
      throw new NotFoundException()
    }

    const project = await this.projectService.getFullProject(
      experiment.projectId,
    )
    this.projectService.allowedToManage(
      project,
      uid,
      'You are not allowed to manage this experiment',
    )

    if (experiment.featureFlagId) {
      if (experiment.featureFlagMode === FeatureFlagMode.CREATE) {
        await this.featureFlagService.delete(experiment.featureFlagId)
      } else {
        await this.featureFlagService.update(experiment.featureFlagId, {
          experimentId: null,
        })
      }
    }

    await this.experimentService.delete(id)
  }

  @ApiBearerAuth()
  @Post('/:id/start')
  @Auth()
  @ApiResponse({ status: 200, type: ExperimentDto })
  @ApiOperation({ summary: 'Start an experiment' })
  async startExperiment(
    @Param('id') id: string,
    @CurrentUserId() uid: string,
    @Headers() headers: Record<string, string>,
    @Ip() reqIP: string,
  ) {
    this.logger.log({ id, uid }, 'POST /experiment/:id/start')

    const ip = getIPFromHeaders(headers) || reqIP
    await checkRateLimit(ip, 'experiment-lifecycle', 30, 3600)
    await checkRateLimit(uid, 'experiment-lifecycle', 30, 3600)

    const experiment = await this.getManageableExperiment(id, uid)

    if (experiment.status === ExperimentStatus.RUNNING) {
      throw new BadRequestException('Experiment is already running')
    }

    if (experiment.status === ExperimentStatus.COMPLETED) {
      throw new BadRequestException('Cannot restart a completed experiment')
    }

    if (!experiment.goalId) {
      throw new BadRequestException(
        'Experiment must have a goal before starting',
      )
    }

    const goal = await this.goalService.findOne(experiment.goalId)
    if (!goal || goal.projectId !== experiment.projectId) {
      throw new BadRequestException(
        'Experiment must have a goal before starting',
      )
    }

    let featureFlagId = experiment.featureFlagId
    if (!featureFlagId) {
      if (experiment.featureFlagMode !== FeatureFlagMode.CREATE) {
        throw new BadRequestException(
          'No feature flag linked to this experiment. Please link a feature flag first.',
        )
      }

      const flagKey =
        experiment.featureFlagKey?.trim() ||
        `experiment_${experiment.id.replace(/-/g, '_').substring(0, 20)}`

      if (!FEATURE_FLAG_KEY_REGEX.test(flagKey)) {
        throw new BadRequestException(
          'Feature flag key must contain only alphanumeric characters, underscores, and hyphens',
        )
      }

      const existingFlag = await this.featureFlagService.findByKey(
        experiment.projectId,
        flagKey,
      )
      if (existingFlag) {
        throw new BadRequestException(
          `Feature flag with key "${flagKey}" already exists`,
        )
      }

      const featureFlag = await this.featureFlagService.create({
        key: flagKey,
        description: `Feature flag for experiment: ${experiment.name}`,
        flagType: FeatureFlagType.ROLLOUT,
        rolloutPercentage: 100,
        enabled: true,
        experimentId: experiment.id,
        projectId: experiment.projectId,
      })
      featureFlagId = featureFlag.id
    } else {
      await this.featureFlagService.update(featureFlagId, {
        enabled: true,
        experimentId: experiment.id,
      })
    }

    const updatedExperiment = await this.experimentService.update(id, {
      status: ExperimentStatus.RUNNING,
      startedAt: experiment.startedAt ?? dayString(),
      featureFlagId,
    })

    return this.toDto(updatedExperiment)
  }

  @ApiBearerAuth()
  @Post('/:id/pause')
  @Auth()
  @ApiResponse({ status: 200, type: ExperimentDto })
  @ApiOperation({ summary: 'Pause an experiment' })
  async pauseExperiment(
    @Param('id') id: string,
    @CurrentUserId() uid: string,
    @Headers() headers: Record<string, string>,
    @Ip() reqIP: string,
  ) {
    this.logger.log({ id, uid }, 'POST /experiment/:id/pause')

    const ip = getIPFromHeaders(headers) || reqIP
    await checkRateLimit(ip, 'experiment-lifecycle', 30, 3600)
    await checkRateLimit(uid, 'experiment-lifecycle', 30, 3600)

    const experiment = await this.getManageableExperiment(id, uid)

    if (experiment.status !== ExperimentStatus.RUNNING) {
      throw new BadRequestException('Can only pause a running experiment')
    }

    if (experiment.featureFlagId) {
      await this.featureFlagService.update(experiment.featureFlagId, {
        enabled: false,
      })
    }

    const updatedExperiment = await this.experimentService.update(id, {
      status: ExperimentStatus.PAUSED,
    })

    return this.toDto(updatedExperiment)
  }

  @ApiBearerAuth()
  @Post('/:id/complete')
  @Auth()
  @ApiResponse({ status: 200, type: ExperimentDto })
  @ApiOperation({ summary: 'Complete an experiment' })
  async completeExperiment(
    @Param('id') id: string,
    @CurrentUserId() uid: string,
    @Headers() headers: Record<string, string>,
    @Ip() reqIP: string,
  ) {
    this.logger.log({ id, uid }, 'POST /experiment/:id/complete')

    const ip = getIPFromHeaders(headers) || reqIP
    await checkRateLimit(ip, 'experiment-lifecycle', 30, 3600)
    await checkRateLimit(uid, 'experiment-lifecycle', 30, 3600)

    const experiment = await this.getManageableExperiment(id, uid)

    if (
      experiment.status !== ExperimentStatus.RUNNING &&
      experiment.status !== ExperimentStatus.PAUSED
    ) {
      throw new BadRequestException(
        'Can only complete a running or paused experiment',
      )
    }

    if (experiment.featureFlagId) {
      await this.featureFlagService.update(experiment.featureFlagId, {
        enabled: false,
      })
    }

    const updatedExperiment = await this.experimentService.update(id, {
      status: ExperimentStatus.COMPLETED,
      endedAt: dayString(),
    })

    return this.toDto(updatedExperiment)
  }

  @ApiBearerAuth()
  @Get('/:id/results')
  @Auth(false, true)
  @ApiResponse({ status: 200, type: ExperimentResultsDto })
  @ApiOperation({ summary: 'Get experiment results with Bayesian statistics' })
  async getExperimentResults(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Query('period') period: string,
    @Query('timeBucket') timeBucketParam?: TimeBucketType,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('timezone') timezone?: string,
  ) {
    this.logger.log(
      { userId, id, period, timeBucket: timeBucketParam, from, to },
      'GET /experiment/:id/results',
    )

    let experiment = await this.experimentService.findOneWithRelations(id)

    if (_isEmpty(experiment)) {
      throw new NotFoundException('Experiment not found')
    }

    const project = await this.projectService.getFullProject(
      experiment.projectId,
    )
    this.projectService.allowedToView(project, userId)

    experiment = await this.withGoal(experiment)

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)

    let timeBucket =
      timeBucketParam || getLowestPossibleTimeBucket(period, from, to)
    let allowedTimeBucketForPeriodAll: TimeBucketType[] | undefined
    let diff: number | undefined
    const goalConditions = experiment.goal
      ? this.buildGoalEventConditions(experiment.goal)
      : null

    if (period === 'all') {
      const res = await this.analyticsService.calculateTimeBucketForAllTime(
        experiment.projectId,
        goalConditions?.eventType || 'pageview',
      )

      diff = res.diff
      timeBucket = res.timeBucket.includes(timeBucket)
        ? timeBucket
        : res.timeBucket[0]
      allowedTimeBucketForPeriodAll = res.timeBucket
    }

    const { groupFrom, groupTo, groupFromUTC, groupToUTC } =
      this.analyticsService.getGroupFromTo(
        from,
        to,
        timeBucket,
        period,
        safeTimezone,
        diff,
      )

    const exposureAttributionSubquery =
      this.getExposureAttributionSubquery(experiment)

    const exposuresQuery = `
      SELECT
        variantKey,
        count() as exposures
      FROM (
        ${exposureAttributionSubquery}
      )
      GROUP BY variantKey
    `

    const exposuresParams = {
      pid: experiment.projectId,
      experimentId: experiment.id,
      groupFrom: groupFromUTC,
      groupTo: groupToUTC,
    }

    let exposuresData: { variantKey: string; exposures: number }[] = []
    try {
      const result = await clickhouse
        .query({ query: exposuresQuery, query_params: exposuresParams })
        .then((resultSet) =>
          resultSet.json<{ variantKey: string; exposures: number }>(),
        )
      exposuresData = result.data
    } catch (err) {
      this.logger.warn({ err }, 'Failed to get experiment exposures')
    }

    let conversionsData: { variantKey: string; conversions: number }[] = []
    if (goalConditions) {
      const {
        eventType,
        matchCondition,
        metaCondition,
        metaParams,
        goalValue,
      } = goalConditions

      const conversionsQuery = `
        SELECT
          e.variantKey,
          uniqExact(e.profileId) as conversions
        FROM (
          ${exposureAttributionSubquery}
        ) e
        INNER JOIN events c ON e.pid = c.pid
          AND c.profileId IS NOT NULL
          AND e.profileId = c.profileId
          AND c.type = '${eventType}'
        WHERE
          e.pid = {pid:FixedString(12)}
          AND c.created BETWEEN {groupFrom:String} AND {groupTo:String}
          AND c.created >= e.exposureCreated
          AND ${matchCondition}
          ${metaCondition}
        GROUP BY e.variantKey
      `

      const conversionsParams = {
        pid: experiment.projectId,
        experimentId: experiment.id,
        groupFrom: groupFromUTC,
        groupTo: groupToUTC,
        goalValue,
        ...metaParams,
      }

      try {
        const result = await clickhouse
          .query({ query: conversionsQuery, query_params: conversionsParams })
          .then((resultSet) =>
            resultSet.json<{ variantKey: string; conversions: number }>(),
          )
        conversionsData = result.data
      } catch (err) {
        this.logger.warn({ err }, 'Failed to get experiment conversions')
      }
    }

    const exposuresMap = new Map(
      exposuresData.map((exposure) => [
        exposure.variantKey,
        Number(exposure.exposures),
      ]),
    )
    const conversionsMap = new Map(
      conversionsData.map((conversion) => [
        conversion.variantKey,
        Number(conversion.conversions),
      ]),
    )

    const controlVariant = experiment.variants.find(
      (variant) => variant.isControl,
    )
    const controlExposures = controlVariant
      ? exposuresMap.get(controlVariant.key) || 0
      : 0
    const controlConversions = controlVariant
      ? conversionsMap.get(controlVariant.key) || 0
      : 0
    const controlRate =
      controlExposures > 0 ? controlConversions / controlExposures : 0

    const variantData = experiment.variants.map((variant) => ({
      key: variant.key,
      exposures: exposuresMap.get(variant.key) || 0,
      conversions: conversionsMap.get(variant.key) || 0,
    }))

    const probabilities = calculateBayesianProbabilities(variantData)

    const variantResults: VariantResultDto[] = experiment.variants.map(
      (variant) => {
        const exposures = exposuresMap.get(variant.key) || 0
        const conversions = conversionsMap.get(variant.key) || 0
        const conversionRate = exposures > 0 ? conversions / exposures : 0
        const improvement = variant.isControl
          ? 0
          : controlRate > 0
            ? ((conversionRate - controlRate) / controlRate) * 100
            : conversionRate > 0
              ? 100
              : 0

        return {
          key: variant.key,
          name: variant.name,
          isControl: variant.isControl,
          exposures,
          conversions,
          conversionRate: _round(conversionRate * 100, 2),
          probabilityOfBeingBest: _round(
            (probabilities.get(variant.key) || 0) * 100,
            2,
          ),
          improvement: _round(improvement, 2),
        }
      },
    )

    const totalExposures = _sum(
      variantResults.map((variant) => variant.exposures),
    )
    const totalConversions = _sum(
      variantResults.map((variant) => variant.conversions),
    )

    let highestProbVariant: VariantResultDto | null = null
    let hasWinner = false

    if (variantResults.length > 0) {
      highestProbVariant = variantResults.reduce((a, b) =>
        a.probabilityOfBeingBest > b.probabilityOfBeingBest ? a : b,
      )
      hasWinner = highestProbVariant.probabilityOfBeingBest >= 95
    }

    let chart:
      | { x: string[]; winProbability: Record<string, number[]> }
      | undefined

    try {
      chart = await this.generateExperimentChart(
        experiment,
        timeBucket,
        groupFrom,
        groupTo,
        groupFromUTC,
        groupToUTC,
        safeTimezone,
      )
    } catch (err) {
      this.logger.warn({ err }, 'Failed to generate experiment chart data')
    }

    return {
      experimentId: experiment.id,
      status: experiment.status,
      variants: variantResults,
      totalExposures,
      totalConversions,
      hasWinner,
      winnerKey:
        hasWinner && highestProbVariant ? highestProbVariant.key : null,
      confidenceLevel: 95,
      chart,
      timeBucket: allowedTimeBucketForPeriodAll,
    }
  }

  private toDto(experiment: Experiment): ExperimentDto {
    const dto = { ...experiment } as Record<string, any>
    delete dto.projectId
    delete dto.project
    delete dto.goal
    delete dto.featureFlag

    return {
      ...dto,
      pid: experiment.projectId,
      goalId: experiment.goalId || null,
      featureFlagId: experiment.featureFlagId || null,
    } as unknown as ExperimentDto
  }

  private validateVariants(
    variants: Array<{
      key: string
      isControl: boolean
      rolloutPercentage: number
    }>,
  ) {
    if (!variants || variants.length < 2) {
      throw new BadRequestException(
        'An experiment must have at least 2 variants',
      )
    }

    validateUniqueVariantKeys(variants)

    const controlVariants = variants.filter((variant) => variant.isControl)
    if (controlVariants.length !== 1) {
      throw new BadRequestException(
        'An experiment must have exactly one control variant',
      )
    }

    const totalPercentage = _sum(
      variants.map((variant) => variant.rolloutPercentage),
    )
    if (Math.abs(totalPercentage - 100) > ROLLOUT_PERCENTAGE_EPSILON) {
      throw new BadRequestException(
        'Variant rollout percentages must sum to 100',
      )
    }
  }

  private async validateGoal(
    goalId: string | undefined,
    projectId: string,
  ): Promise<string | null> {
    if (!goalId) {
      return null
    }

    const goal = await this.goalService.findOne(goalId)
    if (!goal || goal.projectId !== projectId) {
      throw new NotFoundException('Goal not found')
    }

    return goal.id
  }

  private validateCustomEventTrigger(
    exposureTrigger: ExposureTrigger | undefined,
    customEventName: string | null | undefined,
  ) {
    if (
      exposureTrigger === ExposureTrigger.CUSTOM_EVENT &&
      !customEventName?.trim()
    ) {
      throw new BadRequestException(
        'Custom event name is required when using custom event exposure trigger',
      )
    }
  }

  private async validateLinkedFeatureFlag(
    featureFlagId: string | undefined,
    projectId: string,
    experimentId?: string,
  ) {
    if (!featureFlagId) {
      throw new BadRequestException(
        'Feature flag ID is required when linking an existing flag',
      )
    }

    const featureFlag = await this.featureFlagService.findOne(featureFlagId)
    if (!featureFlag || featureFlag.projectId !== projectId) {
      throw new NotFoundException('Feature flag not found')
    }

    if (featureFlag.experimentId && featureFlag.experimentId !== experimentId) {
      throw new BadRequestException(
        'This feature flag is already linked to another experiment',
      )
    }

    return featureFlag
  }

  private async resolveFeatureFlagForUpdate(
    experiment: Experiment,
    experimentDto: UpdateExperimentDto,
  ): Promise<string | null> {
    const targetFeatureFlagMode =
      experimentDto.featureFlagMode ?? experiment.featureFlagMode
    const currentFeatureFlag = experiment.featureFlagId
      ? await this.featureFlagService.findOne(experiment.featureFlagId)
      : null

    if (targetFeatureFlagMode === FeatureFlagMode.LINK) {
      const targetFlagId =
        experimentDto.existingFeatureFlagId ??
        (experiment.featureFlagMode === FeatureFlagMode.LINK
          ? experiment.featureFlagId
          : undefined)
      const existingFlag = await this.validateLinkedFeatureFlag(
        targetFlagId,
        experiment.projectId,
        experiment.id,
      )

      if (currentFeatureFlag && currentFeatureFlag.id !== existingFlag.id) {
        if (experiment.featureFlagMode === FeatureFlagMode.CREATE) {
          await this.featureFlagService.delete(currentFeatureFlag.id)
        } else {
          await this.featureFlagService.update(currentFeatureFlag.id, {
            experimentId: null,
          })
        }
      }

      if (existingFlag.experimentId !== experiment.id) {
        await this.featureFlagService.update(existingFlag.id, {
          experimentId: experiment.id,
        })
      }

      return existingFlag.id
    }

    if (
      targetFeatureFlagMode === FeatureFlagMode.CREATE &&
      currentFeatureFlag &&
      experiment.featureFlagMode === FeatureFlagMode.LINK
    ) {
      await this.featureFlagService.update(currentFeatureFlag.id, {
        experimentId: null,
      })
      return null
    }

    return experiment.featureFlagId
  }

  private async getManageableExperiment(
    id: string,
    uid: string,
  ): Promise<Experiment> {
    const experiment = await this.experimentService.findOneWithRelations(id)

    if (_isEmpty(experiment)) {
      throw new NotFoundException()
    }

    const project = await this.projectService.getFullProject(
      experiment.projectId,
    )
    this.projectService.allowedToManage(
      project,
      uid,
      'You are not allowed to manage this experiment',
    )

    return experiment
  }

  private async withGoal(experiment: Experiment): Promise<Experiment> {
    if (!experiment.goalId) {
      return { ...experiment, goal: null }
    }

    const goal = await this.goalService.findOne(experiment.goalId)
    return {
      ...experiment,
      goal: goal && goal.projectId === experiment.projectId ? goal : null,
    }
  }

  private buildGoalEventConditions(goal: Goal): GoalEventConditions {
    const eventType =
      goal.type === GoalType.CUSTOM_EVENT ? 'custom_event' : 'pageview'
    const matchColumn =
      goal.type === GoalType.CUSTOM_EVENT ? 'event_name' : 'pg'
    const goalValue = goal.value || ''
    const metaParams: Record<string, string> = {}

    let matchCondition = ''
    if (goal.matchType === GoalMatchType.EXACT) {
      matchCondition = `c.${matchColumn} = {goalValue:String}`
    } else if (goalValue.trim() === '') {
      matchCondition = '1=0'
    } else {
      matchCondition = `c.${matchColumn} ILIKE concat('%', {goalValue:String}, '%')`
    }

    let metaCondition = ''
    if (goal.metadataFilters && goal.metadataFilters.length > 0) {
      const conditions: string[] = []

      goal.metadataFilters.forEach((filter, index) => {
        const keyParam = `metaKey${index}`
        const valueParam = `metaValue${index}`
        metaParams[keyParam] = filter.key
        metaParams[valueParam] = filter.value
        conditions.push(
          `has(c.meta.key, {${keyParam}:String}) AND c.meta.value[indexOf(c.meta.key, {${keyParam}:String})] = {${valueParam}:String}`,
        )
      })

      metaCondition = `AND (${conditions.join(' AND ')})`
    }

    return {
      eventType,
      matchColumn,
      matchCondition,
      metaCondition,
      metaParams,
      goalValue,
    }
  }

  private getExposureAttributionSubquery(experiment: Experiment): string {
    const variantSelector =
      'argMin(ee.variantKey, tuple(ee.created, ee.variantKey))'
    const multiVariantFilter =
      experiment.multipleVariantHandling === MultipleVariantHandling.EXCLUDE
        ? 'HAVING uniqExact(ee.variantKey) = 1'
        : ''

    return `
      SELECT
        ee.pid as pid,
        ee.profileId as profileId,
        ${variantSelector} as variantKey,
        min(ee.created) as exposureCreated
      FROM experiment_exposures ee
      WHERE
        ee.pid = {pid:FixedString(12)}
        AND ee.experimentId = {experimentId:String}
        AND ee.created BETWEEN {groupFrom:String} AND {groupTo:String}
      GROUP BY ee.pid, ee.profileId
      ${multiVariantFilter}
    `
  }

  private async generateExperimentChart(
    experiment: Experiment,
    timeBucket: TimeBucketType,
    groupFrom: string,
    groupTo: string,
    groupFromUTC: string,
    groupToUTC: string,
    safeTimezone: string,
  ): Promise<{ x: string[]; winProbability: Record<string, number[]> }> {
    const { xShifted } = this.analyticsService.generateXAxis(
      timeBucket,
      groupFrom,
      groupTo,
      safeTimezone,
    )

    const dateColumnsGroupBy = this.getTimeBucketDateColumnsGroupBy(timeBucket)
    const exposureAttributionSubquery =
      this.getExposureAttributionSubquery(experiment)
    const exposuresDateColumnsSelect = this.getTimeBucketDateColumnsSelect(
      timeBucket,
      'exposureCreated',
    )

    const exposuresQuery = `
      SELECT
        ${exposuresDateColumnsSelect},
        variantKey,
        count() as exposures
      FROM (
        ${exposureAttributionSubquery}
      )
      GROUP BY ${dateColumnsGroupBy}, variantKey
      ORDER BY ${dateColumnsGroupBy}
    `

    const queryParams = {
      pid: experiment.projectId,
      experimentId: experiment.id,
      groupFrom: groupFromUTC,
      groupTo: groupToUTC,
      timezone: safeTimezone,
    }

    let exposuresData: any[] = []
    try {
      const result = await clickhouse
        .query({ query: exposuresQuery, query_params: queryParams })
        .then((resultSet) => resultSet.json())
      exposuresData = result.data as any[]
    } catch (err) {
      this.logger.warn({ err }, 'Failed to get time-bucketed exposures')
    }

    let conversionsData: any[] = []
    if (experiment.goal) {
      const {
        eventType,
        matchCondition,
        metaCondition,
        metaParams,
        goalValue,
      } = this.buildGoalEventConditions(experiment.goal)
      const conversionsDateColumnsSelect = this.getTimeBucketDateColumnsSelect(
        timeBucket,
        'firstConversion',
      )

      const conversionsQuery = `
        SELECT
          ${conversionsDateColumnsSelect},
          variantKey,
          count() as conversions
        FROM (
          SELECT
            e.variantKey as variantKey,
            e.profileId as profileId,
            min(c.created) as firstConversion
          FROM (
            ${exposureAttributionSubquery}
          ) e
          INNER JOIN events c ON e.pid = c.pid
            AND c.profileId IS NOT NULL
            AND e.profileId = c.profileId
            AND c.type = '${eventType}'
          WHERE
            e.pid = {pid:FixedString(12)}
            AND c.created BETWEEN {groupFrom:String} AND {groupTo:String}
            AND c.created >= e.exposureCreated
            AND ${matchCondition}
            ${metaCondition}
          GROUP BY e.variantKey, e.profileId
        )
        GROUP BY ${dateColumnsGroupBy}, variantKey
        ORDER BY ${dateColumnsGroupBy}
      `

      try {
        const result = await clickhouse
          .query({
            query: conversionsQuery,
            query_params: { ...queryParams, goalValue, ...metaParams },
          })
          .then((resultSet) => resultSet.json())
        conversionsData = result.data as any[]
      } catch (err) {
        this.logger.warn({ err }, 'Failed to get time-bucketed conversions')
      }
    }

    const variantKeys = experiment.variants.map((variant) => variant.key)
    const winProbability: Record<string, number[]> = {}

    for (const key of variantKeys) {
      winProbability[key] = Array(xShifted.length).fill(0)
    }

    const cumulativeExposures: Record<string, number> = {}
    const cumulativeConversions: Record<string, number> = {}

    for (const key of variantKeys) {
      cumulativeExposures[key] = 0
      cumulativeConversions[key] = 0
    }

    const exposuresByBucket: Record<string, Record<string, number>> = {}
    for (const row of exposuresData) {
      const rowDate = this.generateDateStringFromRow(row, timeBucket)
      const key = row.variantKey
      if (!rowDate || !key) continue
      exposuresByBucket[rowDate] ||= {}
      exposuresByBucket[rowDate][key] = Number(row.exposures) || 0
    }

    const conversionsByBucket: Record<string, Record<string, number>> = {}
    for (const row of conversionsData) {
      const rowDate = this.generateDateStringFromRow(row, timeBucket)
      const key = row.variantKey
      if (!rowDate || !key) continue
      conversionsByBucket[rowDate] ||= {}
      conversionsByBucket[rowDate][key] = Number(row.conversions) || 0
    }

    for (let i = 0; i < xShifted.length; i++) {
      const bucketDate = xShifted[i]

      const exposuresDelta = exposuresByBucket[bucketDate]
      if (exposuresDelta) {
        for (const [key, value] of Object.entries(exposuresDelta)) {
          if (typeof cumulativeExposures[key] === 'number') {
            cumulativeExposures[key] += value
          }
        }
      }

      const conversionsDelta = conversionsByBucket[bucketDate]
      if (conversionsDelta) {
        for (const [key, value] of Object.entries(conversionsDelta)) {
          if (typeof cumulativeConversions[key] === 'number') {
            cumulativeConversions[key] += value
          }
        }
      }

      const variantData = variantKeys.map((key) => ({
        key,
        exposures: cumulativeExposures[key],
        conversions: cumulativeConversions[key],
      }))

      const probabilities = calculateBayesianProbabilities(variantData)

      for (const key of variantKeys) {
        winProbability[key][i] = _round((probabilities.get(key) || 0) * 100, 2)
      }
    }

    return {
      x: xShifted,
      winProbability,
    }
  }

  private getTimeBucketDateColumnsSelect(
    timeBucket: string,
    dateExpr: string,
  ): string {
    switch (timeBucket) {
      case 'minute':
        return `toYear(${dateExpr}, {timezone:String}) as year, toMonth(${dateExpr}, {timezone:String}) as month, toDayOfMonth(${dateExpr}, {timezone:String}) as day, toHour(${dateExpr}, {timezone:String}) as hour, toMinute(${dateExpr}, {timezone:String}) as minute`
      case 'hour':
        return `toYear(${dateExpr}, {timezone:String}) as year, toMonth(${dateExpr}, {timezone:String}) as month, toDayOfMonth(${dateExpr}, {timezone:String}) as day, toHour(${dateExpr}, {timezone:String}) as hour`
      case 'day':
        return `toYear(${dateExpr}, {timezone:String}) as year, toMonth(${dateExpr}, {timezone:String}) as month, toDayOfMonth(${dateExpr}, {timezone:String}) as day`
      case 'month':
        return `toYear(${dateExpr}, {timezone:String}) as year, toMonth(${dateExpr}, {timezone:String}) as month`
      case 'year':
        return `toYear(${dateExpr}, {timezone:String}) as year`
      default:
        return `toYear(${dateExpr}, {timezone:String}) as year, toMonth(${dateExpr}, {timezone:String}) as month, toDayOfMonth(${dateExpr}, {timezone:String}) as day`
    }
  }

  private getTimeBucketDateColumnsGroupBy(timeBucket: string): string {
    switch (timeBucket) {
      case 'minute':
        return 'year, month, day, hour, minute'
      case 'hour':
        return 'year, month, day, hour'
      case 'day':
        return 'year, month, day'
      case 'month':
        return 'year, month'
      case 'year':
        return 'year'
      default:
        return 'year, month, day'
    }
  }

  private generateDateStringFromRow(row: any, timeBucket: string): string {
    const { year, month, day, hour, minute } = row

    let dateString = `${year}`

    if (typeof month === 'number') {
      dateString += month < 10 ? `-0${month}` : `-${month}`
    }

    if (
      typeof day === 'number' &&
      timeBucket !== 'month' &&
      timeBucket !== 'year'
    ) {
      dateString += day < 10 ? `-0${day}` : `-${day}`
    }

    if (
      typeof hour === 'number' &&
      (timeBucket === 'hour' || timeBucket === 'minute')
    ) {
      const strMinute =
        typeof minute === 'number'
          ? minute < 10
            ? `0${minute}`
            : `${minute}`
          : '00'

      dateString +=
        hour < 10 ? ` 0${hour}:${strMinute}:00` : ` ${hour}:${strMinute}:00`
    }

    return dateString
  }
}

const dayString = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
