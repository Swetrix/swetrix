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
  V2CustomEventsTimeseriesDto,
  V2EventMetadataQueryDto,
  V2PropertyMetadataQueryDto,
} from '../dto/project.dto'
import {
  V2BreakdownDto,
  V2ListQueryDto,
  V2ProjectParamsDto,
  V2SummaryDto,
  V2TimeseriesDto,
} from '../dto/v2-base.dto'

@ApiTags('Analytics v2')
@ApiBearerAuth()
@ApiSecurity('apiKey')
@UseGuards(OptionalJwtAccessTokenGuard, AuthenticationGuard, AnalyticsReadGuard)
@UseInterceptors(PublicProjectCacheInterceptor)
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('v2/projects/:pid/traffic')
export class TrafficV2Controller {
  constructor(
    private readonly analyticsV2Service: AnalyticsV2Service,
    private readonly logger: AppLoggerService,
  ) {}

  @Get('summary')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Traffic summary',
    description:
      'Key traffic metrics for the selected period, the previous period of the same length, and the change between them.',
  })
  async getSummary(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2SummaryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(`pid: ${pid}`, 'GET /v2/projects/:pid/traffic/summary')

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getTrafficSummary(pid, query)
  }

  @Get('timeseries')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Traffic timeseries',
    description:
      'Selected traffic metrics grouped by time bucket, as rows of objects with ISO-8601 timestamps.',
  })
  async getTimeseries(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2TimeseriesDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(`pid: ${pid}`, 'GET /v2/projects/:pid/traffic/timeseries')

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getTrafficTimeseries(pid, query)
  }

  @Get('breakdown')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Traffic breakdown',
    description:
      'Selected traffic metrics grouped by a single dimension (country, page, browser, ...), paginated and sortable.',
  })
  async getBreakdown(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2BreakdownDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(
      `pid: ${pid}, dimension: ${query.dimension}`,
      'GET /v2/projects/:pid/traffic/breakdown',
    )

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getBreakdown(pid, query, 'traffic')
  }

  @Get('custom-events')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Custom events',
    description:
      'Counts of custom events recorded in the selected period, sorted by count.',
  })
  async getCustomEvents(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2ListQueryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(
      `pid: ${pid}`,
      'GET /v2/projects/:pid/traffic/custom-events',
    )

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getTrafficCustomEvents(pid, query)
  }

  @Get('custom-events/timeseries')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Custom events timeseries',
    description:
      'Occurrence counts for the selected custom events grouped by time bucket.',
  })
  async getCustomEventsTimeseries(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2CustomEventsTimeseriesDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(
      `pid: ${pid}, events: ${query.events}`,
      'GET /v2/projects/:pid/traffic/custom-events/timeseries',
    )

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getTrafficCustomEventsTimeseries(pid, query)
  }

  @Get('custom-events/metadata')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Custom event metadata',
    description:
      'Aggregated metadata key/value counts for a specific custom event.',
  })
  async getCustomEventMetadata(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2EventMetadataQueryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(
      `pid: ${pid}, event: ${query.event}`,
      'GET /v2/projects/:pid/traffic/custom-events/metadata',
    )

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getTrafficCustomEventMetadata(pid, query)
  }

  @Get('page-properties/metadata')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Page property values',
    description: 'Aggregated value counts for a specific page property (tag).',
  })
  async getPagePropertyMetadata(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2PropertyMetadataQueryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(
      `pid: ${pid}, property: ${query.property}`,
      'GET /v2/projects/:pid/traffic/page-properties/metadata',
    )

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getTrafficPagePropertyMetadata(pid, query)
  }

  @Get('page-properties')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Page properties',
    description:
      'Counts of pageview metadata (page property) keys recorded in the selected period.',
  })
  async getPageProperties(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2ListQueryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(
      `pid: ${pid}`,
      'GET /v2/projects/:pid/traffic/page-properties',
    )

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getTrafficPageProperties(pid, query)
  }

  @Get('user-flow')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'User flow',
    description:
      'Page-to-page navigation flows (sankey nodes and links) for the selected period.',
  })
  async getUserFlow(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2SummaryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(`pid: ${pid}`, 'GET /v2/projects/:pid/traffic/user-flow')

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getTrafficUserFlow(pid, query)
  }
}
