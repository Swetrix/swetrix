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
  'month': '%d %B %Y',
}

export const reportFrequencies = ['weekly', 'monthly', 'never']

export const GDPR_EXPORT_TIMEFRAME = 14 // days

export const SHOW_BANNER_AT_PERC = 85 // show banner when 85% of events in tier are used

export const TOKEN = 'access_token'

export const TITLE_SUFFIX = '| Swetrix'

export const LS_THEME_SETTING = 'colour-theme'
export const LS_VIEW_PREFS_SETTING = 'proj-view-preferences'

export const DONATE_URL = 'https://ko-fi.com/andriir'
export const FIREFOX_ADDON_URL = 'https://addons.mozilla.org/en-US/firefox/addon/swetrix/'
export const CHROME_EXTENSION_URL = 'https://chrome.google.com/webstore/detail/swetrix/glbeclfdldjldjonfnpnembfkhphmeld'
export const HAVE_I_BEEN_PWNED_URL = 'https://haveibeenpwned.com/passwords'
export const LINKEDIN_URL = 'https://www.linkedin.com/company/swetrix/'
export const GITHUB_URL = 'https://github.com/Swetrix'

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
export const LOW_EVENTS_WARNING = 'low_events_warning'

// List of languages with translations available
export const whitelist = ['en', 'uk', 'de', 'sv', 'el', 'ru', 'hi', 'zh']
export const defaultLanguage = 'en'
export const languages = {
  en: 'English',
  uk: 'Українська',
  de: 'Deutsch',
  sv: 'Svenska',
  el: 'Ελληνικά',
  ru: 'Русский',
  hi: 'हिन्दी',
  zh: '中文简体',
}

export const languageFlag = {
  en: 'GB',
  uk: 'UA',
  de: 'DE',
  sv: 'SE',
  el: 'GR',
  ru: 'RU',
  hi: 'IN',
  zh: 'CN',
}

export const paddleLanguageMapping = {
  zh: 'zh-Hans',
  uk: 'ru',
  el: 'en', 
}
