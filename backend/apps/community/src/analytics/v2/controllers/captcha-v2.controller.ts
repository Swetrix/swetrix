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
  V2BreakdownDto,
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
@Controller('v2/projects/:pid/captcha')
export class CaptchaV2Controller {
  constructor(
    private readonly analyticsV2Service: AnalyticsV2Service,
    private readonly logger: AppLoggerService,
  ) {}

  @Get('summary')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Captcha summary',
    description:
      'Captcha counters, pass rate, solve-time quantiles, and difficulty/solve-time distributions for the selected period, plus the previous period for comparison.',
  })
  async getSummary(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2SummaryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(`pid: ${pid}`, 'GET /v2/projects/:pid/captcha/summary')

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getCaptchaSummary(pid, query)
  }

  @Get('timeseries')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Captcha timeseries',
    description:
      'Captcha counters (generated, passed, failed, validation_failed, replayed) grouped by time bucket.',
  })
  async getTimeseries(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2TimeseriesDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(`pid: ${pid}`, 'GET /v2/projects/:pid/captcha/timeseries')

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getCaptchaTimeseries(pid, query)
  }

  @Get('breakdown')
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Captcha breakdown',
    description:
      'Captcha events grouped by a single dimension (country, browser, os, device, captcha_event, captcha_difficulty, captcha_reason, solve_time).',
  })
  async getBreakdown(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2BreakdownDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(
      `pid: ${pid}, dimension: ${query.dimension}`,
      'GET /v2/projects/:pid/captcha/breakdown',
    )

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getBreakdown(pid, query, 'captcha')
  }
}
