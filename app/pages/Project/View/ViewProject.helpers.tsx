import React from 'react'
import type { ChartOptions, GridLineOptions } from 'billboard.js'
import type i18next from 'i18next'
// @ts-ignore
import { saveAs } from 'file-saver'
import {
  GlobeEuropeAfricaIcon,
  LanguageIcon,
  DocumentTextIcon,
  DeviceTabletIcon,
  ArrowRightCircleIcon,
  MagnifyingGlassIcon,
  ServerIcon,
} from '@heroicons/react/24/outline'
// @ts-ignore
import dayjs from 'dayjs'
import { area, areaSpline, spline, bar, line } from 'billboard.js'
import _forEach from 'lodash/forEach'
import _map from 'lodash/map'
import _split from 'lodash/split'
import _replace from 'lodash/replace'
import _isEmpty from 'lodash/isEmpty'
import _startsWith from 'lodash/startsWith'
import _keys from 'lodash/keys'
import _size from 'lodash/size'
import _round from 'lodash/round'
import _fill from 'lodash/fill'
import _reduce from 'lodash/reduce'
import _last from 'lodash/last'
import _toNumber from 'lodash/toNumber'
import _toString from 'lodash/toString'
import _includes from 'lodash/includes'
import JSZip from 'jszip'
// @ts-ignore
import * as d3 from 'd3'

import {
  TimeFormat,
  chartTypes,
  tbsFormatMapper,
  tbsFormatMapper24h,
  tbsFormatMapperTooltip,
  tbsFormatMapperTooltip24h,
  PROJECT_TABS,
  isSelfhosted,
} from 'redux/constants'
import { IEntry } from 'redux/models/IEntry'
import { getTimeFromSeconds, getStringFromTime, sumArrays, nFormatter } from 'utils/generic'
import countries from 'utils/isoCountries'
import { IAnalyticsFunnel } from 'redux/models/IProject'

const getAvg = (arr: any) => {
  const total = _reduce(arr, (acc, c) => acc + c, 0)
  return total / _size(arr)
}

const getSum = (arr: any) => {
  return _reduce(arr, (acc, c) => acc + c, 0)
}

const transformAIChartData = (data: { [key: string]: any }) => {
  const transformedData = {
    x: [],
    sdur: [],
    uniques: [],
    visits: [],
  }

  _forEach(data, (d) => {
    if (d.x) {
      transformedData.x = d.x
    }
    if (d.sdur) {
      transformedData.sdur = d.sdur
    }
    if (d.uniques) {
      transformedData.uniques = d.uniques
    }
    if (d.visits) {
      transformedData.visits = d.visits
    }
  })

  return transformedData
}

const trendline = (data: any[]): string[] => {
  const xData = _map(_fill(new Array(_size(data)), 0), (_, i) => i + 1)
  const yData = data

  const xMean = getAvg(xData)
  const yMean = getAvg(yData)

  const xMinusxMean = _map(xData, (val) => val - xMean)
  const yMinusyMean = _map(yData, (val) => val - yMean)

  const xMinusxMeanSq = _map(xMinusxMean, (val) => val ** 2)

  const xy = []
  for (let x = 0; x < _size(data); ++x) {
    xy.push(xMinusxMean[x] * yMinusyMean[x])
  }

  const xySum = getSum(xy)

  const b1 = xySum / getSum(xMinusxMeanSq)

  const b0 = yMean - b1 * xMean

  const trendData = []
  for (let x = 0; x < _size(data); ++x) {
    const y = _round(b0 + b1 * x, 2)
    if (y < 0) {
      trendData.push(_toString(0))
    } else {
      trendData.push(_toString(y))
    }
  }

  return trendData
}

const getExportFilename = (prefix: string) => {
  // turn something like 2022-03-02T19:31:00.100Z into 2022-03-02
  const date = _split(_replace(_split(new Date().toISOString(), '.')[0], /:/g, '-'), 'T')[0]
  return `${prefix}-${date}.zip`
}

const convertToCSV = (array: any[]) => {
  let str = 'name,value,percentage\r\n'

  for (let i = 0; i < _size(array); ++i) {
    let lines = ''

    _forEach(array[i], (index) => {
      if (lines !== '') lines += ','
      lines += index
    })

    str += `${lines}\r\n`
  }

  return str
}

const onCSVExportClick = (
  data: {
    data: any
    types: any
  },
  pid: string,
  tnMapping: {
    [key: string]: string
  },
  language: string,
) => {
  const { data: rowData, types } = data
  const zip = new JSZip()

  _forEach(types, (item) => {
    if (_isEmpty(rowData[item])) {
      return null
    }

    const total = _reduce(rowData[item], (acc, { count }) => acc + count, 0)

    const csvData = _map(rowData[item], (entry: IEntry) => {
      const perc = _round((entry.count / total) * 100 || 0, 2)

      if (item === 'cc') {
        const name = countries.getName(entry.name, language)
        return [`"${name}"`, entry.count, `${perc}%`]
      }

      return [`"${entry.name}"`, entry.count, `${perc}%`]
    })

    zip.file(`${tnMapping[item]}.csv`, convertToCSV(csvData))
  })

  zip.generateAsync({ type: 'blob' }).then((content) => {
    saveAs(content, getExportFilename(`swetrix-${pid}`))
  })
}

