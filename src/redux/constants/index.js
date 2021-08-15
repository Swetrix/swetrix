export const tbPeriodPairs = [{
  label: 'Today',
  period: '1d',
  tbs: ['hour'],
  access: 'free',
}, {
  label: 'Last 7 days',
  period: '7d',
  tbs: ['hour', 'day'],
  access: 'free',
}, {
  label: 'Last 4 weeks',
  period: '4w',
  tbs: ['day', 'week'],
  access: 'free',
}, {
  label: 'Last 3 months',
  period: '3M',
  tbs: ['week', 'month'],
  access: 'paid',
}, {
  label: 'Last 12 months',
  period: '12M',
  tbs: ['week', 'month'],
  access: 'paid',
}, {
  label: 'Last 24 months',
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

export const TITLE_SUFFIX = process.env.REACT_APP_TITLE_SUFFIX

export const STRIPE_PUBLIC_KEY = process.env.REACT_APP_STRIPE_PUB_KEY

// Functions
export const getProjectCacheKey = (period, timeBucket) => `${period}${timeBucket}`

// Cookies
export const GDPR_REQUEST = 'gdpr_request'
export const CONFIRMATION_TIMEOUT = 'confirmation_timeout'
