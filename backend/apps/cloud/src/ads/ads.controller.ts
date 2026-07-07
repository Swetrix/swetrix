import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  HttpCode,
  Ip,
  Headers,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import _isEmpty from 'lodash/isEmpty'

import { AuthenticationGuard } from '../auth/guards/authentication.guard'
import { Auth } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { ProjectService } from '../project/project.service'
import { AppLoggerService } from '../logger/logger.service'
import { trackCustom } from '../common/analytics'
import { getIPFromHeaders } from '../common/utils'
import { AdsService } from './ads.service'
import { GoogleAdsAdapter } from './adapters/google-ads.adapter'
import { SelectAdsAccountDto } from './dto/select-account.dto'
import { ADS_BACKFILL_DAYS } from './interfaces/ads.interface'

@ApiTags('Project - Google Ads')
@UseGuards(AuthenticationGuard)
@Controller({ path: 'project/ads', version: '1' })
export class AdsController {
  constructor(
    private readonly adsService: AdsService,
    private readonly googleAdsAdapter: GoogleAdsAdapter,
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
  ) {}

  @Post('process-token')
  @Auth()
  async processAdsToken(
    @Body() body: { code: string; state: string },
    @CurrentUserId() uid: string,
    @Headers() headers: Record<string, string>,
    @Ip() requestIp: string,
  ) {
    const ip = getIPFromHeaders(headers) || requestIp || ''
    const { code, state } = body

    if (!code || !state) {
      throw new BadRequestException('Invalid Google Ads token parameters')
    }

    const { pid } = await this.adsService.handleOAuthCallback(uid, code, state)

    await trackCustom(ip, headers['user-agent'], {
      ev: 'ADS_CONNECTED',
    })

    return { pid }
  }

  @ApiBearerAuth()
  @Post(':pid/connect')
  @Auth()
  async connect(@Param('pid') pid: string, @CurrentUserId() uid: string) {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)
    return this.adsService.generateConnectURL(uid, pid)
  }

  @ApiBearerAuth()
  @Get(':pid/status')
  @Auth()
  async status(@Param('pid') pid: string, @CurrentUserId() uid: string) {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)
    return this.adsService.getStatus(pid)
  }

  @ApiBearerAuth()
  @Get(':pid/accounts')
  @Auth()
  async accounts(@Param('pid') pid: string, @CurrentUserId() uid: string) {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)

    const accessToken = await this.adsService.getAuthedAccessToken(pid)
    return this.googleAdsAdapter.listAccessibleAccounts(accessToken)
  }

  @ApiBearerAuth()
  @Post(':pid/account')
  @Auth()
  async setAccount(
    @Param('pid') pid: string,
    @CurrentUserId() uid: string,
    @Body() body: SelectAdsAccountDto,
  ) {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)

    if (!body?.customerId) {
      throw new BadRequestException('customerId is required')
    }

    const accessToken = await this.adsService.getAuthedAccessToken(pid)
    const accounts =
      await this.googleAdsAdapter.listAccessibleAccounts(accessToken)

    const account = accounts.find((a) => a.customerId === body.customerId)

    if (!account) {
      throw new BadRequestException(
        'The provided customerId is not available for the connected account',
      )
    }

    const currency =
      account.currency ||
      (await this.googleAdsAdapter.getAccountCurrency(
        accessToken,
        account.customerId,
        account.loginCustomerId,
      ))

    await this.adsService.setAccount(
      pid,
      account.customerId,
      account.loginCustomerId,
      currency,
    )

    // Kick off the initial backfill without blocking the response
    this.backfill(pid).catch((error) => {
      this.logger.error(
        { error, pid },
        'Google Ads initial backfill failed after account selection',
      )
    })

    return {}
  }

  @ApiBearerAuth()
  @Post(':pid/sync')
  @Auth()
  async sync(@Param('pid') pid: string, @CurrentUserId() uid: string) {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)

    const fullProject = await this.projectService.findOne({
      where: { id: pid },
      select: [
        'id',
        'googleAdsCustomerId',
        'googleAdsLoginCustomerId',
        'googleAdsCurrency',
        'revenueCurrency',
      ],
    })

    if (_isEmpty(fullProject?.googleAdsCustomerId)) {
      throw new BadRequestException(
        'Google Ads account is not selected for this project',
      )
    }

    await this.adsService.clearSyncError(pid)
    await this.googleAdsAdapter.syncCampaignMetrics({
      id: fullProject.id,
      googleAdsCustomerId: fullProject.googleAdsCustomerId,
      googleAdsLoginCustomerId: fullProject.googleAdsLoginCustomerId,
      googleAdsCurrency: fullProject.googleAdsCurrency,
      revenueCurrency: fullProject.revenueCurrency,
    })
    await this.adsService.updateLastSyncAt(pid)

    return { success: true }
  }

  @ApiBearerAuth()
  @Delete(':pid/disconnect')
  @Auth()
  @HttpCode(204)
  async disconnect(
    @Param('pid') pid: string,
    @CurrentUserId() uid: string,
    @Headers() headers: Record<string, string>,
    @Ip() requestIp: string,
  ) {
    const ip = getIPFromHeaders(headers) || requestIp || ''

    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)
    await this.adsService.disconnect(pid)

    await trackCustom(ip, headers['user-agent'], {
      ev: 'ADS_DISCONNECTED',
    })
  }

  private async backfill(pid: string) {
    const project = await this.projectService.findOne({
      where: { id: pid },
      select: [
        'id',
        'googleAdsCustomerId',
        'googleAdsLoginCustomerId',
        'googleAdsCurrency',
        'revenueCurrency',
      ],
    })

    if (_isEmpty(project?.googleAdsCustomerId)) {
      return
    }

    await this.googleAdsAdapter.syncCampaignMetrics(
      {
        id: project.id,
        googleAdsCustomerId: project.googleAdsCustomerId,
        googleAdsLoginCustomerId: project.googleAdsLoginCustomerId,
        googleAdsCurrency: project.googleAdsCurrency,
        revenueCurrency: project.revenueCurrency,
      },
      ADS_BACKFILL_DAYS,
    )
    await this.adsService.updateLastSyncAt(pid)
  }
}
