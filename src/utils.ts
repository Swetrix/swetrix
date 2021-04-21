const ua = navigator.userAgent || ''

const findInSearch = (exp: RegExp): string | null => {
  const res = location.search.match(exp)
  return res && res[2]
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

export const getRefferer = () => {
  return document.referrer
}

export const getUTMSource = () => findInSearch(utmSourceRegex)

export const getUTMMedium = () => findInSearch(utmMediumRegex)

export const getUTMCampaign = () => findInSearch(utmCampaignRegex)
