const getCustomLabel = (dates: Date[], t: Function): string => {
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

export const FORECAST_MAX_MAPPING: {
  [key: string]: number
} = {
  hour: 72,
  day: 21,
  week: 21,
  month: 12,
}

export const tbPeriodPairs = (t: Function, tbs?: string[] | null, dates?: Date[]): {
  label: string
  period: string
  tbs: string[]
  countDays?: number
  dropdownLabel?: string
  isCustomDate?: boolean
}[] => [{
  label: t('project.today'),
  period: 'today',
  tbs: ['hour'],
}, {
  label: t('project.yesterday'),
  period: 'yesterday',
  tbs: ['hour'],
}, {
  label: t('project.last24h'),
  period: '1d',
  countDays: 1,
  tbs: ['hour'],
}, {
  label: t('project.lastXDays', { amount: 7 }),
  period: '7d',
  tbs: ['hour', 'day'],
  countDays: 7,
}, {
  label: t('project.lastXWeeks', { amount: 4 }),
  period: '4w',
  tbs: ['day', 'week'],
  countDays: 28,
}, {
  label: t('project.lastXMonths', { amount: 3 }),
  period: '3M',
  tbs: ['week', 'month'],
  countDays: 90,
}, {
  label: t('project.lastXMonths', { amount: 12 }),
  period: '12M',
  tbs: ['week', 'month'],
  countDays: 365,
}, {
  label: t('project.lastXMonths', { amount: 24 }),
  period: '24M',
  tbs: ['month'],
}, {
  label: dates ? getCustomLabel(dates, t) : t('project.custom'),
  dropdownLabel: t('project.custom'),
  isCustomDate: true,
  period: 'custom',
  tbs: tbs || ['custom'],
}, {
  label: t('project.compare'),
  period: 'compare',
  tbs: tbs || ['custom'],
}]

export const filtersPeriodPairs = ['1d', '7d', '4w', '3M', '12M', 'custom', 'compare']

export const tbPeriodPairsCompare = (t: Function, dates?: Date[]): {
  label: string
  period: string
}[] => [{
  label: t('project.previousPeriod'),
  period: 'previous',
}, {
  label: dates ? getCustomLabel(dates, t) : t('project.custom'),
  period: 'custom',
}, {
  label: t('project.disableCompare'),
  period: 'disable',
}]

export const PERIOD_PAIRS_COMPARE: {
  COMPARE: string
  PREVIOS: string
  CUSTOM: string
  DISABLE: string
} = {
  COMPARE: 'compare',
  PREVIOS: 'previous',
  CUSTOM: 'custom',
  DISABLE: 'disable',
}

export const periodToCompareDate: {
  period: string
  formula: (date?: Date[]) => {
    from: Date
    to: Date
  }
}[] = [{
  period: '1d',
  formula: () => {
    const to = new Date()
    to.setDate(to.getDate() - 1)
    const from = new Date()
    from.setDate(to.getDate() - 1)
    return {
      from,
      to,
    }
  },
}, {
  period: '7d',
  formula: () => {
    const to = new Date()
    to.setDate(to.getDate() - 7)
    const from = new Date()
    from.setDate(to.getDate() - 7)
    return {
      from,
      to,
    }
  },
}, {
  period: '4w',
  formula: () => {
    const to = new Date()
    to.setDate(to.getDate() - 28)
    const from = new Date()
    from.setDate(to.getDate() - 28)
    return {
      from,
      to,
    }
  },
}, {
  period: '3M',
  formula: () => {
    const to = new Date()
    to.setMonth(to.getMonth() - 3)
    const from = new Date()
    from.setMonth(to.getMonth() - 3)
    return {
      from,
      to,
    }
  },
}, {
  period: '12M',
  formula: () => {
    const to = new Date()
    to.setMonth(to.getMonth() - 12)
    const from = new Date()
    from.setMonth(to.getMonth() - 12)
    return {
      from,
      to,
    }
  },
}, {
  period: 'custom',
  formula: (date) => {
    if (!date) {
      return {
        from: new Date(),
        to: new Date(),
      }
    }
    const days = (date[1].getTime() - date[0].getTime()) / (1000 * 3600 * 24)
    const to = new Date()
    to.setDate(to.getDate() - days)
    const from = new Date()
    from.setDate(to.getDate() - days)
    return {
      from,
      to,
    }
  },
}]

interface IStringObject {
  [key: string]: string
}

// the order of panels in the project view
export const TRAFFIC_PANELS_ORDER: string[] = ['cc', 'pg', 'lc', 'br', 'os', 'dv', 'ref', 'so', 'me', 'ca']
export const PERFORMANCE_PANELS_ORDER: string[] = ['cc', 'pg', 'br', 'dv']

// the maximum amount of months user can go back when picking a date in flat picker (project view)
export const MAX_MONTHS_IN_PAST: number = 24

export const timeBucketToDays: {
  lt: number
  tb: string[]
}[] = [
  { lt: 1, tb: ['hour'] }, // 1 days
  { lt: 7, tb: ['hour', 'day'] }, // 7 days
  { lt: 28, tb: ['day', 'week'] }, // 4 weeks
  { lt: 366, tb: ['week', 'month'] }, // 12 months
  { lt: 732, tb: ['month'] }, // 24 months
]

export const tbsFormatMapper: IStringObject = {
  hour: '%d %b %H:%M',
  day: '%d %b',
  week: '%d %b',
  month: '%d %b %Y',
}

export const tbsFormatMapper24h: IStringObject = {
  hour: '%H:%M',
  day: '%d %b',
  week: '%d %b',
  month: '%d %b %Y',
}

export const TimeFormat: IStringObject = {
  '12-hour': '12-hour',
  '24-hour': '24-hour',
}

export const FREE_TIER_KEY: string = 'free'

export const PADDLE_JS_URL = 'https://cdn.paddle.com/paddle/paddle.js'
export const PADDLE_VENDOR_ID = 139393

// a dedicated variable is needed for paid tier checking
export const WEEKLY_REPORT_FREQUENCY: string = 'weekly'
export const reportFrequencies: string[] = [WEEKLY_REPORT_FREQUENCY, 'monthly', 'quarterly', 'never']

export const reportFrequencyForEmailsOptions: {
  value: string
  label: string
}[] = [
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'never', label: 'Never' },
]

