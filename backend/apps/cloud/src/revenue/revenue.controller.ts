import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
  NotFoundException,
  ForbiddenException,
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
import {
  ConnectPaddleDto,
  UpdateRevenueCurrencyDto,
} from './dto/connect-paddle.dto'
import { GetRevenueDto, GetRevenueTransactionsDto } from './dto/get-revenue.dto'
import {
  RevenueStatsDto,
  RevenueChartDto,
  RevenueTransactionDto,
  RevenueBreakdownDto,
  RevenueStatusDto,
} from './dto/revenue-stats.dto'

@ApiTags('Revenue')
@Controller('project')
export class RevenueController {
  constructor(
    private readonly revenueService: RevenueService,
    private readonly paddleAdapter: PaddleAdapter,
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
  async connectPaddle(
    @CurrentUserId() userId: string,
    @Param('pid') pid: string,
    @Body() dto: ConnectPaddleDto,
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
      dto.currency || 'USD',
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
  async disconnectPaddle(
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

    await this.revenueService.disconnectPaddle(pid)
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

    if (!project.paddleApiKeyEnc) {
      throw new BadRequestException('Paddle is not connected to this project')
    }

    const apiKey = this.revenueService.getPaddleApiKey(project)
    if (!apiKey) {
      throw new BadRequestException('Failed to decrypt Paddle API key')
    }

    const count = await this.paddleAdapter.syncTransactions(
      pid,
      apiKey,
      project.revenueCurrency || 'USD',
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

    if (!project.paddleApiKeyEnc) {
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
