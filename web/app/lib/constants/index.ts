import { t as i18nextT } from 'i18next'
import _endsWith from 'lodash/endsWith'

import { Role } from '~/lib/models/Organisation'

const displayDateOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
}

const getCustomLabel = (dates: Date[], t: typeof i18nextT, language?: string): string => {
  if (dates) {
    let from: string
    let to: string

    if (language) {
      from = dates[0].toLocaleDateString(language, displayDateOptions)
      to = dates[1].toLocaleDateString(language, displayDateOptions)
    } else {
      from = dates[0].toLocaleDateString()
      to = dates[1].toLocaleDateString()
    }

    if (from === to) {
      return from
    }

    return `${from} - ${to}`
  }

  return t('project.custom')
}

export interface TBPeriodPairsProps {
  label: string
  period: Period
  tbs: TimeBucket[]
  countDays?: number
  dropdownLabel?: string
  isCustomDate?: boolean
}

export const VALID_PERIODS = [
  '1h',
  'today',
  'yesterday',
  '1d',
  '7d',
  '4w',
  '3M',
  '12M',
  '24M',
  'all',

  // Extended periods
  'custom',
  'compare',
] as const

export const VALID_TIME_BUCKETS = ['minute', 'hour', 'day', 'month', 'year'] as const

export type Period = (typeof VALID_PERIODS)[number]

export type TimeBucket = (typeof VALID_TIME_BUCKETS)[number]

export const tbPeriodPairs = (
  t: typeof i18nextT,
  tbs?: TimeBucket[] | null,
  dates?: Date[] | null,
  language?: string,
): TBPeriodPairsProps[] => [
  {
    label: t('project.thisHour'),
    period: '1h',
    tbs: ['minute'],
  },
  {
    label: t('project.today'),
    period: 'today',
    tbs: ['hour'],
  },
  {
    label: t('project.yesterday'),
    period: 'yesterday',
    tbs: ['hour'],
  },
  {
    label: t('project.last24h'),
    period: '1d',
    countDays: 1,
    tbs: ['hour'],
  },
  {
    label: t('project.lastXDays', { amount: 7 }),
    period: '7d',
    tbs: ['hour', 'day'],
    countDays: 7,
  },
  {
    label: t('project.lastXWeeks', { amount: 4 }),
    period: '4w',
    tbs: ['day'],
    countDays: 28,
  },
  {
    label: t('project.lastXMonths', { amount: 3 }),
    period: '3M',
    tbs: ['day', 'month'],
    countDays: 90,
  },
  {
    label: t('project.lastXMonths', { amount: 12 }),
    period: '12M',
    tbs: ['day', 'month'],
    countDays: 365,
  },
  {
    label: t('project.lastXMonths', { amount: 24 }),
    period: '24M',
    tbs: ['month'],
  },
  {
    label: t('project.all'),
    period: 'all',
    tbs: ['month', 'year'],
  },
  {
    label: dates ? getCustomLabel(dates, t, language) : t('project.custom'),
    dropdownLabel: t('project.custom'),
    isCustomDate: true,
    period: 'custom',
    tbs: tbs || ['month'],
  },
  {
    label: t('project.compare'),
    period: 'compare',
    tbs: tbs || ['month'],
  },
]

export const tbPeriodPairsCompare = (
  t: typeof i18nextT,
  dates?: Date[],
  language?: string,
): {
  label: string
  period: string
}[] => [
  {
    label: t('project.previousPeriod'),
    period: 'previous',
  },
  {
    label: dates ? getCustomLabel(dates, t, language) : t('project.custom'),
    period: 'custom',
  },
  {
    label: t('project.disableCompare'),
    period: 'disable',
  },
]

export const PERIOD_PAIRS_COMPARE = {
  COMPARE: 'compare',
  PREVIOS: 'previous',
  CUSTOM: 'custom',
  DISABLE: 'disable',
} as const

