import { promises as dns } from 'dns'
import * as crypto from 'crypto'
import * as tls from 'tls'
import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import dayjs from 'dayjs'
import { parse as parseDomain } from 'tldts'

import { ProxyDomain, ProxyDomainStatus } from './entity/proxy-domain.entity'
import { redis } from '../common/constants'

const DEFAULT_PROXY_BASE_DOMAIN = 'proxy.swetrix.org'

export const PROXY_BASE_DOMAIN =
  process.env.MANAGED_PROXY_BASE_DOMAIN || DEFAULT_PROXY_BASE_DOMAIN

const MAX_PROXY_DOMAINS_PER_PROJECT = 5

// Domains stuck in `issuing` (DNS resolves but TLS keeps failing) are
// escalated to `error` after this timeout so the user gets an actionable
// message instead of a perpetual spinner.
const MAX_ISSUING_MINUTES = 30

// Match the `prefix` used by lua-resty-auto-ssl in the edge nginx config
// (see internal-docs/configs/nginx/sites/proxy.swetrix.org.conf). All cert
// data for a hostname lives under `<prefix>:<hostname>:*`.
const AUTOSSL_REDIS_PREFIX = 'swetrix-managed-proxy'

// Domains belonging to Swetrix that customers cannot register as proxies for.
const RESERVED_HOSTNAME_SUFFIXES = [
  'swetrix.com',
  'swetrix.org',
  'swetrixcaptcha.com',
  'europehog.com',
]

// Words commonly blocked by adblockers when present in a hostname. We still
// allow the domain to be created but warn the user in the API response.
const BLOCKED_KEYWORDS_REGEX =
  /\b(analytics|tracking|telemetry|posthog|track|metrics?|stats?|count|pixel|tag(s|ger)?|ads?)\b/i

// Same regex as RFC 1035 hostname (no trailing dot, no leading/trailing hyphen,
// at least one dot meaning it must be a subdomain).
const HOSTNAME_REGEX =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

interface ValidatedHostname {
  hostname: string
  blockedKeywordWarning: boolean
}

export const validateHostname = (raw: string): ValidatedHostname => {
  if (typeof raw !== 'string') {
    throw new BadRequestException('Hostname must be a string')
  }

  const hostname = raw.trim().toLowerCase().replace(/\.+$/, '')

  if (!hostname) {
    throw new BadRequestException('Hostname is required')
  }

  if (hostname.length > 253) {
    throw new BadRequestException('Hostname is too long')
  }

  if (hostname.includes('*')) {
    throw new BadRequestException('Wildcard hostnames are not supported')
  }

  if (!HOSTNAME_REGEX.test(hostname)) {
    throw new BadRequestException('Hostname is not a valid subdomain')
  }

  // Use the public suffix list to robustly distinguish a true subdomain
  // ("foo.example.com", "foo.example.co.uk", "foo.pages.dev") from an apex
  // ("example.com", "example.co.uk"). Apex domains cannot host the required
  // CNAME so we reject them up front instead of leaving the user stuck in
  // `waiting` forever.
  const parsed = parseDomain(hostname)
  if (parsed.isIp) {
    throw new BadRequestException('IP addresses are not supported')
  }
  if (!parsed.domain || !parsed.publicSuffix) {
    throw new BadRequestException(
      'Hostname does not look like a real internet domain',
    )
  }
  if (!parsed.subdomain) {
    throw new BadRequestException(
      'Please use a subdomain (e.g. t.example.com) — a CNAME record cannot be set on the root domain',
    )
  }

  for (const reserved of RESERVED_HOSTNAME_SUFFIXES) {
    if (hostname === reserved || hostname.endsWith(`.${reserved}`)) {
      throw new BadRequestException(
        'This hostname belongs to Swetrix and cannot be used',
      )
    }
  }

  const blockedKeywordWarning = BLOCKED_KEYWORDS_REGEX.test(hostname)

  return { hostname, blockedKeywordWarning }
}

@Injectable()
export class ProxyDomainService {
  private readonly logger = new Logger(ProxyDomainService.name)

  constructor(
    @InjectRepository(ProxyDomain)
    private readonly proxyDomainRepository: Repository<ProxyDomain>,
  ) {}

  getProxyTarget(domain: ProxyDomain): string {
    return `${domain.proxyTargetId}.${PROXY_BASE_DOMAIN}`
  }

  // Public projection that the frontend consumes.
  serialise(domain: ProxyDomain) {
    return {
      id: domain.id,
      hostname: domain.hostname,
      proxyTargetId: domain.proxyTargetId,
      proxyTarget: this.getProxyTarget(domain),
      status: domain.status,
      errorMessage: domain.errorMessage,
      lastCheckedAt: domain.lastCheckedAt,
      liveSince: domain.liveSince,
      statusChangedAt: domain.statusChangedAt,
      created: domain.created,
    }
  }

