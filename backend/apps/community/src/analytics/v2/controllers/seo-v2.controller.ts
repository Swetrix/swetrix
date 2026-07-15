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
import { AnalyticsReadGuard } from '../../protection/analytics-read.guard'
import { CacheableAnalytics } from '../../protection/cacheable-analytics.decorator'
import { PublicProjectCacheInterceptor } from '../../protection/public-project-cache.interceptor'
import { AnalyticsV2Service } from '../analytics-v2.service'
import {
  V2SeoBreakdownDto,
  V2SeoRangeDto,
  V2SeoSummaryDto,
  V2SeoTimeseriesDto,
} from '../dto/seo.dto'
import { V2ProjectParamsDto } from '../dto/v2-base.dto'
import { SeoV2Service } from '../seo-v2.service'

@ApiTags('Analytics v2')
@ApiBearerAuth()
@ApiSecurity('apiKey')
@UseGuards(OptionalJwtAccessTokenGuard, AuthenticationGuard, AnalyticsReadGuard)
@UseInterceptors(PublicProjectCacheInterceptor)
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('v2/projects/:pid/seo')
export class SeoV2Controller {
  constructor(
    private readonly seoV2Service: SeoV2Service,
    private readonly analyticsV2Service: AnalyticsV2Service,
    private readonly logger: AppLoggerService,
  ) {}

  @Get('status')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Search Console connection status',
    description:
      'Whether Google Search Console is connected for this project and which property is linked. The other seo endpoints return 409 until both are true.',
  })
  async getStatus(
    @Param() { pid }: V2ProjectParamsDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(`pid: ${pid}`, 'GET /v2/projects/:pid/seo/status')

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.seoV2Service.getStatus(pid)
  }

  @Get('summary')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'SEO summary',
    description:
      'Clicks, impressions, CTR and average position for the selected period, the previous period of the same length, and the change between them.',
  })
  async getSummary(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2SeoSummaryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(`pid: ${pid}`, 'GET /v2/projects/:pid/seo/summary')

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.seoV2Service.getSummary(pid, query)
  }

  @Get('timeseries')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'SEO timeseries',
    description:
      'Selected SEO metrics grouped by time bucket, as rows of objects with ISO-8601 timestamps.',
  })
  async getTimeseries(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2SeoTimeseriesDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(`pid: ${pid}`, 'GET /v2/projects/:pid/seo/timeseries')

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.seoV2Service.getTimeseries(pid, query)
  }

  @Get('breakdown')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'SEO breakdown',
    description:
      'SEO metrics grouped by a single dimension (query, page, country, device), paginated. Rows are always ordered by clicks descending.',
  })
  async getBreakdown(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2SeoBreakdownDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(
      `pid: ${pid}, dimension: ${query.dimension}`,
      'GET /v2/projects/:pid/seo/breakdown',
    )

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.seoV2Service.getBreakdown(pid, query)
  }

  @Get('branded-traffic')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Branded vs non-branded traffic',
    description:
      "Clicks split by whether the search query contained one of the project's brand keywords. Skipped for ranges wider than 31 days.",
  })
  async getBrandedTraffic(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2SeoRangeDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(`pid: ${pid}`, 'GET /v2/projects/:pid/seo/branded-traffic')

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.seoV2Service.getBrandedTraffic(pid, query)
  }

  @Get('positions')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Search position analytics',
    description:
      'Impressions bucketed by search position, and the daily count of ranking queries per position bucket. Skipped for ranges wider than 31 days.',
  })
  async getPositions(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2SeoRangeDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(`pid: ${pid}`, 'GET /v2/projects/:pid/seo/positions')

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.seoV2Service.getPositions(pid, query)
  }
}
