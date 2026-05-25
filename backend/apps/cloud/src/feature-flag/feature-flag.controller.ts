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
  FeatureFlagProfilesResponseDto,
  KillFeatureFlagDto,
} from './dto/feature-flag.dto'
import { FeatureFlagService } from './feature-flag.service'
import { ExperimentService } from '../experiment/experiment.service'
import {
  ExperimentStatus,
  ExposureTrigger,
} from '../experiment/entity/experiment.entity'
import { clickhouse } from '../common/integrations/clickhouse'
import { checkRateLimit, getIPFromHeaders, getIPDetails } from '../common/utils'
import {
  FeatureFlagSchedule,
  FeatureFlagStaleReason,
  FeatureFlagStatus,
  applyDueScheduledChange,
  getExperimentVariant,
  isScheduledChangeDue,
} from './evaluation'
import { trackCustom } from '../common/analytics'

const FEATURE_FLAGS_MAXIMUM = 50 // Maximum feature flags per project
const FEATURE_FLAGS_PAGINATION_MAX_TAKE = 100
const FEATURE_FLAG_EVALUATION_STALE_DAYS = 30
const FEATURE_FLAG_TARGETING_STALE_DAYS = 90
const DAY_IN_MS = 24 * 60 * 60 * 1000

@ApiTags('Feature Flag')
@Controller(['feature-flag', 'v1/feature-flag'])
export class FeatureFlagController {
  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
    private readonly userService: UserService,
    private readonly analyticsService: AnalyticsService,
    private readonly experimentService: ExperimentService,
  ) {}

  private validateScheduledChange(
    scheduledChange?: FeatureFlagSchedule | null,
  ) {
    if (!scheduledChange) {
      return
    }

    if (
      scheduledChange.enabled === undefined &&
      scheduledChange.rolloutPercentage === undefined
    ) {
      throw new BadRequestException(
        'Scheduled change must include enabled or rolloutPercentage',
      )
    }

    const applyAt = new Date(scheduledChange.applyAt)

    if (Number.isNaN(applyAt.getTime())) {
      throw new BadRequestException('Scheduled change date is invalid')
    }

    if (applyAt.getTime() <= Date.now()) {
      throw new BadRequestException('Scheduled change must be in the future')
    }
  }

  private hasTargetingRulesChanged(
    current: FeatureFlag['targetingRules'],
    next?: FeatureFlag['targetingRules'],
  ) {
    if (next === undefined) {
      return false
    }

    return JSON.stringify(current || []) !== JSON.stringify(next || [])
  }

  private getAgeInDays(value?: Date | string | null) {
    if (!value) {
      return Number.POSITIVE_INFINITY
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return Number.POSITIVE_INFINITY
    }

    return (Date.now() - date.getTime()) / DAY_IN_MS
  }

  private getStaleReasons(
    flag: FeatureFlag,
    lastEvaluatedAt: string | null,
    completedExperimentIds: Set<string>,
    skipEvaluationStaleness = false,
  ) {
    const reasons: FeatureFlagStaleReason[] = []
    const createdAge = this.getAgeInDays(flag.created)
    const updatedAge = this.getAgeInDays(flag.updated || flag.created)
    const targetingAge = this.getAgeInDays(
      flag.targetingUpdatedAt || flag.created,
    )

    if (!skipEvaluationStaleness) {
      if (
        !lastEvaluatedAt &&
        createdAge >= FEATURE_FLAG_EVALUATION_STALE_DAYS
      ) {
        reasons.push(FeatureFlagStaleReason.NOT_EVALUATED_RECENTLY)
      } else if (
        lastEvaluatedAt &&
        this.getAgeInDays(lastEvaluatedAt) >= FEATURE_FLAG_EVALUATION_STALE_DAYS
      ) {
        reasons.push(FeatureFlagStaleReason.NOT_EVALUATED_RECENTLY)
      }
    }

    if (
      flag.flagType === 'rollout' &&
      (flag.rolloutPercentage === 0 || flag.rolloutPercentage === 100) &&
      updatedAge >= FEATURE_FLAG_EVALUATION_STALE_DAYS
    ) {
      reasons.push(FeatureFlagStaleReason.PERMANENT_ROLLOUT)
    }

    if (
      flag.targetingRules?.length > 0 &&
      targetingAge >= FEATURE_FLAG_TARGETING_STALE_DAYS
    ) {
      reasons.push(FeatureFlagStaleReason.TARGETING_UNCHANGED)
    }

    if (flag.experimentId && completedExperimentIds.has(flag.experimentId)) {
      reasons.push(FeatureFlagStaleReason.COMPLETED_EXPERIMENT)
    }

    return reasons
  }

  private getFlagStatus(
    flag: FeatureFlag,
    staleReasons: FeatureFlagStaleReason[],
  ) {
    if (flag.killSwitchActive) {
      return FeatureFlagStatus.KILLED
    }

    if (!isScheduledChangeDue(flag.scheduledChange) && flag.scheduledChange) {
      return FeatureFlagStatus.SCHEDULED
    }

    if (staleReasons.length > 0) {
      return FeatureFlagStatus.STALE
    }

    return flag.enabled ? FeatureFlagStatus.ENABLED : FeatureFlagStatus.DISABLED
  }

  private async decorateFeatureFlags(projectId: string, flags: FeatureFlag[]) {
    let skipEvaluationStaleness = false
    let lastEvaluatedAtByFlag = new Map<string, string>()

    try {
      lastEvaluatedAtByFlag =
        await this.featureFlagService.getLastEvaluatedAtByFlagIds(
          projectId,
          flags.map((flag) => flag.id),
        )
    } catch {
      skipEvaluationStaleness = true
    }

    const experimentIds = flags
      .map((flag) => flag.experimentId)
      .filter((id): id is string => Boolean(id))
    const completedExperimentIds = new Set<string>()

    if (experimentIds.length > 0) {
      const experiments = await this.experimentService.findByProject(projectId)

      for (const experiment of experiments) {
        if (
          experiment.status === ExperimentStatus.COMPLETED &&
          experimentIds.includes(experiment.id)
        ) {
          completedExperimentIds.add(experiment.id)
        }
      }
    }

    return _map(flags, (flag) => {
      const effectiveFlag = applyDueScheduledChange(flag)
      const lastEvaluatedAt =
        lastEvaluatedAtByFlag.get(effectiveFlag.id) || null
      const staleReasons = this.getStaleReasons(
        effectiveFlag,
        lastEvaluatedAt,
        completedExperimentIds,
        skipEvaluationStaleness,
      )

      return {
        ..._omit(effectiveFlag, ['project']),
        pid: projectId,
        lastEvaluatedAt,
        staleReasons,
        status: this.getFlagStatus(effectiveFlag, staleReasons),
      }
    })
  }

  @ApiBearerAuth()
  @Get('/project/:projectId')
  @Auth(true, true)
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

    await this.featureFlagService.applyDueScheduledChanges(projectId)

    const result = await this.featureFlagService.paginate(
      { take: safeTake, skip: safeSkip },
      projectId,
      search,
    )

    result.results = (await this.decorateFeatureFlags(
      projectId,
      result.results,
    )) as any

    return result
  }

  @ApiBearerAuth()
  @Get('/:flagId')
  @Auth(true, true)
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

    await this.featureFlagService.applyDueScheduledChanges(flag.project.id)

    const freshFlag =
      (await this.featureFlagService.findOne({
        where: { id: flagId },
        relations: ['project'],
      })) || flag
    const [decoratedFlag] = await this.decorateFeatureFlags(flag.project.id, [
      freshFlag,
    ])

    return decoratedFlag
  }

  @ApiBearerAuth()
  @Post('/')
  @Auth()
  @ApiResponse({ status: 201, type: FeatureFlagDto })
  @ApiOperation({ summary: 'Create a new feature flag' })
  async createFeatureFlag(
    @Body() flagDto: CreateFeatureFlagDto,
    @CurrentUserId() uid: string,
    @Headers() headers: Record<string, string>,
    @Ip() requestIp: string,
  ) {
    this.logger.log({ uid, pid: flagDto.pid }, 'POST /feature-flag')
    const ip = getIPFromHeaders(headers) || requestIp || ''

    const user = await this.userService.findOne({
      where: { id: uid },
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

    this.validateScheduledChange(flagDto.scheduledChange)

    try {
      const flag = new FeatureFlag()
      flag.key = flagDto.key
      flag.description = flagDto.description || null
      flag.flagType = flagDto.flagType || flag.flagType
      flag.rolloutPercentage = flagDto.rolloutPercentage ?? 100
      flag.targetingRules = flagDto.targetingRules || null
      flag.enabled = flagDto.enabled ?? true
      flag.scheduledChange = flagDto.scheduledChange || null
      flag.killSwitchActive = false
      flag.killSwitchValue = false
      flag.killedAt = null
      flag.targetingUpdatedAt = new Date()
      flag.project = project

      const newFlag = await this.featureFlagService.create(flag)

      await trackCustom(ip, headers['user-agent'], {
        ev: 'FEATURE_FLAG_CREATED',
      })

      const [decoratedFlag] = await this.decorateFeatureFlags(flagDto.pid, [
        newFlag,
      ])

      return decoratedFlag
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
      'Evaluates all feature flags for a project based on visitor attributes derived from the request. Does not require authentication.',
  })
  async evaluateFlags(
    @Body() evaluateDto: EvaluateFeatureFlagsDto,
    @Headers() headers: Record<string, string>,
    @Ip() reqIP: string,
  ) {
    this.logger.log({ pid: evaluateDto.pid }, 'POST /feature-flag/evaluate')

    const ip = getIPFromHeaders(headers) || reqIP || ''
    const userAgent = headers['user-agent'] || ''
    const origin = headers.origin || ''

    if (ip) {
      await checkRateLimit(ip, 'feature-flag-evaluate-ip', 600, 60)
    }
    await checkRateLimit(
      evaluateDto.pid,
      'feature-flag-evaluate-project',
      5000,
      60,
    )

    const botResult = await this.analyticsService.checkBot(
      evaluateDto.pid,
      userAgent,
      headers,
      ip,
      headers.referer || headers.referrer,
      null,
      'feature_flag',
    )

    if (botResult.isBot) {
      return { flags: {} }
    }

    let project
    try {
      project = await this.projectService.getRedisProject(evaluateDto.pid)
    } catch {
      project = await this.projectService.getFullProject(evaluateDto.pid)
    }

    // Return empty flags instead of revealing whether a project exists
    // This prevents project ID enumeration attacks
    if (_isEmpty(project) || !project.active) {
      return { flags: {} }
    }

    this.analyticsService.checkIpBlacklist(project, ip)
    this.analyticsService.checkOrigin(project, origin)
    this.analyticsService.checkIfAccountSuspended(project)

    // Derive attributes from request headers (like analytics does)
    const { country, city, region } = getIPDetails(ip)
    this.analyticsService.checkCountryBlacklist(project, country)

    await this.featureFlagService.applyDueScheduledChanges(evaluateDto.pid)

    const flags = await this.featureFlagService.findByProject(evaluateDto.pid)

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

    // Determine experiment variants for flags linked to running experiments
    const experimentVariants = new Map<string, string>()
    const flagsWithExperiments = flags.filter(
      (f) => f.experimentId && evaluatedFlags[f.key],
    )

    if (flagsWithExperiments.length > 0) {
      // Get running experiments for these flags
      const experiments = await this.experimentService.find({
        where: flagsWithExperiments.map((f) => ({
          id: f.experimentId,
          status: ExperimentStatus.RUNNING,
          exposureTrigger: ExposureTrigger.FEATURE_FLAG,
        })),
        relations: ['variants'],
      })

      for (const experiment of experiments) {
        if (experiment.variants && experiment.variants.length > 0) {
          // Sort variants by key to ensure stable ordering regardless of DB query order
          const sortedVariants = [...experiment.variants].sort((a, b) =>
            a.key.localeCompare(b.key),
          )
          const variantKey = getExperimentVariant(
            experiment.id,
            sortedVariants.map((v) => ({
              key: v.key,
              rolloutPercentage: v.rolloutPercentage,
            })),
            profileId,
          )
          if (variantKey) {
            experimentVariants.set(experiment.id, variantKey)
          }
        }
      }
    }

    // Track evaluations in ClickHouse (async, don't wait)
    this.trackEvaluations(
      evaluateDto.pid,
      flags,
      evaluatedFlags,
      profileId,
      experimentVariants,
    ).catch((err) => {
      this.logger.error({ err }, 'Failed to track flag evaluations')
    })

    // Build response with experiment variants
    const response: {
      flags: Record<string, boolean>
      experiments?: Record<string, string>
    } = {
      flags: evaluatedFlags,
    }

    if (experimentVariants.size > 0) {
      const experimentsByIdOrFlagKey: Record<string, string> = {}

      for (const [experimentId, variantKey] of experimentVariants.entries()) {
        experimentsByIdOrFlagKey[experimentId] = variantKey

        const linkedFlags = flagsWithExperiments.filter(
          (flag) => flag.experimentId === experimentId,
        )

        for (const linkedFlag of linkedFlags) {
          if (linkedFlag.key) {
            experimentsByIdOrFlagKey[linkedFlag.key] = variantKey
          }
        }
      }

      response.experiments = experimentsByIdOrFlagKey
    }

    return response
  }

  private async trackEvaluations(
    pid: string,
    flags: FeatureFlag[],
    evaluatedFlags: Record<string, boolean>,
    profileId: string,
    experimentVariants?: Map<string, string>, // experimentId -> variantKey
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

    // Track experiment exposures for flags linked to experiments
    if (experimentVariants && experimentVariants.size > 0) {
      const experimentExposures = Array.from(experimentVariants.entries()).map(
        ([experimentId, variantKey]) => ({
          pid,
          experimentId,
          variantKey,
          profileId,
          created: now,
        }),
      )

      try {
        await clickhouse.insert({
          table: 'experiment_exposures',
          values: experimentExposures,
          format: 'JSONEachRow',
        })
      } catch (err) {
        this.logger.error({ err }, 'Failed to insert experiment exposures')
      }
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

    await this.featureFlagService.applyDueScheduledChanges(flag.project.id)

    this.validateScheduledChange(flagDto.scheduledChange)

    const updatePayload: Partial<FeatureFlag> = {
      ..._pick(flagDto, [
        'key',
        'description',
        'flagType',
        'rolloutPercentage',
        'targetingRules',
        'enabled',
        'scheduledChange',
      ]),
    }

    if (
      this.hasTargetingRulesChanged(flag.targetingRules, flagDto.targetingRules)
    ) {
      updatePayload.targetingUpdatedAt = new Date()
    }

    await this.featureFlagService.update(id, updatePayload)

    const updatedFlag = await this.featureFlagService.findOne({ where: { id } })
    if (!updatedFlag) {
      throw new NotFoundException('Feature flag not found after update')
    }

    const [decoratedFlag] = await this.decorateFeatureFlags(flag.project.id, [
      updatedFlag,
    ])

    return decoratedFlag
  }

  @ApiBearerAuth()
  @Put('/:id/kill')
  @Auth()
  @ApiResponse({ status: 200, type: FeatureFlagDto })
  @ApiOperation({ summary: 'Activate the feature flag kill switch' })
  async killFeatureFlag(
    @Param('id') id: string,
    @Body() killDto: KillFeatureFlagDto,
    @CurrentUserId() uid: string,
    @Headers() headers: Record<string, string>,
    @Ip() requestIp: string,
  ) {
    this.logger.log({ id, uid }, 'PUT /feature-flag/:id/kill')
    const ip = getIPFromHeaders(headers) || requestIp || ''

    const flag = await this.featureFlagService.findOneWithRelations(id)

    if (_isEmpty(flag)) {
      throw new NotFoundException()
    }

    this.projectService.allowedToManage(
      flag.project,
      uid,
      'You are not allowed to manage this feature flag',
    )

    await this.featureFlagService.applyDueScheduledChanges(flag.project.id)

    await this.featureFlagService.update(id, {
      killSwitchActive: true,
      killSwitchValue: killDto.killSwitchValue ?? false,
      killedAt: new Date(),
    })

    await trackCustom(ip, headers['user-agent'], {
      ev: 'FEATURE_FLAG_KILLED',
    })

    const updatedFlag = await this.featureFlagService.findOne({ where: { id } })
    if (!updatedFlag) {
      throw new NotFoundException('Feature flag not found after update')
    }

    const [decoratedFlag] = await this.decorateFeatureFlags(flag.project.id, [
      updatedFlag,
    ])

    return decoratedFlag
  }

  @ApiBearerAuth()
  @Put('/:id/release-kill-switch')
  @Auth()
  @ApiResponse({ status: 200, type: FeatureFlagDto })
  @ApiOperation({ summary: 'Release the feature flag kill switch' })
  async releaseFeatureFlagKillSwitch(
    @Param('id') id: string,
    @CurrentUserId() uid: string,
    @Headers() headers: Record<string, string>,
    @Ip() requestIp: string,
  ) {
    this.logger.log({ id, uid }, 'PUT /feature-flag/:id/release-kill-switch')
    const ip = getIPFromHeaders(headers) || requestIp || ''

    const flag = await this.featureFlagService.findOneWithRelations(id)

    if (_isEmpty(flag)) {
      throw new NotFoundException()
    }

    this.projectService.allowedToManage(
      flag.project,
      uid,
      'You are not allowed to manage this feature flag',
    )

    await this.featureFlagService.applyDueScheduledChanges(flag.project.id)

    await this.featureFlagService.update(id, {
      killSwitchActive: false,
      killedAt: null,
    })

    await trackCustom(ip, headers['user-agent'], {
      ev: 'FEATURE_FLAG_KILL_SWITCH_RELEASED',
    })

    const updatedFlag = await this.featureFlagService.findOne({ where: { id } })
    if (!updatedFlag) {
      throw new NotFoundException('Feature flag not found after update')
    }

    const [decoratedFlag] = await this.decorateFeatureFlags(flag.project.id, [
      updatedFlag,
    ])

    return decoratedFlag
  }

  @ApiBearerAuth()
  @Delete('/:id')
  @Auth()
  @ApiResponse({ status: 204, description: 'Empty body' })
  @ApiOperation({ summary: 'Delete a feature flag' })
  async deleteFeatureFlag(
    @Param('id') id: string,
    @CurrentUserId() uid: string,
    @Headers() headers: Record<string, string>,
    @Ip() requestIp: string,
  ) {
    this.logger.log({ id, uid }, 'DELETE /feature-flag/:id')
    const ip = getIPFromHeaders(headers) || requestIp || ''

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

    await trackCustom(ip, headers['user-agent'], {
      ev: 'FEATURE_FLAG_DELETED',
    })
  }

  @ApiBearerAuth()
  @Get('/:id/stats')
  @Auth(true, true)
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
      pid: flag.project.id,
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
  @Auth(true, true)
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
      pid: flag.project.id,
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
