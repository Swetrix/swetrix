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
  V2ErrorDetailQueryDto,
  V2ErrorParamsDto,
  V2ErrorSessionsQueryDto,
  V2ErrorsQueryDto,
} from '../dto/entities.dto'
import {
  V2BreakdownDto,
  V2ProjectParamsDto,
  V2TimeseriesDto,
} from '../dto/v2-base.dto'

// NOTE: static routes (overview, timeseries, breakdown) MUST be declared
// before the :eid routes — NestJS matches routes in declaration order.
@ApiTags('Analytics v2')
@ApiBearerAuth()
@ApiSecurity('apiKey')
@UseGuards(OptionalJwtAccessTokenGuard, AuthenticationGuard, AnalyticsReadGuard)
@UseInterceptors(PublicProjectCacheInterceptor)
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('v2/projects/:pid/errors')
export class ErrorsV2Controller {
  constructor(
    private readonly analyticsV2Service: AnalyticsV2Service,
    private readonly logger: AppLoggerService,
  ) {}

  @Get()
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Error groups',
    description:
      'Paginated list of error groups (grouped by error ID) with occurrence counts, affected users and status.',
  })
  async getErrors(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2ErrorsQueryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(`pid: ${pid}`, 'GET /v2/projects/:pid/errors')

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getErrorsList(pid, query)
  }

  @Get('overview')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Errors overview',
    description:
      'Aggregated error statistics: occurrences, affected users and sessions for the selected period.',
  })
  async getOverview(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2ErrorsQueryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(`pid: ${pid}`, 'GET /v2/projects/:pid/errors/overview')

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getErrorsOverview(pid, query)
  }

  @Get('timeseries')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Errors timeseries',
    description: 'Error occurrences and affected users grouped by time bucket.',
  })
  async getTimeseries(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2TimeseriesDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(`pid: ${pid}`, 'GET /v2/projects/:pid/errors/timeseries')

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getErrorsTimeseries(pid, query)
  }

  @Get('breakdown')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Errors breakdown',
    description:
      'Error occurrences grouped by a single dimension (page, browser, os, country, ...).',
  })
  async getBreakdown(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2BreakdownDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(
      `pid: ${pid}, dimension: ${query.dimension}`,
      'GET /v2/projects/:pid/errors/breakdown',
    )

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getBreakdown(pid, query, 'errors')
  }

  @Get(':eid')
  @Auth(true, true)
  @ApiOperation({
    summary: 'Error details',
    description:
      'Details for a single error group: metadata, occurrence chart and affected user counts.',
  })
  async getErrorDetails(
    @Param() { pid, eid }: V2ErrorParamsDto,
    @Query() query: V2ErrorDetailQueryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(
      `pid: ${pid}, eid: ${eid}`,
      'GET /v2/projects/:pid/errors/:eid',
    )

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getErrorDetails(pid, eid, query)
  }

  @Get(':eid/sessions')
  @Auth(true, true)
  @ApiOperation({
    summary: 'Error sessions',
    description: 'Paginated sessions affected by a specific error group.',
  })
  async getErrorSessions(
    @Param() { pid, eid }: V2ErrorParamsDto,
    @Query() query: V2ErrorSessionsQueryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(
      `pid: ${pid}, eid: ${eid}`,
      'GET /v2/projects/:pid/errors/:eid/sessions',
    )

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getErrorSessions(pid, eid, query)
  }
}
