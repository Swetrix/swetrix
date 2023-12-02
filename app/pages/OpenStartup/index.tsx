/* eslint-disable */
import React, { useEffect } from 'react'
import _map from 'lodash/map'
import bb, {
  bar, line,
} from 'billboard.js'
import { useTranslation, Trans } from 'react-i18next'
import { Link } from '@remix-run/react'
import { useSelector } from 'react-redux'

import { nFormatterSeparated } from 'utils/generic'
import { StateType } from 'redux/store/index'
import { LIVE_DEMO_URL } from 'redux/constants'

// This should be generated on the API side, will be done later.
// MRR taken from Profitwell dashboard
// Revenue taken from Paddle dashboard
const financeData = {
  '2021-08-01': {
    'Technical Expences': -32,
    'Business Expences': 0,
    'MRR': 0,
    'Revenue': 0,
  },
  '2021-09-01': {
    'Technical Expences': -32,
    'Business Expences': 0,
    'MRR': 0,
    'Revenue': 0,
  },
  '2021-10-01': {
    'Technical Expences': -32,
    'Business Expences': 0,
    'MRR': 0,
    'Revenue': 0,
  },
  '2021-11-01': {
    'Technical Expences': -32,
    'Business Expences': 0,
    'MRR': 0,
    'Revenue': 0,
  },
  '2021-12-01': {
    'Technical Expences': -32,
    'Business Expences': 0,
    'MRR': 0,
    'Revenue': 0,
  },
  '2022-01-01': {
    'Technical Expences': -32,
    'Business Expences': 0,
    'MRR': 0,
    'Revenue': 0,
  },
  '2022-02-01': {
    'Technical Expences': -32,
    'Business Expences': 0,
    'MRR': 2,
    'Revenue': 2,
  },
  '2022-03-01': {
    'Technical Expences': -32,
    'Business Expences': 0,
    'MRR': 15,
    'Revenue': 14,
  },
  '2022-04-01': {
    'Technical Expences': -32,
    'Business Expences': -300,
    'MRR': 15,
    'Revenue': 14,
  },
  '2022-05-01': {
    'Technical Expences': -32,
    'Business Expences': -300,
    'MRR': 15,
    'Revenue': 14,
  },
  '2022-06-01': {
    'Technical Expences': -32,
    'Business Expences': -300,
    'MRR': 15,
    'Revenue': 14,
  },
  '2022-07-01': {
    'Technical Expences': -32,
    'Business Expences': -300,
    'MRR': 15,
    'Revenue': 14,
  },
  '2022-08-01': {
    'Technical Expences': -42,
    'Business Expences': -300,
    'MRR': 15,
    'Revenue': 14,
  },
  '2022-09-01': {
    'Technical Expences': -42,
    'Business Expences': -350,
    'MRR': 15,
    'Revenue': 14,
  },
  '2022-10-01': {
    'Technical Expences': -48,
    'Business Expences': -300,
    'MRR': 15,
    'Revenue': 14,
  },
  '2022-11-01': {
    'Technical Expences': -48,
    'Business Expences': -300,
    'MRR': 15,
    'Revenue': 14,
  },
  '2022-12-01': {
    'Technical Expences': -48,
    'Business Expences': -400,
    'MRR': 15,
    'Revenue': 14,
  },
  '2023-01-01': {
    'Technical Expences': -48,
    'Business Expences': -375,
    'MRR': 15,
    'Revenue': 14,
  },
  '2023-02-01': {
    'Technical Expences': -48,
    'Business Expences': -300,
    'MRR': 35,
    'Revenue': 31,
  },
  '2023-03-01': {
    'Technical Expences': -48,
    'Business Expences': -370,
    'MRR': 30,
    'Revenue': 26,
  },
  '2023-04-01': {
    'Technical Expences': -48,
    'Business Expences': -50,
    'MRR': 34,
    'Revenue': 73,
  },
  '2023-05-01': {
    'Technical Expences': -48,
    'Business Expences': -650,
    'MRR': 38,
    'Revenue': 73,
  },
  '2023-06-01': {
    'Technical Expences': -48,
    'Business Expences': -300,
    'MRR': 38,
    'Revenue': 22,
  },
  '2023-07-01': {
    'Technical Expences': -23,
    'Business Expences': -300,
    'MRR': 63,
    'Revenue': 63,
  },
  '2023-08-01': {
    'Technical Expences': -23,
    'Business Expences': 0,
    'MRR': 64,
    'Revenue': 49,
  },
  '2023-09-01': {
    'Technical Expences': -23,
    'Business Expences': 0,
    'MRR': 58,
    'Revenue': 86,
  },
  '2023-10-01': {
    'Technical Expences': -23,
    'Business Expences': 0,
    'MRR': 68,
    'Revenue': 47,
  },
  '2023-11-01': {
    'Technical Expences': -23,
    'Business Expences': 0,
    'MRR': 77,
    'Revenue': 100,
  },
}

