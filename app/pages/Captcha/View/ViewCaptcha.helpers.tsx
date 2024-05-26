import React from 'react'
import type i18next from 'i18next'
// @ts-ignore
import {
  GlobeEuropeAfricaIcon,
  LanguageIcon,
  DocumentTextIcon,
  DeviceTabletIcon,
  ArrowRightCircleIcon,
  MagnifyingGlassIcon,
  ServerIcon,
} from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import { area, bar } from 'billboard.js'
import _map from 'lodash/map'
import _split from 'lodash/split'
import _replace from 'lodash/replace'
import _size from 'lodash/size'

import {
  TimeFormat,
  chartTypes,
  tbsFormatMapper,
  tbsFormatMapper24h,
  tbsFormatMapperTooltip,
  tbsFormatMapperTooltip24h,
} from 'redux/constants'
// @ts-ignore
import * as d3 from 'd3'
import { nFormatter } from 'utils/generic'

const PANELS_ORDER = ['cc', 'br', 'os', 'dv']

const getExportFilename = (prefix: string) => {
  // turn something like 2022-03-02T19:31:00.100Z into 2022-03-02
  const date = _split(_replace(_split(new Date().toISOString(), '.')[0], /:/g, '-'), 'T')[0]
  return `${prefix}-${date}.zip`
}

const CHART_METRICS_MAPPING = {
  results: 'results',
}

// function to filter the data for the chart
const getColumns = (
  chart: {
    x: string[]
    results: string[]
  },
  activeChartMetrics: {
    [key: string]: boolean
  },
) => {
  const { results } = activeChartMetrics

  const columns = [['x', ..._map(chart.x, (el) => dayjs(el).toDate())]]

  if (results) {
    columns.push(['results', ...chart.results])
  }

  return columns
}

// setting the default values for the time period dropdown
const noRegionPeriods = ['custom', 'yesterday']

// function to get the settings and data for the chart(main diagram)
const getSettings = (
  chart: any,
  timeBucket: string,
  activeChartMetrics: {
    [key: string]: boolean
  },
  applyRegions: boolean,
  timeFormat: string,
  rotateXAxias: boolean,
  chartType: string,
) => {
  const xAxisSize = _size(chart.x)
  let regions

  if (applyRegions) {
    let regionStart

    if (xAxisSize > 1) {
      regionStart = dayjs(chart.x[xAxisSize - 2]).toDate()
    } else {
      regionStart = dayjs(chart.x[xAxisSize - 1]).toDate()
    }

    regions = {
      results: [
        {
          start: regionStart,
          style: {
            dasharray: '6 2',
          },
        },
      ],
    }
  }

  return {
    data: {
      x: 'x',
      columns: getColumns(
        {
          ...chart,
        },
        activeChartMetrics,
      ),
      types: {
        results: chartType === chartTypes.line ? area() : bar(),
      },
      colors: {
        results: '#2563EB',
      },
      regions,
    },
    transition: {
      duration: 500,
    },
    resize: {
      auto: true,
      timer: false,
    },
    axis: {
      x: {
        clipPath: false,
        tick: {
          fit: true,
          rotate: rotateXAxias ? 45 : 0,
          format:
            timeFormat === TimeFormat['24-hour']
              ? (x: string) => d3.timeFormat(tbsFormatMapper24h[timeBucket])(x)
              : (x: string) => d3.timeFormat(tbsFormatMapper[timeBucket])(x),
        },
        localtime: timeFormat === TimeFormat['24-hour'],
        type: 'timeseries',
      },
      y: {
        tick: {
          format: (d: number) => nFormatter(d, 1),
        },
        show: true,
        inner: true,
      },
    },
    tooltip: {
      contents: (item: any, _: any, __: any, color: any) => {
        return `<ul class='bg-gray-100 dark:text-gray-50 dark:bg-slate-800 rounded-md shadow-md px-3 py-1'>
          <li class='font-semibold'>${
            timeFormat === TimeFormat['24-hour']
              ? d3.timeFormat(tbsFormatMapperTooltip24h[timeBucket])(item[0].x)
              : d3.timeFormat(tbsFormatMapperTooltip[timeBucket])(item[0].x)
          }</li>
          <hr class='border-gray-200 dark:border-gray-600' />
          ${_map(item, (el: { id: string; index: number; name: string; value: string; x: Date }) => {
            return `
            <li class='flex justify-between'>
              <div class='flex justify-items-start'>
                <div class='w-3 h-3 rounded-sm mt-1.5 mr-2' style=background-color:${color(el.id)}></div>
                <span>${el.name}</span>
              </div>
              <span class='pl-4'>${el.value}</span>
            </li>
            `
          }).join('')}`
      },
    },
    point: {
      focus: {
        only: xAxisSize > 1,
      },
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
    area: {
      linearGradient: true,
    },
    padding: {
      right: rotateXAxias && 35,
    },
    bindto: '#captchaChart',
  }
}

const validTimeBacket = ['hour', 'day', 'week', 'month']
const validPeriods = ['custom', 'today', 'yesterday', '1d', '7d', '4w', '3M', '12M', '24M']
const validFilters = ['cc', 'pg', 'lc', 'ref', 'dv', 'br', 'os', 'so', 'me', 'ca', 'lt', 'ev']

const typeNameMapping = (t: typeof i18next.t) => ({
  cc: t('project.mapping.cc'),
  dv: t('project.mapping.dv'),
  br: t('project.mapping.br'),
  os: t('project.mapping.os'),
})

const iconClassName = 'w-6 h-6'
const panelIconMapping = {
  cc: <GlobeEuropeAfricaIcon className={iconClassName} />,
  pg: <DocumentTextIcon className={iconClassName} />,
  lc: <LanguageIcon className={iconClassName} />,
  ref: <ArrowRightCircleIcon className={iconClassName} />,
  dv: <DeviceTabletIcon className={iconClassName} />,
  br: <MagnifyingGlassIcon className={iconClassName} />,
  os: <ServerIcon className={iconClassName} />,
}

// This function return date using the same format as the backend
const getFormatDate = (date: Date) => {
  const yyyy = date.getFullYear()
  let mm: string | number = date.getMonth() + 1
  let dd: string | number = date.getDate()
  if (dd < 10) dd = `0${dd}`
  if (mm < 10) mm = `0${mm}`
  return `${yyyy}-${mm}-${dd}`
}

export {
  iconClassName,
  getFormatDate,
  panelIconMapping,
  typeNameMapping,
  validFilters,
  validPeriods,
  validTimeBacket,
  noRegionPeriods,
  getSettings,
  getExportFilename,
  getColumns,
  CHART_METRICS_MAPPING,
  PANELS_ORDER,
}
