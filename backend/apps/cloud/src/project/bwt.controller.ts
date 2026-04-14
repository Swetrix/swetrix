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

import { AuthenticationGuard } from '../auth/guards/authentication.guard'
import { Auth } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { BWTService } from './bwt.service'
import { ProjectService } from './project.service'
import { trackCustom } from '../common/analytics'
import { getIPFromHeaders } from '../common/utils'

@ApiTags('Project - Bing Webmaster Tools')
@UseGuards(AuthenticationGuard)
@Controller({ path: 'project/bwt', version: '1' })
export class BWTController {
  constructor(
    private readonly bwtService: BWTService,
    private readonly projectService: ProjectService,
  ) {}

  @Post('process-token')
  @Auth()
  async processBWTToken(
    @Body() body: { code: string; state: string },
    @CurrentUserId() uid: string,
    @Headers() headers: Record<string, string>,
    @Ip() requestIp: string,
  ) {
    const ip = getIPFromHeaders(headers) || requestIp || ''
    const { code, state } = body

    if (!code || !state) {
      throw new BadRequestException('Invalid BWT token parameters')
    }

    const { pid } = await this.bwtService.handleOAuthCallback(uid, code, state)

    await trackCustom(ip, headers['user-agent'], {
      ev: 'BWT_CONNECTED',
    })

    return { pid }
  }

  @ApiBearerAuth()
  @Post(':pid/connect')
  @Auth()
  async connect(@Param('pid') pid: string, @CurrentUserId() uid: string) {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)
    return this.bwtService.generateConnectURL(uid, pid)
  }

  @ApiBearerAuth()
  @Get(':pid/status')
  @Auth()
  async status(@Param('pid') pid: string, @CurrentUserId() uid: string) {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)
    return this.bwtService.getStatus(pid)
  }

  @ApiBearerAuth()
  @Get(':pid/properties')
  @Auth()
  async properties(@Param('pid') pid: string, @CurrentUserId() uid: string) {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)
    return this.bwtService.listSites(pid)
  }

  @ApiBearerAuth()
  @Post(':pid/property')
  @Auth()
  async setProperty(
    @Param('pid') pid: string,
    @CurrentUserId() uid: string,
    @Body() body: { propertyUri: string },
  ) {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)
    await this.bwtService.setProperty(pid, body?.propertyUri)
    return {}
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
    await this.bwtService.disconnect(pid)

    await trackCustom(ip, headers['user-agent'], {
      ev: 'BWT_DISCONNECTED',
    })
  }
}
