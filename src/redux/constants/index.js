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

export const TOKEN = 'access_token'

export const TITLE_SUFFIX = process.env.REACT_APP_TITLE_SUFFIX