// the order of panels in the project view
export const TRAFFIC_PANELS_ORDER = ['location', 'pg', 'devices', 'traffic-sources']
export const PERFORMANCE_PANELS_ORDER = ['location', 'pg', 'devices']
export const ERROR_PANELS_ORDER = ['location', 'pg', 'devices']
export const FILTERS_PANELS_ORDER = [
  'pg',
  'entryPage',
  'exitPage',
  'host',
  'cc',
  'rg',
  'ct',
  'lc',
  'dv',
  'br',
  'brv',
  'os',
  'osv',
  'ref',
  'so',
  'me',
  'ca',
  'te',
  'co',
]
export const ERRORS_FILTERS_PANELS_ORDER = ['cc', 'rg', 'ct', 'pg', 'br', 'brv', 'os', 'osv', 'lc', 'dv']

// the maximum amount of months user can go back when picking a date in flat picker (project view)
export const MAX_MONTHS_IN_PAST = 24

export const timeBucketToDays: {
  lt: number
  tb: TimeBucket[]
}[] = [
  // { lt: 0, tb: ['minute'] }, // 1 hour
  { lt: 1, tb: ['hour'] }, // 1 days
  { lt: 7, tb: ['hour', 'day'] }, // 7 days
  { lt: 28, tb: ['day'] }, // 4 weeks
  { lt: 366, tb: ['day', 'month'] }, // 12 months
  { lt: 732, tb: ['month'] }, // 24 months
]

export const tbsFormatMapper = {
  minute: '%I:%M %p',
  hour: '%I %p',
  day: '%d %b',
  month: '%b %Y',
  year: '%Y',
} as Record<string, string>

export const tbsFormatMapperTooltip = {
  minute: '%I:%M %p',
  hour: '%d %b %I %p',
  day: '%d %b',
  month: '%b %Y',
  year: '%Y',
} as Record<string, string>

export const tbsFormatMapperTooltip24h = {
  minute: '%H:%M',
  hour: '%d %b %H:%M',
  day: '%d %b',
  month: '%b %Y',
  year: '%Y',
} as Record<string, string>

export const tbsFormatMapper24h = {
  minute: '%H:%M',
  hour: '%H:%M',
  day: '%d %b',
  month: '%b %Y',
  year: '%Y',
} as Record<string, string>

export const TimeFormat = {
  '12-hour': '12-hour',
  '24-hour': '24-hour',
} as const

export const PADDLE_JS_URL = 'https://cdn.paddle.com/paddle/paddle.js'
export const PADDLE_VENDOR_ID = 139393

export const reportFrequencies = ['weekly', 'monthly', 'quarterly', 'never']

export const reportFrequencyForEmailsOptions: {
  value: string
  label: string
}[] = [
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'never', label: 'Never' },
]

export const SHOW_BANNER_AT_PERC = 85 // show banner when 85% of events in tier are used

export const LS_THEME_SETTING = 'colour-theme'
export const LS_VIEW_PREFS_SETTING = 'proj-view-preferences'
export const LS_CAPTCHA_VIEW_PREFS_SETTING = 'captcha-view-preferences'

export const DEFAULT_TIMEZONE = 'Etc/GMT'

export const DONATE_URL = 'https://github.com/sponsors/Swetrix'
export const HAVE_I_BEEN_PWNED_URL = 'https://haveibeenpwned.com/passwords'
export const LINKEDIN_URL = 'https://www.linkedin.com/company/swetrix/'
export const GITHUB_URL = 'https://github.com/Swetrix/swetrix'
export const TWITTER_URL = 'https://twitter.com/intent/user?screen_name=swetrix'
export const TWITTER_USERNAME = '@swetrix'
export const DISCORD_URL = 'https://discord.gg/ZVK8Tw2E8j'
export const STATUSPAGE_URL = 'https://stats.uptimerobot.com/33rvmiXXEz'
export const MAIN_URL = 'https://swetrix.com'
export const LIVE_DEMO_URL = '/projects/STEzHcB1rALV'
export const BOOK_A_CALL_URL = 'https://cal.com/swetrix'
export const PERFORMANCE_LIVE_DEMO_URL = '/projects/STEzHcB1rALV?tab=performance'
export const ERROR_TRACKING_LIVE_DEMO_URL = '/projects/STEzHcB1rALV?tab=errors'
export const DOCS_URL = 'https://docs.swetrix.com'
export const INTEGRATIONS_URL = 'https://docs.swetrix.com/integrations'
export const ERROR_TRACKING_DOCS_URL = 'https://docs.swetrix.com/error-tracking'