  async listForProject(projectId: string) {
    const domains = await this.proxyDomainRepository.find({
      where: { projectId },
      order: { created: 'ASC' },
    })

    return domains.map((d) => this.serialise(d))
  }

  async create(projectId: string, rawHostname: string) {
    const { hostname, blockedKeywordWarning } = validateHostname(rawHostname)

    const existingForProject = await this.proxyDomainRepository.count({
      where: { projectId },
    })

    if (existingForProject >= MAX_PROXY_DOMAINS_PER_PROJECT) {
      throw new ConflictException(
        `You can register up to ${MAX_PROXY_DOMAINS_PER_PROJECT} managed proxy domains per project`,
      )
    }

    const existing = await this.proxyDomainRepository.findOne({
      where: { hostname },
    })

    if (existing) {
      throw new ConflictException(
        'This hostname is already registered as a managed proxy',
      )
    }

    const proxyTargetId = this.generateProxyTargetId()

    const domain = this.proxyDomainRepository.create({
      projectId,
      hostname,
      proxyTargetId,
      status: ProxyDomainStatus.WAITING,
      statusChangedAt: new Date(),
    })

    await this.proxyDomainRepository.save(domain)

    return {
      domain: this.serialise(domain),
      blockedKeywordWarning,
    }
  }

  async delete(projectId: string, id: string) {
    const domain = await this.proxyDomainRepository.findOne({
      where: { id, projectId },
    })

    if (!domain) {
      throw new NotFoundException('Proxy domain not found')
    }

    await this.proxyDomainRepository.delete({ id, projectId })

    // Drop the cached cert at the edge. The edge also revalidates each
    // request via `isHostnameLive`, so this is best-effort: if it fails the
    // hostname stops serving traffic almost immediately anyway, but we still
    // want to free the Redis storage and avoid serving a now-orphaned cert.
    this.purgeAutoSslCertCache(domain.hostname).catch((err) => {
      this.logger.warn(
        `purgeAutoSslCertCache(${domain.hostname}) failed: ${err}`,
      )
    })
  }

  async findById(projectId: string, id: string) {
    const domain = await this.proxyDomainRepository.findOne({
      where: { id, projectId },
    })

    if (!domain) {
      throw new NotFoundException('Proxy domain not found')
    }

    return domain
  }

  async findByHostname(hostname: string) {
    return this.proxyDomainRepository.findOne({
      where: { hostname: hostname.trim().toLowerCase() },
    })
  }

  // Used by lua-resty-auto-ssl: allow Let's Encrypt issuance only for hostnames
  // that are actively registered.
  async isHostnameAllowedForIssuance(hostname: string): Promise<boolean> {
    const domain = await this.findActiveDomainByHostname(hostname)
    if (!domain) return false

    // Allow cert issuance for any status that hasn't been administratively
    // disabled. ERROR rows are intentionally excluded — if we've already
    // determined this hostname can't be served (e.g. CNAME timeout, ISSUING
    // timeout) we shouldn't keep handing out certs for it.
    return (
      domain.status === ProxyDomainStatus.WAITING ||
      domain.status === ProxyDomainStatus.ISSUING ||
      domain.status === ProxyDomainStatus.LIVE
    )
  }

  // Used by the OpenResty edge `access_by_lua_block`: per-request gate that
  // decides whether to actually serve traffic for a hostname. This is what
  // makes a freshly-deleted hostname stop proxying within seconds, even if
  // its TLS cert is still cached in Redis.
  async isHostnameLive(hostname: string): Promise<boolean> {
    const domain = await this.findActiveDomainByHostname(hostname)
    if (!domain) return false
    return domain.status === ProxyDomainStatus.LIVE
  }

  private async findActiveDomainByHostname(
    hostname: string,
  ): Promise<ProxyDomain | null> {
    if (!hostname) return null

    let normalised: string
    try {
      normalised = validateHostname(hostname).hostname
    } catch {
      return null
    }

    const domain = await this.proxyDomainRepository.findOne({
      where: { hostname: normalised },
      relations: { project: true },
    })
    if (!domain) return null

    // Reject hostnames whose project has been deactivated (e.g. account
    // suspended) so they can't keep proxying traffic.
    if (domain.project && domain.project.active === false) return null

    return domain
  }