const CHART_METRICS_MAPPING = {
  unique: 'unique',
  views: 'views',
  bounce: 'bounce',
  viewsPerUnique: 'viewsPerUnique',
  trendlines: 'trendlines',
  sessionDuration: 'sessionDuration',
  customEvents: 'customEvents',
  cumulativeMode: 'cumulativeMode',
}

const ERROR_FILTERS_MAPPING = {
  showResolved: 'showResolved',
}

const FILTER_CHART_METRICS_MAPPING_FOR_COMPARE = ['bounce', 'viewsPerUnique', 'trendlines', 'customEvents']

const CHART_METRICS_MAPPING_PERF = {
  quantiles: 'quantiles',
  full: 'full',
  timing: 'timing',
  network: 'network',
  frontend: 'frontend',
  backend: 'backend',
}

const CHART_MEASURES_MAPPING_PERF = {
  // Dependent on metric
  average: 'average',
  median: 'median',
  p95: 'p95',

  // Independent measure that provides it's own metrics
  quantiles: 'quantiles',
}

// function to filter the data for the chart
const getColumns = (
  chart: {
    [key: string]: string[]
  },
  activeChartMetrics: {
    [key: string]: boolean
  },
  compareChart?: {
    [key: string]: string[]
  },
) => {
  const { views, bounce, viewsPerUnique, unique, trendlines, sessionDuration, occurrences } = activeChartMetrics

  const columns: any[] = [['x', ..._map(chart.x, (el) => dayjs(el).toDate())]]

  if (unique) {
    columns.push(['unique', ...chart.uniques])
    if (trendlines) {
      columns.push(['trendlineUnique', ...trendline(chart.uniques)])
    }

    if (compareChart?.uniques) {
      columns.push(['uniqueCompare', ...compareChart.uniques])
    }
  }

  if (occurrences) {
    columns.push(['occurrences', ...chart.occurrences])

    if (compareChart?.occurrences) {
      columns.push(['occurrencesCompare', ...compareChart.occurrences])
    }
  }

  if (views) {
    columns.push(['total', ...chart.visits])
    if (trendlines) {
      columns.push(['trendlineTotal', ...trendline(chart.visits)])
    }

    if (compareChart?.visits) {
      columns.push(['totalCompare', ...compareChart.visits])
    }
  }

  if (bounce) {
    const bounceArray = _map(chart.uniques, (el, i) => {
      return _round((_toNumber(el) * 100) / _toNumber(chart.visits[i]), 1) || 0
    })
    columns.push(['bounce', ...bounceArray])
  }

  if (viewsPerUnique) {
    const viewsPerUniqueArray = _map(chart.visits, (el, i) => {
      if (chart.uniques[i] === '0' || chart.uniques[i] === undefined) {
        return 0
      }
      return _round(_toNumber(el) / _toNumber(chart.uniques[i]), 1)
    })
    columns.push(['viewsPerUnique', ...viewsPerUniqueArray])
  }

  if (sessionDuration) {
    columns.push(['sessionDuration', ...chart.sdur])

    if (compareChart?.sdur) {
      columns.push(['sessionDurationCompare', ...compareChart.sdur])
    }
  }

  return columns
}

