import type { ChartOptions } from 'billboard.js'
import { area, line } from 'billboard.js'
import type { TFunction } from 'i18next'

import type { AdsChart } from '~/api/api.server'
import { nFormatter } from '~/utils/generic'
import { formatCurrencyAmount } from '~/lib/pricing/format'

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
      types: {
        cost: area(),
        clicks: line(),
        sessions: line(),
      },
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
      duration: 200,
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
  }
}