const financeDataToColumns = (financeData: any) => {
  const dates = Object.keys(financeData)
  const columns = [
    ['Technical Expences'],
    ['Business Expences'],
    ['MRR'],
    ['Profit'],
    ['Revenue'],
    ['x']
  ]

  dates.forEach((date) => {
    columns[0].push(financeData[date]['Technical Expences'])
    columns[1].push(financeData[date]['Business Expences'])
    columns[2].push(financeData[date]['MRR'])
    columns[3].push(
      financeData[date]['Revenue'] + financeData[date]['Technical Expences'] + financeData[date]['Business Expences']
    )
    columns[4].push(financeData[date]['Revenue'])
    columns[5].push(date)
  })

  return columns
}

const columns = financeDataToColumns(financeData)

const groups = ['Revenue', 'MRR', 'Profit', 'Technical Expences', 'Business Expences']

const getSettings = () => {
  return {
    data: {
      x: 'x',
      xFormat: '%b %Y',
      columns,
      types: {
        'Technical Expences': bar(),
        'Business Expences': bar(),
        MRR: bar(),
        Profit: line(),
        Revenue: line(),
      },
      colors: {
        'Technical Expences': '#EC4319',
        'Business Expences': '#F27059',
        MRR: '#709775',
        Profit: '#A5E6AB',
        Revenue: '#12731E'
      },
      groups: [
        groups,
      ],
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
                  <div class='w-3 h-3 rounded-sm mt-1.5 mr-2' style=background-color:{=COLOR}></div>
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
      pattern: [
        'circle',
      ],
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

const OpenStartup = (): JSX.Element => {
  const { t }: any = useTranslation('common')
  const { stats } = useSelector((state: StateType) => state.ui.misc)

  const events = nFormatterSeparated(Number(stats.events), 1)
  const users = nFormatterSeparated(Number(stats.users), 1)
  const websites = nFormatterSeparated(Number(stats.projects), 1)

  useEffect(() => {
    const bbSettings = getSettings()

    // @ts-ignore
    bb.generate(bbSettings)
  }, [])

  return (
    <div className='min-h-page bg-gray-50 dark:bg-slate-900'>
      <div className='w-11/12 md:w-4/5 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 whitespace-pre-line'>
        <h1 className='text-4xl font-bold text-gray-900 dark:text-gray-50 tracking-tight'>
          {t('titles.open')}
        </h1>

        <p className='mt-2 text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          {t('open.desc')}
        </p>

        <p className='mt-2 text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          {t('open.updated')}
        </p>

        <h2 className='mt-8 text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight'>
          {t('open.finance.title')}
        </h2>

        <p className='mt-2 text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          {t('open.finance.desc')}
        </p>

        <div className='h-80 mt-4' id='open-startup' />

        <h2 className='mt-8 text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight'>
          {t('open.usage.title')}
        </h2>

        <p className='mt-2 text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          {t('open.usage.desc')}
        </p>

        <p className='mt-2 text-md text-gray-900 dark:text-gray-50 tracking-tight'>
          {t('main.users')}
          {': '}
          {users[0]}
          {users[1] && (
            <span className='text-gray-900 dark:text-indigo-200'>
              {users[1]}
              +
            </span>
          )}
        </p>

        <p className='mt-2 text-md text-gray-900 dark:text-gray-50 tracking-tight'>
          {t('main.websites')}
          {': '}
          {websites[0]}
          {websites[1] && (
            <span className='text-gray-900 dark:text-indigo-200'>
              {websites[1]}
              +
            </span>
          )}
        </p>

        <p className='mt-2 text-md text-gray-900 dark:text-gray-50 tracking-tight'>
          {t('main.pageviews')}
          {': '}
          {events[0]}
          {events[1] && (
            <span className='text-gray-900 dark:text-indigo-200'>
              {events[1]}
              +
            </span>
          )}
        </p>

        <p className='mt-2 text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          <Trans
            t={t}
            i18nKey='open.usage.live'
            components={{
              livedemo: <Link to={LIVE_DEMO_URL} className='font-medium hover:underline text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500' />,
            }}
          />
        </p>
      </div>
    </div>
  )
}

export default OpenStartup
