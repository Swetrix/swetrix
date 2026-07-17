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
  V2ProfileParamsDto,
  V2ProfilesQueryDto,
  V2TimezoneQueryDto,
} from '../dto/entities.dto'
import { V2ListQueryDto, V2ProjectParamsDto } from '../dto/v2-base.dto'

@ApiTags('Analytics v2')
@ApiBearerAuth()
@ApiSecurity('apiKey')
@UseGuards(OptionalJwtAccessTokenGuard, AuthenticationGuard, AnalyticsReadGuard)
@UseInterceptors(PublicProjectCacheInterceptor)
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('v2/projects/:pid/profiles')
export class ProfilesV2Controller {
  constructor(
    private readonly analyticsV2Service: AnalyticsV2Service,
    private readonly logger: AppLoggerService,
  ) {}

  @Get()
  @Auth(true, true)
  @CacheableAnalytics()
  @ApiOperation({
    summary: 'Profiles',
    description:
      'Paginated list of user profiles (anonymous and identified visitors).',
  })
  async getProfiles(
    @Param() { pid }: V2ProjectParamsDto,
    @Query() query: V2ProfilesQueryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(`pid: ${pid}`, 'GET /v2/projects/:pid/profiles')

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getProfilesList(pid, query)
  }

  @Get(':profileId')
  @Auth(true, true)
  @ApiOperation({
    summary: 'Profile details',
    description:
      'Details for a single profile: attributes, top pages and activity calendar.',
  })
  async getProfile(
    @Param() { pid, profileId }: V2ProfileParamsDto,
    @Query() query: V2TimezoneQueryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(
      `pid: ${pid}, profileId: ${profileId}`,
      'GET /v2/projects/:pid/profiles/:profileId',
    )

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getProfileDetails(
      pid,
      profileId,
      query.timezone,
    )
  }

  @Get(':profileId/sessions')
  @Auth(true, true)
  @ApiOperation({
    summary: 'Profile sessions',
    description: 'Paginated sessions recorded for a specific profile.',
  })
  async getProfileSessions(
    @Param() { pid, profileId }: V2ProfileParamsDto,
    @Query() query: V2ListQueryDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    this.logger.log(
      `pid: ${pid}, profileId: ${profileId}`,
      'GET /v2/projects/:pid/profiles/:profileId/sessions',
    )

    await this.analyticsV2Service.assertReadAccess(
      pid,
      uid,
      headers['x-password'],
    )

    return this.analyticsV2Service.getProfileSessions(pid, profileId, query)
  }
}
