interface IGetPath {
  hash?: boolean
  search?: boolean
}

const findInSearch = (exp: RegExp): string | undefined => {
  const res = location.search.match(exp)
  return (res && res[2]) || undefined
}

const utmSourceRegex = /[?&](ref|source|utm_source)=([^?&]+)/
const utmCampaignRegex = /[?&](utm_campaign)=([^?&]+)/
const utmMediumRegex = /[?&](utm_medium)=([^?&]+)/

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

export const getUTMSource = () => findInSearch(utmSourceRegex)

export const getUTMMedium = () => findInSearch(utmMediumRegex)

export const getUTMCampaign = () => findInSearch(utmCampaignRegex)

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
 * @param options.hash - Whether to trigger on hash change.
 * @param options.search - Whether to trigger on search change.
 * @returns The path of the current page.
 */
export const getPath = (options: IGetPath): string => {
  let result = location.pathname || ''

  if (options.hash) {
    const hashIndex = location.hash.indexOf('?')
    const hashString = hashIndex > -1 ? location.hash.substring(0, hashIndex) : location.hash
    result += hashString
  }

  if (options.search) {
    const hashIndex = location.hash.indexOf('?')
    const searchString = location.search || (hashIndex > -1 ? location.hash.substring(hashIndex) : '')
    result += searchString
  }

  return result
}
