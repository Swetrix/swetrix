import type { ChartOptions } from 'billboard.js'
import { area, bar, donut, line, scatter } from 'billboard.js'
import * as d3 from 'd3'
import _round from 'lodash/round'
import type { TFunction } from 'i18next'

import { escapeHtml, nFormatter } from '~/utils/generic'
import {
  SEO_IMPRESSION_POSITION_BUCKETS,
  SEO_METRICS,
  SEO_ORGANIC_POSITION_BUCKETS,
  type DateSeriesEntry,
  type ImpressionsByPositionEntry,
  type OrganicPositionEntry,
  type SEOMetricKey,
} from './seo-utils'

const SEO_MAIN_METRIC_COLORS: Record<SEOMetricKey, string> = {
  clicks: '#2563eb',
  impressions: '#7c3aed',
  position: '#d97706',
  ctr: '#0d9488',
}

const SEO_MAIN_METRIC_COMPARE_COLORS: Record<SEOMetricKey, string> = {
  clicks: 'rgba(37, 99, 235, 0.4)',
  impressions: 'rgba(124, 58, 237, 0.4)',
  position: 'rgba(217, 119, 6, 0.4)',
  ctr: 'rgba(13, 148, 136, 0.4)',
}

const formatSEOMetricValue = (metric: SEOMetricKey, value: number) => {
  if (metric === SEO_METRICS.ctr) {
    return `${Number(value).toFixed(1)}%`
  }

  if (metric === SEO_METRICS.position) {
    return Number(value).toFixed(1)
  }

  return nFormatter(value, 1)
}

const getSEOMetricValue = (entry: DateSeriesEntry, metric: SEOMetricKey) => {
  return entry[metric] ?? 0
}

