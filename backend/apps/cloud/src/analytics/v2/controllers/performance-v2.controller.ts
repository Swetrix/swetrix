import {
  Controller,
  Get,
  Headers,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger'

import { Auth } from '../../../auth/decorators'
import { CurrentUserId } from '../../../auth/decorators/current-user-id.decorator'
import { OptionalJwtAccessTokenGuard } from '../../../auth/guards'
import { AuthenticationGuard } from '../../../auth/guards/authentication.guard'
import { AppLoggerService } from '../../../logger/logger.service'
import { PerfMeasure } from '../../interfaces'
import { AnalyticsReadGuard } from '../../protection/analytics-read.guard'
import { CacheableAnalytics } from '../../protection/cacheable-analytics.decorator'
import { PublicProjectCacheInterceptor } from '../../protection/public-project-cache.interceptor'
import { AnalyticsV2Service } from '../analytics-v2.service'
import {
  V2PerfBreakdownDto,
  V2PerfSummaryDto,
  V2PerfTimeseriesDto,
} from '../dto/performance.dto'
import { V2ProjectParamsDto } from '../dto/v2-base.dto'

@ApiTags('Analytics v2')
@ApiBearerAuth()
@ApiSecurity('apiKey')
@UseGuards(OptionalJwtAccessTokenGuard, AuthenticationGuard, AnalyticsReadGuard)
@UseInterceptors(PublicProjectCacheInterceptor)
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('v2/projects/:pid/performance')
export class PerformanceV2Controller {
  constructor(
    private readonly analyticsV2Service: AnalyticsV2Service,
    private readonly logger: AppLoggerService,
  ) {}

  @Get('summary')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Performance summary',
    description:
      'Aggregated frontend/network/backend timings for the selected period, the previous period, and the change between them. Values are in seconds.',
  })
  async getSummary(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2PerfSummaryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(`pid: ${pid}`, 'GET /v2/projects/:pid/performance/summary')

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getPerformanceSummary(pid, query)
  }

  @Get('timeseries')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Performance timeseries',
    description:
      'Performance timings grouped by time bucket. With measure=quantiles, returns p50/p75/p95 of the total load time instead of individual timings. Values are in seconds.',
  })
  async getTimeseries(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2PerfTimeseriesDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(
      `pid: ${pid}, measure: ${query.measure}`,
      'GET /v2/projects/:pid/performance/timeseries',
    )

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getPerformanceTimeseries(pid, query)
  }

  @Get('breakdown')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Performance breakdown',
    description:
      'Performance timings grouped by a single dimension (country, page, browser, ...), paginated and sortable. Values are in seconds.',
  })
  async getBreakdown(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2PerfBreakdownDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(
      `pid: ${pid}, dimension: ${query.dimension}, measure: ${query.measure}`,
      'GET /v2/projects/:pid/performance/breakdown',
    )

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getBreakdown(
      pid,
      query,
      'performance',
      (query.measure || 'median') as PerfMeasure,
    )
  }
}
