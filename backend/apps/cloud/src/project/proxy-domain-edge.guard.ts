import * as crypto from 'crypto'
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'

// Shared-secret guard for the public-facing edge endpoints in
// ProxyDomainEdgeController. The proxy.swetrix.org edge box passes the secret
// in `X-Edge-Api-Key`; everything else gets a generic 404 so an attacker
// can't even tell that the endpoint exists, let alone enumerate hostnames.
//
// Fails closed: if MANAGED_PROXY_EDGE_API_KEY is unset, every request is
// rejected. Self-hosted deployments that don't run the managed proxy never
// hit these routes anyway.
@Injectable()
export class ProxyDomainEdgeGuard implements CanActivate {
  private readonly logger = new Logger(ProxyDomainEdgeGuard.name)

  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.MANAGED_PROXY_EDGE_API_KEY

    if (!expected) {
      this.logger.warn(
        'MANAGED_PROXY_EDGE_API_KEY is not configured; rejecting edge request',
      )
      throw new NotFoundException()
    }

    const request = context.switchToHttp().getRequest()
    const provided = request.headers['x-edge-api-key']

    if (typeof provided !== 'string' || provided.length === 0) {
      throw new NotFoundException()
    }

    const expectedBuf = Buffer.from(expected)
    const providedBuf = Buffer.from(provided)

    if (
      expectedBuf.length !== providedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, providedBuf)
    ) {
      throw new NotFoundException()
    }

    return true
  }
}
