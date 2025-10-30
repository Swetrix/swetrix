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
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { AuthenticationGuard } from '../auth/guards/authentication.guard'
import { Auth } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { GSCService } from './gsc.service'
import { ProjectService } from './project.service'

@ApiTags('Project - Google Search Console')
@UseGuards(AuthenticationGuard)
@Controller({ path: 'project/gsc', version: '1' })
export class GSCController {
  constructor(
    private readonly gscService: GSCService,
    private readonly projectService: ProjectService,
  ) {}

  @Post('process-token')
  async processGSCToken(@Body() body: { code: string; state: string }) {
    const { code, state } = body
    if (!code || !state) {
      throw new BadRequestException('Invalid GSC token parameters')
    }
    const { pid } = await this.gscService.handleOAuthCallback(code, state)
    return { pid }
  }

  @ApiBearerAuth()
  @Post(':pid/connect')
  @Auth()
  async connect(@Param('pid') pid: string, @CurrentUserId() uid: string) {
    // ensure user can manage project
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)
    return this.gscService.generateConnectURL(uid, pid)
  }

  @ApiBearerAuth()
  @Get(':pid/status')
  @Auth()
  async status(@Param('pid') pid: string, @CurrentUserId() uid: string) {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)
    return this.gscService.getStatus(pid)
  }

  @ApiBearerAuth()
  @Get(':pid/properties')
  @Auth()
  async properties(@Param('pid') pid: string, @CurrentUserId() uid: string) {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)
    return this.gscService.listSites(pid)
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
    await this.gscService.setProperty(pid, body?.propertyUri)
    return {}
  }

  @ApiBearerAuth()
  @Delete(':pid/disconnect')
  @Auth()
  @HttpCode(204)
  async disconnect(@Param('pid') pid: string, @CurrentUserId() uid: string) {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)
    await this.gscService.disconnect(pid)
  }
}
