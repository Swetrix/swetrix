import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { createPrivateKey, KeyObject, sign } from 'crypto'
import { parse } from 'tldts'

@Injectable()
export class ProxyDomainConnectService {
  private readonly privateKey?: KeyObject
  private readonly keyId?: string
  private readonly clientOrigin?: string

  constructor() {
    if (process.env.MANAGED_PROXY_DOMAIN_CONNECT_ENABLED !== 'true') return

    try {
      const keyId = process.env.MANAGED_PROXY_DOMAIN_CONNECT_KEY_ID
      if (!keyId || !/^_[a-z0-9_-]+$/i.test(keyId)) {
        throw new Error('Invalid Domain Connect key ID')
      }
      if (
        process.env.MANAGED_PROXY_BASE_DOMAIN &&
        process.env.MANAGED_PROXY_BASE_DOMAIN !== 'proxy.swetrix.org'
      ) {
        throw new Error('Domain Connect template requires proxy.swetrix.org')
      }
      const origin = new URL(process.env.CLIENT_URL || 'https://swetrix.com')
      if (origin.protocol !== 'https:') {
        throw new Error('Domain Connect requires an HTTPS client URL')
      }
      const key = createPrivateKey(
        (process.env.MANAGED_PROXY_DOMAIN_CONNECT_PRIVATE_KEY || '').replace(
          /\\n/g,
          '\n',
        ),
      )
      if (
        key.asymmetricKeyType !== 'rsa' ||
        (key.asymmetricKeyDetails?.modulusLength || 0) < 2048
      ) {
        throw new Error(
          'Domain Connect requires an RSA key of at least 2048 bits',
        )
      }
      this.keyId = keyId
      this.clientOrigin = origin.origin
      this.privateKey = key
    } catch {
      new Logger(ProxyDomainConnectService.name).warn(
        'Cloudflare DNS setup is disabled: check the Domain Connect configuration',
      )
    }
  }

  get enabled(): boolean {
    return !!this.privateKey
  }

  createUrl(
    projectId: string,
    hostname: string,
    proxyTargetId: string,
  ): string {
    if (!this.privateKey) {
      throw new ServiceUnavailableException(
        'Cloudflare DNS setup is unavailable',
      )
    }

    const { domain, subdomain } = parse(hostname)
    if (!domain || !subdomain || !/^[a-f0-9]{32}$/.test(proxyTargetId)) {
      throw new BadRequestException('Invalid managed proxy domain')
    }

    const redirect = new URL(
      `/projects/settings/${encodeURIComponent(projectId)}`,
      this.clientOrigin,
    )
    redirect.searchParams.set('tab', 'proxy')
    redirect.searchParams.set('cloudflare', hostname)

    const query = new URLSearchParams({
      domain,
      host: subdomain,
      proxyTargetId,
      redirect_uri: redirect.toString(),
    }).toString()
    const signature = sign(
      'RSA-SHA256',
      Buffer.from(query),
      this.privateKey,
    ).toString('base64')

    return (
      'https://dash.cloudflare.com/domainconnect/v2/domainTemplates/providers/' +
      'swetrix.com/services/managed-proxy/apply?' +
      `${query}&key=${encodeURIComponent(this.keyId)}&sig=${encodeURIComponent(signature)}`
    )
  }
}
