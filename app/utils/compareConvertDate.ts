import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { getFormatDate } from 'pages/Project/View/ViewProject.helpers'

dayjs.extend(utc)

export const periodToCompareDate: {
  period: string
  formula: (date?: Date[]) => {
    from: string
    to: string
  }
}[] = [{
  period: '1d',
  formula: () => {
    const to = dayjs.utc().subtract(1, 'day').format('YYYY-MM-DD')
    const from = dayjs.utc().subtract(2, 'day').format('YYYY-MM-DD')

    return {
      from,
      to,
    }
  },
}, {
  period: '7d',
  formula: () => {
    const to = dayjs.utc().subtract(7, 'day').format('YYYY-MM-DD')
    const from = dayjs.utc().subtract(14, 'day').format('YYYY-MM-DD')

    return {
      from,
      to,
    }
  },
}, {
  period: '4w',
  formula: () => {
    const to = dayjs.utc().subtract(28, 'day').format('YYYY-MM-DD')
    const from = dayjs.utc().subtract(56, 'day').format('YYYY-MM-DD')

    return {
      from,
      to,
    }
  },
}, {
  period: '3M',
  formula: () => {
    const to = dayjs.utc().subtract(3, 'month').format('YYYY-MM-DD')
    const from = dayjs.utc().subtract(6, 'month').format('YYYY-MM-DD')

    return {
      from,
      to,
    }
  },
}, {
  period: '12M',
  formula: () => {
    const to = dayjs.utc().subtract(12, 'month').format('YYYY-MM-DD')
    const from = dayjs.utc().subtract(24, 'month').format('YYYY-MM-DD')

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
        from: getFormatDate(new Date()),
        to: getFormatDate(new Date()),
      }
    }
    const days = (date[1].getTime() - date[0].getTime()) / (1000 * 3600 * 24)
    const to = dayjs.utc().subtract(days, 'day').format('YYYY-MM-DD')
    const from = dayjs.utc().subtract(days * 2, 'day').format('YYYY-MM-DD')

    return {
      from,
      to,
    }
  },
}]