export function buildMainChartOptions(
  series: DateSeriesEntry[],
  activeMetrics: Record<SEOMetricKey, boolean>,
  timeBucket: string,
  t: TFunction,
  compareSeries?: DateSeriesEntry[],
): ChartOptions {
  if (!series.length) return {}

  const dates = series.map((d) => d.date)
  const columns: any[] = [['x', ...dates]]
  const colors: Record<string, string> = {}
  const axes: Record<string, string> = {}
  const names: Record<string, string> = {}
  const types: Record<string, any> = {}
  const compareIds: string[] = []
  let needsY2 = false
  const hasCompareSeries = !!compareSeries?.length
  const metricLabels: Record<SEOMetricKey, string> = {
    clicks: t('project.seo.clicks'),
    impressions: t('project.seo.impressions'),
    position: t('project.seo.avgPosition'),
    ctr: t('project.seo.avgCTR'),
  }

  const metricUsesSecondaryAxis = (metric: SEOMetricKey) => {
    if (metric === SEO_METRICS.impressions) {
      return activeMetrics.clicks
    }

    if (metric === SEO_METRICS.position || metric === SEO_METRICS.ctr) {
      return activeMetrics.clicks || activeMetrics.impressions
    }

    return false
  }

  const metricKeys = Object.keys(SEO_METRICS) as SEOMetricKey[]

  metricKeys.forEach((metric: SEOMetricKey) => {
    if (!activeMetrics[metric]) return

    const compareId = `${metric}Compare`
    const usesY2 = metricUsesSecondaryAxis(metric)

    columns.push([metric, ...series.map((d) => getSEOMetricValue(d, metric))])
    colors[metric] = SEO_MAIN_METRIC_COLORS[metric]
    names[metric] = metricLabels[metric]
    types[metric] = area()

    if (usesY2) {
      axes[metric] = 'y2'
      needsY2 = true
    }

    if (hasCompareSeries) {
      columns.push([
        compareId,
        ...dates.map((_, index) => {
          const entry = compareSeries?.[index]
          return entry ? getSEOMetricValue(entry, metric) : null
        }),
      ])
      colors[compareId] = SEO_MAIN_METRIC_COMPARE_COLORS[metric]
      names[compareId] = metricLabels[metric]
      types[compareId] = line()
      compareIds.push(compareId)

      if (usesY2) {
        axes[compareId] = 'y2'
      }
    }
  })

  const tickFormatMap: Record<string, string> = {
    hour: '%b %d %H:%M',
    day: '%b %d',
    week: '%b %d',
    month: '%b %Y',
    quarter: '%b %Y',
    year: '%Y',
  }
  const tickFormat = tickFormatMap[timeBucket] || '%b %d'

  return {
    data: {
      x: 'x',
      xFormat: timeBucket === 'hour' ? '%Y-%m-%d %H:%M:%S' : '%Y-%m-%d',
      columns,
      types,
      axes,
      colors,
      names,
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
          format: tickFormat,
          rotate: 0,
        },
      },
      y: {
        tick: {
          format: (d: number) => nFormatter(d, 1),
        },
        show: true,
        inner: true,
        min: 0,
        padding: { bottom: 0 },
      },
      y2: {
        show: needsY2,
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
        only: dates.length > 1,
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
      hide: compareIds,
    },
    tooltip: {
      contents: (items, _defaultTitleFormat, _defaultValueFormat, color) => {
        if (!items.length) return ''

        const tooltipFormatMap: Record<string, string> = {
          hour: '%b %d, %Y %H:%M',
          day: '%a, %d %b',
          week: 'Week of %b %d, %Y',
          month: '%B %Y',
          quarter: '%B %Y',
          year: '%Y',
        }
        const tooltipFmt = tooltipFormatMap[timeBucket] || '%b %d, %Y'
        const firstIndex = items[0].index ?? 0
        const headerLabel = d3.timeFormat(tooltipFmt)(items[0].x)
        const compareDate = hasCompareSeries
          ? compareSeries?.[firstIndex]?.date
          : null
        const parsedCompareDate = compareDate
          ? d3.timeParse('%Y-%m-%d')(compareDate)
          : null
        const compareHeaderLabel = parsedCompareDate
          ? d3.timeFormat(tooltipFmt)(parsedCompareDate)
          : ''
        const currentItems = items.filter(
          (el: any) => !String(el.id).endsWith('Compare'),
        )
        const currentSection = `<li class='font-semibold pb-1 mb-1 border-b border-gray-200 dark:border-slate-800 sticky top-0 bg-gray-50 dark:bg-slate-900'>${headerLabel}</li>
            ${currentItems
              .map((el: any) => {
                const metric = el.id as SEOMetricKey
                const formatted = formatSEOMetricValue(metric, el.value)

                return `
            <li class='flex justify-between items-center py-px leading-snug'>
              <div class='flex items-center min-w-0 mr-4'>
                <div class='w-2.5 h-2.5 rounded-xs mr-1.5 shrink-0' style=background-color:${color(el.id)}></div>
                <span class="truncate">${el.name}</span>
              </div>
              <span class='font-mono whitespace-nowrap'>${formatted}</span>
            </li>`
              })
              .join('')}`
        const compareSection = compareHeaderLabel
          ? `<li class='font-semibold pb-1 mb-1 mt-3 pt-2 border-t border-b border-gray-200 dark:border-slate-800'>${compareHeaderLabel}</li>
            ${currentItems
              .map((el: any) => {
                const metric = el.id as SEOMetricKey
                const compareValue = compareSeries?.[el.index]?.[metric]
                if (compareValue == null) return ''

                return `
            <li class='flex justify-between items-center py-px leading-snug'>
              <div class='flex items-center min-w-0 mr-4'>
                <div class='w-2.5 h-2.5 rounded-xs mr-1.5 shrink-0 opacity-60' style=background-color:${color(el.id)}></div>
                <span class="truncate opacity-75">${el.name}</span>
              </div>
              <span class='font-mono whitespace-nowrap opacity-75'>${formatSEOMetricValue(metric, compareValue)}</span>
            </li>`
              })
              .join('')}`
          : ''

        return `<ul class='bg-gray-50 dark:text-gray-50 dark:bg-slate-900 rounded-md ring-1 ring-black/10 px-2 py-1 text-xs md:text-sm max-h-[250px] md:max-h-[350px] overflow-y-auto shadow-md z-50'>
            ${currentSection}
            ${compareSection}
          </ul>`
      },
    },
    padding: { right: needsY2 ? 20 : undefined },
  }
}

