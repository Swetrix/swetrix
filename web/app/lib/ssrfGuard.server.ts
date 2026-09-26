import {
  lookup as dnsLookup,
  type LookupAddress,
  type LookupOptions,
} from 'node:dns'
import { isIP } from 'node:net'

import { Agent, fetch as undiciFetch } from 'undici'

const BLOCKED_MESSAGE =
  'This URL resolves to a private or reserved network address, which is not allowed'

const allowPrivateHosts = process.env.SEO_TOOLS_ALLOW_PRIVATE_HOSTS === 'true'

class BlockedRequestError extends Error {
  constructor(message = BLOCKED_MESSAGE) {
    super(message)
    this.name = 'BlockedRequestError'
  }
}

const BLOCKED_HOSTNAMES = new Set(['localhost', 'localhost.localdomain'])
const BLOCKED_HOST_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.intranet',
  '.lan',
  '.corp',
  '.private',
  '.home.arpa',
  '.in-addr.arpa',
  '.ip6.arpa',
]

const BLOCKED_IPV4_RANGES: Array<[string, number]> = [
  ['0.0.0.0', 8], // "this host on this network"
  ['10.0.0.0', 8], // RFC1918 private
  ['100.64.0.0', 10], // RFC6598 carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local - cloud instance metadata lives here
  ['172.16.0.0', 12], // RFC1918 private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.88.99.0', 24], // deprecated 6to4 relay anycast
  ['192.168.0.0', 16], // RFC1918 private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, incl. 255.255.255.255 broadcast
]

function ipv4ToInt(value: string): number | null {
  const parts = value.split('.')
  if (parts.length !== 4) return null

  let result = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const octet = Number(part)
    if (octet > 255) return null
    result = result * 256 + octet
  }

  return result
}

function isBlockedIpv4(address: number): boolean {
  return BLOCKED_IPV4_RANGES.some(([network, prefix]) => {
    const base = ipv4ToInt(network)
    if (base === null) return false
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
    return (address & mask) >>> 0 === (base & mask) >>> 0
  })
}

function parseIpv6(value: string): number[] | null {
  // Drop a zone index (fe80::1%eth0) and any surrounding brackets.
  const address = value.split('%')[0].replace(/^\[/, '').replace(/\]$/, '')
  const halves = address.split('::')
  if (halves.length > 2) return null

  const toHextets = (chunk: string): number[] | null => {
    if (!chunk) return []
    const parts = chunk.split(':')
    const hextets: number[] = []

    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index]

      // A trailing IPv4 form (::ffff:127.0.0.1) occupies the last two hextets.
      if (part.includes('.')) {
        if (index !== parts.length - 1) return null
        const packed = ipv4ToInt(part)
        if (packed === null) return null
        hextets.push((packed >>> 16) & 0xffff, packed & 0xffff)
        continue
      }

      if (!/^[0-9a-f]{1,4}$/i.test(part)) return null
      hextets.push(Number.parseInt(part, 16))
    }

    return hextets
  }

  const head = toHextets(halves[0])
  const tail = halves.length === 2 ? toHextets(halves[1]) : []
  if (!head || !tail) return null

  if (halves.length === 1) return head.length === 8 ? head : null

  const fill = 8 - head.length - tail.length
  if (fill < 1) return null

  return [...head, ...new Array(fill).fill(0), ...tail]
}

