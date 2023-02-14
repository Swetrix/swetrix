import { saveAs } from 'file-saver'
import {
  GlobeEuropeAfricaIcon, LanguageIcon, DocumentTextIcon, DeviceTabletIcon,
  ArrowRightCircleIcon, MagnifyingGlassIcon, ServerIcon,
} from '@heroicons/react/24/outline'
import * as d3 from 'd3'
import dayjs from 'dayjs'
import { area, areaSpline, spline } from 'billboard.js'
import _forEach from 'lodash/forEach'
import _map from 'lodash/map'
import _split from 'lodash/split'
import _replace from 'lodash/replace'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _size from 'lodash/size'
import _round from 'lodash/round'
import _fill from 'lodash/fill'
import _reduce from 'lodash/reduce'
import _last from 'lodash/last'
import JSZip from 'jszip'

import { TimeFormat, tbsFormatMapper, tbsFormatMapper24h } from 'redux/constants'
import { getTimeFromSeconds, getStringFromTime, sumArrays } from 'utils/generic'
import countries from 'utils/isoCountries'

const getAvg = (arr) => {
  const total = _reduce(arr, (acc, c) => acc + c, 0)
  return total / _size(arr)
}

const getSum = (arr) => {
  return _reduce(arr, (acc, c) => acc + c, 0)
}

const transformAIChartData = (data) => {
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

const trendline = (data) => {
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
      trendData.push(0)
    } else {
      trendData.push(y)
    }
  }

  return trendData
}

const getExportFilename = (prefix) => {
  // turn something like 2022-03-02T19:31:00.100Z into 2022-03-02
  const date = _split(_replace(_split(new Date().toISOString(), '.')[0], /:/g, '-'), 'T')[0]
  return `${prefix}-${date}.zip`
}

const convertToCSV = (array) => {
  let str = 'name,value,perc\r\n'

  for (let i = 0; i < _size(array); ++i) {
    let line = ''

    _forEach(array[i], (index) => {
      if (line !== '') line += ','
      line += index
    })

    str += `${line}\r\n`
  }

  return str
}

