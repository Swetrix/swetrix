/* eslint-disable no-useless-escape */
import billboard, { bar, line } from 'billboard.js'
import { useEffect, useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Link } from 'react-router'

import { getGeneralStats } from '~/api'
import { LIVE_DEMO_URL } from '~/lib/constants'
import { Stats } from '~/lib/models/Stats'
import { nFormatterSeparated } from '~/utils/generic'

// This should be generated on the API side, will be done later.
// MRR taken from Profitwell dashboard
// Revenue taken from Paddle dashboard
const financeData = {
  '2021-08-01': {
    'Technical Expenses': -32,
    'Business Expenses': 0,
    MRR: 0,
    Revenue: 0,
  },
  '2021-09-01': {
    'Technical Expenses': -32,
    'Business Expenses': 0,
    MRR: 0,
    Revenue: 0,
  },
  '2021-10-01': {
    'Technical Expenses': -32,
    'Business Expenses': 0,
    MRR: 0,
    Revenue: 0,
  },
  '2021-11-01': {
    'Technical Expenses': -32,
    'Business Expenses': 0,
    MRR: 0,
    Revenue: 0,
  },
  '2021-12-01': {
    'Technical Expenses': -32,
    'Business Expenses': 0,
    MRR: 0,
    Revenue: 0,
  },
  '2022-01-01': {
    'Technical Expenses': -32,
    'Business Expenses': 0,
    MRR: 0,
    Revenue: 0,
  },
  '2022-02-01': {
    'Technical Expenses': -32,
    'Business Expenses': 0,
    MRR: 2,
    Revenue: 2,
  },
  '2022-03-01': {
    'Technical Expenses': -32,
    'Business Expenses': 0,
    MRR: 15,
    Revenue: 14,
  },
  '2022-04-01': {
    'Technical Expenses': -32,
    'Business Expenses': -300,
    MRR: 15,
    Revenue: 14,
  },
  '2022-05-01': {
    'Technical Expenses': -32,
    'Business Expenses': -300,
    MRR: 15,
    Revenue: 14,
  },
  '2022-06-01': {
    'Technical Expenses': -32,
    'Business Expenses': -300,
    MRR: 15,
    Revenue: 14,
  },
  '2022-07-01': {
    'Technical Expenses': -32,
    'Business Expenses': -300,
    MRR: 15,
    Revenue: 14,
  },
  '2022-08-01': {
    'Technical Expenses': -42,
    'Business Expenses': -300,
    MRR: 15,
    Revenue: 14,
  },
  '2022-09-01': {
    'Technical Expenses': -42,
    'Business Expenses': -350,
    MRR: 15,
    Revenue: 14,
  },
  '2022-10-01': {
    'Technical Expenses': -48,
    'Business Expenses': -300,
    MRR: 15,
    Revenue: 14,
  },
  '2022-11-01': {
    'Technical Expenses': -48,
    'Business Expenses': -300,
    MRR: 15,
    Revenue: 14,
  },
  '2022-12-01': {
    'Technical Expenses': -48,
    'Business Expenses': -400,
    MRR: 15,
    Revenue: 14,
  },
  '2023-01-01': {
    'Technical Expenses': -48,
    'Business Expenses': -375,
    MRR: 15,
    Revenue: 14,
  },
  '2023-02-01': {
    'Technical Expenses': -48,
    'Business Expenses': -300,
    MRR: 35,
    Revenue: 31,
  },
  '2023-03-01': {
    'Technical Expenses': -48,
    'Business Expenses': -370,
    MRR: 30,
    Revenue: 26,
  },
  '2023-04-01': {
    'Technical Expenses': -48,
    'Business Expenses': -50,
    MRR: 34,
    Revenue: 73,
  },
  '2023-05-01': {
    'Technical Expenses': -48,
    'Business Expenses': -650,
    MRR: 38,
    Revenue: 73,
  },
  '2023-06-01': {
    'Technical Expenses': -48,
    'Business Expenses': -300,
    MRR: 38,
    Revenue: 22,
  },
  '2023-07-01': {
    'Technical Expenses': -23,
    'Business Expenses': -300,
    MRR: 63,
    Revenue: 63,
  },
  '2023-08-01': {
    'Technical Expenses': -23,
    'Business Expenses': 0,
    MRR: 64,
    Revenue: 49,
  },
  '2023-09-01': {
    'Technical Expenses': -23,
    'Business Expenses': 0,
    MRR: 58,
    Revenue: 86,
  },
  '2023-10-01': {
    'Technical Expenses': -23,
    'Business Expenses': 0,
    MRR: 68,
    Revenue: 47,
  },
  '2023-11-01': {
    'Technical Expenses': -23,
    'Business Expenses': 0,
    MRR: 77,
    Revenue: 100,
  },
  '2023-12-01': {
    'Technical Expenses': -23,
    'Business Expenses': 0,
    MRR: 101,
    Revenue: 216,
  },
  '2024-01-01': {
    'Technical Expenses': -23,
    'Business Expenses': -366,
    MRR: 119,
    Revenue: 307,
  },
  '2024-02-01': {
    'Technical Expenses': -23,
    'Business Expenses': 0,
    MRR: 129,
    Revenue: 403,
  },
  '2024-03-01': {
    'Technical Expenses': -23,
    'Business Expenses': -252, // google ads campaign
    MRR: 144,
    Revenue: 150,
  },
  '2024-04-01': {
    'Technical Expenses': -23,
    'Business Expenses': -255, // google ads campaign
    MRR: 148,
    Revenue: 1536,
  },
  '2024-05-01': {
    'Technical Expenses': -40,
    'Business Expenses': -45, // [personal expence for business] Wise
    MRR: 159,
    Revenue: 1300,
  },
  '2024-06-01': {
    'Technical Expenses': -40,
    'Business Expenses': -252, // marketing
    MRR: 192,
    Revenue: 1624,
  },
  '2024-07-01': {
    'Technical Expenses': -40,
    'Business Expenses': -695, // marketing + marketing freelancer
    MRR: 204,
    Revenue: 264,
  },
  '2024-08-01': {
    'Technical Expenses': -45,
    'Business Expenses': -898, // marketing + marketing freelancer
    MRR: 204,
    Revenue: 781,
  },
  '2024-09-01': {
    'Technical Expenses': -69,
    'Business Expenses': -1005, // marketing + marketing freelancer
    MRR: 214,
    Revenue: 818,
  },
  '2024-10-01': {
    'Technical Expenses': -75, // cloud hosting, mail
    'Business Expenses': -1148, // google ads + marketing freelancer
    MRR: 238,
    Revenue: 6378,
  },
  '2024-11-01': {
    'Technical Expenses': -75, // cloud hosting, mail
    'Business Expenses': -565, // google ads
    MRR: 257,
    Revenue: 340,
  },
  '2024-12-01': {
    'Technical Expenses': -96, // cloud hosting, mail, accounting
    'Business Expenses': -1859, // google ads + marketing freelancer + gov
    MRR: 291,
    Revenue: 1059,
  },
  '2025-01-01': {
    'Technical Expenses': -123, // cloud hosting, mail, accounting
    'Business Expenses': -362, // google ads + office
    MRR: 298,
    Revenue: 178,
  },
  '2025-02-01': {
    'Technical Expenses': -144, // cloud hosting, mail, accounting
    'Business Expenses': -42, // gov
    MRR: 311,
    Revenue: 1312,
  },
}