export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

export const isIframe = isBrowser && window.self !== window.top

export type ThemeType = 'dark' | 'light'
export const SUPPORTED_THEMES = ['light', 'dark']

export const CONTACT_EMAIL = 'contact@swetrix.com'

export const LIVE_VISITORS_UPDATE_INTERVAL = 40000

// Environment variables
// Using optional chaining for REMIX_ENV?. to avoid errors when running some unit tests
const isStaging = isBrowser ? window.REMIX_ENV?.STAGING : process.env.STAGING
const STAGING_API_URL = isBrowser ? window.REMIX_ENV?.API_STAGING_URL : process.env.API_STAGING_URL
const PRODUCTION_API_URL = isBrowser ? window.REMIX_ENV?.API_URL : process.env.API_URL

export const COOKIE_DOMAIN = (isBrowser ? window.REMIX_ENV?.COOKIE_DOMAIN : process.env.COOKIE_DOMAIN) || 'swetrix.com'

export const isSelfhosted = Boolean(isBrowser ? window.REMIX_ENV?.SELFHOSTED : process.env.__SELFHOSTED)

export const isDisableMarketingPages =
  (isBrowser ? window.REMIX_ENV?.DISABLE_MARKETING_PAGES : process.env.DISABLE_MARKETING_PAGES) === 'true'

export const apiUrlUnprocessed = isSelfhosted || !isStaging ? PRODUCTION_API_URL : STAGING_API_URL

export const TITLE_SUFFIX = isSelfhosted ? '| Swetrix Community Edition' : '| Swetrix'

export const API_URL = _endsWith(apiUrlUnprocessed, '/') ? apiUrlUnprocessed : `${apiUrlUnprocessed}/`
const NODE_ENV = isBrowser ? window.REMIX_ENV?.NODE_ENV : process.env.NODE_ENV

export const isDevelopment = !NODE_ENV || NODE_ENV === 'development'

export const getOgImageUrl = (title: string) => {
  const apiUrl = API_URL.slice(0, -1)

  return `${apiUrl}/v1/og-image?title=${encodeURIComponent(title)}`
}

// Cookies
export const CONFIRMATION_TIMEOUT = 'confirmation_timeout'
export const LOW_EVENTS_WARNING = 'low_events_warning'
export const TOKEN = 'access_token'
export const REFRESH_TOKEN = 'refresh_token'

// LocalStorage
export const LS_PROJECTS_PROTECTED_KEY = 'projects_protected'
export const LS_IS_ACTIVE_COMPARE_KEY = 'is-active-compare'

// Funnels
export const MIN_FUNNEL_STEPS = 2
export const MAX_FUNNEL_STEPS = 10

// List of languages with translations available
export const whitelist = ['en', 'uk', 'pl', 'de', 'fr']
export const whitelistWithCC = {
  en: 'en-GB',
  uk: 'uk-UA',
  pl: 'pl-PL',
  de: 'de-DE',
  fr: 'fr-FR',
} as Record<string, string>
export const defaultLanguage = 'en'
export const languages = {
  en: 'English',
  uk: 'Українська',
  pl: 'Polski',
  de: 'Deutsch',
  fr: 'Français',
} as Record<string, string>

export const languageFlag = {
  en: 'GB',
  uk: 'UA',
  pl: 'PL',
  fr: 'FR',
  de: 'DE',
} as Record<string, string>

export const paddleLanguageMapping = {
  uk: 'en',
} as Record<string, string>

