import dayjs from 'dayjs'

const DIVISIONS = [
  { amount: 60, name: 'seconds' },
  { amount: 60, name: 'minutes' },
  { amount: 24, name: 'hours' },
  { amount: 7, name: 'days' },
  { amount: 4.34524, name: 'weeks' },
  { amount: 12, name: 'months' },
  { amount: Number.POSITIVE_INFINITY, name: 'years' },
]

// @ts-ignore
const formatTimeAgo = (date, language?: string) => {
  const rtf = new Intl.RelativeTimeFormat(language)

  // @ts-ignore
  let duration = (date - new Date()) / 1000

  for (let i = 0; i < DIVISIONS.length; i++) {
    const division = DIVISIONS[i]
    if (Math.abs(duration) < division.amount) {
      // @ts-ignore
      return rtf.format(Math.round(duration), division.name)
    }
    duration /= division.amount
  }
}

export const getRelativeDateIfPossible = (date: string, language?: string) => {
  if (!Intl?.RelativeTimeFormat) {
    return new Date(date).toLocaleDateString(language, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    })
  }

  return formatTimeAgo(dayjs.utc(date).toDate(), language)
}
