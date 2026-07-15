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
  V2DimensionsQueryDto,
  V2DimensionValuesParamsDto,
  V2DimensionValuesQueryDto,
  V2FunnelQueryDto,
  V2FunnelSessionsQueryDto,
} from '../dto/project.dto'
import { V2ProjectParamsDto } from '../dto/v2-base.dto'
import { SeoV2Service } from '../seo-v2.service'

@ApiTags('Analytics v2')
@ApiBearerAuth()
@ApiSecurity('apiKey')
@UseGuards(OptionalJwtAccessTokenGuard, AuthenticationGuard, AnalyticsReadGuard)
@UseInterceptors(PublicProjectCacheInterceptor)
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('v2/projects/:pid')
export class ProjectV2Controller {
  constructor(
    private readonly analyticsV2Service: AnalyticsV2Service,
    private readonly seoV2Service: SeoV2Service,
    private readonly logger: AppLoggerService,
  ) {}

  @Get('funnel')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Funnel analysis',
    description:
      'Funnel step conversion for a saved funnel (funnelId) or an ad-hoc list of steps, with per-step breakdowns and time-to-convert stats.',
  })
  async getFunnel(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2FunnelQueryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(`pid: ${pid}`, 'GET /v2/projects/:pid/funnel')

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getFunnel(pid, query)
  }

  @Get('funnel/sessions')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Funnel sessions',
    description:
      'Paginated sessions that reached (or dropped off at) a specific funnel step.',
  })
  async getFunnelSessions(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2FunnelSessionsQueryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(
      `pid: ${pid}, step: ${query.step}`,
      'GET /v2/projects/:pid/funnel/sessions',
    )

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getFunnelSessions(pid, query)
  }

  @Get('live-visitors')
  @Auth(true, true)
  @ApiOperation({
    summary: 'Live visitors',
    description:
      'Current online visitor count and the list of active visitors (last 5 minutes).',
  })
  async getLiveVisitors(
    @Param() { pid }: V2ProjectParamsDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(`pid: ${pid}`, 'GET /v2/projects/:pid/live-visitors')

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getLiveVisitors(pid)
  }

  @Get('dimensions')
  @Auth(true, true)
  @ApiOperation({
    summary: 'Dimension & metric discovery',
    description:
      'Machine-readable list of the dimensions and metrics available for a data type — useful for building custom dashboards.',
  })
  async getDimensions(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2DimensionsQueryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(`pid: ${pid}`, 'GET /v2/projects/:pid/dimensions')

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    // SEO is served by the Search Console API rather than ClickHouse, so it
    // keeps its own registry outside the sqlExpr-based one.
    if (query.type === 'seo') {
      return this.seoV2Service.getDimensions()
    }

    return this.analyticsV2Service.getDimensions(query.type || 'traffic')
  }

  @Get('dimensions/:dimension/values')
  @Auth(true, true)
  @ApiOperation({
    summary: 'Dimension values',
    description:
      'Distinct recorded values for a dimension — useful for filter autocompletion. browser_version and os_version return { name, version } pairs.',
  })
  async getDimensionValues(
    @Param() { pid, dimension }: V2DimensionValuesParamsDto,
    @Query() query: V2DimensionValuesQueryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(
      `pid: ${pid}, dimension: ${dimension}`,
      'GET /v2/projects/:pid/dimensions/:dimension/values',
    )

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getDimensionValues(
      pid,
      dimension,
      query.type || 'traffic',
    )
  }
}
