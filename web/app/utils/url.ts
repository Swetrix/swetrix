export const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value.trim())
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

const DOMAIN_REGEX = /^[a-z0-9._-]+\.[a-z]{2,}$/i

/**
 * Pull a bare hostname out of whatever a visitor typed - with or without a
 * scheme, `www.`, a path or a trailing dot. Returns null when the input doesn't
 * (yet) look like a public domain, which is what the callers use to decide
 * whether it's worth asking for a favicon.
 */
export const extractDomain = (raw: string | null | undefined) => {
  const trimmed = (raw || '').trim().toLowerCase()

  if (!trimmed) {
    return null
  }

  const host = trimmed
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#]/)[0]
    ?.replace(/\.+$/, '')

  if (!host || host.length > 253 || !DOMAIN_REGEX.test(host)) {
    return null
  }

  return host
}