function isBlockedIpv6(hextets: number[]): boolean {
  const [h0, h1, h2, h3, h4, h5] = hextets
  const packLast32 = () => ((hextets[6] << 16) | hextets[7]) >>> 0

  const isUnspecified = hextets.every((hextet) => hextet === 0)
  const isLoopback =
    hextets.slice(0, 7).every((hextet) => hextet === 0) && hextets[7] === 1
  if (isUnspecified || isLoopback) return true

  const firstFiveZero = h0 === 0 && h1 === 0 && h2 === 0 && h3 === 0 && h4 === 0
  if (firstFiveZero && (h5 === 0xffff || h5 === 0)) {
    return isBlockedIpv4(packLast32())
  }
  // RFC6052 NAT64 (64:ff9b::/96) and its local-use sibling (64:ff9b:1::/48).
  if (h0 === 0x0064 && h1 === 0xff9b) return true
  // 6to4 (2002::/16) embeds the v4 address of the relay in hextets 1-2.
  if (h0 === 0x2002) return isBlockedIpv4(((h1 << 16) | h2) >>> 0)

  if ((h0 & 0xfe00) === 0xfc00) return true // fc00::/7 unique-local
  if ((h0 & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
  if ((h0 & 0xff00) === 0xff00) return true // ff00::/8 multicast
  if (h0 === 0x0100 && h1 === 0 && h2 === 0 && h3 === 0) return true // 100::/64 discard
  if (h0 === 0x2001 && h1 === 0x0000) return true // 2001::/32 Teredo
  if (h0 === 0x2001 && h1 === 0x0002 && h2 === 0) return true // 2001:2::/48 benchmarking
  if (h0 === 0x2001 && h1 === 0x0db8) return true // 2001:db8::/32 documentation
  if (h0 === 0x5f00) return true // 5f00::/16 reserved

  return false
}

/** True for anything that is not a publicly routable IP address. Fails closed. */
function isBlockedAddress(address: string): boolean {
  const ipv4 = ipv4ToInt(address)
  if (ipv4 !== null) return isBlockedIpv4(ipv4)

  const ipv6 = parseIpv6(address)
  if (ipv6) return isBlockedIpv6(ipv6)

  return true
}

/**
 * Both layers resolve through this one function, so there is a single resolver
 * to reason about rather than `node:dns` in one place and `node:dns/promises` in
 * another.
 */
function resolveAll(hostname: string): Promise<LookupAddress[]> {
  return new Promise((resolve, reject) => {
    dnsLookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
      if (error) reject(error)
      else resolve(addresses)
    })
  })
}

interface AssertHostOptions {
  /**
   * When false, a hostname that does not resolve is allowed through - only
   * addresses we *do* get back are checked. The DNS lookup tool needs this: a
   * domain with MX/TXT records but no A/AAAA is a perfectly valid thing to
   * inspect there.
   */
  requireResolvable?: boolean
}

/**
 * Validate a hostname, returning the addresses it resolves to.
 *
 * Every address is checked, not just the first - a name with one public and one
 * private answer must not slip through on whichever one the resolver happens to
 * return first.
 */
export async function assertHostAllowed(
  hostname: string,
  { requireResolvable = true }: AssertHostOptions = {},
): Promise<string[]> {
  const host = hostname
    .trim()
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/^\[/, '')
    .replace(/\]$/, '')

  if (!host) throw new BlockedRequestError('Please enter a valid host name')
  if (allowPrivateHosts) return []

  if (
    BLOCKED_HOSTNAMES.has(host) ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
  ) {
    throw new BlockedRequestError()
  }

  // An IP literal needs no resolution - and must not get any, or a hostile
  // resolver could answer for it.
  if (isIP(host)) {
    if (isBlockedAddress(host)) throw new BlockedRequestError()
    return [host]
  }

  let addresses: string[]
  try {
    addresses = (await resolveAll(host)).map((entry) => entry.address)
  } catch {
    if (requireResolvable) {
      throw new BlockedRequestError(`Could not resolve host name "${host}"`)
    }
    return []
  }

  if (!addresses.length) {
    if (requireResolvable) {
      throw new BlockedRequestError(`Could not resolve host name "${host}"`)
    }
    return []
  }

  if (addresses.some(isBlockedAddress)) throw new BlockedRequestError()

  return addresses
}

/**
 * Validate a URL before we connect to it. Returns the parsed URL so callers can
 * reuse the normalised form.
 */
async function assertUrlAllowed(value: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new BlockedRequestError('Please enter a valid URL')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BlockedRequestError('Only HTTP and HTTPS URLs are supported')
  }

  // Credentials in the URL are never needed here and are a classic way to make
  // a host look like something it is not (http://example.com@127.0.0.1/).
  if (url.username || url.password) {
    throw new BlockedRequestError(
      'URLs with embedded credentials are not allowed',
    )
  }

  await assertHostAllowed(url.hostname)

  return url
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