// Increase this counter every time some major change is done within localisation files
// This will prevent cached version or raw locale strings being displayed in production
export const I18N_CACHE_BREAKER = 28

export const roles: Role[] = ['admin', 'viewer']

export const FUNNELS_PERIOD_PAIRS = ['1h', '1d', '7d', '4w', '3M', '12M', 'all', 'custom']

const SELFHOSTED_PROJECT_TABS = {
  traffic: 'traffic',
  performance: 'performance',
  funnels: 'funnels',
  profiles: 'profiles',
  sessions: 'sessions',
  errors: 'errors',
  goals: 'goals',
  featureFlags: 'featureFlags',
  captcha: 'captcha',
} as const

const PRODUCTION_PROJECT_TABS = {
  traffic: 'traffic',
  performance: 'performance',
  profiles: 'profiles',
  funnels: 'funnels',
  sessions: 'sessions',
  errors: 'errors',
  goals: 'goals',
  experiments: 'experiments',
  featureFlags: 'featureFlags',
  alerts: 'alerts',
  captcha: 'captcha',
  ai: 'ai',
} as const

export const PROJECT_TABS = (
  isSelfhosted ? SELFHOSTED_PROJECT_TABS : PRODUCTION_PROJECT_TABS
) as typeof PRODUCTION_PROJECT_TABS

export const QUERY_METRIC = {
  PAGE_VIEWS: 'page_views',
  UNIQUE_PAGE_VIEWS: 'unique_page_views',
  ONLINE_USERS: 'online_users',
  CUSTOM_EVENTS: 'custom_events',
  ERRORS: 'errors',
} as const

export const QUERY_CONDITION = {
  GREATER_THAN: 'greater_than',
  GREATER_EQUAL_THAN: 'greater_equal_than',
  LESS_THAN: 'less_than',
  LESS_EQUAL_THAN: 'less_equal_than',
} as const

export const QUERY_TIME = {
  LAST_15_MINUTES: 'last_15_minutes',
  LAST_30_MINUTES: 'last_30_minutes',
  LAST_1_HOUR: 'last_1_hour',
  LAST_4_HOURS: 'last_4_hours',
  LAST_24_HOURS: 'last_24_hours',
  LAST_48_HOURS: 'last_48_hours',
} as const

export const INVITATION_EXPIRES_IN = 48 // hours
export const ENTRIES_PER_PAGE_DASHBOARD = 11

export const DEFAULT_ALERTS_TAKE = 100

const EUR = {
  symbol: '€',
  code: 'EUR',
}

const USD = {
  symbol: '$',
  code: 'USD',
}

const GBP = {
  symbol: '£',
  code: 'GBP',
}

type ICurrencies = Record<
  'EUR' | 'USD' | 'GBP',
  {
    symbol: string
    code: string
  }
>

export const CURRENCIES: ICurrencies = {
  EUR,
  USD,
  GBP,
}

export const BillingFrequency = {
  monthly: 'monthly',
  yearly: 'yearly',
}