export const GDPR_EXPORT_TIMEFRAME: number = 14 // days

export const SHOW_BANNER_AT_PERC: number = 85 // show banner when 85% of events in tier are used

export const TITLE_SUFFIX: string = '| Swetrix'

export const LS_THEME_SETTING: string = 'colour-theme'
export const LS_VIEW_PREFS_SETTING: string = 'proj-view-preferences'
export const LS_CAPTCHA_VIEW_PREFS_SETTING: string = 'captcha-view-preferences'

export const DEFAULT_TIMEZONE: string = 'Etc/GMT'

export const DONATE_URL: string = 'https://ko-fi.com/andriir'
export const FIREFOX_ADDON_URL: string = 'https://addons.mozilla.org/en-US/firefox/addon/swetrix/'
export const CHROME_EXTENSION_URL: string = 'https://chrome.google.com/webstore/detail/swetrix/glbeclfdldjldjonfnpnembfkhphmeld'
export const HAVE_I_BEEN_PWNED_URL: string = 'https://haveibeenpwned.com/passwords'
export const LINKEDIN_URL: string = 'https://www.linkedin.com/company/swetrix/'
export const GITHUB_URL: string = 'https://github.com/Swetrix'
export const TWITTER_URL: string = 'https://twitter.com/intent/user?screen_name=swetrix'
export const TWITTER_USERNAME: string = '@swetrix'
export const DISCORD_URL: string = 'https://discord.gg/tVxGxU3s4B'
export const STATUSPAGE_URL: string = 'https://stats.uptimerobot.com/33rvmiXXEz'
export const BLOG_URL: string = 'https://blog.swetrix.com'
export const UTM_GENERATOR_URL: string = 'https://url.swetrix.com'
export const MARKETPLACE_URL: string = 'https://marketplace.swetrix.com'
export const DOCS_URL: string = 'https://docs.swetrix.com'
export const CAPTCHA_URL: string = 'https://captcha.swetrix.com'
export const DOCS_CAPTCHA_URL: string = `${DOCS_URL}/captcha/introduction`
export const CDN_URL: string | undefined = process.env.REACT_APP_CDN_URL

// Swetrix vs ...
export const SWETRIX_VS_GOOGLE: string = 'https://blog.swetrix.com/post/vs-google-analytics/'
export const SWETRIX_VS_CLOUDFLARE: string = 'https://blog.swetrix.com/post/vs-cloudflare-analytics/'
export const SWETRIX_VS_SIMPLE_ANALYTICS: string = 'https://blog.swetrix.com/post/vs-simple-analytics/'

export const isDevelopment: boolean = !process.env.NODE_ENV || process.env.NODE_ENV === 'development'

export const SUPPORTED_THEMES: string[] = ['light', 'dark']

export const CONTACT_EMAIL: string = 'contact@swetrix.com'
export const SECURITY_EMAIL: string = 'security@swetrix.com'

export const isSelfhosted: boolean = Boolean(process.env.REACT_APP_SELFHOSTED)

export const LIVE_VISITORS_UPDATE_INTERVAL: number = 40000
export const GENERAL_STATS_UPDATE_INTERVAL: number = 60000