const financeDataToColumns = (financeData: any) => {
  const dates = Object.keys(financeData)
  const columns = [['Technical Expenses'], ['Business Expenses'], ['MRR'], ['Profit'], ['Revenue'], ['x']]

  dates.forEach((date) => {
    columns[0].push(financeData[date]['Technical Expenses'])
    columns[1].push(financeData[date]['Business Expenses'])
    columns[2].push(financeData[date]['MRR'])
    columns[3].push(
      financeData[date]['Revenue'] + financeData[date]['Technical Expenses'] + financeData[date]['Business Expenses'],
    )
    columns[4].push(financeData[date]['Revenue'])
    columns[5].push(date)
  })

  return columns
}

const columns = financeDataToColumns(financeData)

const groups = ['Revenue', 'MRR', 'Profit', 'Technical Expenses', 'Business Expenses']

const getSettings = () => {
  return {
    data: {
      x: 'x',
      xFormat: '%b %Y',
      columns,
      types: {
        'Technical Expenses': bar(),
        'Business Expenses': bar(),
        MRR: bar(),
        Profit: line(),
        Revenue: line(),
      },
      colors: {
        'Technical Expenses': '#EC4319',
        'Business Expenses': '#F27059',
        MRR: '#709775',
        Profit: '#A5E6AB',
        Revenue: '#12731E',
      },
      groups: [['MRR', 'Technical Expenses', 'Business Expenses']],
    },
    axis: {
      x: {
        type: 'timeseries',
        tick: {
          format: '%b %Y',
        },
      },
      y: {
        tick: {
          // format: (d: string) => getStringFromTime(getTimeFromSeconds(d), true),
        },
      },
    },
    tooltip: {
      // format: {
      //   title: (x: string) => d3.timeFormat(tbsFormatMapper[timeBucket])(x),
      // },
      order: (a: any, b: any) => {
        const aIndex = groups.indexOf(a.name)
        const bIndex = groups.indexOf(b.name)

        // ascending order
        return aIndex - bIndex
      },
      contents: {
        template: `
          <ul class='bg-gray-100 dark:text-gray-50 dark:bg-slate-800 rounded-md shadow-md px-3 py-1'>
            <li class='font-semibold'>{=TITLE}</li>
            <hr class='border-gray-200 dark:border-gray-600' />
            {{
              <li class='flex justify-between'>
                <div class='flex justify-items-start'>
                  <div class='w-3 h-3 rounded-xs mt-1.5 mr-2' style=background-color:{=COLOR}></div>
                  <span>{=NAME}</span>
                </div>
                <span class='pl-4'>{=VALUE} US\$</span>
              </li>
            }}
          </ul>
        `,
      },
    },
    point: {
      // focus: {
      //   only: xAxisSize > 1,
      // },
      pattern: ['circle'],
      r: 3,
    },
    legend: {
      usePoint: true,
      item: {
        tile: {
          width: 10,
        },
      },
    },
    // area: {
    //   linearGradient: true,
    // },
    // padding: {
    //   right: rotateXAxias && 35,
    // },
    bindto: '#open-startup',
  }
}