// TODO: Eventually this should be fetched from the API, e.g. GET /config route
export const PLAN_LIMITS = {
  none: {
    index: 0, // 'downgrade' or 'upgrade' logic depends on this
    planCode: 'none',
    monthlyUsageLimit: 0,
    legacy: false,
    price: {
      USD: {
        monthly: 0,
        yearly: 0,
      },
      EUR: {
        monthly: 0,
        yearly: 0,
      },
      GBP: {
        monthly: 0,
        yearly: 0,
      },
    },
    maxAlerts: 0,
  },
  free: {
    index: 0, // 'downgrade' or 'upgrade' logic depends on this
    planCode: 'free',
    monthlyUsageLimit: 5000,
    legacy: true,
    price: {
      USD: {
        monthly: 0,
        yearly: 0,
      },
      EUR: {
        monthly: 0,
        yearly: 0,
      },
      GBP: {
        monthly: 0,
        yearly: 0,
      },
    },
    maxAlerts: 1,
  },
  trial: {
    index: 0, // 'downgrade' or 'upgrade' logic depends on this
    planCode: 'trial',
    monthlyUsageLimit: 10000000,
    legacy: false,
    price: {
      USD: {
        monthly: 0,
        yearly: 0,
      },
      EUR: {
        monthly: 0,
        yearly: 0,
      },
      GBP: {
        monthly: 0,
        yearly: 0,
      },
    },
    maxAlerts: 50,
  },
  hobby: {
    index: 1, // 'downgrade' or 'upgrade' logic depends on this
    planCode: 'hobby',
    monthlyUsageLimit: 10000,
    legacy: true,
    price: {
      USD: {
        monthly: 5,
        yearly: 50,
      },
      EUR: {
        monthly: 5,
        yearly: 50,
      },
      GBP: {
        monthly: 4,
        yearly: 40,
      },
    },
    pid: 813694, // Plan ID
    ypid: 813695, // Plan ID - Yearly billing
    maxAlerts: 50,
  },
  '50k': {
    index: 1.5, // 'downgrade' or 'upgrade' logic depends on this
    planCode: '50k',
    monthlyUsageLimit: 50000,
    legacy: true,
    price: {
      USD: {
        monthly: 12,
        yearly: 120,
      },
      EUR: {
        monthly: 10,
        yearly: 100,
      },
      GBP: {
        monthly: 10,
        yearly: 100,
      },
    },
    pid: 918109, // Plan ID
    ypid: 918110, // Plan ID - Yearly billing
    maxAlerts: 50,
  },
  freelancer: {
    index: 2, // 'downgrade' or 'upgrade' logic depends on this
    planCode: 'freelancer',
    monthlyUsageLimit: 100000,
    legacy: true,
    price: {
      USD: {
        monthly: 15,
        yearly: 150,
      },
      EUR: {
        monthly: 15,
        yearly: 150,
      },
      GBP: {
        monthly: 14,
        yearly: 140,
      },
    },
    pid: 752316, // Plan ID
    ypid: 776469, // Plan ID - Yearly billing
    maxAlerts: 50,
  },
  '100k': {
    index: 2.5, // 'downgrade' or 'upgrade' logic depends on this
    planCode: '100k',
    monthlyUsageLimit: 100000,
    legacy: false,
    price: {
      USD: {
        monthly: 19,
        yearly: 190,
      },
      EUR: {
        monthly: 17,
        yearly: 170,
      },
      GBP: {
        monthly: 15,
        yearly: 150,
      },
    },
    pid: 916455, // Plan ID
    ypid: 916456, // Plan ID - Yearly billing
    maxAlerts: 50,
  },
  '200k': {
    index: 3, // 'downgrade' or 'upgrade' logic depends on this
    planCode: '200k',
    monthlyUsageLimit: 200000,
    legacy: false,
    price: {
      USD: {
        monthly: 29,
        yearly: 290,
      },
      EUR: {
        monthly: 25,
        yearly: 250,
      },
      GBP: {
        monthly: 23,
        yearly: 230,
      },
    },
    pid: 854654, // Plan ID
    ypid: 854655, // Plan ID - Yearly billing
    maxAlerts: 50,
  },
  '500k': {
    index: 4, // 'downgrade' or 'upgrade' logic depends on this
    planCode: '500k',
    monthlyUsageLimit: 500000,
    legacy: false,
    price: {
      USD: {
        monthly: 49,
        yearly: 490,
      },
      EUR: {
        monthly: 42,
        yearly: 420,
      },
      GBP: {
        monthly: 39,
        yearly: 390,
      },
    },
    pid: 854656, // Plan ID
    ypid: 854657, // Plan ID - Yearly billing
    maxAlerts: 50,
  },
  startup: {
    index: 5, // 'downgrade' or 'upgrade' logic depends on this
    planCode: 'startup',
    monthlyUsageLimit: 1000000,
    legacy: false,
    price: {
      USD: {
        monthly: 79,
        yearly: 790,
      },
      EUR: {
        monthly: 69,
        yearly: 690,
      },
      GBP: {
        monthly: 59,
        yearly: 590,
      },
    },
    pid: 752317,
    ypid: 776470,
    maxAlerts: 50,
  },
  '2m': {
    index: 6, // 'downgrade' or 'upgrade' logic depends on this
    planCode: '2m',
    monthlyUsageLimit: 2000000,
    legacy: false,
    price: {
      USD: {
        monthly: 119,
        yearly: 1190,
      },
      EUR: {
        monthly: 99,
        yearly: 990,
      },
      GBP: {
        monthly: 89,
        yearly: 890,
      },
    },
    pid: 854663,
    ypid: 854664,
    maxAlerts: 50,
  },
  enterprise: {
    index: 7, // 'downgrade' or 'upgrade' logic depends on this
    planCode: 'enterprise',
    monthlyUsageLimit: 5000000,
    legacy: false,
    price: {
      USD: {
        monthly: 179,
        yearly: 1790,
      },
      EUR: {
        monthly: 149,
        yearly: 1490,
      },
      GBP: {
        monthly: 139,
        yearly: 1390,
      },
    },
    pid: 752318,
    ypid: 776471,
    maxAlerts: 50,
  },
  '10m': {
    index: 8, // 'downgrade' or 'upgrade' logic depends on this
    planCode: '10m',
    monthlyUsageLimit: 10000000,
    legacy: false,
    price: {
      USD: {
        monthly: 249,
        yearly: 2490,
      },
      EUR: {
        monthly: 209,
        yearly: 2090,
      },
      GBP: {
        monthly: 189,
        yearly: 1890,
      },
    },
    pid: 854665,
    ypid: 854666,
    maxAlerts: 50,
  },
  '15m': {
    index: 9, // 'downgrade' or 'upgrade' logic depends on this
    planCode: '15m',
    monthlyUsageLimit: 15000000,
    legacy: false,
    price: {
      USD: {
        monthly: 349,
        yearly: 3490,
      },
      EUR: {
        monthly: 299,
        yearly: 2990,
      },
      GBP: {
        monthly: 259,
        yearly: 2590,
      },
    },
    pid: 916451,
    ypid: 916452,
    maxAlerts: 50,
  },
  '20m': {
    index: 10, // 'downgrade' or 'upgrade' logic depends on this
    planCode: '20m',
    monthlyUsageLimit: 20000000,
    legacy: false,
    price: {
      USD: {
        monthly: 419,
        yearly: 4190,
      },
      EUR: {
        monthly: 359,
        yearly: 3590,
      },
      GBP: {
        monthly: 319,
        yearly: 3190,
      },
    },
    pid: 916453,
    ypid: 916454,
    maxAlerts: 50,
  },
}