// Functions
export const getProjectCacheKey = (period: string, timeBucket: string): string => `${period}${timeBucket}`
export const getProjectCaptchaCacheKey = (period: string, timeBucket: string): string => `${period}${timeBucket}captcha`
export const getProjectForcastCacheKey = (period: string, timeBucket: string, periodToForecast: string): string => `${period}${timeBucket}${periodToForecast}forecast`
export const getProjectCacheCustomKey = (from: string, to: string, timeBucket: string): string => `${from}-${to}-${timeBucket}`
export const getUserFlowCacheKey = (pid: string, period: string): string => `${pid}${period}userflow`

// Cookies
export const GDPR_REQUEST: string = 'gdpr_request'
export const CONFIRMATION_TIMEOUT: string = 'confirmation_timeout'
export const LOW_EVENTS_WARNING: string = 'low_events_warning'
export const TOKEN: string = 'access_token'
export const REFRESH_TOKEN: string = 'refresh_token'

// LocalStorage
export const PAGE_FORCE_REFRESHED = 'page-force-refreshed'
export const IS_ACTIVE_COMPARE = 'is-active-compare'

// List of languages with translations available
export const whitelist: string[] = ['en', 'uk', 'pl', 'de', 'sv', 'el', 'ru', 'hi', 'zh']
export const defaultLanguage: string = 'en'
export const languages: IStringObject = {
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

export const languageFlag: IStringObject = {
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

export const paddleLanguageMapping: IStringObject = {
  zh: 'zh-Hans',
  uk: 'ru',
  el: 'en',
}

// dashboard && projects

export const roles: string[] = ['admin', 'viewer']

export const roleViewer: {
  name: string
  role: string
  description: string
} = {
  name: 'Viewer',
  role: 'viewer',
  description: 'Can view the project',
}

export const roleAdmin: {
  name: string
  role: string
  description: string
} = {
  name: 'Admin',
  role: 'admin',
  description: 'Can manage the project',
}

export const tabForOwnedProject: string = 'owned'
export const tabForSharedProject: string = 'shared'
export const tabForCaptchaProject: string = 'captcha'

interface IDashboardTabs {
  name: string
  label: string
}

export const tabsForDashboard: IDashboardTabs[] = [
  {
    name: tabForOwnedProject,
    label: 'profileSettings.owned',
  },
  {
    name: tabForSharedProject,
    label: 'profileSettings.shared',
  },
  {
    name: tabForCaptchaProject,
    label: 'profileSettings.captcha',
  },
]

const SELFHOSTED_PROJECT_TABS: IStringObject = {
  traffic: 'traffic',
  performance: 'performance',
}

const PRODUCTION_PROJECT_TABS: IStringObject = {
  traffic: 'traffic',
  performance: 'performance',
  alerts: 'alerts',
}

export const PROJECT_TABS = isSelfhosted ? SELFHOSTED_PROJECT_TABS : PRODUCTION_PROJECT_TABS

export const DASHBOARD_TABS: IStringObject = {
  owned: 'owned',
  shared: 'shared',
  captcha: 'captcha',
}

export const QUERY_METRIC: IStringObject = {
  PAGE_VIEWS: 'page_views',
  UNIQUE_PAGE_VIEWS: 'unique_page_views',
  ONLINE_USERS: 'online_users',
}

export const QUERY_CONDITION: IStringObject = {
  GREATER_THAN: 'greater_than',
  GREATER_EQUAL_THAN: 'greater_equal_than',
  LESS_THAN: 'less_than',
  LESS_EQUAL_THAN: 'less_equal_than',
}

export const QUERY_TIME: IStringObject = {
  LAST_15_MINUTES: 'last_15_minutes',
  LAST_30_MINUTES: 'last_30_minutes',
  LAST_1_HOUR: 'last_1_hour',
  LAST_4_HOURS: 'last_4_hours',
  LAST_24_HOURS: 'last_24_hours',
  LAST_48_HOURS: 'last_48_hours',
}

export const INVITATION_EXPIRES_IN: number = 48 // hours
export const ENTRIES_PER_PAGE_DASHBOARD: number = 10

export const THEME_TYPE: IStringObject = {
  classic: 'classic',
  christmas: 'christmas',
}

export const DEFAULT_ALERTS_TAKE: number = 100

// TODO: Eventually this should be fetched from the API, e.g. GET /config route
export const PLAN_LIMITS: {
  [key: string]: {
    monthlyUsageLimit: number
    maxProjects: number
    maxAlerts: number
    legacy: boolean
    priceMonthly: number
    priceYearly: number
  }
} = {
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

export const TRIAL_DAYS: number = 14

export const chartTypes = Object.freeze({
  line: 'line',
  bar: 'bar',
})

export const SSO_ACTIONS = Object.freeze({
  LINK: 'link',
  AUTH: 'auth',
})

export const SSO_PROVIDERS = Object.freeze({
  GOOGLE: 'google',
  GITHUB: 'github',
})
