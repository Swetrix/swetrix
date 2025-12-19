import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import _isEmpty from 'lodash/isEmpty'

import { ProjectService } from '../project/project.service'
import { AppLoggerService } from '../logger/logger.service'
import {
  AnalyticsService,
  getLowestPossibleTimeBucket,
} from '../analytics/analytics.service'
import { Auth } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { RevenueService } from './revenue.service'
import { PaddleAdapter } from './adapters/paddle.adapter'
import { StripeAdapter } from './adapters/stripe.adapter'
import { UpdateRevenueCurrencyDto } from './dto/connect-paddle.dto'
import { ConnectRevenueDto } from './dto/connect-revenue.dto'
import { GetRevenueDto, GetRevenueTransactionsDto } from './dto/get-revenue.dto'
import {
  RevenueStatsDto,
  RevenueChartDto,
  RevenueTransactionDto,
  RevenueBreakdownDto,
  RevenueStatusDto,
} from './dto/revenue-stats.dto'
import { STRIPE_REQUIRED_PERMISSIONS } from './interfaces/revenue.interface'

@ApiTags('Revenue')
@Controller('project')
export class RevenueController {
  constructor(
    private readonly revenueService: RevenueService,
    private readonly paddleAdapter: PaddleAdapter,
    private readonly stripeAdapter: StripeAdapter,
    private readonly projectService: ProjectService,
    private readonly analyticsService: AnalyticsService,
    private readonly logger: AppLoggerService,
  ) {}

  @ApiBearerAuth()
  @Get('/:pid/revenue/status')
  @Auth()
  @ApiResponse({ status: 200, type: RevenueStatusDto })
  async getRevenueStatus(
    @CurrentUserId() userId: string,
    @Param('pid') pid: string,
  ): Promise<RevenueStatusDto> {
    this.logger.log({ userId, pid }, 'GET /project/:pid/revenue/status')

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, userId)

    return this.revenueService.getRevenueStatus(project)
  }

  @ApiBearerAuth()
  @Post('/:pid/revenue/connect')
  @Auth()
  @ApiResponse({ status: 201 })
  async connectRevenue(
    @CurrentUserId() userId: string,
    @Param('pid') pid: string,
    @Body() dto: ConnectRevenueDto,
  ) {
    this.logger.log({ userId, pid }, 'POST /project/:pid/revenue/connect')

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToManage(
      project,
      userId,
      'You are not allowed to manage revenue settings for this project',
    )

    const currency = dto.currency || 'USD'

    if (dto.provider === 'paddle') {
      // Validate API key with Paddle
      const isValid = await this.paddleAdapter.validateApiKey(dto.apiKey)
      if (!isValid) {
        throw new BadRequestException(
          'Invalid Paddle API key. Please check your key and try again.',
        )
      }

      const result = await this.revenueService.connectPaddle(
        pid,
        dto.apiKey,
        currency,
      )

      if (!result.success) {
        throw new BadRequestException(result.message)
      }

      return { success: true }
    }

    // Stripe
    const isValid = await this.stripeAdapter.validateApiKey(dto.apiKey)
    if (!isValid) {
      throw new BadRequestException(
        'Invalid Stripe restricted API key. Please check your key and try again.',
      )
    }

    const result = await this.revenueService.connectStripe(
      pid,
      dto.apiKey,
      currency,
      STRIPE_REQUIRED_PERMISSIONS,
    )

    if (!result.success) {
      throw new BadRequestException(result.message)
    }

    return { success: true }
  }

  @ApiBearerAuth()
  @Delete('/:pid/revenue/disconnect')
  @Auth()
  @ApiResponse({ status: 204 })
  async disconnectRevenue(
    @CurrentUserId() userId: string,
    @Param('pid') pid: string,
  ) {
    this.logger.log({ userId, pid }, 'DELETE /project/:pid/revenue/disconnect')

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToManage(
      project,
      userId,
      'You are not allowed to manage revenue settings for this project',
    )

    await this.revenueService.disconnectRevenue(pid)
  }

  @ApiBearerAuth()
  @Post('/:pid/revenue/currency')
  @Auth()
  async updateCurrency(
    @CurrentUserId() userId: string,
    @Param('pid') pid: string,
    @Body() dto: UpdateRevenueCurrencyDto,
  ) {
    this.logger.log(
      { userId, pid, currency: dto.currency },
      'POST /project/:pid/revenue/currency',
    )

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToManage(
      project,
      userId,
      'You are not allowed to manage revenue settings for this project',
    )

    await this.revenueService.updateCurrency(pid, dto.currency)

    // Trigger immediate re-sync
    try {
      if (project.paddleApiKeyEnc) {
        const apiKey = this.revenueService.getPaddleApiKey(project)
        if (apiKey) {
          await this.paddleAdapter.syncTransactions(
            pid,
            apiKey,
            dto.currency,
            undefined, // Full re-sync
          )
          await this.revenueService.updateLastSyncAt(pid)
        }
      } else if (project.stripeApiKeyEnc) {
        const apiKey = this.revenueService.getStripeApiKey(project)
        if (apiKey) {
          await this.stripeAdapter.syncTransactions(
            pid,
            apiKey,
            dto.currency,
            undefined, // Full re-sync
          )
          await this.revenueService.updateLastSyncAt(pid)
        }
      }
    } catch (error) {
      this.logger.error(
        { error, pid },
        'Failed to trigger re-sync after currency update',
      )
      // Don't throw here, as currency was updated successfully
    }

    return { success: true }
  }

  @ApiBearerAuth()
  @Post('/:pid/revenue/sync')
  @Auth()
  async syncRevenue(
    @CurrentUserId() userId: string,
    @Param('pid') pid: string,
  ) {
    this.logger.log({ userId, pid }, 'POST /project/:pid/revenue/sync')

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToManage(
      project,
      userId,
      'You are not allowed to manage revenue settings for this project',
    )

    const currency = project.revenueCurrency || 'USD'

    if (!project.paddleApiKeyEnc && !project.stripeApiKeyEnc) {
      throw new BadRequestException(
        'Revenue tracking is not connected to this project',
      )
    }

    if (project.paddleApiKeyEnc) {
      const apiKey = this.revenueService.getPaddleApiKey(project)
      if (!apiKey) {
        throw new BadRequestException('Failed to decrypt Paddle API key')
      }

      const count = await this.paddleAdapter.syncTransactions(
        pid,
        apiKey,
        currency,
        project.revenueLastSyncAt || undefined,
      )

      await this.revenueService.updateLastSyncAt(pid)
      return { success: true, transactionsSynced: count }
    }

    // Stripe
    const apiKey = this.revenueService.getStripeApiKey(project)
    if (!apiKey) {
      throw new BadRequestException('Failed to decrypt Stripe API key')
    }

    const count = await this.stripeAdapter.syncTransactions(
      pid,
      apiKey,
      currency,
      project.revenueLastSyncAt || undefined,
    )

    await this.revenueService.updateLastSyncAt(pid)

    return { success: true, transactionsSynced: count }
  }
}