export function buildImpressionsByPositionChartOptions(
  buckets: ImpressionsByPositionEntry[],
  theme: string,
  t: TFunction,
): ChartOptions {
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]))
  const labels = SEO_IMPRESSION_POSITION_BUCKETS.map(({ label }) => label)
  const values = SEO_IMPRESSION_POSITION_BUCKETS.map(
    ({ key }) => bucketMap.get(key)?.impressions ?? 0,
  )
  const seriesLabel = t('project.seo.impressions')
  const axisLabels = SEO_IMPRESSION_POSITION_BUCKETS.map(({ key, label }) => {
    const bucket = bucketMap.get(key)
    return `${label}\n${nFormatter(bucket?.impressions ?? 0, 1)} (${(bucket?.percentage ?? 0).toFixed(1)}%)`
  })
  const colors = SEO_IMPRESSION_POSITION_BUCKETS.reduce<Record<string, string>>(
    (acc, { key, label, color }) => {
      const darkColors: Record<string, string> = {
        pos1To3: '#3db7ad',
        pos4To10: '#2a9189',
        pos11To20: '#1f6f69',
        pos21Plus: '#164f4c',
      }
      acc[label] = theme === 'dark' ? darkColors[key] : color
      return acc
    },
    {},
  )

  return {
    data: {
      columns: [[seriesLabel, ...values]],
      type: bar(),
      colors: {
        [seriesLabel]: (d: any) => {
          const label = SEO_IMPRESSION_POSITION_BUCKETS[d.index]?.label
          return label ? colors[label] : colors[labels[0]]
        },
      },
    },
    axis: {
      x: {
        type: 'category',
        categories: labels,
        tick: {
          format: (index: number) => axisLabels[index] || labels[index] || '',
          multiline: true,
        },
      },
      y: {
        min: 0,
        padding: { bottom: 0 },
        tick: {
          format: (d: number) => nFormatter(d, 1),
        },
        show: true,
        inner: true,
      },
    },
    bar: {
      width: {
        ratio: 0.55,
      },
      radius: {
        ratio: 0.12,
      },
    },
    grid: {
      y: {
        show: true,
      },
    },
    legend: {
      show: false,
    },
    resize: {
      auto: true,
      timer: true,
    },
    transition: {
      duration: 200,
    },
    tooltip: {
      contents: (items) => {
        const item = items[0]
        if (!item) return ''

        const bucketDef = SEO_IMPRESSION_POSITION_BUCKETS[item.index]
        const bucket = bucketDef ? bucketMap.get(bucketDef.key) : null
        const formattedValue = `${nFormatter(bucket?.impressions ?? 0, 1)} (${(bucket?.percentage ?? 0).toFixed(1)}%)`
        const swatchColor = bucketDef ? colors[bucketDef.label] : '#14b8a6'

        return `<ul class='bg-gray-50 dark:text-gray-50 dark:bg-slate-900 rounded-md ring-1 ring-black/10 px-2 py-1 text-xs md:text-sm shadow-md z-50'>
          <li class='font-semibold pb-1 mb-1 border-b border-gray-200 dark:border-slate-800'>${bucketDef?.label ?? ''}</li>
          <li class='flex justify-between items-center py-px leading-snug'>
            <div class='flex items-center min-w-0 mr-4'>
              <div class='w-2.5 h-2.5 rounded-xs mr-1.5 shrink-0' style=background-color:${swatchColor}></div>
              <span class="truncate">${seriesLabel}</span>
            </div>
            <span class='font-mono whitespace-nowrap'>${formattedValue}</span>
          </li>
        </ul>`
      },
    },
    padding: { right: 12 },
  }
}

