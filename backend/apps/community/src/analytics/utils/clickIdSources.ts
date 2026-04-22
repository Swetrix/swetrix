/**
 * Click-ID based traffic source enrichment.
 *
 * Many ad networks, social apps and email platforms append a unique
 * tracking parameter (a "click ID") to URLs they send users to. When the
 * referring app is a native mobile app or in-app browser (Twitter/X,
 * Reddit, Facebook, TikTok, Gmail iOS, Slack, ...) the HTTP `Referer`
 * header is almost always stripped — but the click ID is preserved in
 * the destination URL.
 *
 * By detecting these click IDs server-side we can synthesize a sensible
 * `source` / `medium` (and a canonical `referrer`) for events that would
 * otherwise be bucketed as "Direct / None".
 *
 * Explicit UTM parameters set by the marketer always win — this only
 * fills in gaps.
 */

interface ClickIdMapping {
  /** Canonical traffic source (utm_source). */
  source: string
  /** Canonical traffic medium (utm_medium). */
  medium: string
  /** Canonical referrer URL used when `ref` is empty. */
  ref: string
}

/**
 * Click-ID parameter -> inferred traffic source mapping.
 * Keys are lowercase, matching is case-insensitive.
 *
 * Order matters: ad-network click IDs (paid) are listed before
 * social/email ones so that the most specific attribution wins when
 * multiple click IDs are present in the same URL.
 */
const CLICK_ID_MAP: Record<string, ClickIdMapping> = {
  // Google Ads
  gclid: { source: 'google', medium: 'cpc', ref: 'https://google.com' },
  gbraid: { source: 'google', medium: 'cpc', ref: 'https://google.com' },
  wbraid: { source: 'google', medium: 'cpc', ref: 'https://google.com' },
  dclid: {
    source: 'google',
    medium: 'display',
    ref: 'https://google.com',
  },
  // Microsoft / Bing Ads
  msclkid: { source: 'bing', medium: 'cpc', ref: 'https://bing.com' },
  // Yandex Direct
  yclid: { source: 'yandex', medium: 'cpc', ref: 'https://yandex.com' },
  // Adobe Search
  s_kwcid: { source: 'adobe', medium: 'cpc', ref: 'https://adobe.com' },
  // Meta / Facebook
  fbclid: {
    source: 'facebook',
    medium: 'social',
    ref: 'https://facebook.com',
  },
  // TikTok Ads / organic
  ttclid: { source: 'tiktok', medium: 'social', ref: 'https://tiktok.com' },
  // X / Twitter
  twclid: { source: 'x', medium: 'social', ref: 'https://x.com' },
  // LinkedIn
  li_fat_id: {
    source: 'linkedin',
    medium: 'social',
    ref: 'https://linkedin.com',
  },
  // Pinterest
  epik: {
    source: 'pinterest',
    medium: 'social',
    ref: 'https://pinterest.com',
  },
  // Reddit Ads
  rdt_cid: { source: 'reddit', medium: 'social', ref: 'https://reddit.com' },
  // Instagram (passed by IG in-app browser when sharing links)
  igshid: {
    source: 'instagram',
    medium: 'social',
    ref: 'https://instagram.com',
  },
  // Snapchat Ads
  scclid: {
    source: 'snapchat',
    medium: 'social',
    ref: 'https://snapchat.com',
  },
  // Mailchimp
  mc_cid: {
    source: 'mailchimp',
    medium: 'email',
    ref: 'https://mailchimp.com',
  },
  mc_eid: {
    source: 'mailchimp',
    medium: 'email',
    ref: 'https://mailchimp.com',
  },
  // HubSpot
  _hsenc: { source: 'hubspot', medium: 'email', ref: 'https://hubspot.com' },
  _hsmi: { source: 'hubspot', medium: 'email', ref: 'https://hubspot.com' },
  // Affiliate networks
  irclid: { source: 'impact', medium: 'affiliate', ref: 'https://impact.com' },
  sscid: {
    source: 'shareasale',
    medium: 'affiliate',
    ref: 'https://shareasale.com',
  },
}

/**
 * Iteration order is deterministic in modern engines (insertion order),
 * which gives ad-network IDs priority over social/email — matching the
 * `CLICK_ID_MAP` declaration above.
 */
const CLICK_ID_KEYS = Object.keys(CLICK_ID_MAP)

/**
 * Placeholder value the JS tracker historically sent in the `me` field
 * when only a `gclid` was detected on the client. We rewrite it here.
 */
const LEGACY_GCLID_PLACEHOLDER = '<gclid>'

/**
 * Pulls the URL search string out of a `pg` value the tracker sent.
 *
 * The tracker only includes the search part when the user enables
 * `search: true` in `trackPageViews`. When it is included the value
 * looks like `/path?foo=bar&fbclid=abc` (or `/path#hash?foo=bar`).
 */
const extractSearchString = (pg: string | null | undefined): string => {
  if (!pg) return ''
  const qIdx = pg.indexOf('?')
  if (qIdx === -1) return ''
  let search = pg.slice(qIdx + 1)
  // Strip a trailing hash fragment if present (`?a=b#hash`)
  const hashIdx = search.indexOf('#')
  if (hashIdx !== -1) search = search.slice(0, hashIdx)
  return search
}

/**
 * Returns the first click-ID mapping found in the given query string,
 * iterating in `CLICK_ID_MAP` priority order so that paid-search IDs
 * win over social ones.
 */
const findClickIdMapping = (search: string): ClickIdMapping | null => {
  if (!search) return null

  // Lowercase a single time for case-insensitive `key=` matching.
  // We don't decode the value (we only care about the presence).
  const lower = `&${search.toLowerCase()}`

  for (const key of CLICK_ID_KEYS) {
    if (lower.includes(`&${key}=`)) {
      return CLICK_ID_MAP[key]
    }
  }
  return null
}

interface TrafficSourceFields {
  ref?: string | null
  so?: string | null
  me?: string | null
  ca?: string | null
  te?: string | null
  co?: string | null
  pg?: string | null
}

/**
 * Enriches an incoming pageview / custom-event payload with traffic
 * source information derived from click IDs found in the URL.
 *
 * Mutates the passed object (and returns it) for ergonomic call-site
 * usage. UTM parameters explicitly set by the marketer always win — we
 * only fill empty fields.
 */
export const enrichTrafficSource = <T extends TrafficSourceFields>(
  payload: T,
): T => {
  if (!payload) return payload

  // 1. Rewrite the legacy `<gclid>` placeholder the JS tracker emits.
  if (payload.me === LEGACY_GCLID_PLACEHOLDER) {
    const gclidMapping = CLICK_ID_MAP.gclid
    payload.me = gclidMapping.medium
    if (!payload.so) payload.so = gclidMapping.source
    if (!payload.ref) payload.ref = gclidMapping.ref
  }

  // 2. Parse the page URL search string for any known click IDs.
  const search = extractSearchString(payload.pg)
  const mapping = findClickIdMapping(search)
  if (mapping) {
    if (!payload.so) payload.so = mapping.source
    if (!payload.me) payload.me = mapping.medium
    if (!payload.ref) payload.ref = mapping.ref
  }

  return payload
}
