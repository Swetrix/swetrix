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
import { DataSource, QueryFailedError, Repository, In } from 'typeorm'
import dayjs from 'dayjs'
import { parse as parseDomain } from 'tldts'

import { ProxyDomain, ProxyDomainStatus } from './entity/proxy-domain.entity'
import { Project } from './entity/project.entity'
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

// Strict label check so we still reject things like leading/trailing hyphens
// or labels longer than 63 chars after tldts has done its normalisation.
const HOSTNAME_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

interface ValidatedHostname {
  hostname: string
  blockedKeywordWarning: boolean
}

export const validateHostname = (raw: string): ValidatedHostname => {
  if (typeof raw !== 'string') {
    throw new BadRequestException('Hostname must be a string')
  }

  const trimmed = raw.trim().toLowerCase()

  if (!trimmed) {
    throw new BadRequestException('Hostname is required')
  }

  // Bound input size up front so we never run the parser over absurd input.
  // 253 + a small slack for a trailing dot / leading whitespace already
  // handled above.
  if (trimmed.length > 254) {
    throw new BadRequestException('Hostname is too long')
  }

  if (trimmed.includes('*')) {
    throw new BadRequestException('Wildcard hostnames are not supported')
  }

  // Defer all normalisation to tldts: it strips trailing dots, validates the
  // hostname against the public suffix list, and tells us about IPs and
  // apex/subdomain split in one pass. This also avoids running our own
  // regex over user-controlled input (CodeQL flag).
  const parsed = parseDomain(trimmed)

  if (parsed.isIp) {
    throw new BadRequestException('IP addresses are not supported')
  }

  if (!parsed.hostname || !parsed.domain || !parsed.publicSuffix) {
    throw new BadRequestException(
      'Hostname does not look like a real internet domain',
    )
  }

  const hostname = parsed.hostname

  if (hostname.length > 253) {
    throw new BadRequestException('Hostname is too long')
  }

  // Validate each label individually rather than the whole string with one
  // big regex (avoids any catastrophic-backtracking concerns and keeps the
  // failure mode predictable).
  for (const label of hostname.split('.')) {
    if (!HOSTNAME_LABEL_REGEX.test(label)) {
      throw new BadRequestException('Hostname is not a valid subdomain')
    }
  }

  // Apex domains (`example.com`, `example.co.uk`) can't host a CNAME, so
  // reject them up front instead of leaving the user stuck in `waiting`.
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
    private readonly dataSource: DataSource,
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
    const proxyTargetId = this.generateProxyTargetId()

    let saved: ProxyDomain
    try {
      saved = await this.dataSource.transaction(async (manager) => {
        // Lock the parent project row for the duration of the transaction so
        // two concurrent creates on the same project can't both pass the
        // per-project limit check. Mirrors the pattern used in
        // DataImportService.create.
        await manager.getRepository(Project).findOneOrFail({
          where: { id: projectId },
          lock: { mode: 'pessimistic_write' },
        })

        const repo = manager.getRepository(ProxyDomain)

        const projectDomains = await repo.find({
          where: { projectId },
          select: ['id', 'hostname'],
        })

        if (projectDomains.length >= MAX_PROXY_DOMAINS_PER_PROJECT) {
          throw new ConflictException(
            `You can register up to ${MAX_PROXY_DOMAINS_PER_PROJECT} managed proxy domains per project`,
          )
        }

        if (projectDomains.some((d) => d.hostname === hostname)) {
          throw new ConflictException(
            'This hostname is already registered as a managed proxy',
          )
        }

        const entity = repo.create({
          projectId,
          hostname,
          proxyTargetId,
          status: ProxyDomainStatus.WAITING,
          statusChangedAt: new Date(),
        })

        return repo.save(entity)
      })
    } catch (err) {
      // The hostname is globally unique (UQ_proxy_domain_hostname); a race
      // between two projects trying to register the same hostname loses at
      // commit time. Translate the resulting duplicate-key error so the
      // caller sees the same ConflictException as the in-tx check above.
      if (this.isUniqueConstraintError(err)) {
        throw new ConflictException(
          'This hostname is already registered as a managed proxy',
        )
      }
      throw err
    }

    return {
      domain: this.serialise(saved),
      blockedKeywordWarning,
    }
  }

  private isUniqueConstraintError(err: unknown): boolean {
    if (!(err instanceof QueryFailedError)) return false
    const driverErr = (err as QueryFailedError & { driverError?: unknown })
      .driverError as { code?: string; errno?: number } | undefined
    return driverErr?.code === 'ER_DUP_ENTRY' || driverErr?.errno === 1062
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
      const records = await this.resolveCnameWithTimeout(domain.hostname)
      const found = (records || []).find(
        (r) => r.replace(/\.$/, '').toLowerCase() === expectedTarget,
      )
      if (found) {
        resolvedTarget = found
      }
    } catch {
      // NXDOMAIN/NODATA/timeout — treated as still waiting
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
    // Order by oldest check first so an oversized backlog drains evenly
    // (rather than starving rows that happen to sort late in the table).
    // `id` is the deterministic tie-breaker. NULL `lastCheckedAt` rows
    // (i.e. never-checked) sort first on MySQL where NULLs are less than
    // any value with ASC ordering.
    return this.proxyDomainRepository
      .createQueryBuilder('pd')
      .where({
        status: In([
          ProxyDomainStatus.WAITING,
          ProxyDomainStatus.ISSUING,
          ProxyDomainStatus.ERROR,
        ]),
      })
      .orderBy('pd.lastCheckedAt', 'ASC')
      .addOrderBy('pd.id', 'ASC')
      .take(limit)
      .getMany()
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
      .orderBy('pd.lastCheckedAt', 'ASC')
      .addOrderBy('pd.id', 'ASC')
      .take(limit)
      .getMany()
  }

  // Node's `dns.resolveCname` honours OS timeouts but in practice can hang
  // for tens of seconds on misbehaving authoritatives. Bound it ourselves so
  // a single bad domain can't stall the verifier batch.
  private async resolveCnameWithTimeout(
    hostname: string,
    timeoutMs = 10_000,
  ): Promise<string[]> {
    let timer: NodeJS.Timeout | undefined
    const timeout = new Promise<string[]>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('dns.resolveCname timed out')),
        timeoutMs,
      )
    })
    try {
      return await Promise.race([dns.resolveCname(hostname), timeout])
    } finally {
      if (timer) clearTimeout(timer)
    }
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