export function buildOrganicPositionsChartOptions(
  series: OrganicPositionEntry[],
  theme: string,
  t: TFunction,
): ChartOptions {
  const labels = SEO_ORGANIC_POSITION_BUCKETS.map(({ label }) => label)
  const columns: any[] = [
    ['x', ...series.map(({ date }) => date)],
    ...SEO_ORGANIC_POSITION_BUCKETS.map(({ key, label }) => [
      label,
      ...series.map((entry) => entry[key] ?? 0),
    ]),
  ]
  const colors = SEO_ORGANIC_POSITION_BUCKETS.reduce<Record<string, string>>(
    (acc, { key, label, color }) => {
      const darkColors: Record<string, string> = {
        pos1To3: '#b45309',
        pos4To10: '#ea580c',
        pos11To20: '#fb923c',
        pos21To50: '#64748b',
        pos51Plus: '#475569',
      }
      acc[label] = theme === 'dark' ? darkColors[key] : color
      return acc
    },
    {},
  )

  return {
    data: {
      x: 'x',
      xFormat: '%Y-%m-%d',
      columns,
      type: area(),
      groups: [labels],
      colors,
      order: null,
    },
    area: {
      linearGradient: true,
      zerobased: true,
    },
    axis: {
      x: {
        clipPath: false,
        type: 'timeseries',
        tick: {
          fit: true,
          format: '%b %d',
        },
      },
      y: {
        min: 0,
        padding: { bottom: 0 },
        tick: {
          format: (d: number) => nFormatter(d, 1),
        },
        show: true,
        inner: true,
      },
    },
    point: {
      show: false,
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
    resize: {
      auto: true,
      timer: true,
    },
    transition: {
      duration: 200,
    },
    tooltip: {
      contents: (items, _defaultTitleFormat, _defaultValueFormat, color) => {
        if (!items.length) return ''

        const headerLabel = d3.timeFormat('%a, %d %b')(items[0].x)
        const orderedItems = items.slice().reverse()
        const allPositions = orderedItems.reduce(
          (sum: number, el: any) => sum + Number(el.value || 0),
          0,
        )

        return `<ul class='bg-gray-50 dark:text-gray-50 dark:bg-slate-900 rounded-md ring-1 ring-black/10 px-2 py-1 text-xs md:text-sm max-h-[250px] md:max-h-[350px] overflow-y-auto shadow-md z-50'>
          <li class='font-semibold pb-1 mb-1 border-b border-gray-200 dark:border-slate-800 sticky top-0 bg-gray-50 dark:bg-slate-900'>${headerLabel}</li>
          <li class='flex justify-between items-center py-px leading-snug'>
            <span class='mr-4 font-semibold'>${t('project.seo.allPositions')}</span>
            <span class='font-mono whitespace-nowrap font-semibold'>${nFormatter(allPositions, 1)}</span>
          </li>
          ${orderedItems
            .map(
              (el: any) => `
          <li class='flex justify-between items-center py-px leading-snug'>
            <div class='flex items-center min-w-0 mr-4'>
              <div class='w-2.5 h-2.5 rounded-xs mr-1.5 shrink-0' style=background-color:${color(el.id)}></div>
              <span class="truncate">${escapeHtml(el.name)}</span>
            </div>
            <span class='font-mono whitespace-nowrap'>${nFormatter(el.value, 1)}</span>
          </li>`,
            )
            .join('')}
        </ul>`
      },
    },
    padding: { right: 12 },
  }
}

export interface QuadrantData {
  positions: number[]
  ctrs: number[]
  impressions: number[]
  names: string[]
  maxImp: number
  minImp: number
}

export function buildQuadrantChartOptions(
  qd: QuadrantData,
  avgCtr: number,
  avgPos: number,
  theme: string,
  t: TFunction,
): ChartOptions {
  const { positions, ctrs, impressions, names, maxImp } = qd

  return {
    data: {
      x: 'x',
      columns: [
        ['x', ...positions],
        ['CTR', ...ctrs],
      ],
      type: scatter(),
      colors: {
        CTR: theme === 'dark' ? '#818cf8' : '#6366f1',
      },
    },
    axis: {
      x: {
        min: 0,
        label: {
          text: t('project.seo.avgPosition'),
          position: 'outer-center',
        },
        tick: {
          fit: false,
          format: (d: number) => Number(d).toFixed(0),
        },
      },
      y: {
        min: 0,
        max: 100,
        padding: { top: 0, bottom: 0 },
        label: { text: t('project.seo.avgCTR'), position: 'outer-middle' },
        tick: {
          format: (d: number) => `${d}%`,
        },
      },
    },
    point: {
      r: (d: any) => {
        if (!d || d.index === undefined) return 4
        const imp = impressions[d.index]
        if (!imp) return 4
        return 4 + 16 * Math.sqrt(imp / maxImp)
      },
    },
    grid: {
      x: {
        lines: [
          {
            value: avgPos,
            text: `${t('project.seo.avgPosition')}: ${avgPos.toFixed(1)}`,
            position: 'start',
            class: 'annotation-line',
          },
        ],
      },
      y: {
        lines: [
          {
            value: avgCtr,
            text: `${t('project.seo.avgCTR')}: ${avgCtr.toFixed(1)}%`,
            position: 'start',
            class: 'annotation-line',
          },
        ],
      },
    },
    tooltip: {
      contents: (items: any) => {
        const d = items[0]
        const name = names[d.index]
        const imp = impressions[d.index]

        return `<ul class='bg-gray-50 dark:text-gray-50 dark:bg-slate-900 rounded-md ring-1 ring-black/10 px-2 py-1 text-xs md:text-sm shadow-md z-50'>
            <li class='font-semibold pb-1 mb-1 border-b border-gray-200 dark:border-slate-800 break-all'>${escapeHtml(name ?? '')}</li>
            <li class='flex justify-between items-center py-px leading-snug'>
              <span class='mr-4'>${t('project.seo.position')}:</span>
              <span class='font-mono whitespace-nowrap'>${d.x.toFixed(1)}</span>
            </li>
            <li class='flex justify-between items-center py-px leading-snug'>
              <span class='mr-4'>${t('project.seo.ctr')}:</span>
              <span class='font-mono whitespace-nowrap'>${d.value.toFixed(1)}%</span>
            </li>
            <li class='flex justify-between items-center py-px leading-snug'>
              <span class='mr-4'>${t('project.seo.impressions')}:</span>
              <span class='font-mono whitespace-nowrap'>${nFormatter(imp, 1)}</span>
            </li>
          </ul>`
      },
    },
    legend: {
      show: false,
    },
    transition: {
      duration: 200,
    },
  }
}

export function buildDonutChartOptions(
  branded: number,
  nonBranded: number,
  theme: string,
  t: TFunction,
): ChartOptions {
  const total = branded + nonBranded
  if (total === 0) return {}

  const brandedLabel = t('project.seo.branded')
  const nonBrandedLabel = t('project.seo.nonBranded')

  return {
    data: {
      columns: [
        [brandedLabel, branded],
        [nonBrandedLabel, nonBranded],
      ],
      type: donut(),
      colors: {
        [brandedLabel]: theme === 'dark' ? '#818cf8' : '#6366f1',
        [nonBrandedLabel]: theme === 'dark' ? '#475569' : '#94a3b8',
      },
    },
    donut: {
      title: `${total > 0 ? _round((branded / total) * 100, 0) : 0}%`,
      label: {
        show: false,
      },
      width: 16,
    },
    transition: { duration: 200 },
    resize: { auto: true },
    legend: {
      show: true,
      position: 'bottom',
      item: {
        tile: { type: 'circle', width: 8, r: 4 },
      },
    },
    tooltip: {
      contents: (items, _defaultTitleFormat, _defaultValueFormat, color) => {
        if (!items.length) return ''

        return `<ul class='bg-gray-50 dark:text-gray-50 dark:bg-slate-900 rounded-md ring-1 ring-black/10 px-2 py-1 text-xs md:text-sm shadow-md z-50'>
          <li class='font-semibold pb-1 mb-1 border-b border-gray-200 dark:border-slate-800'>${t('project.seo.brandedTraffic')}</li>
          ${items
            .map((el: any) => {
              const pct = total > 0 ? (Number(el.value || 0) / total) * 100 : 0

              return `
          <li class='flex justify-between items-center py-px leading-snug'>
            <div class='flex items-center min-w-0 mr-4'>
              <div class='w-2.5 h-2.5 rounded-xs mr-1.5 shrink-0' style=background-color:${color(el.id)}></div>
              <span class="truncate">${escapeHtml(el.name)}</span>
            </div>
            <span class='font-mono whitespace-nowrap'>${nFormatter(el.value, 1)} (${pct.toFixed(1)}%)</span>
          </li>`
            })
            .join('')}
        </ul>`
      },
    },
    size: {
      height: 180,
    },
  }
}
