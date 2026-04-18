import {
  Controller,
  Body,
  Param,
  Get,
  Post,
  Delete,
  HttpCode,
  BadRequestException,
  NotFoundException,
  Query,
  Header,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { Auth, Public } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { isValidPID } from '../common/constants'
import { ProjectService } from './project.service'
import {
  ProxyDomainService,
  validateHostname,
  PROXY_BASE_DOMAIN,
} from './proxy-domain.service'
import { ProxyDomainCreateDTO } from './dto'

@ApiTags('Project - Managed Reverse Proxy')
@Controller(['project', 'v1/project'])
export class ProxyDomainController {
  constructor(
    private readonly proxyDomainService: ProxyDomainService,
    private readonly projectService: ProjectService,
  ) {}

  @ApiBearerAuth()
  @Get(':pid/proxy-domains')
  @Auth()
  @ApiOperation({ summary: 'List managed reverse proxy domains for a project' })
  async list(@Param('pid') pid: string, @CurrentUserId() uid: string) {
    if (!isValidPID(pid)) {
      throw new BadRequestException('The provided project ID is incorrect')
    }

    const project = await this.projectService.getFullProject(pid)
    if (!project) {
      throw new NotFoundException('Project not found')
    }
    this.projectService.allowedToManage(project, uid)

    const domains = await this.proxyDomainService.listForProject(pid)
    return { domains, proxyBaseDomain: PROXY_BASE_DOMAIN }
  }

  @ApiBearerAuth()
  @Post(':pid/proxy-domains')
  @Auth()
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a new managed reverse proxy domain' })
  async create(
    @Param('pid') pid: string,
    @Body() body: ProxyDomainCreateDTO,
    @CurrentUserId() uid: string,
  ) {
    if (!isValidPID(pid)) {
      throw new BadRequestException('The provided project ID is incorrect')
    }

    const project = await this.projectService.getFullProject(pid)
    if (!project) {
      throw new NotFoundException('Project not found')
    }
    this.projectService.allowedToManage(project, uid)

    const { domain, blockedKeywordWarning } =
      await this.proxyDomainService.create(pid, body.hostname)

    return { domain, blockedKeywordWarning }
  }

  @ApiBearerAuth()
  @Delete(':pid/proxy-domains/:id')
  @Auth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a managed reverse proxy domain' })
  async remove(
    @Param('pid') pid: string,
    @Param('id') id: string,
    @CurrentUserId() uid: string,
  ): Promise<void> {
    if (!isValidPID(pid)) {
      throw new BadRequestException('The provided project ID is incorrect')
    }

    const project = await this.projectService.getFullProject(pid)
    if (!project) {
      throw new NotFoundException('Project not found')
    }
    this.projectService.allowedToManage(project, uid)

    await this.proxyDomainService.delete(pid, id)
  }

  @ApiBearerAuth()
  @Post(':pid/proxy-domains/:id/verify')
  @Auth()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Force a DNS / TLS re-check of a managed reverse proxy domain',
  })
  async verify(
    @Param('pid') pid: string,
    @Param('id') id: string,
    @CurrentUserId() uid: string,
  ) {
    if (!isValidPID(pid)) {
      throw new BadRequestException('The provided project ID is incorrect')
    }

    const project = await this.projectService.getFullProject(pid)
    if (!project) {
      throw new NotFoundException('Project not found')
    }
    this.projectService.allowedToManage(project, uid)

    const domain = await this.proxyDomainService.findById(pid, id)
    const updated = await this.proxyDomainService.verifyDomain(domain)
    return { domain: this.proxyDomainService.serialise(updated) }
  }
}

// Public endpoint consumed by the proxy.swetrix.org edge server.
@ApiTags('Project - Managed Reverse Proxy (edge)')
@Controller(['v1/proxy-domain'])
export class ProxyDomainEdgeController {
  constructor(private readonly proxyDomainService: ProxyDomainService) {}

  @Public()
  @Get('allow')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Used by the edge proxy to decide whether to issue a Let\u2019s Encrypt certificate for a hostname',
  })
  async allow(@Query('domain') domain: string) {
    let normalised: string
    try {
      normalised = validateHostname(domain || '').hostname
    } catch {
      throw new BadRequestException('Invalid domain')
    }

    const allowed =
      await this.proxyDomainService.isHostnameAllowedForIssuance(normalised)

    if (!allowed) {
      throw new NotFoundException('Hostname is not registered')
    }

    return { allowed: true }
  }

  // Per-request runtime gate consumed by the proxy.swetrix.org edge server.
  // Returns 200 only when the hostname is currently `live`.
  @Public()
  @Get('active')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Used by the edge proxy to decide whether to serve runtime traffic for a hostname',
  })
  async active(@Query('domain') domain: string) {
    let normalised: string
    try {
      normalised = validateHostname(domain || '').hostname
    } catch {
      throw new BadRequestException('Invalid domain')
    }

    const live = await this.proxyDomainService.isHostnameLive(normalised)
    if (!live) {
      throw new NotFoundException('Hostname is not active')
    }

    return { active: true }
  }
}