export const STANDARD_PLANS = ['100k', '200k', '500k', 'startup', '2m', 'enterprise', '10m', '15m', '20m']

export const PURCHASABLE_LEGACY_PLANS = ['hobby', '50k']

export const TRIAL_DAYS = 14

export const chartTypes = Object.freeze({
  line: 'line',
  bar: 'bar',
})

export const SSO_PROVIDERS = Object.freeze({
  GOOGLE: 'google',
  GITHUB: 'github',
})

export const BROWSER_LOGO_MAP = {
  Brave: '/assets/browsers/brave_48x48.png',
  Chrome: '/assets/browsers/chrome_48x48.png',
  'Mobile Chrome': '/assets/browsers/chrome_48x48.png',
  Firefox: '/assets/browsers/firefox_48x48.png',
  'Mobile Firefox': '/assets/browsers/firefox_48x48.png',
  Safari: '/assets/browsers/safari_48x48.png',
  'Mobile Safari': '/assets/browsers/safari-ios_48x48.png',
  Edge: '/assets/browsers/edge_48x48.png',
  'Samsung Browser': '/assets/browsers/samsung-internet_48x48.png',
  'Samsung Internet': '/assets/browsers/samsung-internet_48x48.png',
  'Chrome WebView': '/assets/browsers/android-webview_48x48.png',
  Opera: '/assets/browsers/opera_48x48.png',
  'Opera GX': '/assets/browsers/opera-gx_48x48.png',
  'Opera Air': '/assets/browsers/opera_48x48.png',
  GSA: '/assets/browsers/chrome_48x48.png',
  WebKit: '/assets/browsers/safari_48x48.png',
  Yandex: '/assets/browsers/yandex_48x48.png',
  'Android Browser': '/assets/browsers/android-webview_48x48.png',
  Silk: '/assets/browsers/silk_48x48.png',
  'Opera Touch': '/assets/browsers/opera-touch_48x48.png',
  Electron: '/assets/browsers/electron_48x48.png',
  'Coc Coc': '/assets/browsers/coc-coc_48x48.png',
  SeaMonkey: '/assets/browsers/seamonkey_48x48.png',
  PaleMoon: '/assets/browsers/pale-moon_48x48.png',
  Falkon: '/assets/browsers/falkon_48x48.png',
  Chromium: '/assets/browsers/chromium_48x48.png',
  'Chrome Headless': '/assets/browsers/chromium_48x48.png',
  Vivaldi: '/assets/browsers/vivaldi_48x48.png',
  Whale: '/assets/browsers/whale_48x48.png',
  Puffin: '/assets/browsers/puffin_48x48.png',
  'Opera Mini': '/assets/browsers/opera-mini_48x48.png',
  Mozilla: '/assets/browsers/firefox_48x48.png',
  UCBrowser: '/assets/browsers/uc_48x48.png',
  Midori: '/assets/browsers/midori_48x48.png',
  Maxthon: '/assets/browsers/maxthon_48x48.png',
  Konqueror: '/assets/browsers/konqueror_48x48.png',
  Epiphany: '/assets/browsers/web_48x48.png',
  Fennec: '/assets/browsers/firefox_48x48.png',
  Basilisk: '/assets/browsers/basilisk_48x48.png',
  GameVault: '/assets/browsers/gamevault_43x48.png',
  DuckDuckGo: '/assets/duckduckgo.png',
  Facebook: '/assets/facebook.svg',
  MetaSr: '/assets/facebook.svg',
  'Oculus Browser': '/assets/facebook.svg',
  Instagram: '/assets/instagram.svg',
  LinkedIn: '/assets/linkedin.svg',
}