const onCSVExportClick = (data, pid, tnMapping, language) => {
  const { data: rowData, types } = data
  const zip = new JSZip()

  _forEach(types, (item) => {
    if (_isEmpty(rowData[item])) {
      return
    }

    const rowKeys = _keys(rowData[item])
    let total = 0

    _forEach(rowKeys, (e) => {
      total += rowData[item][e]
    })

    const csvData = _map(rowKeys, (e) => {
      const perc = _round(((rowData[item][e] / total) * 100) || 0, 2)

      if (item === 'cc') {
        const name = countries.getName(e, language)
        return [name, rowData[item][e], `${perc}%`]
      }

      return [e, rowData[item][e], `${perc}%`]
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
}

const CHART_METRICS_MAPPING_PERF = {
  full: 'full',
  timing: 'timing',
  network: 'network',
  frontend: 'frontend',
  backend: 'backend',
}

// function to filter the data for the chart
const getColumns = (chart, activeChartMetrics) => {
  const {
    views, bounce, viewsPerUnique, unique, trendlines, sessionDuration,
  } = activeChartMetrics

  const columns = [
    ['x', ..._map(chart.x, el => dayjs(el).toDate())],
  ]

  if (unique) {
    columns.push(['unique', ...chart.uniques])
    if (trendlines) {
      columns.push(['trendlineUnique', ...trendline(chart.uniques)])
    }
  }

  if (views) {
    columns.push(['total', ...chart.visits])
    if (trendlines) {
      columns.push(['trendlineTotal', ...trendline(chart.visits)])
    }
  }

  if (bounce) {
    const bounceArray = _map(chart.uniques, (el, i) => {
      return _round((el * 100) / chart.visits[i], 1) || 0
    })
    columns.push(
      ['bounce', ...bounceArray],
    )
  }

  if (viewsPerUnique) {
    const viewsPerUniqueArray = _map(chart.visits, (el, i) => {
      if (chart.uniques[i] === 0 || chart.uniques[i] === undefined) {
        return 0
      }
      return _round(el / chart.uniques[i], 1)
    })
    columns.push(['viewsPerUnique', ...viewsPerUniqueArray])
  }

  if (sessionDuration) {
    columns.push(['sessionDuration', ...chart.sdur])
  }

  return columns
}

const getColumnsPerf = (chart, activeChartMetrics) => {
  const columns = [
    ['x', ..._map(chart.x, el => dayjs(el).toDate())],
  ]

  if (activeChartMetrics === CHART_METRICS_MAPPING_PERF.full) {
    columns.push(['dns', ...chart.dns])
    columns.push(['tls', ...chart.tls])
    columns.push(['conn', ...chart.conn])
    columns.push(['response', ...chart.response])
    columns.push(['render', ...chart.render])
    columns.push(['dom_load', ...chart.domLoad])
    columns.push(['ttfb', ...chart.ttfb])
  }

  if (activeChartMetrics === CHART_METRICS_MAPPING_PERF.timing) {
    columns.push(['frontend', ...sumArrays(chart.render, chart.domLoad)])
    columns.push(['network', ...sumArrays(chart.dns, chart.tls, chart.conn, chart.response)])
    columns.push(['backend', ...chart.ttfb])
  }

  if (activeChartMetrics === CHART_METRICS_MAPPING_PERF.network) {
    columns.push(['dns', ...chart.dns])
    columns.push(['tls', ...chart.tls])
    columns.push(['conn', ...chart.conn])
    columns.push(['response', ...chart.response])
  }

  if (activeChartMetrics === CHART_METRICS_MAPPING_PERF.frontend) {
    columns.push(['render', ...chart.render])
    columns.push(['dom_load', ...chart.domLoad])
  }

  if (activeChartMetrics === CHART_METRICS_MAPPING_PERF.backend) {
    columns.push(['ttfb', ...chart.ttfb])
  }

  return columns
}

// setting the default values for the time period dropdown
const noRegionPeriods = ['custom', 'yesterday']

// function to get the settings and data for the chart(main diagram)
const getSettings = (chart, timeBucket, activeChartMetrics, applyRegions, timeFormat, forecasedChartData) => {
  const xAxisSize = _size(chart.x)
  const lines = []
  const modifiedChart = { ...chart }
  let regions

  if (!_isEmpty(forecasedChartData)) {
    lines.push({
      value: _last(chart?.x),
      text: 'Forecast',
    })
    modifiedChart.x = [...modifiedChart.x, ...forecasedChartData.x]
    modifiedChart.uniques = [...modifiedChart.uniques, ...forecasedChartData.uniques]
    modifiedChart.visits = [...modifiedChart.visits, ...forecasedChartData.visits]
    modifiedChart.sdur = [...modifiedChart.sdur, ...forecasedChartData.sdur]
  }

  console.log(lines)

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
      columns: getColumns(modifiedChart, activeChartMetrics),
      types: {
        unique: area(),
        total: area(),
        bounce: spline(),
        viewsPerUnique: spline(),
        trendlineUnique: spline(),
        trendlineTotal: spline(),
        sessionDuration: spline(),
      },
      colors: {
        unique: '#2563EB',
        total: '#D97706',
        bounce: '#2AC4B3',
        viewsPerUnique: '#F87171',
        trendlineUnique: '#436abf',
        trendlineTotal: '#eba14b',
        sessionDuration: '#c945ed',
      },
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
    axis: {
      x: {
        tick: {
          fit: true,
          format: timeFormat === TimeFormat['24-hour'] ? (x) => d3.timeFormat(tbsFormatMapper24h[timeBucket])(x) : null,
        },
        localtime: timeFormat === TimeFormat['24-hour'],
        type: 'timeseries',
      },
      y2: {
        show: activeChartMetrics.bounce || activeChartMetrics.sessionDuration,
        tick: {
          format: activeChartMetrics.bounce ? (d) => `${d}%` : (d) => getStringFromTime(getTimeFromSeconds(d)),
        },
        min: activeChartMetrics.bounce ? 10 : null,
        max: activeChartMetrics.bounce ? 100 : null,
        default: activeChartMetrics.bounce ? [10, 100] : null,
      },
    },
    tooltip: {
      format: {
        title: (x) => d3.timeFormat(tbsFormatMapper[timeBucket])(x),
      },
      contents: {
        template: `
          <ul class='bg-gray-100 dark:text-gray-50 dark:bg-gray-700 rounded-md shadow-md px-3 py-1'>
            <li class='font-semibold'>{=TITLE}</li>
            <hr class='border-gray-200 dark:border-gray-600' />
            {{
              <li class='flex justify-between'>
                <div class='flex justify-items-start'>
                  <div class='w-3 h-3 rounded-sm mt-1.5 mr-2' style=background-color:{=COLOR}></div>
                  <span>{=NAME}</span>
                </div>
                <span class='pl-4'>{=VALUE}</span>
              </li>
            }}
          </ul>`,
      },
    },
    point: {
      focus: {
        only: xAxisSize > 1,
      },
      pattern: [
        'circle',
      ],
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
    bindto: '#dataChart',
  }
}

const getSettingsPerf = (chart, timeBucket, activeChartMetrics) => {
  const xAxisSize = _size(chart.x)

  return {
    data: {
      x: 'x',
      xFormat: tbsFormatMapper[timeBucket],
      columns: getColumnsPerf(chart, activeChartMetrics),
      types: {
        dns: areaSpline(),
        tls: areaSpline(),
        conn: areaSpline(),
        response: areaSpline(),
        render: areaSpline(),
        dom_load: areaSpline(),
        ttfb: areaSpline(),
        frontend: areaSpline(),
        network: areaSpline(),
        backend: areaSpline(),
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
      },
      groups: [
        ['dns', 'tls', 'conn', 'response', 'render', 'dom_load', 'ttfb', 'frontend', 'network', 'backend'],
      ],
    },
    axis: {
      x: {
        type: 'timeseries',
        tick: {
          format: tbsFormatMapper[timeBucket],
        },
      },
      y: {
        tick: {
          format: (d) => getStringFromTime(getTimeFromSeconds(d), true),
        },
      },
    },
    tooltip: {
      format: {
        title: (x) => d3.timeFormat(tbsFormatMapper[timeBucket])(x),
      },
      contents: {
        template: `
          <ul class='bg-gray-100 dark:text-gray-50 dark:bg-gray-700 rounded-md shadow-md px-3 py-1'>
            <li class='font-semibold'>{=TITLE}</li>
            <hr class='border-gray-200 dark:border-gray-600' />
            {{
              <li class='flex justify-between'>
                <div class='flex justify-items-start'>
                  <div class='w-3 h-3 rounded-sm mt-1.5 mr-2' style=background-color:{=COLOR}></div>
                  <span>{=NAME}</span>
                </div>
                <span class='pl-4'>{=VALUE}</span>
              </li>
            }}
          </ul>`,
      },
    },
    point: {
      focus: {
        only: xAxisSize > 1,
      },
      pattern: [
        'circle',
      ],
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
    bindto: '#dataChart',
  }
}

const validTimeBacket = ['hour', 'day', 'week', 'month']
const validPeriods = ['custom', 'today', 'yesterday', '1d', '7d', '4w', '3M', '12M', '24M']
const paidPeriods = ['12M', '24M']
const validFilters = ['cc', 'pg', 'lc', 'ref', 'dv', 'br', 'os', 'so', 'me', 'ca', 'lt', 'ev']

const typeNameMapping = (t) => ({
  cc: t('project.mapping.cc'),
  pg: t('project.mapping.pg'),
  lc: t('project.mapping.lc'),
  ref: t('project.mapping.ref'),
  dv: t('project.mapping.dv'),
  br: t('project.mapping.br'),
  os: t('project.mapping.os'),
  so: 'utm_source',
  me: 'utm_medium',
  ca: 'utm_campaign',
  lt: t('project.mapping.lt'),
  ev: t('project.event'),
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
const getFormatDate = (date) => {
  const yyyy = date.getFullYear()
  let mm = date.getMonth() + 1
  let dd = date.getDate()
  if (dd < 10) dd = `0${dd}`
  if (mm < 10) mm = `0${mm}`
  return `${yyyy}-${mm}-${dd}`
}

export {
  iconClassName, getFormatDate, panelIconMapping, typeNameMapping, validFilters,
  validPeriods, validTimeBacket, paidPeriods, noRegionPeriods, getSettings,
  getExportFilename, getColumns, onCSVExportClick, CHART_METRICS_MAPPING,
  CHART_METRICS_MAPPING_PERF, getColumnsPerf, getSettingsPerf, transformAIChartData,
}
