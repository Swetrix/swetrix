import { isIP } from 'node:net'

interface ParsedIp {
  version: 4 | 6
  bytes: number[]
}

const parseIPv4 = (address: string): number[] | null => {
  const parts = address.split('.')
  if (parts.length !== 4) return null

  const bytes = parts.map((part) => {
    if (!/^\d+$/.test(part)) return NaN
    const value = Number(part)
    return value >= 0 && value <= 255 ? value : NaN
  })

  return bytes.some(Number.isNaN) ? null : bytes
}

const parseHextet = (part: string): number | null => {
  if (!/^[0-9a-f]{1,4}$/i.test(part)) return null
  return parseInt(part, 16)
}

const parseIPv6Bytes = (address: string): number[] | null => {
  let normalised = address.toLowerCase()
  const ipv4Tail = normalised.match(/(.+:)(\d+\.\d+\.\d+\.\d+)$/)

  if (ipv4Tail) {
    const ipv4Bytes = parseIPv4(ipv4Tail[2])
    if (!ipv4Bytes) return null

    normalised =
      ipv4Tail[1] +
      [ipv4Bytes[0] * 256 + ipv4Bytes[1], ipv4Bytes[2] * 256 + ipv4Bytes[3]]
        .map((part) => part.toString(16))
        .join(':')
  }

  const doubleColonParts = normalised.split('::')
  if (doubleColonParts.length > 2) return null

  const left = doubleColonParts[0]
    ? doubleColonParts[0].split(':').filter(Boolean)
    : []
  const right = doubleColonParts[1]
    ? doubleColonParts[1].split(':').filter(Boolean)
    : []

  const missing = 8 - left.length - right.length
  if (doubleColonParts.length === 1 && missing !== 0) return null
  if (doubleColonParts.length === 2 && missing < 1) return null

  const hextets = [...left, ...Array(Math.max(missing, 0)).fill('0'), ...right]

  if (hextets.length !== 8) return null

  const bytes: number[] = []
  for (const hextet of hextets) {
    const value = parseHextet(hextet)
    if (value === null) return null
    bytes.push((value >> 8) & 0xff, value & 0xff)
  }

  return bytes
}

const isIPv4MappedIPv6 = (bytes: number[]): boolean => {
  return (
    bytes.length === 16 &&
    bytes.slice(0, 10).every((byte) => byte === 0) &&
    bytes[10] === 0xff &&
    bytes[11] === 0xff
  )
}

const parseIp = (address: string): ParsedIp | null => {
  const version = isIP(address)

  if (version === 4) {
    const bytes = parseIPv4(address)
    return bytes ? { version: 4, bytes } : null
  }

  if (version === 6) {
    const bytes = parseIPv6Bytes(address)
    if (!bytes) return null
    if (isIPv4MappedIPv6(bytes)) {
      return { version: 4, bytes: bytes.slice(12) }
    }
    return { version: 6, bytes }
  }

  return null
}

const matchesPrefix = (
  target: ParsedIp,
  range: ParsedIp,
  prefix: number,
): boolean => {
  if (target.version !== range.version) return false

  const maxPrefix = target.bytes.length * 8
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > maxPrefix) {
    return false
  }

  const fullBytes = Math.floor(prefix / 8)
  for (let i = 0; i < fullBytes; i += 1) {
    if (target.bytes[i] !== range.bytes[i]) return false
  }

  const remainingBits = prefix % 8
  if (remainingBits === 0) return true

  const mask = (0xff << (8 - remainingBits)) & 0xff
  return (target.bytes[fullBytes] & mask) === (range.bytes[fullBytes] & mask)
}

const matchesSingleRange = (address: string, range: string): boolean => {
  const target = parseIp(address)
  if (!target) return false

  const [rangeAddress, prefixText] = range.split('/')
  const parsedRange = parseIp(rangeAddress)
  if (!parsedRange) return false

  if (prefixText === undefined) {
    return (
      target.version === parsedRange.version &&
      target.bytes.length === parsedRange.bytes.length &&
      target.bytes.every((byte, index) => byte === parsedRange.bytes[index])
    )
  }

  if (!/^\d+$/.test(prefixText)) return false
  return matchesPrefix(target, parsedRange, Number(prefixText))
}

export const isIpInRange = (
  address: string,
  ranges: string | string[],
): boolean => {
  const list = Array.isArray(ranges) ? ranges : [ranges]
  return list.some((range) => matchesSingleRange(address, range))
}
