interface IGetPath {
  hash?: boolean | readonly string[]
  search?: boolean | readonly string[]
}

type RouteTrackingOption = boolean | readonly string[] | undefined

const findInSearch = (exp: RegExp): string | undefined => {
  const res = location.search.match(exp)
  return (res && res[2]) || undefined
}

const utmSourceRegex = /[?&](ref|source|utm_source|gad_source)=([^?&]+)/
const utmCampaignRegex = /[?&](utm_campaign|gad_campaignid)=([^?&]+)/
const utmMediumRegex = /[?&](utm_medium)=([^?&]+)/
const utmTermRegex = /[?&](utm_term)=([^?&]+)/
const utmContentRegex = /[?&](utm_content)=([^?&]+)/

const gclidRegex = /[?&](gclid)=([^?&]+)/

const getGclid = () => {
  return findInSearch(gclidRegex) ? '<gclid>' : undefined
}

export const isInBrowser = () => {
  return typeof window !== 'undefined'
}

export const isLocalhost = () => {
  return location?.hostname === 'localhost' || location?.hostname === '127.0.0.1' || location?.hostname === ''
}

export const isAutomated = () => {
  return navigator?.webdriver
}

export const getLocale = () => {
  return typeof navigator.languages !== 'undefined' ? navigator.languages[0] : navigator.language
}

export const getTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch (e) {
    return
  }
}

export const getReferrer = (): string | undefined => {
  return document.referrer || undefined
}

/**
 * Returns the URL query string (without the leading `?`) of the current
 * page, or `undefined` if there is none.
 *
 * Falls back to a query string embedded in `location.hash` (e.g. when a
 * hash router uses `/#/path?foo=bar`) so we still capture click IDs in
 * SPA hash-routed setups.
 */
export const getQueryString = (): string | undefined => {
  if (location.search && location.search.length > 1) {
    return location.search.slice(1)
  }

  const hashIndex = location.hash.indexOf('?')
  if (hashIndex > -1) {
    const hashQuery = location.hash.slice(hashIndex + 1)
    if (hashQuery) return hashQuery
  }

  return undefined
}

export const getUTMSource = () => findInSearch(utmSourceRegex)

export const getUTMMedium = () => findInSearch(utmMediumRegex) || getGclid()

export const getUTMCampaign = () => findInSearch(utmCampaignRegex)

export const getUTMTerm = () => findInSearch(utmTermRegex)

export const getUTMContent = () => findInSearch(utmContentRegex)

const filterSearch = (search: string, option: RouteTrackingOption): string => {
  if (option === true) return search
  if (!Array.isArray(option) || !search) return ''

  const allowedParams = new Set(option)
  const params = search
    .slice(1)
    .split('&')
    .filter((param) => {
      const separatorIndex = param.indexOf('=')
      const rawName = separatorIndex === -1 ? param : param.slice(0, separatorIndex)

      try {
        return allowedParams.has(decodeURIComponent(rawName.replace(/\+/g, ' ')))
      } catch {
        return allowedParams.has(rawName)
      }
    })

  return params.length ? `?${params.join('&')}` : ''
}

const filterHash = (hash: string, option: RouteTrackingOption): string => {
  if (option === true) return hash
  if (!Array.isArray(option) || !hash) return ''

  const hashValue = hash.slice(1)
  return option.some((value) => value.replace(/^#/, '') === hashValue) ? hash : ''
}

/**
 * Function used to track the current page (path) of the application.
 * Will work in cases where the path looks like:
 * - /path
 * - /#/path
 * - /path?search
 * - /path?search#hash
 * - /path#hash?search
 *
 * @param options - Options for the function.
 * @param options.hash - Whether to include hashes, or an allowlist of hash values to include.
 * @param options.search - Whether to include query parameters, or an allowlist of parameter names to include.
 * @returns The path of the current page.
 */
export const getPath = (options: IGetPath): string => {
  let result = location.pathname || ''

  if (options.hash) {
    const hashIndex = location.hash.indexOf('?')
    const hashString = hashIndex > -1 ? location.hash.substring(0, hashIndex) : location.hash
    result += filterHash(hashString, options.hash)
  }

  if (options.search) {
    const hashIndex = location.hash.indexOf('?')
    const searchString = location.search || (hashIndex > -1 ? location.hash.substring(hashIndex) : '')
    result += filterSearch(searchString, options.search)
  }

  return result
}
