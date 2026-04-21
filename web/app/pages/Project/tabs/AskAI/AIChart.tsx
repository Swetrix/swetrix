import type { ChartOptions } from 'billboard.js'
import { line, area, bar, spline, pie, donut } from 'billboard.js'
import dayjs from 'dayjs'
import _filter from 'lodash/filter'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import React, { useMemo, memo } from 'react'

import BillboardChart from '~/ui/BillboardChart'

interface AIChartData {
  type: 'chart'
  chartType: 'line' | 'bar' | 'area' | 'spline' | 'pie' | 'donut'
  title?: string
  data: {
    x?: string[]
    labels?: string[]
    values?: number[]
    [key: string]: number[] | string[] | undefined
  }
}

interface AIChartProps {
  chart: AIChartData
}

const CHART_COLORS = [
  '#2563EB', // blue-600
  '#16a34a', // green-600
  '#dc2626', // red-600
  '#9333ea', // purple-600
  '#ea580c', // orange-600
  '#0891b2', // cyan-600
  '#4f46e5', // indigo-600
  '#db2777', // pink-600
]

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const formatTooltipValue = (value: number): string => {
  if (!Number.isFinite(value)) return '0'
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(2)}K`
  return value.toLocaleString()
}

const formatTooltipDate = (x: Date | string, granularity: number) => {
  const d = dayjs(x)
  if (!d.isValid()) return String(x)
  if (granularity <= 24) return d.format('MMM D, YYYY HH:mm')
  return d.format('MMM D, YYYY')
}

const isLikelyDate = (val: string): boolean => {
  if (dayjs(val).isValid()) return true
  const parsed = new Date(val)
  return !Number.isNaN(parsed.getTime())
}

const calculateOptimalTicks = (
  data: number[],
  targetCount: number = 6,
): number[] => {
  const validData = data.filter(
    (n) => n !== undefined && n !== null && Number.isFinite(n),
  )

  if (validData.length === 0) {
    return [0, 1]
  }

  const min = Math.min(...validData)
  const max = Math.max(...validData)

  if (min === max) {
    return max === 0 ? [0, 1] : [0, max * 1.2]
  }

  const upperBound = Math.ceil(max * 1.2)
  const roughStep = upperBound / (targetCount - 1)

  let niceStep: number
  if (roughStep <= 1) niceStep = 1
  else if (roughStep <= 2) niceStep = 2
  else if (roughStep <= 5) niceStep = 5
  else if (roughStep <= 10) niceStep = 10
  else if (roughStep <= 20) niceStep = 20
  else if (roughStep <= 25) niceStep = 25
  else if (roughStep <= 50) niceStep = 50
  else {
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)))
    const normalized = roughStep / magnitude
    if (normalized <= 2) niceStep = 2 * magnitude
    else if (normalized <= 5) niceStep = 5 * magnitude
    else niceStep = 10 * magnitude
  }

  const ticks: number[] = []
  for (let i = 0; i <= upperBound; i += niceStep) {
    ticks.push(i)
  }

  if (ticks[ticks.length - 1] < max) {
    ticks.push(ticks[ticks.length - 1] + niceStep)
  }

  return ticks
}

const getChartType = (type: string) => {
  switch (type) {
    case 'bar':
      return bar()
    case 'area':
      return area()
    case 'spline':
      return spline()
    case 'pie':
      return pie()
    case 'donut':
      return donut()
    case 'line':
    default:
      return line()
  }
}

const isPieOrDonutChart = (chartType: string): boolean => {
  return chartType === 'pie' || chartType === 'donut'
}

const AIChart: React.FC<AIChartProps> = ({ chart }) => {
  const chartOptions = useMemo<ChartOptions>(() => {
    const isPieDonut = isPieOrDonutChart(chart.chartType)

    if (isPieDonut) {
      if (
        _isEmpty(chart.data) ||
        _isEmpty(chart.data.labels) ||
        _isEmpty(chart.data.values)
      ) {
        return {}
      }

      const labels = chart.data.labels as string[]
      const values = chart.data.values as number[]

      const columns: any[] = labels.map((label, idx) => [
        label,
        values[idx] || 0,
      ])

      const colors: Record<string, string> = {}
      labels.forEach((label, idx) => {
        colors[label] = CHART_COLORS[idx % CHART_COLORS.length]
      })

      return {
        data: {
          columns,
          type: getChartType(chart.chartType),
          colors,
        },
        donut:
          chart.chartType === 'donut'
            ? {
                title: '',
                label: {
                  format: (_value: number, ratio: number) =>
                    `${(ratio * 100).toFixed(1)}%`,
                },
              }
            : undefined,
        pie:
          chart.chartType === 'pie'
            ? {
                label: {
                  format: (_value: number, ratio: number) =>
                    `${(ratio * 100).toFixed(1)}%`,
                },
              }
            : undefined,
        transition: {
          duration: 200,
        },
        resize: {
          auto: true,
        },
        legend: {
          show: true,
          position: 'right',
          item: {
            tile: {
              type: 'circle',
              width: 10,
              r: 3,
            },
          },
        },
        tooltip: {
          contents: ((
            items: any[],
            _t: any,
            _v: any,
            color: (id: string) => string,
          ) => {
            const rows = items
              .map((el: any) => {
                const ratio = typeof el.ratio === 'number' ? el.ratio : 0
                const percentage = (ratio * 100).toFixed(1)
                return `
                  <li class='flex justify-between items-center py-px leading-snug gap-4'>
                    <div class='flex items-center min-w-0 mr-4'>
                      <div class='w-2.5 h-2.5 rounded-xs mr-1.5 shrink-0' style='background-color:${color(el.id)}'></div>
                      <span class='truncate'>${escapeHtml(el.name)}</span>
                    </div>
                    <span class='font-mono whitespace-nowrap'>${formatTooltipValue(el.value)} <span class='opacity-60'>(${percentage}%)</span></span>
                  </li>`
              })
              .join('')
            return `<ul class='bg-gray-50 dark:text-gray-50 dark:bg-slate-900 rounded-md ring-1 ring-black/10 px-2 py-1 text-xs md:text-sm max-h-[250px] md:max-h-[350px] overflow-y-auto shadow-md z-50'>${rows}</ul>`
          }) as any,
        },
        padding: {
          right: 20,
        },
      }
    }

    if (_isEmpty(chart.data) || _isEmpty(chart.data.x)) {
      return {}
    }

    const xData = chart.data.x as string[]
    const seriesKeys = _filter(
      _keys(chart.data),
      (key) => key !== 'x' && key !== 'labels' && key !== 'values',
    )

    const isDateAxis = xData.length > 0 && isLikelyDate(xData[0])

    const columns: any[] = [
      [
        'x',
        ..._map(xData, (el) => {
          if (!isDateAxis) return el
          const d = dayjs(el)
          if (d.isValid()) return d.toDate()
          const parsed = new Date(el)
          return Number.isNaN(parsed.getTime()) ? el : parsed
        }),
      ],
    ]

    const types: Record<
      string,
      ReturnType<typeof line | typeof bar | typeof area | typeof spline>
    > = {}
    const colors: Record<string, string> = {}

    seriesKeys.forEach((key, idx) => {
      columns.push([key, ...chart.data[key]!])
      types[key] = getChartType(chart.chartType) as any
      colors[key] = CHART_COLORS[idx % CHART_COLORS.length]
    })

    const allYValues: number[] = []
    seriesKeys.forEach((key) => {
      const values = chart.data[key]
      if (Array.isArray(values)) {
        values.forEach((v) => {
          if (typeof v === 'number') {
            allYValues.push(v)
          }
        })
      }
    })

    const optimalTicks =
      allYValues.length > 0 ? calculateOptimalTicks(allYValues) : undefined

    const isBar = chart.chartType === 'bar'

    return {
      data: {
        x: 'x',
        columns,
        types,
        colors,
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
      },
      axis: {
        x: {
          type: isDateAxis ? 'timeseries' : 'category',
          clipPath: false,
          tick: {
            fit: true,
            rotate: xData.length > 10 ? 45 : 0,
            format: isDateAxis
              ? (x: Date) => {
                  const d = dayjs(x)
                  if (xData.length <= 24) {
                    return d.format('HH:mm')
                  }
                  return d.format('MMM D')
                }
              : undefined,
          },
        },
        y: {
          tick: {
            values: optimalTicks,
            format: (d: number) => {
              if (d >= 1_000_000) return `${(d / 1_000_000).toFixed(1)}M`
              if (d >= 1_000) return `${(d / 1_000).toFixed(1)}K`
              return d.toFixed(0)
            },
          },
          min: 0,
          padding: { bottom: 0 },
          inner: true,
          show: true,
        },
      },
      point: isBar
        ? {}
        : {
            focus: {
              only: xData.length > 1,
            },
            pattern: ['circle'],
            r: 4,
          },
      legend: {
        show: seriesKeys.length > 1,
        position: 'bottom',
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
      bar: {
        linearGradient: true,
        radius: {
          ratio: 0.15,
        },
      },
      tooltip: {
        contents: ((
          items: any[],
          _t: any,
          _v: any,
          color: (id: string) => string,
        ) => {
          let titleStr = ''
          if (items.length) {
            const first = items[0]
            if (first.x instanceof Date) {
              titleStr = formatTooltipDate(first.x, xData.length)
            } else {
              const idx =
                typeof first.index === 'number'
                  ? first.index
                  : typeof first.x === 'number'
                    ? first.x
                    : 0
              const original = xData[idx] ?? first.x
              titleStr = isDateAxis
                ? formatTooltipDate(original as string, xData.length)
                : String(original ?? '')
            }
          }
          const rows = items
            .map((el: any) => {
              const numVal =
                typeof el.value === 'number' ? el.value : Number(el.value) || 0
              return `
                <li class='flex justify-between items-center py-px leading-snug gap-4'>
                  <div class='flex items-center min-w-0 mr-4'>
                    <div class='w-2.5 h-2.5 rounded-xs mr-1.5 shrink-0' style='background-color:${color(el.id)}'></div>
                    <span class='truncate'>${escapeHtml(el.name)}</span>
                  </div>
                  <span class='font-mono whitespace-nowrap'>${formatTooltipValue(numVal)}</span>
                </li>`
            })
            .join('')
          return `<ul class='bg-gray-50 dark:text-gray-50 dark:bg-slate-900 rounded-md ring-1 ring-black/10 px-2 py-1 text-xs md:text-sm max-h-[250px] md:max-h-[350px] overflow-y-auto shadow-md z-50'>
              <li class='font-semibold pb-1 mb-1 border-b border-gray-200 dark:border-slate-800'>${escapeHtml(titleStr)}</li>
              ${rows}
            </ul>`
        }) as any,
      },
      padding: {
        right: 20,
      },
    }
  }, [chart])

  const isPieDonut = isPieOrDonutChart(chart.chartType)

  if (isPieDonut) {
    if (
      _isEmpty(chart.data) ||
      _isEmpty(chart.data.labels) ||
      _isEmpty(chart.data.values)
    ) {
      return null
    }
  } else {
    if (_isEmpty(chart.data) || _isEmpty(chart.data.x)) {
      return null
    }
  }

  return (
    <div className='ai-chart rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900'>
      {chart.title ? (
        <h4 className='mb-2 text-sm font-medium text-gray-700 dark:text-gray-300'>
          {chart.title}
        </h4>
      ) : null}
      <div className={isPieDonut ? 'h-[280px] w-full' : 'h-[220px] w-full'}>
        <BillboardChart options={chartOptions} className='h-full w-full' />
      </div>
    </div>
  )
}

// Memoize to prevent re-renders during streaming when chart data hasn't changed
export default memo(AIChart, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.chart) === JSON.stringify(nextProps.chart)
})
