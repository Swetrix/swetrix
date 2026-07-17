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
  V2SessionParamsDto,
  V2SessionsQueryDto,
  V2TimezoneQueryDto,
} from '../dto/entities.dto'
import { V2ProjectParamsDto } from '../dto/v2-base.dto'

@ApiTags('Analytics v2')
@ApiBearerAuth()
@ApiSecurity('apiKey')
@UseGuards(OptionalJwtAccessTokenGuard, AuthenticationGuard, AnalyticsReadGuard)
@UseInterceptors(PublicProjectCacheInterceptor)
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('v2/projects/:pid/sessions')
export class SessionsV2Controller {
  constructor(
    private readonly analyticsV2Service: AnalyticsV2Service,
    private readonly logger: AppLoggerService,
  ) {}

  @Get()
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Sessions',
    description:
      'Paginated list of individual sessions for the selected period.',
  })
  async getSessions(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2SessionsQueryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(`pid: ${pid}`, 'GET /v2/projects/:pid/sessions')

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getSessionsList(pid, query)
  }

  @Get(':psid')
  @Auth(true, true)
  @ApiOperation({
    summary: 'Session details',
    description:
      'Details for a single session: the page/event flow, session attributes and an activity chart.',
  })
  async getSession(
    @Param() { pid, psid }: V2SessionParamsDto,
    @Query() query: V2TimezoneQueryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(
      `pid: ${pid}, psid: ${psid}`,
      'GET /v2/projects/:pid/sessions/:psid',
    )

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getSessionDetails(pid, psid, query.timezone)
  }
}
