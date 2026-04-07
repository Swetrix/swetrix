import type { ChartOptions } from 'billboard.js'
import { area, donut, scatter } from 'billboard.js'
import * as d3 from 'd3'
import _round from 'lodash/round'
import type { TFunction } from 'i18next'

import { escapeHtml, nFormatter } from '~/utils/generic'
import type { DateSeriesEntry, SEOMetricKey } from './seo-utils'

export function buildMainChartOptions(
  series: DateSeriesEntry[],
  activeMetrics: Record<SEOMetricKey, boolean>,
  timeBucket: string,
  t: TFunction,
): ChartOptions {
  if (!series.length) return {}

  const dates = series.map((d) => d.date)
  const columns: any[] = [['x', ...dates]]
  const colors: Record<string, string> = {}
  const axes: Record<string, string> = {}
  let needsY2 = false

  if (activeMetrics.clicks) {
    const label = t('project.seo.clicks')
    columns.push([label, ...series.map((d) => d.clicks)])
    colors[label] = '#3b82f6'
  }

  if (activeMetrics.impressions) {
    const label = t('project.seo.impressions')
    columns.push([label, ...series.map((d) => d.impressions)])
    colors[label] = '#5b21b6'
    if (activeMetrics.clicks) {
      axes[label] = 'y2'
      needsY2 = true
    }
  }

  if (activeMetrics.position) {
    const label = t('project.seo.avgPosition')
    columns.push([label, ...series.map((d) => d.position)])
    colors[label] = '#d97706'
    if (activeMetrics.clicks || activeMetrics.impressions) {
      axes[label] = 'y2'
      needsY2 = true
    }
  }

  if (activeMetrics.ctr) {
    const label = t('project.seo.avgCTR')
    columns.push([label, ...series.map((d) => d.ctr)])
    colors[label] = '#0d9488'
    if (activeMetrics.clicks || activeMetrics.impressions) {
      axes[label] = 'y2'
      needsY2 = true
    }
  }

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
      type: area(),
      axes,
      colors,
    },
    area: {
      linearGradient: true,
    },
    transition: {
      duration: 200,
    },
    resize: {
      auto: true,
      timer: false,
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
    },
    tooltip: {
      contents: (items, _defaultTitleFormat, _defaultValueFormat, color) => {
        const tooltipFormatMap: Record<string, string> = {
          hour: '%b %d, %Y %H:%M',
          day: '%b %d, %Y',
          week: 'Week of %b %d, %Y',
          month: '%B %Y',
          quarter: '%B %Y',
          year: '%Y',
        }
        const tooltipFmt = tooltipFormatMap[timeBucket] || '%b %d, %Y'
        const headerLabel = d3.timeFormat(tooltipFmt)(items[0].x)
        return `<ul class='bg-gray-50 dark:text-gray-50 dark:bg-slate-900 rounded-md ring-1 ring-black/10 px-2 py-1 text-xs md:text-sm max-h-[250px] md:max-h-[350px] overflow-y-auto shadow-md z-50'>
            <li class='font-semibold pb-1 mb-1 border-b border-gray-200 dark:border-slate-800 sticky top-0 bg-gray-50 dark:bg-slate-900'>${headerLabel}</li>
            ${items
              .map((el: any) => {
                const isCtr = el.name === t('project.seo.avgCTR')
                const isPos = el.name === t('project.seo.avgPosition')
                let formatted = nFormatter(el.value, 1)
                if (isCtr) formatted = `${Number(el.value).toFixed(1)}%`
                else if (isPos) formatted = Number(el.value).toFixed(1)

                return `
            <li class='flex justify-between items-center py-px leading-snug'>
              <div class='flex items-center min-w-0 mr-4'>
                <div class='w-2.5 h-2.5 rounded-xs mr-1.5 shrink-0' style=background-color:${color(el.id)}></div>
                <span class="truncate">${el.name}</span>
              </div>
              <span class='font-mono whitespace-nowrap'>${formatted}</span>
            </li>`
              })
              .join('')}
          </ul>`
      },
    },
    padding: { right: needsY2 ? 20 : undefined },
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
      format: {
        value: (value: number, ratio: number) => {
          const pct = (ratio * 100).toFixed(1)
          return `${nFormatter(value, 1)} (${pct}%)`
        },
      },
    },
    size: {
      height: 180,
    },
  }
}