@ApiTags('Revenue Analytics')
@Controller('log/revenue')
export class RevenueAnalyticsController {
  constructor(
    private readonly revenueService: RevenueService,
    private readonly projectService: ProjectService,
    private readonly analyticsService: AnalyticsService,
    private readonly logger: AppLoggerService,
  ) {}

  @ApiBearerAuth()
  @Get('/')
  @Auth()
  @ApiResponse({ status: 200 })
  async getRevenueStats(
    @CurrentUserId() userId: string,
    @Query() dto: GetRevenueDto,
  ): Promise<{
    stats: RevenueStatsDto
    chart: RevenueChartDto
  }> {
    this.logger.log({ userId, ...dto }, 'GET /log/revenue')

    const project = await this.projectService.getFullProject(dto.pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, userId)

    if (!project.paddleApiKeyEnc && !project.stripeApiKeyEnc) {
      throw new BadRequestException(
        'Revenue tracking is not configured for this project',
      )
    }

    const safeTimezone = this.analyticsService.getSafeTimezone(dto.timezone)
    const timeBucket =
      dto.timeBucket ||
      getLowestPossibleTimeBucket(dto.period, dto.from, dto.to)

    const { groupFromUTC, groupToUTC } = this.analyticsService.getGroupFromTo(
      dto.from,
      dto.to,
      timeBucket as any,
      dto.period,
      safeTimezone,
    )

    const { xShifted } = this.analyticsService.generateXAxis(
      timeBucket as any,
      groupFromUTC,
      groupToUTC,
      safeTimezone,
    )

    const currency = project.revenueCurrency || 'USD'

    const [stats, chart] = await Promise.all([
      this.revenueService.getRevenueStats(
        dto.pid,
        groupFromUTC,
        groupToUTC,
        currency,
      ),
      this.revenueService.getRevenueChart(
        dto.pid,
        groupFromUTC,
        groupToUTC,
        timeBucket,
        safeTimezone,
        xShifted,
      ),
    ])

    return { stats, chart }
  }

  @ApiBearerAuth()
  @Get('/transactions')
  @Auth()
  @ApiResponse({ status: 200 })
  async getRevenueTransactions(
    @CurrentUserId() userId: string,
    @Query() dto: GetRevenueTransactionsDto,
  ): Promise<{ transactions: RevenueTransactionDto[]; total: number }> {
    this.logger.log({ userId, ...dto }, 'GET /log/revenue/transactions')

    const project = await this.projectService.getFullProject(dto.pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, userId)

    const safeTimezone = this.analyticsService.getSafeTimezone(dto.timezone)
    const timeBucket = getLowestPossibleTimeBucket(dto.period, dto.from, dto.to)

    const { groupFromUTC, groupToUTC } = this.analyticsService.getGroupFromTo(
      dto.from,
      dto.to,
      timeBucket as any,
      dto.period,
      safeTimezone,
    )

    return this.revenueService.getRevenueTransactions(
      dto.pid,
      groupFromUTC,
      groupToUTC,
      dto.take || 20,
      dto.skip || 0,
      dto.type,
      dto.status,
    )
  }

  @ApiBearerAuth()
  @Get('/breakdown')
  @Auth()
  @ApiResponse({ status: 200, type: RevenueBreakdownDto })
  async getRevenueBreakdown(
    @CurrentUserId() userId: string,
    @Query() dto: GetRevenueDto,
  ): Promise<RevenueBreakdownDto> {
    this.logger.log({ userId, ...dto }, 'GET /log/revenue/breakdown')

    const project = await this.projectService.getFullProject(dto.pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, userId)

    const safeTimezone = this.analyticsService.getSafeTimezone(dto.timezone)
    const timeBucket = getLowestPossibleTimeBucket(dto.period, dto.from, dto.to)

    const { groupFromUTC, groupToUTC } = this.analyticsService.getGroupFromTo(
      dto.from,
      dto.to,
      timeBucket as any,
      dto.period,
      safeTimezone,
    )

    return this.revenueService.getRevenueBreakdown(
      dto.pid,
      groupFromUTC,
      groupToUTC,
    )
  }
}