const getColumnsPerf = (
  chart: {
    [key: string]: string[]
  },
  activeChartMetrics: string,
  compareChart?: {
    [key: string]: string[]
  },
) => {
  const columns: any[] = [['x', ..._map(chart.x, (el) => dayjs(el).toDate())]]

  if (activeChartMetrics === CHART_METRICS_MAPPING_PERF.quantiles && chart?.p50 && chart?.p75 && chart?.p95) {
    columns.push(['p50', ...chart.p50])
    columns.push(['p75', ...chart.p75])
    columns.push(['p95', ...chart.p95])

    if (compareChart?.p50 && compareChart?.p75 && compareChart?.p95) {
      columns.push(['p50Compare', ...compareChart.p50])
      columns.push(['p75Compare', ...compareChart.p75])
      columns.push(['p95Compare', ...compareChart.p95])
    }
  }

  if (activeChartMetrics === CHART_METRICS_MAPPING_PERF.full && chart.dns) {
    columns.push(['dns', ...chart.dns])
    columns.push(['tls', ...chart.tls])
    columns.push(['conn', ...chart.conn])
    columns.push(['response', ...chart.response])
    columns.push(['render', ...chart.render])
    columns.push(['dom_load', ...chart.domLoad])
    columns.push(['ttfb', ...chart.ttfb])

    if (
      compareChart?.dns &&
      compareChart?.tls &&
      compareChart?.conn &&
      compareChart?.response &&
      compareChart?.render &&
      compareChart?.domLoad &&
      compareChart?.ttfb
    ) {
      columns.push(['dnsCompare', ...compareChart.dns])
      columns.push(['tlsCompare', ...compareChart.tls])
      columns.push(['connCompare', ...compareChart.conn])
      columns.push(['responseCompare', ...compareChart.response])
      columns.push(['renderCompare', ...compareChart.render])
      columns.push(['dom_loadCompare', ...compareChart.domLoad])
      columns.push(['ttfbCompare', ...compareChart.ttfb])
    }
  }

  if (activeChartMetrics === CHART_METRICS_MAPPING_PERF.timing && chart.ttfb) {
    columns.push(['frontend', ...sumArrays(chart.render, chart.domLoad)])
    columns.push(['network', ...sumArrays(chart.dns, chart.tls, chart.conn, chart.response)])
    columns.push(['backend', ...chart.ttfb])

    if (
      compareChart?.dns &&
      compareChart?.tls &&
      compareChart?.conn &&
      compareChart?.response &&
      compareChart?.render &&
      compareChart?.domLoad &&
      compareChart?.ttfb
    ) {
      columns.push(['frontendCompare', ...sumArrays(compareChart.render, compareChart.domLoad)])
      columns.push([
        'networkCompare',
        ...sumArrays(compareChart.dns, compareChart.tls, compareChart.conn, compareChart.response),
      ])
      columns.push(['backendCompare', ...compareChart.ttfb])
    }
  }

  if (activeChartMetrics === CHART_METRICS_MAPPING_PERF.network && chart.dns) {
    columns.push(['dns', ...chart.dns])
    columns.push(['tls', ...chart.tls])
    columns.push(['conn', ...chart.conn])
    columns.push(['response', ...chart.response])

    if (compareChart?.dns && compareChart?.tls && compareChart?.conn && compareChart?.response) {
      columns.push(['dnsCompare', ...compareChart.dns])
      columns.push(['tlsCompare', ...compareChart.tls])
      columns.push(['connCompare', ...compareChart.conn])
      columns.push(['responseCompare', ...compareChart.response])
    }
  }

  if (activeChartMetrics === CHART_METRICS_MAPPING_PERF.frontend && chart.render) {
    columns.push(['render', ...chart.render])
    columns.push(['dom_load', ...chart.domLoad])

    if (compareChart?.render && compareChart?.domLoad) {
      columns.push(['renderCompare', ...compareChart.render])
      columns.push(['dom_loadCompare', ...compareChart.domLoad])
    }
  }

  if (activeChartMetrics === CHART_METRICS_MAPPING_PERF.backend && chart.ttfb) {
    columns.push(['ttfb', ...chart.ttfb])

    if (compareChart?.ttfb) {
      columns.push(['ttfbCompare', ...compareChart.ttfb])
    }
  }

  return columns
}

const getValueForTooltipPerfomance = (
  chart: {
    [key: string]: string[]
  },
  id: string,
  index: number,
) => {
  if (id === 'p50' || id === 'p75' || id === 'p95') {
    return chart[id] ? chart[id][index] : 0
  }

  if (id === 'dns' || id === 'tls' || id === 'conn' || id === 'response' || id === 'render' || id === 'ttfb') {
    return chart[id] ? chart[id][index] : 0
  }

  if (id === 'dom_load') {
    return chart.domLoad ? chart.domLoad[index] : 0
  }

  if (id === 'frontend') {
    const sum = sumArrays(chart.render, chart.domLoad)
    return sum ? sum[index] : 0
  }

  if (id === 'network') {
    const sum = sumArrays(chart.dns, chart.tls, chart.conn, chart.response)
    return sum ? sum[index] : 0
  }

  if (id === 'backend') {
    return chart.ttfb ? chart.ttfb[index] : 0
  }

  return 0
}

