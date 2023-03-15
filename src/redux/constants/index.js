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

export const FORECAST_MAX_MAPPING = {
  hour: 72,
  day: 21,
  week: 21,
  month: 12,
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
  access: 'free',
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
  access: 'free',
}]

// the maximum amount of months user can go back when picking a date in flat picker (project view)
export const MAX_MONTHS_IN_PAST = 24
export const MAX_MONTHS_IN_PAST_FREE = 3

export const timeBucketToDays = [
  { lt: 1, tb: ['hour'] }, // 1 days
  { lt: 7, tb: ['hour', 'day'] }, // 7 days
  { lt: 28, tb: ['day', 'week'] }, // 4 weeks
  { lt: 366, tb: ['week', 'month'] }, // 12 months
  { lt: 732, tb: ['month'] }, // 24 months
]

export const tbsFormatMapper = {
  hour: '%d %b %H:%M',
  day: '%d %b',
  week: '%d %b',
  month: '%d %b %Y',
}

export const tbsFormatMapper24h = {
  hour: '%H:%M',
  day: '%d %b',
  week: '%d %b',
  month: '%d %b %Y',
}

export const TimeFormat = {
  '12-hour': '12-hour',
  '24-hour': '24-hour',
}

export const FREE_TIER_KEY = 'free'

// a dedicated variable is needed for paid tier checking
export const WEEKLY_REPORT_FREQUENCY = 'weekly'
export const reportFrequencies = [WEEKLY_REPORT_FREQUENCY, 'monthly', 'never']

export const reportFrequencyForEmailsOptions = [
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'never', label: 'Never' },
]

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
export const TWITTER_URL = 'https://twitter.com/intent/user?screen_name=swetrix'
export const TWITTER_USERNAME = '@swetrix'
export const DISCORD_URL = 'https://discord.gg/35jHATy65F'
export const STATUSPAGE_URL = 'https://stats.uptimerobot.com/33rvmiXXEz'
export const BLOG_URL = 'https://blog.swetrix.com'
export const UTM_GENERATOR_URL = 'https://url.swetrix.com'
export const MARKETPLACE_URL = 'https://marketplace.swetrix.com'
export const DOCS_URL = 'https://docs.swetrix.com'
export const CDN_URL = process.env.REACT_APP_CDN_URL

// Swetrix vs ...
export const SWETRIX_VS_GOOGLE = 'https://blog.swetrix.com/post/vs-google-analytics/'
export const SWETRIX_VS_CLOUDFLARE = 'https://blog.swetrix.com/post/vs-cloudflare-analytics/'
export const SWETRIX_VS_SIMPLE_ANALYTICS = 'https://blog.swetrix.com/post/vs-simple-analytics/'

export const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development'

export const SUPPORTED_THEMES = ['light', 'dark']

export const CONTACT_EMAIL = 'contact@swetrix.com'
export const SECURITY_EMAIL = 'security@swetrix.com'

export const isSelfhosted = Boolean(process.env.REACT_APP_SELFHOSTED)

export const LIVE_VISITORS_UPDATE_INTERVAL = 40000
export const GENERAL_STATS_UPDATE_INTERVAL = 60000

// Functions
export const getProjectCacheKey = (period, timeBucket) => `${period}${timeBucket}`
export const getProjectForcastCacheKey = (period, timeBucket, periodToForecast) => `${period}${timeBucket}${periodToForecast}forecast`
export const getProjectCacheCustomKey = (from, to, timeBucket) => `${from}-${to}-${timeBucket}`

// Cookies
export const GDPR_REQUEST = 'gdpr_request'
export const CONFIRMATION_TIMEOUT = 'confirmation_timeout'
export const LOW_EVENTS_WARNING = 'low_events_warning'
export const TOKEN = 'access_token'
export const REFRESH_TOKEN = 'refresh_token'

// List of languages with translations available
export const whitelist = ['en', 'uk', 'pl', 'de', 'sv', 'el', 'ru', 'hi', 'zh']
export const defaultLanguage = 'en'
export const languages = {
  en: 'English',
  uk: 'Українська',
  pl: 'Polski',
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
  pl: 'PL',
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

export const PROJECT_TABS = {
  traffic: 'traffic',
  performance: 'performance',
  alerts: 'alerts',
}

export const QUERY_METRIC = {
  PAGE_VIEWS: 'page_views',
  UNIQUE_PAGE_VIEWS: 'unique_page_views',
  ONLINE_USERS: 'online_users',
}

export const QUERY_CONDITION = {
  GREATER_THAN: 'greater_than',
  GREATER_EQUAL_THAN: 'greater_equal_than',
  LESS_THAN: 'less_than',
  LESS_EQUAL_THAN: 'less_equal_than',
}

export const QUERY_TIME = {
  LAST_15_MINUTES: 'last_15_minutes',
  LAST_30_MINUTES: 'last_30_minutes',
  LAST_1_HOUR: 'last_1_hour',
  LAST_4_HOURS: 'last_4_hours',
  LAST_24_HOURS: 'last_24_hours',
  LAST_48_HOURS: 'last_48_hours',
}

export const INVITATION_EXPIRES_IN = 48 // hours
export const ENTRIES_PER_PAGE_DASHBOARD = 10

export const THEME_TYPE = {
  classic: 'classic',
  christmas: 'christmas',
}

export const DEFAULT_ALERTS_TAKE = 100

// TODO: Eventually this should be fetched from the API, e.g. GET /config route
export const PLAN_LIMITS = {
  free: {
    priceMonthly: 0,
    priceYearly: 0,
    monthlyUsageLimit: 5000,
    maxProjects: 10,
    maxAlerts: 1,
    legacy: true,
  },
  trial: {
    monthlyUsageLimit: 100000,
    maxProjects: 20,
    maxAlerts: 20,
    legacy: false,
    priceMonthly: 0,
    priceYearly: 0,
  },
  hobby: {
    monthlyUsageLimit: 10000,
    maxProjects: 20,
    maxAlerts: 10,
    legacy: false,
    priceMonthly: 5,
    priceYearly: 50,
  },
  freelancer: {
    monthlyUsageLimit: 100000,
    maxProjects: 20,
    maxAlerts: 20,
    legacy: false,
    priceMonthly: 15,
    priceYearly: 150,
  },
  startup: {
    monthlyUsageLimit: 1000000,
    maxProjects: 30,
    maxAlerts: 50,
    legacy: false,
    priceMonthly: 59,
    priceYearly: 590,
  },
  enterprise: {
    monthlyUsageLimit: 5000000,
    maxProjects: 50,
    maxAlerts: 100,
    legacy: false,
    priceMonthly: 110,
    priceYearly: 1100,
  },
}

export const TRIAL_DAYS = 14

export const chartTypes = {
  line: 'line',
  bar: 'bar',
}