function guardedLookup(
  hostname: string,
  options: LookupOptions,
  callback: (
    error: NodeJS.ErrnoException | null,
    address: string | LookupAddress[],
    family?: number,
  ) => void,
): void {
  dnsLookup(hostname, { ...options, all: true }, (error, resolved) => {
    if (error) {
      callback(error, [])
      return
    }

    // Refuse an empty answer rather than indexing into nothing below: fail
    // closed, the same as an unparseable address.
    if (!resolved.length) {
      callback(new BlockedRequestError(), [])
      return
    }

    if (resolved.some((entry) => isBlockedAddress(entry.address))) {
      callback(new BlockedRequestError(), [])
      return
    }

    // Hand back whichever shape the caller asked for.
    if (options.all) callback(null, resolved)
    else callback(null, resolved[0].address, resolved[0].family)
  })
}

/**
 * Node's global fetch cannot be pointed at a custom resolver, and it rejects a
 * userland undici dispatcher outright, so the guarded requests go through
 * undici's own fetch. It returns a spec Response, so callers see no difference.
 */
const dispatcher = new Agent({
  // Skipping the hook entirely when the escape hatch is on keeps the "no
  // validation at all" promise honest, rather than relying on every check
  // inside the hook being individually short-circuited.
  connect: allowPrivateHosts ? {} : { lookup: guardedLookup },
  // Stay on HTTP/1.1. Several tools surface response.statusText, and HTTP/2 has
  // no reason phrase - negotiating h2 would silently blank it. This also keeps
  // behaviour identical to the global fetch these tools used before.
  allowH2: false,
  connections: 10,
})

/**
 * A lookup rejection surfaces as `TypeError: fetch failed` with the real error
 * on `cause`. Dig the guard's own error back out so the tools can show it,
 * while leaving anything else (AbortError in particular, which callers check by
 * name) exactly as undici threw it.
 */
function rethrowFetchError(error: unknown): never {
  let cause: unknown = error

  for (let depth = 0; depth < 5 && cause; depth += 1) {
    if (cause instanceof BlockedRequestError) throw cause
    cause = cause instanceof Error ? cause.cause : null
  }

  throw error
}

interface GuardedFetchOptions {
  timeout?: number
  maxRedirects?: number
}

export async function guardedFetch(
  url: string,
  init: RequestInit = {},
  { timeout = 10000, maxRedirects = 10 }: GuardedFetchOptions = {},
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  const signal = init.signal
    ? AbortSignal.any([init.signal, controller.signal])
    : controller.signal

  const shouldFollow = !init.redirect || init.redirect === 'follow'

  try {
    let currentUrl = (await assertUrlAllowed(url)).toString()
    let method = init.method || 'GET'
    let body = init.body
    let hopsLeft = shouldFollow ? maxRedirects : 0

    // The timeout covers the whole chain, so a redirect loop cannot buy extra
    // time by resetting the clock on each hop.
    while (true) {
      // undici's Response is the same spec object the global fetch returns; the
      // types differ only in iterator helper declarations, hence the cast.
      const response = (await undiciFetch(currentUrl, {
        ...init,
        method,
        body,
        redirect: shouldFollow ? 'manual' : init.redirect,
        signal,
        dispatcher,
      } as Parameters<typeof undiciFetch>[1]).catch(
        rethrowFetchError,
      )) as unknown as Response

      const location = response.headers.get('location')
      if (
        !shouldFollow ||
        !REDIRECT_STATUSES.has(response.status) ||
        !location
      ) {
        return response
      }

      if (hopsLeft <= 0) {
        throw new Error('Too many redirects')
      }

      await response.body?.cancel().catch(() => {})

      const next = await assertUrlAllowed(
        new URL(location, currentUrl).toString(),
      )

      // Match fetch semantics: 303 always becomes a GET, and 301/302 do too for
      // anything that was not already GET/HEAD. 307/308 keep method and body.
      if (
        response.status === 303 ||
        ((response.status === 301 || response.status === 302) &&
          method !== 'GET' &&
          method !== 'HEAD')
      ) {
        method = 'GET'
        body = undefined
      }

      currentUrl = next.toString()
      hopsLeft -= 1
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
