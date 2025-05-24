import { LanguageIcon, ArrowRightCircleIcon } from '@heroicons/react/24/outline'
import { area, bar } from 'billboard.js'
import type { ChartOptions } from 'billboard.js'
import * as d3 from 'd3'
import dayjs from 'dayjs'
import type i18next from 'i18next'
import _map from 'lodash/map'
import _size from 'lodash/size'
import { CompassIcon, FileTextIcon, MapPinIcon, MonitorCog, TabletSmartphoneIcon } from 'lucide-react'

import {
  TimeFormat,
  chartTypes,
  tbsFormatMapper,
  tbsFormatMapper24h,
  tbsFormatMapperTooltip,
  tbsFormatMapperTooltip24h,
} from '~/lib/constants'
import { nFormatter } from '~/utils/generic'

const PANELS_ORDER = ['cc', 'br', 'os', 'dv']

// function to filter the data for the chart
const getColumns = (chart: { x: string[]; results: string[] }) => {
  const columns = [['x', ..._map(chart.x, (el) => dayjs(el).toDate())]]
  columns.push(['results', ...chart.results])

  return columns
}

// setting the default values for the time period dropdown
const noRegionPeriods = ['custom', 'yesterday']

// function to get the settings and data for the chart(main diagram)
const getSettings = (
  chart: any,
  timeBucket: string,
  applyRegions: boolean,
  timeFormat: string,
  rotateXAxis: boolean,
  chartType: string,
): ChartOptions => {
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
      columns: getColumns({
        ...chart,
      }),
      types: {
        results: chartType === chartTypes.line ? area() : bar(),
      },
      colors: {
        results: '#2563EB',
      },
      // @ts-expect-error
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
          rotate: rotateXAxis ? 45 : 0,
          format:
            // @ts-expect-error
            timeFormat === TimeFormat['24-hour']
              ? (x: string) => d3.timeFormat(tbsFormatMapper24h[timeBucket])(x as unknown as Date)
              : (x: string) => d3.timeFormat(tbsFormatMapper[timeBucket])(x as unknown as Date),
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
        return `<ul class='bg-gray-50 dark:text-gray-50 dark:bg-slate-800 rounded-md ring-1 ring-black/10 px-3 py-1'>
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
                <div class='w-3 h-3 rounded-xs mt-1.5 mr-2' style=background-color:${color(el.id)}></div>
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
      r: 2,
    },
    legend: {
      item: {
        tile: {
          type: 'circle',
          width: 10,
          r: 3,
        },
      },
    },
    area: {
      linearGradient: true,
    },
    padding: {
      right: rotateXAxis ? 35 : 0,
    },
    bindto: '#captchaChart',
  }
}

const typeNameMapping = (t: typeof i18next.t) => ({
  cc: t('project.mapping.cc'),
  dv: t('project.mapping.dv'),
  br: t('project.mapping.br'),
  os: t('project.mapping.os'),
})

const iconClassName = 'w-6 h-6'
const panelIconMapping = {
  cc: <MapPinIcon className={iconClassName} strokeWidth={1.5} />,
  pg: <FileTextIcon className={iconClassName} strokeWidth={1.5} />,
  lc: <LanguageIcon className={iconClassName} />,
  ref: <ArrowRightCircleIcon className={iconClassName} />,
  dv: <TabletSmartphoneIcon className={iconClassName} strokeWidth={1.5} />,
  br: <CompassIcon className={iconClassName} strokeWidth={1.5} />,
  os: <MonitorCog className={iconClassName} strokeWidth={1.5} />,
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

export { getFormatDate, panelIconMapping, typeNameMapping, noRegionPeriods, getSettings, getColumns, PANELS_ORDER }
