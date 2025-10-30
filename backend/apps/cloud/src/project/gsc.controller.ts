import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  HttpCode,
  Response,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { AuthenticationGuard } from '../auth/guards/authentication.guard'
import { Auth } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { GSCService } from './gsc.service'
import { ProjectService } from './project.service'

@ApiTags('Project - Google Search Console')
@UseGuards(AuthenticationGuard)
@Controller({ path: 'project', version: '1' })
export class GSCController {
  constructor(
    private readonly gscService: GSCService,
    private readonly projectService: ProjectService,
  ) {}

  @ApiBearerAuth()
  @Post(':pid/gsc/connect')
  @Auth()
  async connect(@Param('pid') pid: string, @CurrentUserId() uid: string) {
    // ensure user can manage project
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)
    return this.gscService.generateConnectURL(uid, pid)
  }

  // OAuth2 callback endpoint
  @Get('gsc/callback')
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Response() res: any,
  ) {
    if (!code || !state) {
      throw new BadRequestException('Invalid OAuth callback parameters')
    }
    const { pid } = await this.gscService.handleOAuthCallback(code, state)
    res.redirect(`/project/${pid}/settings?gsc=connected`)
  }

  @ApiBearerAuth()
  @Get(':pid/gsc/status')
  @Auth()
  async status(@Param('pid') pid: string, @CurrentUserId() uid: string) {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)
    const connected = await this.gscService.isConnected(pid)
    return { connected }
  }

  @ApiBearerAuth()
  @Get(':pid/gsc/properties')
  @Auth()
  async properties(@Param('pid') pid: string, @CurrentUserId() uid: string) {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)
    return this.gscService.listSites(pid)
  }

  @ApiBearerAuth()
  @Post(':pid/gsc/property')
  @Auth()
  async setProperty(
    @Param('pid') pid: string,
    @CurrentUserId() uid: string,
    @Body() body: { propertyUri: string },
  ) {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)
    await this.gscService.setProperty(pid, body?.propertyUri)
    return {}
  }

  @ApiBearerAuth()
  @Delete(':pid/gsc')
  @Auth()
  @HttpCode(204)
  async disconnect(@Param('pid') pid: string, @CurrentUserId() uid: string) {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)
    await this.gscService.disconnect(pid)
  }
}
