import type { ChartOptions } from 'billboard.js'
import { area } from 'billboard.js'
import * as d3 from 'd3'
import dayjs from 'dayjs'
import { useMemo } from 'react'

import BillboardChart from '~/ui/BillboardChart'
import { nFormatter } from '~/utils/generic'

import type { SeriesPoint } from './types'

export interface AdminChartSeries {
  id: string
  name: string
  color: string
  data: SeriesPoint[]
}

// Same palette as the main analytics dashboard chart
export const ADMIN_CHART_COLORS = {
  blue: '#2563EB',
  amber: '#D97706',
  purple: '#c945ed',
  teal: '#2AC4B3',
  green: '#10B981',
} as const

const tooltipDateFormat = d3.timeFormat('%a, %b %d, %Y')

// Chart options mirroring the main dashboard's look (gradient areas, circle
// legend, custom tooltip) instead of billboard.js defaults
const buildOptions = (series: AdminChartSeries[]): ChartOptions => {
  const dates = Array.from(
    new Set(series.flatMap(({ data }) => data.map(({ date }) => date))),
  ).sort()

  const columns: [string, ...(Date | number)[]][] = [
    ['x', ...dates.map((date) => dayjs(date).toDate())],
  ]

  for (const { id, data } of series) {
    const countByDate = new Map(data.map(({ date, count }) => [date, count]))
    columns.push([id, ...dates.map((date) => countByDate.get(date) || 0)])
  }

  return {
    data: {
      x: 'x',
      columns,
      types: Object.fromEntries(series.map(({ id }) => [id, area()])),
      colors: Object.fromEntries(series.map(({ id, color }) => [id, color])),
      names: Object.fromEntries(series.map(({ id, name }) => [id, name])),
    },
    area: {
      linearGradient: true,
    },
    grid: {
      y: {
        show: true,
      },
    },
    transition: {
      duration: 200,
    },
    resize: {
      auto: true,
      timer: true,
    },
    axis: {
      x: {
        type: 'timeseries',
        clipPath: false,
        tick: {
          fit: false,
          format: '%b %d',
        },
      },
      y: {
        tick: {
          format: (d: number) => (Number.isInteger(d) ? nFormatter(d, 1) : ''),
        },
        show: true,
        inner: true,
      },
    },
    point: {
      focus: {
        only: dates.length > 1,
      },
      pattern: ['circle'],
      r: 4,
    },
    legend: {
      show: series.length > 1,
      item: {
        tile: {
          type: 'circle',
          width: 10,
          r: 3,
        },
      },
    },
    tooltip: {
      contents: (items, _, __, color) => {
        const rows = items
          .map(
            (item) => `
              <li class='flex justify-between items-center py-px leading-snug'>
                <div class='flex items-center min-w-0 mr-4'>
                  <div class='w-2.5 h-2.5 rounded-xs mr-1.5 shrink-0' style='background-color:${color(item.id)}'></div>
                  <span class='truncate'>${item.name || item.id}</span>
                </div>
                <span class='tabular-nums whitespace-nowrap'>${Number(item.value).toLocaleString('en-US')}</span>
              </li>`,
          )
          .join('')

        return `<ul class='bg-gray-50 dark:text-gray-50 dark:bg-slate-900 rounded-md ring-1 ring-black/10 px-2 py-1 text-xs md:text-sm shadow-md z-50'>
          <li class='font-semibold pb-1 mb-1 border-b border-gray-200 dark:border-slate-800'>${tooltipDateFormat(items[0].x as unknown as Date)}</li>
          ${rows}
        </ul>`
      },
    },
  }
}

export const AdminChart = ({
  series,
  className,
}: {
  series: AdminChartSeries[]
  className?: string
}) => {
  const options = useMemo(() => buildOptions(series), [series])

  return (
    <BillboardChart options={options} className={className} deps={[series]} />
  )
}