  // Verifier — runs DNS + TLS checks and updates the row's status.
  async verifyDomain(domain: ProxyDomain): Promise<ProxyDomain> {
    const expectedTarget = this.getProxyTarget(domain).replace(/\.$/, '')
    const update: Partial<ProxyDomain> = {
      lastCheckedAt: new Date(),
    }

    let resolvedTarget: string | null = null
    try {
      const records = await dns.resolveCname(domain.hostname)
      const found = (records || []).find(
        (r) => r.replace(/\.$/, '').toLowerCase() === expectedTarget,
      )
      if (found) {
        resolvedTarget = found
      }
    } catch {
      // No CNAME yet (NXDOMAIN/NODATA) — treated as still waiting
    }

    if (!resolvedTarget) {
      // CNAME not configured yet — keep "waiting" unless we've been stuck for too long.
      const stuckMinutes = dayjs().diff(domain.created, 'minute')
      if (stuckMinutes > 60 * 24 * 7) {
        this.applyStatusTransition(domain, update, ProxyDomainStatus.ERROR)
        update.errorMessage =
          'CNAME record not found after 7 days. Please verify your DNS configuration.'
      } else {
        this.applyStatusTransition(domain, update, ProxyDomainStatus.WAITING)
        update.errorMessage = null
      }

      await this.proxyDomainRepository.update({ id: domain.id }, update)
      return { ...domain, ...update } as ProxyDomain
    }

    // DNS is good; probe TLS to see if Let's Encrypt has issued the cert.
    const tlsOk = await this.probeTLS(domain.hostname)

    if (tlsOk) {
      this.applyStatusTransition(domain, update, ProxyDomainStatus.LIVE)
      update.errorMessage = null
      if (!domain.liveSince) {
        update.liveSince = new Date()
      }
    } else if (
      domain.status === ProxyDomainStatus.ISSUING &&
      domain.statusChangedAt &&
      dayjs().diff(domain.statusChangedAt, 'minute') > MAX_ISSUING_MINUTES
    ) {
      // DNS resolves but TLS keeps failing for too long — escalate to ERROR
      // so the user gets an actionable message instead of a permanent
      // spinner. The verifier will keep re-checking and can demote back to
      // ISSUING / LIVE on the next successful probe.
      this.applyStatusTransition(domain, update, ProxyDomainStatus.ERROR)
      update.errorMessage =
        `SSL certificate could not be issued after ${MAX_ISSUING_MINUTES} minutes. ` +
        'Confirm your CNAME points to the value shown above, that DNS proxying ' +
        '(e.g. Cloudflare orange-cloud) is disabled, and that ports 80/443 ' +
        'are reachable. Use "Re-check" once fixed.'
    } else {
      this.applyStatusTransition(domain, update, ProxyDomainStatus.ISSUING)
      update.errorMessage = null
    }

    await this.proxyDomainRepository.update({ id: domain.id }, update)
    return { ...domain, ...update } as ProxyDomain
  }

  private applyStatusTransition(
    current: ProxyDomain,
    update: Partial<ProxyDomain>,
    next: ProxyDomainStatus,
  ): void {
    update.status = next
    if (current.status !== next || !current.statusChangedAt) {
      update.statusChangedAt = new Date()
    }
  }

  // Best-effort wipe of the cached TLS cert in Redis so a deleted hostname
  // can't be served by the edge anymore. Mirrors the storage layout used by
  // lua-resty-auto-ssl: every key for a hostname lives under
  // `<prefix>:<hostname>:*` (latest cert, historical versions, etc).
  private async purgeAutoSslCertCache(hostname: string): Promise<void> {
    const pattern = `${AUTOSSL_REDIS_PREFIX}:${hostname.toLowerCase()}:*`
    const keys: string[] = []

    await new Promise<void>((resolve, reject) => {
      const stream = redis.scanStream({ match: pattern, count: 100 })
      stream.on('data', (batch: string[]) => {
        if (batch && batch.length) keys.push(...batch)
      })
      stream.on('end', () => resolve())
      stream.on('error', reject)
    })

    if (keys.length) {
      await redis.del(...keys)
    }
  }

  async findPendingForVerification(limit = 200): Promise<ProxyDomain[]> {
    return this.proxyDomainRepository.find({
      where: {
        status: In([
          ProxyDomainStatus.WAITING,
          ProxyDomainStatus.ISSUING,
          ProxyDomainStatus.ERROR,
        ]),
      },
      take: limit,
    })
  }

  async findLiveForRecheck(
    olderThan: Date,
    limit = 200,
  ): Promise<ProxyDomain[]> {
    return this.proxyDomainRepository
      .createQueryBuilder('pd')
      .where('pd.status = :status', { status: ProxyDomainStatus.LIVE })
      .andWhere('(pd.lastCheckedAt IS NULL OR pd.lastCheckedAt < :ts)', {
        ts: olderThan,
      })
      .take(limit)
      .getMany()
  }

  private async probeTLS(hostname: string): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = tls.connect(
        {
          host: hostname,
          servername: hostname,
          port: 443,
          rejectUnauthorized: true,
          // Self-signed fallback or invalid cert == not yet issued.
          ALPNProtocols: ['http/1.1'],
        },
        () => {
          const ok = socket.authorized === true
          socket.end()
          resolve(ok)
        },
      )

      const timer = setTimeout(() => {
        socket.destroy()
        resolve(false)
      }, 5000)

      socket.once('error', () => {
        clearTimeout(timer)
        resolve(false)
      })

      socket.once('close', () => clearTimeout(timer))
    })
  }

  private generateProxyTargetId(): string {
    return crypto.randomBytes(16).toString('hex')
  }
}
