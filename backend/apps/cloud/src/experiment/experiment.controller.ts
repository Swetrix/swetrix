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
import _omit from 'lodash/omit'
import _pick from 'lodash/pick'
import _round from 'lodash/round'
import _sum from 'lodash/sum'
import { DataSource } from 'typeorm'

import { UserService } from '../user/user.service'
import { ProjectService } from '../project/project.service'
import { AppLoggerService } from '../logger/logger.service'
import { PlanCode } from '../user/entities/user.entity'
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
import { FeatureFlagService } from '../feature-flag/feature-flag.service'
import {
  FeatureFlag,
  FeatureFlagType,
} from '../feature-flag/entity/feature-flag.entity'
import { clickhouse } from '../common/integrations/clickhouse'
import { calculateBayesianProbabilities } from './bayesian'
import { trackCustom } from '../common/analytics'
import { Pagination } from '../common/pagination'

const EXPERIMENTS_MAXIMUM = 20 // Maximum experiments per project
const FEATURE_FLAG_KEY_REGEX = /^[a-zA-Z0-9_-]+$/

@ApiTags('Experiment')
@Controller(['experiment', 'v1/experiment'])
export class ExperimentController {
  constructor(
    private readonly experimentService: ExperimentService,
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
    private readonly userService: UserService,
    private readonly analyticsService: AnalyticsService,
    private readonly goalService: GoalService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly dataSource: DataSource,
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

    const safeTake =
      typeof take === 'number' ? Math.min(Math.max(take, 1), 200) : undefined
    const safeSkip = typeof skip === 'number' ? Math.max(skip, 0) : undefined

    const result = await this.experimentService.paginate(
      { take: safeTake, skip: safeSkip },
      projectId,
      search,
    )

    const mappedResults: ExperimentDto[] = _map(
      result.results,
      experiment =>
        ({
          ..._omit(experiment, ['project', 'goal', 'featureFlag']),
          pid: projectId,
          goalId: experiment.goal?.id || null,
          featureFlagId: experiment.featureFlag?.id || null,
        }) as ExperimentDto,
    )

    return new Pagination<ExperimentDto>({
      results: mappedResults,
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
      experiment.project.id,
    )

    this.projectService.allowedToView(project, userId)

    return {
      ..._omit(experiment, ['project', 'goal', 'featureFlag']),
      pid: experiment.project.id,
      goalId: experiment.goal?.id || null,
      featureFlagId: experiment.featureFlag?.id || null,
    }
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

    const user = await this.userService.findOne({
      where: { id: uid },
      relations: ['projects'],
    })

    if (!user.isActive) {
      throw new ForbiddenException('Please, verify your email address first')
    }

    const project = await this.projectService.findOne({
      where: {
        id: experimentDto.pid,
      },
      relations: ['experiments', 'admin'],
    })

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToManage(
      project,
      uid,
      'You are not allowed to add experiments to this project',
    )

    const experimentsCount = await this.experimentService.count({
      where: { project: { id: experimentDto.pid } },
    })

    if (user.planCode === PlanCode.none) {
      throw new HttpException(
        'You cannot create new experiments due to no active subscription. Please upgrade your account plan to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    if (user.isAccountBillingSuspended) {
      throw new HttpException(
        'The account that owns this site is currently suspended, this is because of a billing issue. Please resolve the issue to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    if (experimentsCount >= EXPERIMENTS_MAXIMUM) {
      throw new HttpException(
        `You cannot create more than ${EXPERIMENTS_MAXIMUM} experiments per project.`,
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    if (!experimentDto.variants || experimentDto.variants.length < 2) {
      throw new BadRequestException(
        'An experiment must have at least 2 variants',
      )
    }

    const controlVariants = experimentDto.variants.filter(v => v.isControl)
    if (controlVariants.length !== 1) {
      throw new BadRequestException(
        'An experiment must have exactly one control variant',
      )
    }

    const totalPercentage = _sum(
      experimentDto.variants.map(v => v.rolloutPercentage),
    )
    if (totalPercentage !== 100) {
      throw new BadRequestException(
        'Variant rollout percentages must sum to 100',
      )
    }

    let goal = null
    if (experimentDto.goalId) {
      goal = await this.goalService.findOne({
        where: { id: experimentDto.goalId, project: { id: experimentDto.pid } },
      })
      if (!goal) {
        throw new NotFoundException('Goal not found')
      }
    }

    if (
      experimentDto.exposureTrigger === ExposureTrigger.CUSTOM_EVENT &&
      !experimentDto.customEventName?.trim()
    ) {
      throw new BadRequestException(
        'Custom event name is required when using custom event exposure trigger',
      )
    }

    let existingFeatureFlag: FeatureFlag | null = null
    if (experimentDto.featureFlagMode === FeatureFlagMode.LINK) {
      if (!experimentDto.existingFeatureFlagId) {
        throw new BadRequestException(
          'Feature flag ID is required when linking an existing flag',
        )
      }
      existingFeatureFlag = await this.featureFlagService.findOne({
        where: {
          id: experimentDto.existingFeatureFlagId,
          project: { id: experimentDto.pid },
        },
      })
      if (!existingFeatureFlag) {
        throw new NotFoundException('Feature flag not found')
      }
      if (existingFeatureFlag.experimentId) {
        throw new BadRequestException(
          'This feature flag is already linked to another experiment',
        )
      }
    }

    try {
      const experiment = new Experiment()
      experiment.name = experimentDto.name
      experiment.description = experimentDto.description || null
      experiment.hypothesis = experimentDto.hypothesis || null
      experiment.status = ExperimentStatus.DRAFT
      experiment.project = project
      experiment.goal = goal

      experiment.exposureTrigger =
        experimentDto.exposureTrigger || ExposureTrigger.FEATURE_FLAG
      experiment.customEventName = experimentDto.customEventName || null
      experiment.multipleVariantHandling =
        experimentDto.multipleVariantHandling || MultipleVariantHandling.EXCLUDE
      experiment.filterInternalUsers =
        experimentDto.filterInternalUsers !== false

      experiment.featureFlagMode =
        experimentDto.featureFlagMode || FeatureFlagMode.CREATE
      experiment.featureFlagKey = experimentDto.featureFlagKey || null
      experiment.featureFlag = existingFeatureFlag

      experiment.variants = experimentDto.variants.map(v => {
        const variant = new ExperimentVariant()
        variant.name = v.name
        variant.key = v.key
        variant.description = v.description || null
        variant.rolloutPercentage = v.rolloutPercentage
        variant.isControl = v.isControl
        return variant
      })

      const newExperiment = await this.dataSource.transaction(
        async transactionalEntityManager => {
          const createdExperiment = await this.experimentService.create(
            experiment,
            transactionalEntityManager,
          )

          if (existingFeatureFlag) {
            await this.featureFlagService.update(
              existingFeatureFlag.id,
              {
                experimentId: createdExperiment.id,
              },
              transactionalEntityManager,
            )
          }

          return createdExperiment
        },
      )

      await trackCustom(ip, headers['user-agent'], {
        ev: 'EXPERIMENT_CREATED',
      })

      return {
        ..._omit(newExperiment, ['project', 'goal', 'featureFlag']),
        pid: experimentDto.pid,
        goalId: goal?.id || null,
        featureFlagId: existingFeatureFlag?.id || null,
      }
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

    this.projectService.allowedToManage(
      experiment.project,
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

    let goal = experiment.goal
    if (experimentDto.goalId !== undefined) {
      if (experimentDto.goalId) {
        goal = await this.goalService.findOne({
          where: {
            id: experimentDto.goalId,
            project: { id: experiment.project.id },
          },
        })
        if (!goal) {
          throw new NotFoundException('Goal not found')
        }
      } else {
        goal = null
      }
    }

    await this.dataSource.transaction(async transactionalEntityManager => {
      if (experimentDto.variants) {
        if (experimentDto.variants.length < 2) {
          throw new BadRequestException(
            'An experiment must have at least 2 variants',
          )
        }

        const controlVariants = experimentDto.variants.filter(v => v.isControl)
        if (controlVariants.length !== 1) {
          throw new BadRequestException(
            'An experiment must have exactly one control variant',
          )
        }

        const totalPercentage = _sum(
          experimentDto.variants.map(v => v.rolloutPercentage),
        )
        if (totalPercentage !== 100) {
          throw new BadRequestException(
            'Variant rollout percentages must sum to 100',
          )
        }

        await this.experimentService.recreateVariants(
          experiment,
          experimentDto.variants,
          transactionalEntityManager,
        )
      }

      const exposureTrigger =
        experimentDto.exposureTrigger ?? experiment.exposureTrigger
      const customEventName =
        experimentDto.customEventName ?? experiment.customEventName
      if (
        exposureTrigger === ExposureTrigger.CUSTOM_EVENT &&
        !customEventName?.trim()
      ) {
        throw new BadRequestException(
          'Custom event name is required when using custom event exposure trigger',
        )
      }

      let featureFlag = experiment.featureFlag
      if (
        experimentDto.featureFlagMode !== undefined &&
        experimentDto.featureFlagMode !== experiment.featureFlagMode
      ) {
        if (experimentDto.featureFlagMode === FeatureFlagMode.LINK) {
          if (!experimentDto.existingFeatureFlagId) {
            throw new BadRequestException(
              'Feature flag ID is required when linking an existing flag',
            )
          }
          const existingFlag = await this.featureFlagService.findOne({
            where: {
              id: experimentDto.existingFeatureFlagId,
              project: { id: experiment.project.id },
            },
          })
          if (!existingFlag) {
            throw new NotFoundException('Feature flag not found')
          }
          if (existingFlag.experimentId && existingFlag.experimentId !== id) {
            throw new BadRequestException(
              'This feature flag is already linked to another experiment',
            )
          }
          if (experiment.featureFlag) {
            await this.featureFlagService.update(
              experiment.featureFlag.id,
              {
                experimentId: null,
              },
              transactionalEntityManager,
            )
          }
          await this.featureFlagService.update(
            existingFlag.id,
            {
              experimentId: id,
            },
            transactionalEntityManager,
          )
          featureFlag = existingFlag
        }
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
        goal,
        featureFlag,
      }

      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === undefined) {
          delete updatePayload[key]
        }
      })

      await this.experimentService.update(
        id,
        updatePayload,
        transactionalEntityManager,
      )
    })

    const updatedExperiment =
      await this.experimentService.findOneWithRelations(id)
    if (!updatedExperiment) {
      throw new NotFoundException('Experiment not found after update')
    }

    return {
      ..._omit(updatedExperiment, ['project', 'goal', 'featureFlag']),
      pid: experiment.project.id,
      goalId: updatedExperiment.goal?.id || null,
      featureFlagId: updatedExperiment.featureFlag?.id || null,
    }
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

    this.projectService.allowedToManage(
      experiment.project,
      uid,
      'You are not allowed to manage this experiment',
    )

    if (experiment.featureFlag) {
      if (experiment.featureFlagMode === FeatureFlagMode.CREATE) {
        await this.featureFlagService.delete(experiment.featureFlag.id)
      } else {
        await this.featureFlagService.update(experiment.featureFlag.id, {
          experimentId: null,
        })
      }
    }

    await this.experimentService.delete(id)

    await trackCustom(ip, headers['user-agent'], {
      ev: 'EXPERIMENT_DELETED',
    })
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

    const experiment = await this.experimentService.findOneWithRelations(id)

    if (_isEmpty(experiment)) {
      throw new NotFoundException()
    }

    this.projectService.allowedToManage(
      experiment.project,
      uid,
      'You are not allowed to manage this experiment',
    )

    if (experiment.status === ExperimentStatus.RUNNING) {
      throw new BadRequestException('Experiment is already running')
    }

    if (experiment.status === ExperimentStatus.COMPLETED) {
      throw new BadRequestException('Cannot restart a completed experiment')
    }

    if (!experiment.goal) {
      throw new BadRequestException(
        'Experiment must have a goal before starting',
      )
    }

    try {
      await this.dataSource.transaction(async transactionalEntityManager => {
        let featureFlag = experiment.featureFlag
        if (!featureFlag) {
          if (experiment.featureFlagMode === FeatureFlagMode.CREATE) {
            const flagKey =
              experiment.featureFlagKey?.trim() ||
              `experiment_${experiment.id.replace(/-/g, '_').substring(0, 20)}`

            if (!FEATURE_FLAG_KEY_REGEX.test(flagKey)) {
              throw new BadRequestException(
                'Feature flag key must contain only alphanumeric characters, underscores, and hyphens',
              )
            }

            const existingFlag = await this.featureFlagService.findOne({
              where: { key: flagKey, project: { id: experiment.project.id } },
            })
            if (existingFlag) {
              throw new BadRequestException(
                `Feature flag with key "${flagKey}" already exists`,
              )
            }

            featureFlag = new FeatureFlag()
            featureFlag.key = flagKey
            featureFlag.description = `Feature flag for experiment: ${experiment.name}`
            featureFlag.flagType = FeatureFlagType.ROLLOUT
            featureFlag.rolloutPercentage = 100
            featureFlag.enabled = true
            featureFlag.project = experiment.project
            featureFlag.experimentId = experiment.id
            featureFlag = await this.featureFlagService.create(
              featureFlag,
              transactionalEntityManager,
            )
          } else {
            throw new BadRequestException(
              'No feature flag linked to this experiment. Please link a feature flag first.',
            )
          }
        } else {
          await this.featureFlagService.update(
            featureFlag.id,
            { enabled: true },
            transactionalEntityManager,
          )
        }

        await this.experimentService.update(
          id,
          {
            status: ExperimentStatus.RUNNING,
            startedAt: new Date(),
            featureFlag,
          },
          transactionalEntityManager,
        )
      })
    } catch (reason) {
      this.logger.error({ reason, id }, 'Error while starting experiment')

      if (reason instanceof HttpException) {
        throw reason
      }

      throw new BadRequestException('Error occurred while starting experiment')
    }

    const updatedExperiment =
      await this.experimentService.findOneWithRelations(id)

    return {
      ..._omit(updatedExperiment, ['project', 'goal', 'featureFlag']),
      pid: experiment.project.id,
      goalId: updatedExperiment?.goal?.id || null,
      featureFlagId: updatedExperiment?.featureFlag?.id || null,
    }
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

    const experiment = await this.experimentService.findOneWithRelations(id)

    if (_isEmpty(experiment)) {
      throw new NotFoundException()
    }

    this.projectService.allowedToManage(
      experiment.project,
      uid,
      'You are not allowed to manage this experiment',
    )

    if (experiment.status !== ExperimentStatus.RUNNING) {
      throw new BadRequestException('Can only pause a running experiment')
    }

    if (experiment.featureFlag) {
      await this.featureFlagService.update(experiment.featureFlag.id, {
        enabled: false,
      })
    }

    await this.experimentService.update(id, {
      status: ExperimentStatus.PAUSED,
    })

    const updatedExperiment =
      await this.experimentService.findOneWithRelations(id)

    return {
      ..._omit(updatedExperiment, ['project', 'goal', 'featureFlag']),
      pid: experiment.project.id,
      goalId: updatedExperiment?.goal?.id || null,
      featureFlagId: updatedExperiment?.featureFlag?.id || null,
    }
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

    const experiment = await this.experimentService.findOneWithRelations(id)

    if (_isEmpty(experiment)) {
      throw new NotFoundException()
    }

    this.projectService.allowedToManage(
      experiment.project,
      uid,
      'You are not allowed to manage this experiment',
    )

    if (
      experiment.status !== ExperimentStatus.RUNNING &&
      experiment.status !== ExperimentStatus.PAUSED
    ) {
      throw new BadRequestException(
        'Can only complete a running or paused experiment',
      )
    }

    if (experiment.featureFlag) {
      await this.featureFlagService.update(experiment.featureFlag.id, {
        enabled: false,
      })
    }

    await this.experimentService.update(id, {
      status: ExperimentStatus.COMPLETED,
      endedAt: new Date(),
    })

    const updatedExperiment =
      await this.experimentService.findOneWithRelations(id)

    return {
      ..._omit(updatedExperiment, ['project', 'goal', 'featureFlag']),
      pid: experiment.project.id,
      goalId: updatedExperiment?.goal?.id || null,
      featureFlagId: updatedExperiment?.featureFlag?.id || null,
    }
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

    const experiment = await this.experimentService.findOneWithRelations(id)

    if (_isEmpty(experiment)) {
      throw new NotFoundException('Experiment not found')
    }

    const project = await this.projectService.getFullProject(
      experiment.project.id,
    )
    this.projectService.allowedToView(project, userId)

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)

    let timeBucket =
      timeBucketParam || getLowestPossibleTimeBucket(period, from, to)
    let allowedTimeBucketForPeriodAll: TimeBucketType[] | undefined
    let diff: number | undefined

    if (period === 'all') {
      const res = await this.analyticsService.calculateTimeBucketForAllTime(
        experiment.project.id,
        'analytics',
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

    const exposuresQuery = `
      SELECT 
        variantKey,
        uniqExact(profileId) as exposures
      FROM experiment_exposures
      WHERE 
        pid = {pid:FixedString(12)}
        AND experimentId = {experimentId:String}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
      GROUP BY variantKey
    `

    const exposuresParams = {
      pid: experiment.project.id,
      experimentId: experiment.id,
      groupFrom: groupFromUTC,
      groupTo: groupToUTC,
    }

    let exposuresData: { variantKey: string; exposures: number }[] = []
    try {
      const result = await clickhouse
        .query({ query: exposuresQuery, query_params: exposuresParams })
        .then(resultSet =>
          resultSet.json<{ variantKey: string; exposures: number }>(),
        )
      exposuresData = result.data
    } catch (err) {
      this.logger.warn({ err }, 'Failed to get experiment exposures')
    }

    let conversionsData: { variantKey: string; conversions: number }[] = []
    if (experiment.goal) {
      const goalType = experiment.goal.type
      const table = goalType === 'custom_event' ? 'customEV' : 'analytics'
      const matchColumn = goalType === 'custom_event' ? 'ev' : 'pg'
      const goalValue = experiment.goal.value || ''

      let matchCondition = ''
      if (experiment.goal.matchType === 'exact') {
        matchCondition = `c.${matchColumn} = {goalValue:String}`
      } else {
        matchCondition = `c.${matchColumn} ILIKE concat('%', {goalValue:String}, '%')`
      }

      let metaCondition = ''
      const metaParams: Record<string, string> = {}
      const metadataFilters = experiment.goal.metadataFilters
      if (metadataFilters && metadataFilters.length > 0) {
        const conditions: string[] = []
        metadataFilters.forEach((filter, index) => {
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

      const conversionsQuery = `
        SELECT 
          e.variantKey,
          uniqExact(e.profileId) as conversions
        FROM experiment_exposures e
        INNER JOIN ${table} c ON e.pid = c.pid AND e.profileId = assumeNotNull(c.profileId)
        WHERE 
          e.pid = {pid:FixedString(12)}
          AND e.experimentId = {experimentId:String}
          AND e.created BETWEEN {groupFrom:String} AND {groupTo:String}
          AND c.created BETWEEN {groupFrom:String} AND {groupTo:String}
          AND c.created >= e.created
          AND ${matchCondition}
          ${metaCondition}
        GROUP BY e.variantKey
      `

      const conversionsParams = {
        pid: experiment.project.id,
        experimentId: experiment.id,
        groupFrom: groupFromUTC,
        groupTo: groupToUTC,
        goalValue,
        ...metaParams,
      }

      try {
        const result = await clickhouse
          .query({ query: conversionsQuery, query_params: conversionsParams })
          .then(resultSet =>
            resultSet.json<{ variantKey: string; conversions: number }>(),
          )
        conversionsData = result.data
      } catch (err) {
        this.logger.warn({ err }, 'Failed to get experiment conversions')
      }
    }

    const exposuresMap = new Map(
      exposuresData.map(e => [e.variantKey, Number(e.exposures)]),
    )
    const conversionsMap = new Map(
      conversionsData.map(c => [c.variantKey, Number(c.conversions)]),
    )

    const controlVariant = experiment.variants.find(v => v.isControl)
    const controlExposures = controlVariant
      ? exposuresMap.get(controlVariant.key) || 0
      : 0
    const controlConversions = controlVariant
      ? conversionsMap.get(controlVariant.key) || 0
      : 0
    const controlRate =
      controlExposures > 0 ? controlConversions / controlExposures : 0

    const variantData = experiment.variants.map(v => ({
      key: v.key,
      exposures: exposuresMap.get(v.key) || 0,
      conversions: conversionsMap.get(v.key) || 0,
    }))

    const probabilities = calculateBayesianProbabilities(variantData)

    const variantResults: VariantResultDto[] = experiment.variants.map(v => {
      const exposures = exposuresMap.get(v.key) || 0
      const conversions = conversionsMap.get(v.key) || 0
      const conversionRate = exposures > 0 ? conversions / exposures : 0
      const improvement = v.isControl
        ? 0
        : controlRate > 0
          ? ((conversionRate - controlRate) / controlRate) * 100
          : conversionRate > 0
            ? 100
            : 0

      return {
        key: v.key,
        name: v.name,
        isControl: v.isControl,
        exposures,
        conversions,
        conversionRate: _round(conversionRate * 100, 2),
        probabilityOfBeingBest: _round(
          (probabilities.get(v.key) || 0) * 100,
          2,
        ),
        improvement: _round(improvement, 2),
      }
    })

    const totalExposures = _sum(variantResults.map(v => v.exposures))
    const totalConversions = _sum(variantResults.map(v => v.conversions))

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

  /**
   * Generate time-series chart data for experiment win probabilities
   */
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

    // Important: table results use overall uniqExact(profileId) counts per variant.
    // For the time-series we must avoid "summing per-bucket uniques", because a profile
    // can appear in multiple time buckets (re-exposed / repeated events). Instead we:
    // - bucket exposures by the first exposure per (variantKey, profileId)
    // - bucket conversions by the first conversion per (variantKey, profileId)
    // This guarantees that the last chart point uses the same data as the table.
    const dateColumnsGroupBy = this.getTimeBucketDateColumnsGroupBy(timeBucket)
    const exposuresDateColumnsSelect = this.getTimeBucketDateColumnsSelect(
      timeBucket,
      'firstCreated',
    )

    const exposuresQuery = `
      SELECT
        ${exposuresDateColumnsSelect},
        variantKey,
        count() as exposures
      FROM (
        SELECT
          variantKey,
          profileId,
          min(created) as firstCreated
        FROM experiment_exposures
        WHERE
          pid = {pid:FixedString(12)}
          AND experimentId = {experimentId:String}
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        GROUP BY variantKey, profileId
      )
      GROUP BY ${dateColumnsGroupBy}, variantKey
      ORDER BY ${dateColumnsGroupBy}
    `

    const queryParams = {
      pid: experiment.project.id,
      experimentId: experiment.id,
      groupFrom: groupFromUTC,
      groupTo: groupToUTC,
      timezone: safeTimezone,
    }

    let exposuresData: any[] = []
    try {
      const result = await clickhouse
        .query({ query: exposuresQuery, query_params: queryParams })
        .then(resultSet => resultSet.json())
      exposuresData = result.data as any[]
    } catch (err) {
      this.logger.warn({ err }, 'Failed to get time-bucketed exposures')
    }

    let conversionsData: any[] = []
    if (experiment.goal) {
      const goalType = experiment.goal.type
      const table = goalType === 'custom_event' ? 'customEV' : 'analytics'
      const matchColumn = goalType === 'custom_event' ? 'ev' : 'pg'
      const goalValue = experiment.goal.value || ''
      const conversionsDateColumnsSelect = this.getTimeBucketDateColumnsSelect(
        timeBucket,
        'firstConversion',
      )

      let matchCondition = ''
      if (experiment.goal.matchType === 'exact') {
        matchCondition = `c.${matchColumn} = {goalValue:String}`
      } else {
        matchCondition = `c.${matchColumn} ILIKE concat('%', {goalValue:String}, '%')`
      }

      let metaCondition = ''
      const metaParams: Record<string, string> = {}
      const metadataFilters = experiment.goal.metadataFilters
      if (metadataFilters && metadataFilters.length > 0) {
        const conditions: string[] = []
        metadataFilters.forEach((filter, index) => {
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
          FROM experiment_exposures e
          INNER JOIN ${table} c ON e.pid = c.pid AND e.profileId = assumeNotNull(c.profileId)
          WHERE
            e.pid = {pid:FixedString(12)}
            AND e.experimentId = {experimentId:String}
            AND e.created BETWEEN {groupFrom:String} AND {groupTo:String}
            AND c.created BETWEEN {groupFrom:String} AND {groupTo:String}
            AND c.created >= e.created
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
          .then(resultSet => resultSet.json())
        conversionsData = result.data as any[]
      } catch (err) {
        this.logger.warn({ err }, 'Failed to get time-bucketed conversions')
      }
    }

    const variantKeys = experiment.variants.map(v => v.key)
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

      const variantData = variantKeys.map(key => ({
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

  /**
   * Get SQL date columns for time bucket grouping
   */
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

  /**
   * Generate date string from row based on time bucket
   */
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

      if (hour < 10) {
        dateString += ` 0${hour}:${strMinute}:00`
      } else {
        dateString += ` ${hour}:${strMinute}:00`
      }
    }

    return dateString
  }
}