const OpenStartup = () => {
  const { t }: any = useTranslation('common')
  const [stats, setStats] = useState<Stats>({} as Stats)

  const events = nFormatterSeparated(Number(stats.events), 1)
  const users = nFormatterSeparated(Number(stats.users), 1)
  const websites = nFormatterSeparated(Number(stats.projects), 1)

  useEffect(() => {
    getGeneralStats()
      .then((stats) => setStats(stats))
      .catch(console.error)

    const bbSettings = getSettings()

    // @ts-expect-error
    billboard.generate(bbSettings)
  }, [])

  return (
    <div className='min-h-page bg-gray-50 dark:bg-slate-900'>
      <div className='mx-auto w-11/12 px-4 pt-12 pb-16 whitespace-pre-line sm:px-6 md:w-4/5 lg:px-8'>
        <h1 className='text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50'>{t('titles.open')}</h1>

        <p className='mt-2 text-lg tracking-tight text-gray-900 dark:text-gray-50'>{t('open.desc')}</p>

        <p className='mt-2 text-lg tracking-tight text-gray-900 dark:text-gray-50'>{t('open.updated')}</p>

        <h2 className='mt-8 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50'>
          {t('open.finance.title')}
        </h2>

        <p className='mt-2 text-lg tracking-tight text-gray-900 dark:text-gray-50'>{t('open.finance.desc')}</p>

        <div className='mt-4 h-80' id='open-startup' />

        <h2 className='mt-8 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50'>
          {t('open.usage.title')}
        </h2>

        <p className='mt-2 text-lg tracking-tight text-gray-900 dark:text-gray-50'>{t('open.usage.desc')}</p>

        <p className='text-md mt-2 tracking-tight text-gray-900 dark:text-gray-50'>
          {t('main.users')}
          {': '}
          {users[0]}
          {users[1] ? <span className='text-gray-900 dark:text-indigo-200'>{users[1]}+</span> : null}
        </p>

        <p className='text-md mt-2 tracking-tight text-gray-900 dark:text-gray-50'>
          {t('main.websites')}
          {': '}
          {websites[0]}
          {websites[1] ? <span className='text-gray-900 dark:text-indigo-200'>{websites[1]}+</span> : null}
        </p>

        <p className='text-md mt-2 tracking-tight text-gray-900 dark:text-gray-50'>
          {t('main.pageviews')}
          {': '}
          {events[0]}
          {events[1] ? <span className='text-gray-900 dark:text-indigo-200'>{events[1]}+</span> : null}
        </p>

        <p className='mt-2 text-lg tracking-tight text-gray-900 dark:text-gray-50'>
          <Trans
            t={t}
            i18nKey='open.usage.live'
            components={{
              livedemo: (
                <Link
                  to={LIVE_DEMO_URL}
                  className='font-medium text-indigo-600 hover:text-indigo-500 hover:underline dark:text-indigo-400 dark:hover:text-indigo-500'
                />
              ),
            }}
          />
        </p>
      </div>
    </div>
  )
}

export default OpenStartup