export const OS_LOGO_MAP = {
  Windows: '/assets/os/WIN.png',
  Android: '/assets/os/AND.png',
  iOS: '/assets/os/apple.svg',
  'Mac OS': '/assets/os/apple.svg',
  macOS: '/assets/os/apple.svg',
  Mac: '/assets/os/apple.svg',
  Linux: '/assets/os/LIN.png',
  'Linux x86_64': '/assets/os/LIN.png',
  Ubuntu: '/assets/os/UBT.png',
  'Chrome OS': '/assets/os/COS.png',
  Fedora: '/assets/os/FED.png',
  HarmonyOS: '/assets/os/HAR.png',
  PlayStation: '/assets/os/PS3.png',
  FreeBSD: '/assets/os/BSD.png',
  Tizen: '/assets/os/TIZ.png',
  OpenBSD: '/assets/os/OBS.png',
  Chromecast: '/assets/os/COS.png',
  Kubuntu: '/assets/os/KBT.png',
  Xbox: '/assets/os/XBX.png',
  NetBSD: '/assets/os/NBS.png',
  Nintendo: '/assets/os/WII.png',
  KAIOS: '/assets/os/KOS.png',
  BSD: '/assets/os/BSD.png',
  'Windows Phone': '/assets/os/WIN.png',
  'Windows Mobile': '/assets/os/WIN.png',
}

export const OS_LOGO_MAP_DARK = {
  iOS: '/assets/os/apple-dark.svg',
  'Mac OS': '/assets/os/apple-dark.svg',
  macOS: '/assets/os/apple-dark.svg',
  Mac: '/assets/os/apple-dark.svg',
}
