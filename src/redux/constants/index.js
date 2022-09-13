const getCustomLabel = (dates, t) => {
  if (dates) {
    const from = dates[0].toLocaleDateString()
    const to = dates[1].toLocaleDateString()

    if (from === to) {
      return from
    }

    return `${from} - ${to}`
  }

  return t('project.custom')
}

export const tbPeriodPairs = (t, tbs, dates) => [{
  label: t('project.today'),
  period: 'today',
  tbs: ['hour'],
  access: 'free',
}, {
  label: t('project.yesterday'),
  period: 'yesterday',
  tbs: ['hour'],
  access: 'free',
}, {
  label: t('project.last24h'),
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
}, {
  label: getCustomLabel(dates, t),
  dropdownLabel: t('project.custom'),
  isCustomDate: true,
  period: 'custom',
  tbs: tbs || ['custom'],
  access: 'paid',
}]

export const timeBucketToDays = [
  { lt: 7, tb: ['hour', 'day'] }, // 7 days
  { lt: 28, tb: ['day', 'week'] }, // 4 weeks
  { lt: 366, tb: ['week', 'month'] }, // 12 months
  { lt: 732, tb: ['month'] }, // 24 months
]

export const tbsFormatMapper = {
  hour: '%d %B %H:%M',
  day: '%d %B',
  week: '%d %B',
  month: '%d %B %Y',
}

export const FREE_TIER_KEY = 'free'

export const reportFrequencies = ['weekly', 'monthly', 'never']

export const GDPR_EXPORT_TIMEFRAME = 14 // days

export const SHOW_BANNER_AT_PERC = 85 // show banner when 85% of events in tier are used

export const TITLE_SUFFIX = '| Swetrix'

export const LS_THEME_SETTING = 'colour-theme'
export const LS_VIEW_PREFS_SETTING = 'proj-view-preferences'

export const DEFAULT_TIMEZONE = 'Etc/GMT'

export const DONATE_URL = 'https://ko-fi.com/andriir'
export const FIREFOX_ADDON_URL = 'https://addons.mozilla.org/en-US/firefox/addon/swetrix/'
export const CHROME_EXTENSION_URL = 'https://chrome.google.com/webstore/detail/swetrix/glbeclfdldjldjonfnpnembfkhphmeld'
export const HAVE_I_BEEN_PWNED_URL = 'https://haveibeenpwned.com/passwords'
export const LINKEDIN_URL = 'https://www.linkedin.com/company/swetrix/'
export const GITHUB_URL = 'https://github.com/Swetrix'
export const TWITTER_URL = 'https://twitter.com/swetrix'
export const STATUSPAGE_URL = 'https://stats.uptimerobot.com/33rvmiXXEz'
export const BLOG_URL = 'https://blog.swetrix.com'
export const UTM_GENERATOR_URL = 'https://url.swetrix.com'

export const SUPPORTED_THEMES = ['light', 'dark']

export const CONTACT_EMAIL = 'contact@swetrix.com'
export const SECURITY_EMAIL = 'security@swetrix.com'

export const isSelfhosted = Boolean(process.env.REACT_APP_SELFHOSTED)

export const LIVE_VISITORS_UPDATE_INTERVAL = 40000
export const GENERAL_STATS_UPDATE_INTERVAL = 60000

// Functions
export const getProjectCacheKey = (period, timeBucket) => `${period}${timeBucket}`
export const getProjectCacheCustomKey = (from, to, timeBucket) => `${from}-${to}-${timeBucket}`

// Cookies
export const GDPR_REQUEST = 'gdpr_request'
export const CONFIRMATION_TIMEOUT = 'confirmation_timeout'
export const LOW_EVENTS_WARNING = 'low_events_warning'
export const TOKEN = 'access_token'

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

// dashboard && projects

export const roles = ['admin', 'viewer']

export const roleViewer = {
  name: 'Viewer',
  role: 'viewer',
  description: 'Can view the project',
}

export const roleAdmin = {
  name: 'Admin',
  role: 'admin',
  description: 'Can manage the project',
}

export const tabForOwnedProject = 'owned'
export const tabForSharedProject = 'shared'

export const tabsForDashboard = [
  {
    name: tabForOwnedProject,
    label: 'profileSettings.owned',
  },
  {
    name: tabForSharedProject,
    label: 'profileSettings.shared',
  },
]

export const INVITATION_EXPIRES_IN = 48 // hours
export const ENTRIES_PER_PAGE_DASHBOARD = 10