const stringToColour = (str: string) => {
  let hash = 0

  // Loop through each character in the string
  for (let i = 0; i < str.length; i++) {
    // Get the ASCII code for the current character
    const charCode = str.charCodeAt(i)
    // Update the hash value using a simple algorithm
    hash = charCode + ((hash << 5) - hash)
  }

  // Initialise color value to #
  let colour = '#'

  // Generate 3-byte color code (RRGGBB)
  for (let i = 0; i < 3; i++) {
    // Get the next 8 bits of the hash value
    const value = (hash >> (i * 8)) & 0xff
    // Convert the value to a 2-digit hex string
    const hexString = `00${value.toString(16)}`.substr(-2)
    // Append the hex string to the color value
    colour += hexString
  }

  // Return the resulting color value
  return colour
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
  forecasedChartData: {
    [key: string]: string[]
  },
  rotateXAxis: boolean,
  chartType: string,
  customEvents?: {
    [key: string]: string[]
  },
  compareChart?: {
    [key: string]: string[]
  },
): ChartOptions => {
  const xAxisSize = _size(chart.x)
  const lines: GridLineOptions[] = []
  const modifiedChart = { ...chart }
  let regions
  const customEventsToArray = customEvents
    ? _map(_keys(customEvents), (el) => {
        return [el, ...customEvents[el]]
      })
    : []

  let customEventsColors: {
    [key: string]: string
  } = {}

  if (_isEmpty(compareChart)) {
    _forEach(_keys(customEvents), (el) => {
      customEventsColors = {
        ...customEventsColors,
        [el]: stringToColour(el),
      }
    })
  }

  if (!_isEmpty(forecasedChartData) && _isEmpty(compareChart)) {
    lines.push({
      value: _last(chart?.x) as string,
      text: 'Forecast',
    })
    modifiedChart.x = [...modifiedChart.x, ...forecasedChartData.x]
    modifiedChart.uniques = [...modifiedChart.uniques, ...forecasedChartData.uniques]
    modifiedChart.visits = [...modifiedChart.visits, ...forecasedChartData.visits]
    modifiedChart.sdur = [...modifiedChart.sdur, ...forecasedChartData.sdur]
  }

  const columns = getColumns(modifiedChart, activeChartMetrics, compareChart)

  if (applyRegions) {
    let regionStart

    if (xAxisSize > 1) {
      regionStart = dayjs(chart.x[xAxisSize - 2]).toDate()
    } else {
      regionStart = dayjs(chart.x[xAxisSize - 1]).toDate()
    }

    regions = {
      unique: [
        {
          start: regionStart,
          style: {
            dasharray: '6 2',
          },
        },
      ],
      total: [
        {
          start: regionStart,
          style: {
            dasharray: '6 2',
          },
        },
      ],
      bounce: [
        {
          start: regionStart,
          style: {
            dasharray: '6 2',
          },
        },
      ],
      viewsPerUnique: [
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
      columns: [...columns, ...customEventsToArray],
      types: {
        unique: chartType === chartTypes.line ? area() : bar(),
        uniqueCompare: chartType === chartTypes.line ? line() : bar(),
        total: chartType === chartTypes.line ? area() : bar(),
        totalCompare: chartType === chartTypes.line ? line() : bar(),
        bounce: chartType === chartTypes.line ? spline() : bar(),
        bounceCompare: chartType === chartTypes.line ? spline() : bar(),
        viewsPerUnique: chartType === chartTypes.line ? spline() : bar(),
        trendlineUnique: spline(),
        trendlineTotal: spline(),
        sessionDuration: chartType === chartTypes.line ? spline() : bar(),
        sessionDurationCompare: chartType === chartTypes.line ? spline() : bar(),
      },
      colors: {
        unique: '#2563EB',
        uniqueCompare: 'rgba(37, 99, 235, 0.4)',
        total: '#D97706',
        totalCompare: 'rgba(217, 119, 6, 0.4)',
        bounce: '#2AC4B3',
        bounceCompare: 'rgba(42, 196, 179, 0.4)',
        viewsPerUnique: '#F87171',
        trendlineUnique: '#436abf',
        trendlineTotal: '#eba14b',
        sessionDuration: '#c945ed',
        sessionDurationCompare: 'rgba(201, 69, 237, 0.4)',
        ...customEventsColors,
      },
      // @ts-expect-error
      regions,
      axes: {
        bounce: 'y2',
        sessionDuration: 'y2',
      },
    },
    grid: {
      x: {
        lines,
      },
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
          // @ts-expect-error
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
      y2: {
        show: activeChartMetrics.bounce || activeChartMetrics.sessionDuration,
        tick: {
          // @ts-expect-error
          format: activeChartMetrics.bounce
            ? (d: string) => `${d}%`
            : (d: string) => getStringFromTime(getTimeFromSeconds(d)),
        },
        min: activeChartMetrics.bounce ? 10 : undefined,
        max: activeChartMetrics.bounce ? 100 : undefined,
        default: activeChartMetrics.bounce ? [10, 100] : undefined,
      },
    },
    tooltip: {
      contents: (item, _, __, color) => {
        const typesOptionsToTypesCompare: {
          [key: string]: string
        } = {
          unique: 'uniques',
          total: 'visits',
          sessionDuration: 'sdur',
        }

        if (_isEmpty(compareChart)) {
          return `<ul class='bg-gray-100 dark:text-gray-50 dark:bg-slate-800 rounded-md shadow-md px-3 py-1'>
          <li class='font-semibold'>${
            timeFormat === TimeFormat['24-hour']
              ? d3.timeFormat(tbsFormatMapperTooltip24h[timeBucket])(item[0].x)
              : d3.timeFormat(tbsFormatMapperTooltip[timeBucket])(item[0].x)
          }</li>
          <hr class='border-gray-200 dark:border-gray-600' />
          ${_map(item, (el: { id: string; index: number; name: string; value: string; x: Date }) => {
            if (el.id === 'sessionDuration') {
              return `
              <li class='flex justify-between'>
                <div class='flex justify-items-start'>
                  <div class='w-3 h-3 rounded-sm mt-1.5 mr-2' style=background-color:${color(el.id)}></div>
                  <span>${el.name}</span>
                </div>
                <span class='pl-4'>${getStringFromTime(getTimeFromSeconds(el.value))}</span>
              </li>
              `
            }

            if (el.id === 'trendlineUnique' || el.id === 'trendlineTotal') {
              return ''
            }

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
        }

        return `
        <ul class='bg-gray-100 dark:text-gray-50 dark:bg-slate-800 rounded-md shadow-md px-3 py-1'>
          ${_map(item, (el: { id: string; index: number; name: string; value: string; x: Date }) => {
            const { id, index, name, value, x } = el

            const xDataValueCompare =
              timeFormat === TimeFormat['24-hour']
                ? d3.timeFormat(tbsFormatMapperTooltip24h[timeBucket])(dayjs(compareChart?.x[index]).toDate())
                : d3.timeFormat(tbsFormatMapperTooltip[timeBucket])(dayjs(compareChart?.x[index]).toDate())
            const xDataValue =
              timeFormat === TimeFormat['24-hour']
                ? d3.timeFormat(tbsFormatMapperTooltip24h[timeBucket])(x)
                : d3.timeFormat(tbsFormatMapperTooltip[timeBucket])(x)
            const valueCompare =
              id === 'sessionDuration'
                ? getStringFromTime(getTimeFromSeconds(compareChart?.[typesOptionsToTypesCompare?.[id]]?.[index]))
                : compareChart?.[typesOptionsToTypesCompare[id]]?.[index]

            if (
              id === 'uniqueCompare' ||
              id === 'totalCompare' ||
              id === 'bounceCompare' ||
              id === 'sessionDurationCompare'
            ) {
              return ''
            }

            if (id === 'sessionDuration') {
              return `
              <div class='flex justify-between'>
              <div class='flex justify-items-start'>
                <div class='w-3 h-3 rounded-sm mt-1.5 mr-2' style=background-color:${color(id)}></div>
                <span>${name}</span>
              </div>
            </div>
            <hr class='border-gray-200 dark:border-gray-600' />
            <li class='mt-1 ml-2'>
              <p>
                <span>${xDataValue}</span> -
                <span>${getStringFromTime(getTimeFromSeconds(value))}</span>
              </p>
              ${
                valueCompare && Number(compareChart?.[typesOptionsToTypesCompare?.[id]]?.[index]) > 0
                  ? `<p>
                <span>${xDataValueCompare}</span> -
                <span>${valueCompare}</span>
              </p>`
                  : ''
              }
            </li>
          `
            }

            return `
            <div class='flex justify-between'>
              <div class='flex justify-items-start'>
                <div class='w-3 h-3 rounded-sm mt-1.5 mr-2' style=background-color:${color(id)}></div>
                <span>${name}</span>
              </div>
            </div>
            <hr class='border-gray-200 dark:border-gray-600' />
            <li class='mt-1 ml-2'>
            <p>
              <span>${xDataValue}</span> - <span>${value}</span>
            </p>
            ${
              valueCompare
                ? `<p>
              <span>${xDataValueCompare}</span> -
              <span>${valueCompare}</span>
            </p>`
                : ''
            }
            </li>
          `
          }).join('')}
        </ul>`
      },
    },
    point:
      chartType === chartTypes.bar
        ? {}
        : {
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
      hide: ['uniqueCompare', 'totalCompare', 'bounceCompare', 'sessionDurationCompare'],
    },
    area: {
      linearGradient: true,
    },
    bar: {
      linearGradient: true,
    },
    bindto: '#dataChart',
  }
}

// function to get the settings and data for the session inspector chart
const getSettingsSession = (
  chart: any,
  timeBucket: string,
  timeFormat: string,
  rotateXAxis: boolean,
  chartType: string,
): ChartOptions => {
  const xAxisSize = _size(chart.x)

  const columns = getColumns(chart, { views: true }, {})

  return {
    data: {
      x: 'x',
      columns,
      types: {
        total: chartType === chartTypes.line ? area() : bar(),
      },
      colors: {
        total: '#D97706',
        totalCompare: 'rgba(217, 119, 6, 0.4)',
      },
      axes: {
        bounce: 'y2',
        sessionDuration: 'y2',
      },
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
          // @ts-expect-error
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
            if (el.id === 'sessionDuration') {
              return `
              <li class='flex justify-between'>
                <div class='flex justify-items-start'>
                  <div class='w-3 h-3 rounded-sm mt-1.5 mr-2' style=background-color:${color(el.id)}></div>
                  <span>${el.name}</span>
                </div>
                <span class='pl-4'>${getStringFromTime(getTimeFromSeconds(el.value))}</span>
              </li>
              `
            }

            if (el.id === 'trendlineUnique' || el.id === 'trendlineTotal') {
              return ''
            }

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
    point:
      chartType === chartTypes.bar
        ? {}
        : {
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
      hide: ['uniqueCompare', 'totalCompare', 'bounceCompare', 'sessionDurationCompare'],
    },
    area: {
      linearGradient: true,
    },
    bar: {
      linearGradient: true,
    },
    bindto: '#sessionChart',
  }
}

// function to get the settings and data for the error details chart
const getSettingsError = (
  chart: any,
  timeBucket: string,
  timeFormat: string,
  rotateXAxis: boolean,
  chartType: string,
): ChartOptions => {
  const xAxisSize = _size(chart.x)

  const columns = getColumns(chart, { occurrences: true }, {})

  let regionStart

  if (xAxisSize > 1) {
    regionStart = dayjs(chart.x[xAxisSize - 2]).toDate()
  } else {
    regionStart = dayjs(chart.x[xAxisSize - 1]).toDate()
  }

  return {
    data: {
      x: 'x',
      columns,
      types: {
        occurrences: chartType === chartTypes.line ? area() : bar(),
      },
      colors: {
        occurrences: '#dc2626',
        occurrencesCompare: 'rgba(220, 38, 38, 0.4)',
      },
      regions: {
        occurrences: [
          {
            // @ts-expect-error
            start: regionStart,
            style: {
              dasharray: '6 2',
            },
          },
        ],
      },
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
          // @ts-expect-error
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
          ${_map(
            item,
            (el: { id: string; index: number; name: string; value: string; x: Date }) => `
            <li class='flex justify-between'>
              <div class='flex justify-items-start'>
                <div class='w-3 h-3 rounded-sm mt-1.5 mr-2' style=background-color:${color(el.id)}></div>
                <span>${el.name}</span>
              </div>
              <span class='pl-4'>${el.value}</span>
            </li>
            `,
          ).join('')}`
      },
    },
    point:
      chartType === chartTypes.bar
        ? {}
        : {
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
      hide: ['uniqueCompare', 'totalCompare', 'bounceCompare', 'sessionDurationCompare'],
    },
    area: {
      linearGradient: true,
    },
    bar: {
      linearGradient: true,
    },
    bindto: '#errorChart',
  }
}

// function to get the settings and data for the funnels chart
const getSettingsFunnels = (funnel: IAnalyticsFunnel[], totalPageviews: number, t: typeof i18next.t): ChartOptions => {
  const values = _map(funnel, (step) => {
    if (_startsWith(step.value, '/')) {
      return t('project.visitPage', { page: step.value })
    }

    return step.value
  })
  const events = _map(funnel, (step) => step.events)
  const dropoff = _map(funnel, (step) => step.dropoff)

  return {
    data: {
      x: 'x',
      columns: [
        ['x', ...values],
        ['dropoff', ...dropoff],
        ['events', ...events],
      ],
      types: {
        events: bar(),
        dropoff: bar(),
      },
      colors: {
        events: '#2563eb', // blue-600
        dropoff: 'rgba(37, 99, 235, 0.2)', // blue-600 + opacity
      },
      groups: [['events', 'dropoff']],
      // @ts-expect-error
      order: (a: any, b: any) => {
        return a.id < b.id
      },
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
        type: 'category',
      },
      y: {
        tick: {
          format: (d: number) => nFormatter(d, 1),
        },
      },
    },
    tooltip: {
      contents: (items: any, _: any, __: any, color: any) => {
        const { index } = items[0]
        const step = funnel[index]
        const stepTitle = values[index]
        const prevStepTitle = values[index - 1]

        const prevStepHtml = prevStepTitle
          ? `
          <span>${prevStepTitle}</span>
        `
          : ''

        const title = `
          <p class='font-semibold flex space-x-2 items-center tracking-tight'>
            ${prevStepHtml}
            <svg fill='none' viewBox='0 0 24 24' stroke-width='1.5' class='w-4 h-4'>
              <path class='stroke-gray-400 dark:stroke-gray-200' stroke-linecap='round' stroke-linejoin='round' d='M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3' />
            </svg>
            <span>${stepTitle}</span>
          </p>
        `

        const events = `
          <tr class='tracking-tight'>
            <td class='pr-7'>
              <div class='w-3 h-3 rounded-sm mr-1 float-left mt-1.5' style=background-color:${color('events')}></div>
              <span class='font-semibold'>
                ${_startsWith(step.value, '/') ? t('project.visitors') : t('project.events')}
              </span>
            </td>
            <td class='pr-3 font-semibold text-right'>
              ${step.events}
            </td>
            <td class='text-right'>
              ${step.eventsPercStep}%
            </td>
          </tr>
        `

        const dropoff = `
          <tr class='tracking-tight'>
            <td class='pr-7'>
              <div class='w-3 h-3 rounded-sm mr-1 float-left mt-1.5' style="background-color:${color(
                'dropoff',
              )}"}></div>
              <span class='font-semibold'>
                ${index === 0 ? t('project.neverEnteredTheFunnel') : t('project.dropoff')}
              </span>
            </td>
            <td class='pr-3 font-semibold text-right'>
              ${index === 0 ? totalPageviews - step.events : step.dropoff}
            </td>
            <td class='text-right'>
              ${
                index === 0 ? _round(((totalPageviews - step.events) / totalPageviews) * 100, 2) : step.dropoffPercStep
              }%
            </td>
          </tr>
        `

        return `
          <div class='bg-gray-100 dark:text-gray-50 dark:bg-slate-800 rounded-md shadow-md px-3 py-1'>
            ${title}
            <hr class='border-gray-200 dark:border-gray-600' />
            <table class='table-fixed'>
              <thead>
                <tr>
                  <th className='w-3/5'></th>
                  <th className='w-1/5'></th>
                  <th className='w-1/5'></th>
                </tr>
              </thead>
              <tbody>
                ${events}
                ${dropoff}
              </tbody>
            </table>
          </div>
        `
      },
    },
    padding: {
      left: 40,
    },
    bar: {
      linearGradient: true,
    },
    bindto: '#dataChart',
  }
}

const perfomanceChartCompare = [
  'dnsCompare',
  'tlsCompare',
  'connCompare',
  'responseCompare',
  'renderCompare',
  'dom_loadCompare',
  'ttfbCompare',
  'frontendCompare',
  'networkCompare',
  'backendCompare',
  'p50Compare',
  'p75Compare',
  'p95Compare',
]

const getSettingsPerf = (
  chart: {
    [key: string]: string[]
  },
  timeBucket: string,
  activeChartMetrics: string,
  rotateXAxis: boolean,
  chartType: string,
  timeFormat: string,
  compareChart?: {
    [key: string]: string[]
  },
): ChartOptions => {
  const xAxisSize = _size(chart.x)

  return {
    data: {
      x: 'x',
      xFormat: tbsFormatMapper[timeBucket],
      columns: getColumnsPerf(chart, activeChartMetrics, compareChart),
      types: {
        dns: chartType === chartTypes.line ? areaSpline() : bar(),
        tls: chartType === chartTypes.line ? areaSpline() : bar(),
        conn: chartType === chartTypes.line ? areaSpline() : bar(),
        response: chartType === chartTypes.line ? areaSpline() : bar(),
        render: chartType === chartTypes.line ? areaSpline() : bar(),
        dom_load: chartType === chartTypes.line ? areaSpline() : bar(),
        ttfb: chartType === chartTypes.line ? areaSpline() : bar(),
        frontend: chartType === chartTypes.line ? areaSpline() : bar(),
        network: chartType === chartTypes.line ? areaSpline() : bar(),
        backend: chartType === chartTypes.line ? areaSpline() : bar(),
        p50: chartType === chartTypes.line ? areaSpline() : bar(),
        p75: chartType === chartTypes.line ? areaSpline() : bar(),
        p95: chartType === chartTypes.line ? areaSpline() : bar(),
        dnsCompare: chartType === chartTypes.line ? spline() : bar(),
        tlsCompare: chartType === chartTypes.line ? spline() : bar(),
        connCompare: chartType === chartTypes.line ? spline() : bar(),
        responseCompare: chartType === chartTypes.line ? spline() : bar(),
        renderCompare: chartType === chartTypes.line ? spline() : bar(),
        dom_loadCompare: chartType === chartTypes.line ? spline() : bar(),
        ttfbCompare: chartType === chartTypes.line ? spline() : bar(),
        frontendCompare: chartType === chartTypes.line ? spline() : bar(),
        networkCompare: chartType === chartTypes.line ? spline() : bar(),
        backendCompare: chartType === chartTypes.line ? spline() : bar(),
        p50Compare: chartType === chartTypes.line ? spline() : bar(),
        p75Compare: chartType === chartTypes.line ? spline() : bar(),
        p95Compare: chartType === chartTypes.line ? spline() : bar(),
      },
      colors: {
        dns: '#EC4319',
        tls: '#F27059',
        conn: '#F7A265',
        response: '#F5D376',
        render: '#709775',
        dom_load: '#A5E6AB',
        ttfb: '#00A8E8',
        frontend: '#709775',
        network: '#F7A265',
        backend: '#00A8E8',
        p50: '#38bdf8',
        p75: '#facc15',
        p95: '#f87171',
        p50Compare: 'rgba(56, 189, 248, 0.4)',
        p75Compare: 'rgba(250, 204, 21, 0.4)',
        p95Compare: 'rgba(248, 113, 113, 0.4)',
        dnsCompare: 'rgba(236, 67, 25, 0.4)',
        tlsCompare: 'rgba(242, 112, 89, 0.4)',
        connCompare: 'rgba(247, 162, 101, 0.4)',
        responseCompare: 'rgba(245, 211, 118, 0.4)',
        renderCompare: 'rgba(112, 151, 117, 0.4)',
        dom_loadCompare: 'rgba(165, 230, 171, 0.4)',
        ttfbCompare: 'rgba(0, 168, 232, 0.4)',
        frontendCompare: 'rgba(112, 151, 117, 0.4)',
        networkCompare: 'rgba(247, 162, 101, 0.4)',
        backendCompare: 'rgba(0, 168, 232, 0.4)',
      },
      groups: [
        ['dns', 'tls', 'conn', 'response', 'render', 'dom_load', 'ttfb', 'frontend', 'network', 'backend'],
        [
          'dnsCompare',
          'tlsCompare',
          'connCompare',
          'responseCompare',
          'renderCompare',
          'dom_loadCompare',
          'ttfbCompare',
          'frontendCompare',
          'networkCompare',
          'backendCompare',
        ],
      ],
    },
    axis: {
      x: {
        clipPath: false,
        tick: {
          fit: true,
          rotate: rotateXAxis ? 45 : 0,
          // @ts-expect-error
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
          // @ts-expect-error
          format: (d: string) => getStringFromTime(getTimeFromSeconds(d), true),
        },
        show: true,
        inner: true,
      },
    },
    transition: {
      duration: 500,
    },
    resize: {
      auto: true,
      timer: false,
    },
    tooltip: {
      contents: (item: any, _: any, __: any, color: any) => {
        if (_isEmpty(compareChart)) {
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
            <span class='pl-4'>${getStringFromTime(getTimeFromSeconds(el.value), true)}</span>
          </li>
          `
        }).join('')}`
        }

        return `
      <ul class='bg-gray-100 dark:text-gray-50 dark:bg-slate-800 rounded-md shadow-md px-3 py-1'>
        ${_map(item, (el: { id: string; index: number; name: string; value: string; x: Date }) => {
          const { id, index, name, value, x } = el

          const xDataValueCompare =
            timeFormat === TimeFormat['24-hour']
              ? d3.timeFormat(tbsFormatMapperTooltip24h[timeBucket])(dayjs(compareChart?.x[index]).toDate())
              : d3.timeFormat(tbsFormatMapperTooltip[timeBucket])(dayjs(compareChart?.x[index]).toDate())
          const xDataValue =
            timeFormat === TimeFormat['24-hour']
              ? d3.timeFormat(tbsFormatMapperTooltip24h[timeBucket])(x)
              : d3.timeFormat(tbsFormatMapperTooltip[timeBucket])(x)
          const valueCompare = getValueForTooltipPerfomance(compareChart, id, index)

          if (_includes(perfomanceChartCompare, id)) {
            return ''
          }

          return `
          <div class='flex justify-between'>
            <div class='flex justify-items-start'>
              <div class='w-3 h-3 rounded-sm mt-1.5 mr-2' style=background-color:${color(id)}></div>
              <span>${name}</span>
            </div>
          </div>
          <hr class='border-gray-200 dark:border-gray-600' />
          <li class='mt-1 ml-2'>
          <p>
            <span>${xDataValue}</span> - <span>${getStringFromTime(getTimeFromSeconds(value), true)}</span>
          </p>
          ${
            valueCompare
              ? `<p>
            <span>${xDataValueCompare}</span> -
            <span>${getStringFromTime(getTimeFromSeconds(valueCompare), true)}</span>
          </p>`
              : ''
          }
          </li>
        `
        }).join('')}
      </ul>`
      },
    },
    point:
      chartType === chartTypes.bar
        ? {}
        : {
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
      hide: perfomanceChartCompare,
    },
    area: {
      linearGradient: true,
    },
    bar: {
      linearGradient: true,
    },
    bindto: '#dataChart',
  }
}

const validTimeBacket = ['hour', 'day', 'week', 'month']
const validPeriods = ['custom', 'today', 'yesterday', '1d', '7d', '4w', '3M', '12M', '24M']
const validFilters = ['cc', 'rg', 'ct', 'pg', 'lc', 'ref', 'dv', 'br', 'os', 'so', 'me', 'ca', 'ev']

export const filterInvalidViewPrefs = (prefs: any): any => {
  const pids = _keys(prefs)
  const filtered = _reduce(
    pids,
    (prev: string[], curr: string) => {
      const { period, timeBucket } = prefs[curr]

      if (!_includes(validPeriods, period) || !_includes(validTimeBacket, timeBucket)) {
        return prev
      }

      return [...prev, curr]
    },
    [],
  )

  return _reduce(
    filtered,
    (prev: any, curr: string) => {
      return {
        ...prev,
        [curr]: prefs[curr],
      }
    },
    {},
  )
}

const typeNameMapping = (t: typeof i18next.t) => ({
  cc: t('project.mapping.cc'),
  rg: t('project.mapping.rg'),
  ct: t('project.mapping.ct'),
  pg: t('project.mapping.pg'),
  lc: t('project.mapping.lc'),
  ref: t('project.mapping.ref'),
  dv: t('project.mapping.dv'),
  br: t('project.mapping.br'),
  os: t('project.mapping.os'),
  so: t('project.mapping.so'),
  me: t('project.mapping.me'),
  ca: t('project.mapping.ca'),
  ev: t('project.event'),
  userFlow: t('main.competitiveFeatures.usfl'),
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

/*
  Converts an array of filters like:
  [
    {
      "column": "cc",
      "filter": [
        "NL", "PL"
      ]
    }
  ]
  to
  [
    {
      "column": "cc",
      "filter": "NL"
    },
    {
      "column": "cc",
      "filter": "PL"
    }
  ]
*/
const convertFilters = (filters: any) => {
  return _reduce(
    filters,
    (prev: any, curr: any) => {
      const { column, filter } = curr
      const converted = _map(filter, (el: any) => ({
        column,
        filter: el,
      }))

      return [...prev, ...converted]
    },
    [],
  )
}

const SHORTCUTS_TABS_MAP = {
  T: PROJECT_TABS.traffic,
  P: PROJECT_TABS.performance,
  F: PROJECT_TABS.funnels,
  S: PROJECT_TABS.sessions,
  A: PROJECT_TABS.alerts,
  R: PROJECT_TABS.errors,
}

const _SHORTCUTS_TABS_LISTENERS = 'shift+t, shift+p, shift+s, shift+f, shift+e, shift+r'
const SHORTCUTS_TABS_LISTENERS = isSelfhosted ? _SHORTCUTS_TABS_LISTENERS : _SHORTCUTS_TABS_LISTENERS + ', shift+a'

const _SHORTCUTS_GENERAL_LISTENERS = 'alt+s,alt+ß, alt+b,alt+∫, alt+l,alt+¬, r'
const SHORTCUTS_GENERAL_LISTENERS = isSelfhosted
  ? _SHORTCUTS_GENERAL_LISTENERS
  : _SHORTCUTS_GENERAL_LISTENERS + ',alt+f,alt+ƒ'

const SHORTCUTS_TIMEBUCKETS_LISTENERS = 'h, t, y, d, w, m, q, l, z, a, u, c'

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
  onCSVExportClick,
  CHART_METRICS_MAPPING,
  CHART_METRICS_MAPPING_PERF,
  getColumnsPerf,
  getSettingsPerf,
  transformAIChartData,
  FILTER_CHART_METRICS_MAPPING_FOR_COMPARE,
  getSettingsFunnels,
  getSettingsSession,
  convertFilters,
  SHORTCUTS_TABS_MAP,
  SHORTCUTS_TABS_LISTENERS,
  SHORTCUTS_GENERAL_LISTENERS,
  SHORTCUTS_TIMEBUCKETS_LISTENERS,
  CHART_MEASURES_MAPPING_PERF,
  getSettingsError,
  ERROR_FILTERS_MAPPING,
}
