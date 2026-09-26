import type { ChartOptions } from 'billboard.js'
import { area } from 'billboard.js'
import { timeFormat } from 'd3'
import type { TFunction } from 'i18next'

import type { AdsChart } from '~/api/api.server'
import { escapeHtml, nFormatter } from '~/utils/generic'
import { formatCurrencyAmount } from '~/lib/pricing/format'
import { calculateOptimalTicks } from '~/pages/Project/View/ViewProject.helpers'

const ADS_METRIC_COLORS = {
  cost: '#f97316',
  clicks: '#2563eb',
  sessions: '#0d9488',
}

export function buildAdsChartOptions(
  chart: AdsChart,
  timeBucket: string,
  currency: string,
  language: string,
  t: TFunction,
): ChartOptions {
  if (!chart.x.length) return {}

  const xFormatMap: Record<string, string> = {
    day: '%Y-%m-%d',
    month: '%Y-%m',
    year: '%Y',
  }
  const tickFormatMap: Record<string, string> = {
    day: '%b %d',
    month: '%b %Y',
    year: '%Y',
  }

  return {
    data: {
      x: 'x',
      xFormat: xFormatMap[timeBucket] || '%Y-%m-%d',
      columns: [
        ['x', ...chart.x],
        ['cost', ...chart.cost],
        ['clicks', ...chart.clicks],
        ['sessions', ...chart.sessions],
      ],
      type: area(),
      colors: ADS_METRIC_COLORS,
      names: {
        cost: t('project.ads.spend'),
        clicks: t('project.ads.clicks'),
        sessions: t('project.ads.adSessions'),
      },
      axes: {
        clicks: 'y2',
        sessions: 'y2',
      },
    },
    area: {
      linearGradient: true,
    },
    transition: {
      duration: 0,
    },
    resize: {
      auto: true,
      timer: true,
    },
    axis: {
      x: {
        clipPath: false,
        type: 'timeseries',
        tick: {
          fit: true,
          format: tickFormatMap[timeBucket] || '%b %d',
          rotate: 0,
        },
      },
      y: {
        tick: {
          format: (d: number) => formatCurrencyAmount(d, currency, language),
          values: calculateOptimalTicks(chart.cost),
        },
        show: true,
        inner: true,
        min: 0,
        padding: { bottom: 0 },
      },
      y2: {
        show: true,
        tick: {
          format: (d: number) => nFormatter(d, 1),
          values: calculateOptimalTicks([...chart.clicks, ...chart.sessions]),
        },
        inner: true,
        min: 0,
        padding: { bottom: 0 },
      },
    },
    point: {
      focus: {
        only: chart.x.length > 1,
      },
      pattern: ['circle'],
      r: 2,
    },
    grid: {
      y: {
        show: true,
      },
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
    tooltip: {
      contents: (items, _defaultTitleFormat, _defaultValueFormat, color) => {
        if (!items.length) return ''

        const tooltipFormat =
          timeBucket === 'year'
            ? '%Y'
            : timeBucket === 'month'
              ? '%B %Y'
              : '%a, %d %b'

        return `<ul class='bg-gray-50 dark:text-gray-50 dark:bg-slate-900 rounded-md ring-1 ring-black/10 px-2 py-1 text-xs md:text-sm max-h-[250px] md:max-h-[350px] overflow-y-auto shadow-md z-50'>
          <li class='font-semibold pb-1 mb-1 border-b border-gray-200 dark:border-slate-800 sticky top-0 bg-gray-50 dark:bg-slate-900'>${timeFormat(tooltipFormat)(items[0].x)}</li>
          ${items
            .map((item) => {
              const value =
                item.id === 'cost'
                  ? formatCurrencyAmount(Number(item.value), currency, language)
                  : nFormatter(Number(item.value), 1)

              return `<li class='flex justify-between items-center py-px leading-snug'>
                <div class='flex items-center min-w-0 mr-4'>
                  <div class='w-2.5 h-2.5 rounded-xs mr-1.5 shrink-0' style='background-color:${color(item.id)}'></div>
                  <span class='truncate'>${escapeHtml(String(item.name))}</span>
                </div>
                <span class='font-mono whitespace-nowrap'>${escapeHtml(value)}</span>
              </li>`
            })
            .join('')}
        </ul>`
      },
    },
    padding: { right: 20 },
  }
}
