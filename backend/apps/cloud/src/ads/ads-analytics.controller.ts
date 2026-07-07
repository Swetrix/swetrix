import { Controller, Get, Query, NotFoundException } from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import _isEmpty from 'lodash/isEmpty'

import { Auth } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { ProjectService } from '../project/project.service'
import { AppLoggerService } from '../logger/logger.service'
import {
  AnalyticsService,
  getLowestPossibleTimeBucket,
} from '../analytics/analytics.service'
import { TimeBucketType } from '../analytics/dto/getData.dto'
import { AdsService, AdsCampaignRow, AdsChart, AdsStats } from './ads.service'
import { GetAdsDto } from './dto/get-ads.dto'

// ad_metrics is daily-grain; sub-day buckets cannot be served
const clampTimeBucket = (timeBucket: TimeBucketType): TimeBucketType => {
  if (
    timeBucket === TimeBucketType.MINUTE ||
    timeBucket === TimeBucketType.HOUR
  ) {
    return TimeBucketType.DAY
  }

  return timeBucket
}

@ApiTags('Ads Analytics')
@Controller(['log/ads', 'v1/log/ads'])
export class AdsAnalyticsController {
  constructor(
    private readonly adsService: AdsService,
    private readonly projectService: ProjectService,
    private readonly analyticsService: AnalyticsService,
    private readonly logger: AppLoggerService,
  ) {}

  private async getViewableProject(pid: string, userId: string) {
    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, userId)

    return project
  }

  private getRange(dto: GetAdsDto) {
    const safeTimezone = this.analyticsService.getSafeTimezone(dto.timezone)
    const timeBucket = clampTimeBucket(
      dto.timeBucket ||
        getLowestPossibleTimeBucket(dto.period, dto.from, dto.to),
    )

    const { groupFromUTC, groupToUTC } = this.analyticsService.getGroupFromTo(
      dto.from,
      dto.to,
      timeBucket,
      dto.period,
      safeTimezone,
    )

    return { safeTimezone, timeBucket, groupFromUTC, groupToUTC }
  }

  @ApiBearerAuth()
  @Get('/')
  @Auth(true, true)
  @ApiResponse({ status: 200 })
  async getAdsData(
    @CurrentUserId() userId: string,
    @Query() dto: GetAdsDto,
  ): Promise<
    | { notConnected: true }
    | {
        notConnected: false
        currency: string
        stats: AdsStats
        chart: AdsChart
      }
  > {
    this.logger.log({ userId, ...dto }, 'GET /log/ads')

    const project = await this.getViewableProject(dto.pid, userId)

    if (!project.googleAdsCustomerId) {
      return { notConnected: true }
    }

    const { safeTimezone, timeBucket, groupFromUTC, groupToUTC } =
      this.getRange(dto)

    const { xShifted } = this.analyticsService.generateXAxis(
      timeBucket,
      groupFromUTC,
      groupToUTC,
      safeTimezone,
    )

    const [stats, chart] = await Promise.all([
      this.adsService.getAdsStats(dto.pid, groupFromUTC, groupToUTC),
      this.adsService.getAdsChart(
        dto.pid,
        groupFromUTC,
        groupToUTC,
        timeBucket,
        safeTimezone,
        xShifted,
      ),
    ])

    return {
      notConnected: false,
      currency: project.revenueCurrency || 'USD',
      stats,
      chart,
    }
  }

  @ApiBearerAuth()
  @Get('/campaigns')
  @Auth(true, true)
  @ApiResponse({ status: 200 })
  async getCampaigns(
    @CurrentUserId() userId: string,
    @Query() dto: GetAdsDto,
  ): Promise<{ campaigns: AdsCampaignRow[] }> {
    this.logger.log({ userId, ...dto }, 'GET /log/ads/campaigns')

    const project = await this.getViewableProject(dto.pid, userId)

    if (!project.googleAdsCustomerId) {
      return { campaigns: [] }
    }

    const { groupFromUTC, groupToUTC } = this.getRange(dto)

    const campaigns = await this.adsService.getCampaignRows(
      dto.pid,
      groupFromUTC,
      groupToUTC,
    )

    return { campaigns }
  }

  @ApiBearerAuth()
  @Get('/campaign-map')
  @Auth(true, true)
  @ApiResponse({ status: 200 })
  async getCampaignMap(
    @CurrentUserId() userId: string,
    @Query() dto: GetAdsDto,
  ): Promise<{
    map: Record<
      string,
      {
        campaignId: string
        name: string
        cost: number
        clicks: number
        cpc: number
      }
    >
    currency: string
  }> {
    this.logger.log({ userId, ...dto }, 'GET /log/ads/campaign-map')

    const project = await this.getViewableProject(dto.pid, userId)
    const currency = project.revenueCurrency || 'USD'

    if (!project.googleAdsCustomerId) {
      return { map: {}, currency }
    }

    const { groupFromUTC, groupToUTC } = this.getRange(dto)

    const map = await this.adsService.getCampaignMap(
      dto.pid,
      groupFromUTC,
      groupToUTC,
    )

    return { map, currency }
  }
}
