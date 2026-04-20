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
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { Auth, Public } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { isValidPID } from '../common/constants'
import { ProjectService } from './project.service'
import { ProxyDomainService, PROXY_BASE_DOMAIN } from './proxy-domain.service'
import { ProxyDomainCreateDTO } from './dto'
import { ProxyDomainEdgeGuard } from './proxy-domain-edge.guard'

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

// Edge endpoints consumed by the proxy.swetrix.org edge server.
//
// These are gated by ProxyDomainEdgeGuard (shared-secret in `X-Edge-Api-Key`,
// validated against the MANAGED_PROXY_EDGE_API_KEY env var with a constant-time
// compare). Without the secret every request gets a generic 404 — same shape
// as a real "not registered" response — so an unauthenticated probe can't
// distinguish missing endpoint, missing secret, missing hostname, wrong
// status, or suspended project.
//
// The endpoints themselves are not throttled at the Nest layer: the edge
// caches positive answers for 30s and negative answers for 15s in
// `proxy_domain_active` (lua_shared_dict, see proxy.swetrix.org.conf), and
// auto-ssl only invokes `/allow` during ACME issuance. Combined with the
// shared secret gate that's the throttle.
@ApiTags('Project - Managed Reverse Proxy (edge)')
@Controller(['v1/proxy-domain'])
@UseGuards(ProxyDomainEdgeGuard)
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
    const allowed = await this.proxyDomainService.isHostnameAllowedForIssuance(
      domain || '',
    )

    if (!allowed) {
      throw new NotFoundException()
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
    const live = await this.proxyDomainService.isHostnameLive(domain || '')

    if (!live) {
      throw new NotFoundException()
    }

    return { active: true }
  }
}
