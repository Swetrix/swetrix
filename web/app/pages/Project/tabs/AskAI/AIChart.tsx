import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from '@headlessui/react'
import type { Chart, ChartOptions } from 'billboard.js'
import { line, area, bar, spline, pie, donut } from 'billboard.js'
import {
  ArrowSquareOutIcon,
  ChartBarIcon,
  ChartDonutIcon,
  ChartLineIcon,
  ChartPieIcon,
  CopyIcon,
  DownloadSimpleIcon,
  FileCsvIcon,
} from '@phosphor-icons/react'
import dayjs from 'dayjs'
import _filter from 'lodash/filter'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import React, {
  Fragment,
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import BillboardChart from '~/ui/BillboardChart'
import { cn } from '~/utils/generic'

const VALID_LINK_TABS = new Set([
  'traffic',
  'performance',
  'errors',
  'sessions',
  'funnels',
  'goals',
  'experiments',
  'featureFlags',
  'captcha',
  'profiles',
])

const VALID_LINK_PERIODS = new Set([
  '1h',
  'today',
  'yesterday',
  '1d',
  '7d',
  '4w',
  '3M',
  '12M',
  '24M',
  'all',
])

const VALID_LINK_FILTER_COLUMNS = new Set([
  'pg',
  'cc',
  'rg',
  'ct',
  'br',
  'os',
  'dv',
  'ref',
  'so',
  'me',
  'ca',
  'te',
  'co',
  'lc',
  'host',
])

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

interface AIChartLink {
  tab: string
  period?: string
  from?: string
  to?: string
  filters?: Array<{
    column: string
    filter: string
    isExclusive?: boolean
    isContains?: boolean
  }>
}

interface AIChartAnnotation {
  x: string
  label?: string
  kind?: 'spike' | 'dip'
}

type AIChartType = 'line' | 'bar' | 'area' | 'spline' | 'pie' | 'donut'

interface AIChartData {
  type: 'chart'
  chartType: AIChartType
  title?: string
  data: {
    x?: string[]
    labels?: string[]
    values?: number[]
    [key: string]: number[] | string[] | undefined
  }
  annotations?: AIChartAnnotation[]
  link?: AIChartLink
}

const TIME_SERIES_TYPES: AIChartType[] = ['line', 'area', 'spline', 'bar']
const CATEGORICAL_TYPES: AIChartType[] = ['pie', 'donut']

const ANNOTATION_LABEL_MAX = 40

const buildAnnotationLines = (
  annotations: AIChartAnnotation[] | undefined,
  xData: string[],
): Array<{ value: Date; text: string; class: string; position: 'middle' }> => {
  if (!Array.isArray(annotations) || annotations.length === 0) return []

  const xValueSet = new Set(xData)

  return annotations
    .filter(
      (a): a is AIChartAnnotation =>
        !!a && typeof a === 'object' && typeof a.x === 'string',
    )
    .map((a) => {
      const matchesX = xValueSet.has(a.x)
      const parsed = dayjs(a.x)
      if (!matchesX && !parsed.isValid()) return null

      const date = parsed.isValid() ? parsed.toDate() : new Date(a.x)
      if (Number.isNaN(date.getTime())) return null

      const kind = a.kind === 'dip' ? 'dip' : 'spike'
      const rawLabel = typeof a.label === 'string' ? a.label.trim() : ''
      const text =
        rawLabel.length > ANNOTATION_LABEL_MAX
          ? `${rawLabel.slice(0, ANNOTATION_LABEL_MAX - 1)}…`
          : rawLabel

      return {
        value: date,
        text,
        class:
          kind === 'spike'
            ? 'annotation-line annotation-spike'
            : 'annotation-line annotation-dip',
        position: 'middle' as const,
      }
    })
    .filter(
      (
        x,
      ): x is {
        value: Date
        text: string
        class: string
        position: 'middle'
      } => x !== null,
    )
    .slice(0, 3)
}

interface AIChartProps {
  chart: AIChartData
  projectId?: string
}

const buildDashboardUrl = (
  projectId: string,
  link: AIChartLink,
): string | null => {
  if (!VALID_LINK_TABS.has(link.tab)) return null

  const params = new URLSearchParams()
  params.set('tab', link.tab)

  const hasCustomRange =
    typeof link.from === 'string' &&
    ISO_DATE_PATTERN.test(link.from) &&
    typeof link.to === 'string' &&
    ISO_DATE_PATTERN.test(link.to)

  if (hasCustomRange) {
    params.set('period', 'custom')
    params.set('from', link.from!)
    params.set('to', link.to!)
  } else if (link.period && VALID_LINK_PERIODS.has(link.period)) {
    params.set('period', link.period)
  }

  if (Array.isArray(link.filters)) {
    for (const f of link.filters) {
      if (
        !f ||
        typeof f.column !== 'string' ||
        typeof f.filter !== 'string' ||
        !VALID_LINK_FILTER_COLUMNS.has(f.column)
      ) {
        continue
      }
      // Match the dashboard's URL convention from parseFilters():
      //   `!` => exclusive, `~` => contains, `^` => exclusive + contains
      let prefix = ''
      if (f.isExclusive && f.isContains) prefix = '^'
      else if (f.isExclusive) prefix = '!'
      else if (f.isContains) prefix = '~'
      params.append(`${prefix}${f.column}`, f.filter)
    }
  }

  return `/projects/${projectId}?${params.toString()}`
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

const slugify = (str: string): string => {
  const slug = str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'chart'
}

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke on next tick so the download has time to kick off
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

const escapeCsvCell = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

const buildCsvFromChart = (
  chart: AIChartData,
  displayType: AIChartType,
): string => {
  const lines: string[] = []
  if (isPieOrDonutChart(displayType)) {
    const labels = (chart.data.labels as string[]) || []
    const values = (chart.data.values as number[]) || []
    lines.push(['label', 'value'].map(escapeCsvCell).join(','))
    labels.forEach((label, idx) => {
      lines.push(
        [escapeCsvCell(label), escapeCsvCell(values[idx] ?? '')].join(','),
      )
    })
  } else {
    const xData = (chart.data.x as string[]) || []
    const seriesKeys = _filter(
      _keys(chart.data),
      (key) => key !== 'x' && key !== 'labels' && key !== 'values',
    )
    lines.push(['x', ...seriesKeys].map(escapeCsvCell).join(','))
    xData.forEach((xVal, idx) => {
      const row = [
        escapeCsvCell(xVal),
        ...seriesKeys.map((key) => {
          const series = chart.data[key]
          return escapeCsvCell(Array.isArray(series) ? series[idx] : '')
        }),
      ]
      lines.push(row.join(','))
    })
  }
  return lines.join('\n')
}

// Subset of CSS properties that meaningfully affect rendered SVG output.
// Inlining everything from getComputedStyle bloats the file and can break
// gradient/marker references, so we cherry-pick the visual ones.
const SVG_STYLE_PROPS = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'stroke-miterlimit',
  'opacity',
  'visibility',
  'display',
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-anchor',
  'dominant-baseline',
  'shape-rendering',
  'paint-order',
] as const

// Walk source + cloned trees in lockstep and copy the resolved styles onto the
// clone so the rasterised SVG matches what the browser draws.
const inlineComputedStyles = (source: SVGElement, target: SVGElement) => {
  const sourceNodes: Element[] = [
    source,
    ...Array.from(source.querySelectorAll('*')),
  ]
  const targetNodes: Element[] = [
    target,
    ...Array.from(target.querySelectorAll('*')),
  ]

  const len = Math.min(sourceNodes.length, targetNodes.length)
  for (let i = 0; i < len; i++) {
    const computed = window.getComputedStyle(sourceNodes[i])
    let styleStr = ''
    for (const prop of SVG_STYLE_PROPS) {
      const value = computed.getPropertyValue(prop)
      if (!value) continue
      styleStr += `${prop}:${value};`
    }
    if (styleStr) {
      const existing =
        (targetNodes[i] as HTMLElement).getAttribute('style') || ''
      ;(targetNodes[i] as HTMLElement).setAttribute(
        'style',
        `${styleStr}${existing}`,
      )
    }
  }
}

// Billboard renders to SVG with styles applied via stylesheets; we inline the
// computed styles, capture the bounding box, then rasterise via Image →
// Canvas → PNG blob.
const exportChartAsPng = async (
  container: HTMLElement,
  filename: string,
): Promise<void> => {
  const svg = container.querySelector('svg')
  if (!svg) throw new Error('svg not found')

  const rect = svg.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))

  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`)
  }

  inlineComputedStyles(svg, clone)

  const svgString = new XMLSerializer().serializeToString(clone)
  const svgBlob = new Blob(
    ['<?xml version="1.0" standalone="no"?>\n', svgString],
    { type: 'image/svg+xml;charset=utf-8' },
  )
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const dpr = window.devicePixelRatio || 1
          const canvas = document.createElement('canvas')
          canvas.width = width * dpr
          canvas.height = height * dpr
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('canvas context unavailable')
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.scale(dpr, dpr)
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob((pngBlob) => {
            if (!pngBlob) {
              reject(new Error('toBlob failed'))
              return
            }
            triggerBlobDownload(pngBlob, filename)
            resolve()
          }, 'image/png')
        } catch (err) {
          reject(err)
        }
      }
      img.onerror = () => reject(new Error('image load failed'))
      img.src = svgUrl
    })
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

const TYPE_ICONS: Record<
  AIChartType,
  React.ComponentType<{ className?: string }>
> = {
  line: ChartLineIcon,
  area: ChartLineIcon,
  spline: ChartLineIcon,
  bar: ChartBarIcon,
  pie: ChartPieIcon,
  donut: ChartDonutIcon,
}

const AIChart: React.FC<AIChartProps> = ({ chart, projectId }) => {
  const { t } = useTranslation('common')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [displayType, setDisplayType] = useState<AIChartType>(chart.chartType)
  const [chartReady, setChartReady] = useState(false)

  const handleChartReady = useCallback((instance: Chart | null) => {
    setChartReady(instance !== null)
  }, [])

  const dashboardHref = useMemo(() => {
    if (!projectId || !chart.link) return null
    return buildDashboardUrl(projectId, chart.link)
  }, [projectId, chart.link])

  const isPieDonutData =
    !_isEmpty(chart.data.labels) && !_isEmpty(chart.data.values)
  const isTimeSeriesData = !_isEmpty(chart.data.x)

  const compatibleTypes = useMemo<AIChartType[]>(() => {
    if (isPieDonutData) {
      const labels = (chart.data.labels as string[]) || []
      if (labels.length <= 1) return [displayType]
      return CATEGORICAL_TYPES
    }
    if (isTimeSeriesData) {
      return TIME_SERIES_TYPES
    }
    return [displayType]
  }, [chart.data.labels, displayType, isPieDonutData, isTimeSeriesData])

  const chartOptions = useMemo<ChartOptions>(() => {
    const isPieDonut = isPieOrDonutChart(displayType)

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
          type: getChartType(displayType),
          colors,
        },
        donut:
          displayType === 'donut'
            ? {
                title: '',
                label: {
                  format: (_value: number, ratio: number) =>
                    `${(ratio * 100).toFixed(1)}%`,
                },
              }
            : undefined,
        pie:
          displayType === 'pie'
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
      types[key] = getChartType(displayType) as any
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

    const isBar = displayType === 'bar'

    const annotationLines = isDateAxis
      ? buildAnnotationLines(chart.annotations, xData)
      : []

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
        ...(annotationLines.length > 0
          ? { x: { lines: annotationLines } }
          : {}),
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
  }, [chart, displayType])

  const filenameBase = useMemo(
    () => slugify(chart.title || 'chart'),
    [chart.title],
  )

  const handleDownloadPng = useCallback(async () => {
    if (!containerRef.current || !chartReady) return
    try {
      await exportChartAsPng(containerRef.current, `${filenameBase}.png`)
    } catch {
      // swallow – download failed, nothing actionable to show
    }
  }, [chartReady, filenameBase])

  const handleDownloadCsv = useCallback(() => {
    const csv = buildCsvFromChart(chart, displayType)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    triggerBlobDownload(blob, `${filenameBase}.csv`)
  }, [chart, displayType, filenameBase])

  const handleCopyData = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(chart.data, null, 2))
      toast.success(t('project.askAi.chart.dataCopied'))
    } catch {
      // ignore clipboard errors
    }
  }, [chart.data, t])

  const isPieDonut = isPieOrDonutChart(displayType)

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

  const canChangeType = compatibleTypes.length > 1
  const openInDashboardLabel = t('project.askAi.openInDashboard')

  const toolbarButtonClass =
    'flex h-7 w-7 items-center justify-center rounded-md text-gray-500 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm ring-1 ring-gray-200/80 dark:ring-slate-800/80 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white/80 dark:disabled:hover:bg-slate-900/80'

  const toolbar = (
    <div className='absolute top-3 right-3 z-10 flex items-center gap-1 opacity-0 transition-opacity group-hover/chart:opacity-100 focus-within:opacity-100'>
      {canChangeType ? (
        <Menu as='div' className='relative'>
          {({ open }) => (
            <>
              <MenuButton
                className={toolbarButtonClass}
                title={t('project.askAi.chart.changeType')}
                aria-label={t('project.askAi.chart.changeType')}
              >
                <ChartLineIcon className='h-4 w-4' />
              </MenuButton>
              <Transition
                show={open}
                as={Fragment}
                enter='transition ease-out duration-100'
                enterFrom='transform opacity-0 scale-95'
                enterTo='transform opacity-100 scale-100'
                leave='transition ease-in duration-75'
                leaveFrom='transform opacity-100 scale-100'
                leaveTo='transform opacity-0 scale-95'
              >
                <MenuItems
                  anchor={{ to: 'bottom end', offset: 6 }}
                  modal={false}
                  className='z-50 w-36 rounded-md bg-white p-1 ring-1 ring-gray-200 focus:outline-hidden dark:bg-slate-900 dark:ring-slate-800'
                >
                  {compatibleTypes.map((typeOption) => {
                    const Icon = TYPE_ICONS[typeOption]
                    const active = typeOption === displayType
                    return (
                      <MenuItem key={typeOption}>
                        <button
                          type='button'
                          onClick={() => setDisplayType(typeOption)}
                          className={cn(
                            'flex w-full cursor-pointer items-center gap-2 rounded-md p-2 text-sm transition-colors',
                            active
                              ? 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-white'
                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-50 dark:hover:bg-slate-800',
                          )}
                        >
                          <Icon className='h-4 w-4' />
                          <span>
                            {t(`project.askAi.chart.types.${typeOption}`)}
                          </span>
                        </button>
                      </MenuItem>
                    )
                  })}
                </MenuItems>
              </Transition>
            </>
          )}
        </Menu>
      ) : null}
      <button
        type='button'
        onClick={handleDownloadPng}
        disabled={!chartReady}
        className={toolbarButtonClass}
        title={t('project.askAi.chart.downloadPng')}
        aria-label={t('project.askAi.chart.downloadPng')}
      >
        <DownloadSimpleIcon className='h-4 w-4' />
      </button>
      <button
        type='button'
        onClick={handleDownloadCsv}
        className={toolbarButtonClass}
        title={t('project.askAi.chart.downloadCsv')}
        aria-label={t('project.askAi.chart.downloadCsv')}
      >
        <FileCsvIcon className='h-4 w-4' />
      </button>
      <button
        type='button'
        onClick={handleCopyData}
        className={toolbarButtonClass}
        title={t('project.askAi.chart.copyData')}
        aria-label={t('project.askAi.chart.copyData')}
      >
        <CopyIcon className='h-4 w-4' />
      </button>
      {dashboardHref ? (
        <a
          href={dashboardHref}
          target='_blank'
          rel='noopener noreferrer'
          className={toolbarButtonClass}
          title={openInDashboardLabel}
          aria-label={openInDashboardLabel}
        >
          <ArrowSquareOutIcon className='h-4 w-4' />
        </a>
      ) : null}
    </div>
  )

  const cardClassName = cn(
    'ai-chart group/chart relative block rounded-lg border border-gray-200 bg-white p-4 transition-colors dark:border-slate-800 dark:bg-slate-900',
  )

  const titleNode = chart.title ? (
    <h4 className='mb-2 pr-36 text-sm font-medium text-gray-700 dark:text-gray-300'>
      {chart.title}
    </h4>
  ) : null

  return (
    <div className={cardClassName}>
      {toolbar}
      {titleNode}
      <div
        ref={containerRef}
        className={isPieDonut ? 'h-[280px] w-full' : 'h-[220px] w-full'}
      >
        <BillboardChart
          options={chartOptions}
          className='h-full w-full'
          onReady={handleChartReady}
        />
      </div>
    </div>
  )
}

// Memoize to prevent re-renders during streaming when chart data hasn't changed
export default memo(AIChart, (prevProps, nextProps) => {
  return (
    prevProps.projectId === nextProps.projectId &&
    JSON.stringify(prevProps.chart) === JSON.stringify(nextProps.chart)
  )
})
