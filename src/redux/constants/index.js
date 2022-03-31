export const tbPeriodPairs = (t) => [{
  label: t('project.today'),
  period: '1d',
  tbs: ['hour'],
  access: 'free',
}, {
  label: t('project.lastXDays', { amount: 7 }),
  period: '7d',
  tbs: ['hour', 'day'],
  access: 'free',
}, {
  label: t('project.lastXWeeks', { amount: 4 }),
  period: '4w',
  tbs: ['day', 'week'],
  access: 'free',
}, {
  label: t('project.lastXMonths', { amount: 3 }),
  period: '3M',
  tbs: ['week', 'month'],
  access: 'paid',
}, {
  label: t('project.lastXMonths', { amount: 12 }),
  period: '12M',
  tbs: ['week', 'month'],
  access: 'paid',
}, {
  label: t('project.lastXMonths', { amount: 24 }),
  period: '24M',
  tbs: ['month'],
  access: 'paid',
}]

export const tbsFormatMapper = {
  'hour': '%d %B %H:%M',
  'day': '%d %B',
  'week': '%d %B',
  'month': '%d %B',
}

export const reportFrequencies = ['weekly', 'monthly', 'never']

export const GDPR_EXPORT_TIMEFRAME = 14 // days

export const TOKEN = 'access_token'

export const TITLE_SUFFIX = '| Swetrix'

export const LS_THEME_SETTING = 'colour-theme'

export const DONATE_URL = 'https://ko-fi.com/andriir'
export const FIREFOX_ADDON_URL = 'https://addons.mozilla.org/en-US/firefox/addon/swetrix/'
export const CHROME_EXTENSION_URL = 'https://chrome.google.com/webstore/detail/swetrix/glbeclfdldjldjonfnpnembfkhphmeld'
export const HAVE_I_BEEN_PWNED_URL = 'https://haveibeenpwned.com/passwords'

export const CONTACT_EMAIL = 'contact@swetrix.com'
export const SECURITY_EMAIL = 'security@swetrix.com'

export const isSelfhosted = Boolean(process.env.REACT_APP_SELFHOSTED)

export const LIVE_VISITORS_UPDATE_INTERVAL = 40000
export const GENERAL_STATS_UPDATE_INTERVAL = 60000

// Functions
export const getProjectCacheKey = (period, timeBucket) => `${period}${timeBucket}`

// Cookies
export const GDPR_REQUEST = 'gdpr_request'
export const CONFIRMATION_TIMEOUT = 'confirmation_timeout'

// List of languages with translations available
export const whitelist = ['en', 'ru', 'uk', 'de', 'sv', 'hi', 'zh']
export const defaultLanguage = 'en'
export const languages = {
  en: 'English',
  ru: 'Русский',
  uk: 'Українська',
  de: 'Deutsch',
  sv: 'Svenska',
  hi: 'हिन्दी',
  zh: '中文简体',
}
export const languageFlag = {
  en: 'GB',
  uk: 'UA',
  ru: 'RU',
  de: 'DE',
  sv: 'SE',
  hi: 'IN',
  zh: 'CN',
}

export const paddleLanguageMapping = {
  zh: 'zh-Hans',
  uk: 'ru',
}
