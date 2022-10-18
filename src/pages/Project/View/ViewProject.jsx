/* eslint-disable react/forbid-prop-types, react/no-unstable-nested-components, react/display-name */
import React, {
  useState, useEffect, useMemo, memo, useRef, Fragment,
} from 'react'
import { useHistory, useParams, Link } from 'react-router-dom'
import domToImage from 'dom-to-image'
import { saveAs } from 'file-saver'
import bb, { area } from 'billboard.js'
import Flag from 'react-flagkit'
import {
  GlobeEuropeAfricaIcon, LanguageIcon, DocumentTextIcon, DeviceTabletIcon,
  ArrowRightCircleIcon, MagnifyingGlassIcon, ServerIcon, ArrowDownTrayIcon,
  Cog8ToothIcon, ArrowPathIcon, CurrencyDollarIcon,
} from '@heroicons/react/24/outline'
import cx from 'clsx'
import * as d3 from 'd3'
import dayjs from 'dayjs'
import { useTranslation, Trans } from 'react-i18next'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _includes from 'lodash/includes'
import _last from 'lodash/last'
import _isEmpty from 'lodash/isEmpty'
import _replace from 'lodash/replace'
import _find from 'lodash/find'
import _size from 'lodash/size'
import _filter from 'lodash/filter'
import _truncate from 'lodash/truncate'
import _startsWith from 'lodash/startsWith'
import PropTypes from 'prop-types'
import SwetrixSDK from 'swetrix-sdk-test/esnext'

import { SWETRIX_PID } from 'utils/analytics'
import Title from 'components/Title'
import EventsRunningOutBanner from 'components/EventsRunningOutBanner'
import {
  tbPeriodPairs, tbsFormatMapper, getProjectCacheKey, LIVE_VISITORS_UPDATE_INTERVAL, DEFAULT_TIMEZONE,
  timeBucketToDays, getProjectCacheCustomKey, roleViewer, MAX_MONTHS_IN_PAST, MAX_MONTHS_IN_PAST_FREE,
} from 'redux/constants'
import Button from 'ui/Button'
import Loader from 'ui/Loader'
import Dropdown from 'ui/Dropdown'
import Checkbox from 'ui/Checkbox'
import FlatPicker from 'ui/Flatpicker'
import PaidFeature from 'modals/PaidFeature'
import routes from 'routes'
import {
  getProjectData, getProject, getOverallStats, getLiveVisitors,
} from 'api'
import countries from 'utils/isoCountries'
import {
  Panel, Overview, CustomEvents,
} from './Panels'
import './styles.css'
import { onCSVExportClick } from './ViewProject.helpers'

// component for the Country icon
const CCRow = memo(({ rowName, language }) => (
  <>
    <Flag
      className='rounded-sm'
      country={rowName}
      size={21}
      alt=''
    />
    &nbsp;&nbsp;
    {countries.getName(rowName, language)}
  </>
))
// component for the Link icon
const RefRow = memo(({ rowName, showIcons }) => {
  let isUrl = true
  let url = rowName

  try {
    url = new URL(rowName)
  } catch {
    isUrl = false
  }

  return (
    <div>
      {showIcons && isUrl && !_isEmpty(url.hostname) && (
        <img
          className='w-5 h-5 mr-1.5 float-left'
          src={`https://icons.duckduckgo.com/ip3/${url.hostname}.ico`}
          alt=''
        />
      )}
      {isUrl ? (
        <a
          className='flex label overflow-visible hover:underline text-blue-600 dark:text-blue-500'
          href={rowName}
          target='_blank'
          rel='noopener noreferrer nofollow'
          onClick={(e) => e.stopPropagation()}
        >
          {rowName}
        </a>
      ) : (
        <span className='flex label overflow-visible hover:underline text-blue-600 dark:text-blue-500'>
          {rowName}
        </span>
      )}
    </div>
  )
})
// function to filtering the data for the chart
const getColumns = (chart, showTotal) => {
  if (showTotal) {
    return [
      ['x', ..._map(chart.x, el => dayjs(el).toDate())],
      ['unique', ...chart.uniques],
      ['total', ...chart.visits],
    ]
  }

  return [
    ['x', ..._map(chart.x, el => dayjs(el).toDate())],
    ['unique', ...chart.uniques],
  ]
}

// setting the default values for the time period dropdown
const noRegionPeriods = ['custom', 'yesterday']

// function to get the settings and data for the chart(main diagram)
const getSettings = (chart, timeBucket, showTotal, applyRegions) => {
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
    }
  }

  return {
    data: {
      x: 'x',
      columns: getColumns(chart, showTotal),
      type: area(),
      colors: {
        unique: '#2563EB',
        total: '#D97706',
      },
      regions,
    },
    axis: {
      x: {
        tick: {
          fit: true,
        },
        type: 'timeseries',
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
    bindto: '#dataChart',
  }
}

const validTimeBacket = ['hour', 'day', 'week', 'month']
const validPeriods = ['custom', 'today', 'yesterday', '1d', '7d', '4w', '3M', '12M', '24M']
const paidPeriods = ['12M', '24M']
const validFilters = ['cc', 'pg', 'lc', 'ref', 'dv', 'br', 'os', 'so', 'me', 'ca', 'lt']

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
})

export const iconClassName = 'w-6 h-6'
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

// this component is used to display text if the data is not available
const NoEvents = ({ t, filters, resetFilters }) => (
  <div className='flex flex-col py-6 sm:px-6 lg:px-8 mt-5'>
    <div className='max-w-7xl w-full mx-auto text-gray-900 dark:text-gray-50'>
      <h2 className='text-4xl text-center leading-tight my-3'>
        {t('project.noEvTitle')}
      </h2>
      <h2 className='text-2xl mb-8 text-center leading-snug'>
        <Trans
          t={t}
          i18nKey='project.noEvContent'
          components={{
            url: <Link to={routes.docs} className='hover:underline text-blue-600' />,
          }}
        />
      </h2>
      {!_isEmpty(filters) && (
        <div className='!flex !mx-auto'>
          <Button
            onClick={resetFilters}
            className='!flex !mx-auto'
            primary
            giant
          >
            {t('project.resetFilters')}
          </Button>
        </div>
      )}
    </div>
  </div>
)

// this component is used for showing the filter in panel
const Filter = ({
  column, filter, isExclusive, onRemoveFilter, onChangeExclusive, tnMapping, language, t,
}) => {
  const displayColumn = tnMapping[column]
  let displayFilter = filter

  if (column === 'cc') {
    displayFilter = countries.getName(filter, language)
  }

  displayFilter = _truncate(displayFilter)

  return (
    <span className='inline-flex rounded-md items-center py-0.5 pl-2.5 pr-1 mr-2 mt-2 text-sm font-medium bg-gray-200 text-gray-800 dark:text-gray-50 dark:bg-gray-700'>
      {displayColumn}
      &nbsp;
      <span className='text-blue-400 border-blue-400 border-b-2 border-dotted cursor-pointer' onClick={() => onChangeExclusive(column, filter, !isExclusive)}>
        {t(`common.${isExclusive ? 'isNot' : 'is'}`)}
      </span>
      &nbsp;
      &quot;
      {displayFilter}
      &quot;
      <button
        onClick={() => onRemoveFilter(column, filter)}
        type='button'
        className='flex-shrink-0 ml-0.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-gray-800 hover:text-gray-900 hover:bg-gray-300 focus:bg-gray-300 focus:text-gray-900 dark:text-gray-50 dark:bg-gray-700 dark:hover:text-gray-300 dark:hover:bg-gray-800 dark:focus:bg-gray-800 dark:focus:text-gray-300 focus:outline-none '
      >
        <span className='sr-only'>Remove filter</span>
        <svg className='h-2 w-2' stroke='currentColor' fill='none' viewBox='0 0 8 8'>
          <path strokeLinecap='round' strokeWidth='1.5' d='M1 1l6 6m0-6L1 7' />
        </svg>
      </button>
    </span>
  )
}

// this component is used for rendering the filter panel
const Filters = ({
  filters, onRemoveFilter, onChangeExclusive, language, t, tnMapping,
}) => (
  <div className='flex justify-center md:justify-start flex-wrap -mt-2'>
    {_map(filters, (props) => {
      const { column, filter } = props
      const key = `${column}${filter}`

      return (
        <Filter key={key} onRemoveFilter={onRemoveFilter} onChangeExclusive={onChangeExclusive} language={language} t={t} tnMapping={tnMapping} {...props} />
      )
    })}
  </div>
)

const ViewProject = ({
  projects, isLoading: _isLoading, showError, cache, setProjectCache, projectViewPrefs, setProjectViewPrefs, setPublicProject,
  setLiveStatsForProject, authenticated, timezone, user, sharedProjects, isPaidTierUsed,
}) => {
  const { t, i18n: { language } } = useTranslation('common')
  const [periodPairs, setPeriodPairs] = useState(tbPeriodPairs(t))
  const [customExportTypes, setCustomExportTypes] = useState([])
  const [customPanelTabs, setCustomPanelTabs] = useState([])
  const [sdkInstance, setSdkInstance] = useState(null)
  const dashboardRef = useRef(null)
  const { id } = useParams()
  const history = useHistory()
  const project = useMemo(() => _find([...projects, ..._map(sharedProjects, (item) => item.project)], p => p.id === id) || {}, [projects, id, sharedProjects])
  const isSharedProject = useMemo(() => {
    const foundProject = _find([..._map(sharedProjects, (item) => item.project)], p => p.id === id)
    return !_isEmpty(foundProject)
  }, [id, sharedProjects])
  const [isProjectPublic, setIsProjectPublic] = useState(false)
  const [areFiltersParsed, setAreFiltersParsed] = useState(false)
  const [areTimeBucketParsed, setAreTimeBucketParsed] = useState(false)
  const [arePeriodParsed, setArePeriodParsed] = useState(false)
  const [panelsData, setPanelsData] = useState({})
  const [isPanelsDataEmpty, setIsPanelsDataEmpty] = useState(false)
  const [isPaidFeatureOpened, setIsPaidFeatureOpened] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [period, setPeriod] = useState(projectViewPrefs[id]?.period || periodPairs[3].period)
  const [timeBucket, setTimebucket] = useState(projectViewPrefs[id]?.timeBucket || periodPairs[3].tbs[1])
  const activePeriod = useMemo(() => _find(periodPairs, p => p.period === period), [period, periodPairs])
  const [showTotal, setShowTotal] = useState(false)
  const [chartData, setChartData] = useState({})
  const [mainChart, setMainChart] = useState(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [filters, setFilters] = useState([])
  // That is needed when using 'Export as image' feature
  // Because headless browser cannot do a request to the DDG API due to absense of The Same Origin Policy header
  const [showIcons, setShowIcons] = useState(true)
  const isLoading = authenticated ? _isLoading : false
  const tnMapping = typeNameMapping(t)
  const refCalendar = useRef(null)
  const localStorageDateRange = projectViewPrefs[id]?.rangeDate
  const [dateRange, setDateRange] = useState(localStorageDateRange ? [new Date(localStorageDateRange[0]), new Date(localStorageDateRange[1])] : null)

  const { name } = project

  const sharedRoles = useMemo(() => _find(user.sharedProjects, p => p.project.id === id)?.role || {}, [user, id])

  const onErrorLoading = () => {
    showError(t('project.noExist'))
    history.push(routes.dashboard)
  }

  // this function is used for requesting the data from the API
  const loadAnalytics = async (forced = false, newFilters = null) => {
    if (!forced && (isLoading || _isEmpty(project) || dataLoading)) {
      return
    }

    setDataLoading(true)
    try {
      let data
      let key
      let from
      let to

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
        key = getProjectCacheCustomKey(from, to, timeBucket)
      } else {
        key = getProjectCacheKey(period, timeBucket)
      }

      if (!forced && !_isEmpty(cache[id]) && !_isEmpty(cache[id][key])) {
        data = cache[id][key]
      } else {
        if (period === 'custom' && dateRange) {
          data = await getProjectData(id, timeBucket, '', newFilters || filters, from, to, timezone)
        } else {
          data = await getProjectData(id, timeBucket, period, newFilters || filters, '', '', timezone)
        }

        setProjectCache(id, data || {}, key)
      }

      const sdkData = {
        ...(data || {}),
        filters: newFilters || filters,
        timezone,
        timeBucket,
        period,
        from,
        to,
      }

      if (_isEmpty(data)) {
        setAnalyticsLoading(false)
        setDataLoading(false)
        setIsPanelsDataEmpty(true)
        sdkInstance?._emitEvent('load', sdkData)
        return
      }

      const { chart, params, customs } = data
      sdkInstance?._emitEvent('load', sdkData)

      if (_isEmpty(params)) {
        setIsPanelsDataEmpty(true)
      } else {
        const applyRegions = !_includes(noRegionPeriods, activePeriod.period)
        const bbSettings = getSettings(chart, timeBucket, showTotal, applyRegions)
        setChartData(chart)

        setPanelsData({
          types: _keys(params),
          data: params,
          customs,
        })

        if (!_isEmpty(mainChart)) {
          mainChart.destroy()
        }

        setMainChart(() => {
          const generete = bb.generate(bbSettings)
          generete.data.names({ unique: `${t('project.unique')} ` })
          return generete
        })
        setIsPanelsDataEmpty(false)
      }

      setAnalyticsLoading(false)
      setDataLoading(false)
    } catch (e) {
      setAnalyticsLoading(false)
      setDataLoading(false)
      console.error('[ERROR](loadAnalytics) Loading analytics data failed')
      console.error(e)
    }
  }

  // this funtion is used for requesting the data from the API when the filter is changed
  const filterHandler = (column, filter, isExclusive = false) => {
    let newFilters

    // temporarily apply only 1 filter per data type
    if (_find(filters, (f) => f.column === column) /* && f.filter === filter) */) {
      // selected filter is already included into the filters array -> removing it
      // removing filter from the state
      newFilters = _filter(filters, (f) => f.column !== column)
      setFilters(newFilters)

      // removing filter from the page URL
      const url = new URL(window.location)
      url.searchParams.delete(column)
      const { pathname, search } = url
      history.push({
        pathname,
        search,
        state: {
          scrollToTopDisable: true,
        },
      })
    } else {
      // selected filter is not present in the filters array -> applying it
      // sroting filter in the state
      newFilters = [
        ...filters,
        { column, filter, isExclusive },
      ]
      setFilters(newFilters)

      // storing filter in the page URL
      const url = new URL(window.location)
      url.searchParams.append(column, filter)
      const { pathname, search } = url
      history.push({
        pathname,
        search,
        state: {
          scrollToTopDisable: true,
        },
      })
    }

    sdkInstance?._emitEvent('filtersupdate', newFilters)
    loadAnalytics(true, newFilters)
  }

  // this function is used for requesting the data from the API when the exclusive filter is changed
  const onChangeExclusive = (column, filter, isExclusive) => {
    const newFilters = _map(filters, (f) => {
      if (f.column === column && f.filter === filter) {
        return {
          ...f,
          isExclusive,
        }
      }

      return f
    })

    setFilters(newFilters)
    loadAnalytics(true, newFilters)

    // storing exclusive filter in the page URL
    const url = new URL(window.location)
    url.searchParams.delete(column)
    if (isExclusive) {
      url.searchParams.append(column, `!${filter}`)
    } else {
      url.searchParams.append(column, filter)
    }
    const { pathname, search } = url
    history.push({
      pathname,
      search,
      state: {
        scrollToTopDisable: true,
      },
    })
    sdkInstance?._emitEvent('filtersupdate', newFilters)
  }

  const refreshStats = () => {
    if (!isLoading && !dataLoading) {
      loadAnalytics(true)
    }
  }

  useEffect(() => {
    if (!isLoading && !_isEmpty(chartData) && !_isEmpty(mainChart)) {
      if (showTotal) {
        mainChart.load({
          columns: getColumns(chartData, true),
        })
        mainChart.data.names({ unique: t('project.unique'), total: t('project.total') })
      } else {
        mainChart.unload({
          ids: 'total',
        })
      }
    }
  }, [isLoading, showTotal, chartData, mainChart, t])

  // Initialising Swetrix SDK instance
  useEffect(() => {
    const sdk = new SwetrixSDK([{
      cdnURL: 'http://localhost:3000/assets/test_extension.js',
      id: 'test-extension',
    }, {
      cdnURL: 'http://localhost:3000/assets/export_as_json.js',
      id: 'export-as-json',
    }], {
      debug: true,
    }, {
      onAddExportDataRow: (label, onClick) => {
        setCustomExportTypes((prev) => [
          ...prev,
          {
            label,
            onClick,
          },
        ])
      },
      onRemoveExportDataRow: (label) => {
        setCustomExportTypes((prev) => _filter(prev, (row) => row.label !== label))
      },
      onAddPanelTab: (extensionID, panelID, tabContent, onOpen) => {
        setCustomPanelTabs((prev) => [
          ...prev,
          {
            extensionID,
            panelID,
            tabContent,
            onOpen,
          },
        ])
      },
      onRemovePanelTab: (extensionID, panelID) => {
        setCustomPanelTabs((prev) => _filter(prev, (row) => row.extensionID !== extensionID && row.panelID !== panelID))
      },
    })
    setSdkInstance(sdk)

    return () => {
      sdk._destroy()
    }
  }, [])

  // Supplying 'timeupdate' event to the SDK after loading
  useEffect(() => {
    sdkInstance?._emitEvent('timeupdate', {
      period,
      timeBucket,
      dateRange: period === 'custom' ? dateRange : null,
    })
  }, [sdkInstance])

  // Supplying 'projectinfo' event to the SDK after loading
  useEffect(() => {
    if (_isEmpty(project)) {
      return
    }

    const {
      active: isActive, created, public: isPublic,
    } = project

    sdkInstance?._emitEvent('projectinfo', {
      id, name, isActive, created, isPublic,
    })
  }, [sdkInstance, name])

  useEffect(() => {
    setPeriodPairs(tbPeriodPairs(t))
  }, [t])

  // Parsing initial filters from the address bar
  useEffect(() => {
    // using try/catch because new URL is not supported by browsers like IE, so at least analytics would work without parsing filters
    try {
      const url = new URL(window.location)
      const { searchParams } = url
      const initialFilters = []
      // eslint-disable-next-line lodash/prefer-lodash-method
      searchParams.forEach((value, key) => {
        if (!_includes(validFilters, key)) {
          return
        }

        const isExclusive = _startsWith(value, '!')
        initialFilters.push({
          column: key,
          filter: isExclusive ? value.substring(1) : value,
          isExclusive,
        })
      })

      setFilters(initialFilters)
    } finally {
      setAreFiltersParsed(true)
    }
  }, [])

  useEffect(() => {
    if (arePeriodParsed) {
      try {
        const url = new URL(window.location)
        const { searchParams } = url
        const intialTimeBucket = searchParams.get('timeBucket')
        // eslint-disable-next-line lodash/prefer-lodash-method
        if (!_includes(validTimeBacket, intialTimeBucket)) {
          return
        }
        const newPeriodFull = _find(periodPairs, (el) => el.period === period)
        if (!_includes(newPeriodFull.tbs, intialTimeBucket)) {
          return
        }
        setTimebucket(intialTimeBucket)
      } finally {
        setAreTimeBucketParsed(true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arePeriodParsed])

  const onRangeDateChange = (dates, onRender) => {
    const days = Math.ceil(Math.abs(dates[1].getTime() - dates[0].getTime()) / (1000 * 3600 * 24))
    const url = new URL(window.location)

    // setting allowed time buckets for the specified date range (period)
    // eslint-disable-next-line no-restricted-syntax
    for (const index in timeBucketToDays) {
      if (timeBucketToDays[index].lt >= days) {
        let eventEmitTimeBucket = timeBucket

        if (!onRender && !_includes(timeBucketToDays[index].tb, timeBucket)) {
          // eslint-disable-next-line prefer-destructuring
          eventEmitTimeBucket = timeBucketToDays[index].tb[0]
          url.searchParams.delete('timeBucket')
          url.searchParams.append('timeBucket', eventEmitTimeBucket)
          const { pathname, search } = url
          history.push({
            pathname,
            search,
            state: {
              scrollToTopDisable: true,
            },
          })
          setTimebucket(eventEmitTimeBucket)
        }

        url.searchParams.delete('period')
        url.searchParams.delete('from')
        url.searchParams.delete('to')
        url.searchParams.append('period', 'custom')
        url.searchParams.append('from', dates[0].toISOString())
        url.searchParams.append('to', dates[1].toISOString())

        const { pathname, search } = url
        history.push({
          pathname,
          search,
          state: {
            scrollToTopDisable: true,
          },
        })

        setPeriodPairs(tbPeriodPairs(t, timeBucketToDays[index].tb, dates))
        setPeriod('custom')
        setProjectViewPrefs(id, 'custom', timeBucketToDays[index].tb[0], dates)

        sdkInstance?._emitEvent('timeupdate', {
          period: 'custom',
          timeBucket: eventEmitTimeBucket,
          dateRange: dates,
        })

        break
      }
    }
  }

  useEffect(() => {
    if (areFiltersParsed && areTimeBucketParsed && arePeriodParsed) {
      loadAnalytics()
    }
  }, [project, period, timeBucket, periodPairs, areFiltersParsed, areTimeBucketParsed, arePeriodParsed, t]) // eslint-disable-line

  useEffect(() => {
    if (dateRange && arePeriodParsed) {
      onRangeDateChange(dateRange)
    }
  }, [dateRange, t, arePeriodParsed]) // eslint-disable-line

  useEffect(() => {
    const updateLiveVisitors = async () => {
      const { id: pid } = project
      const result = await getLiveVisitors([pid])

      setLiveStatsForProject(pid, result[pid])
    }

    let interval
    if (project.uiHidden) {
      updateLiveVisitors()
      interval = setInterval(async () => {
        await updateLiveVisitors()
      }, LIVE_VISITORS_UPDATE_INTERVAL)
    }

    return () => clearInterval(interval)
  }, [project.id, setLiveStatsForProject]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLoading && _isEmpty(project)) {
      getProject(id)
        .then(projectRes => {
          if (!_isEmpty(projectRes) && projectRes?.public) {
            getOverallStats([id])
              .then(res => {
                setPublicProject({
                  ...projectRes,
                  overall: res[id],
                  live: 'N/A',
                })
              })
              .catch(e => {
                console.error(e)
                onErrorLoading()
              })

            setIsProjectPublic(true)
          } else {
            onErrorLoading()
          }
        })
        .catch(e => {
          console.error(e)
          onErrorLoading()
        })
    }
  }, [isLoading, project, id, setPublicProject]) // eslint-disable-line

  const updatePeriod = (newPeriod) => {
    const newPeriodFull = _find(periodPairs, (el) => el.period === newPeriod.period)
    let tb = timeBucket
    const url = new URL(window.location)
    if (_isEmpty(newPeriodFull)) return

    if (!_includes(newPeriodFull.tbs, timeBucket)) {
      tb = _last(newPeriodFull.tbs)
      url.searchParams.delete('timeBucket')
      url.searchParams.append('timeBucket', tb)
      setTimebucket(tb)
    }

    if (newPeriod.period !== 'custom') {
      url.searchParams.delete('period')
      url.searchParams.delete('from')
      url.searchParams.delete('to')
      url.searchParams.append('period', newPeriod.period)
      setProjectViewPrefs(id, newPeriod.period, tb)
      setPeriod(newPeriod.period)
      setDateRange(null)
    }
    const { pathname, search } = url
    history.push({
      pathname,
      search,
      state: {
        scrollToTopDisable: true,
      },
    })
    sdkInstance?._emitEvent('timeupdate', {
      period: newPeriod.period,
      timeBucket: tb,
      dateRange: newPeriod.period === 'custom' ? dateRange : null,
    })
  }

  const updateTimebucket = (newTimebucket) => {
    const url = new URL(window.location)
    url.searchParams.delete('timeBucket')
    url.searchParams.append('timeBucket', newTimebucket)
    const { pathname, search } = url
    history.push({
      pathname,
      search,
      state: {
        scrollToTopDisable: true,
      },
    })
    setTimebucket(newTimebucket)
    setProjectViewPrefs(id, period, newTimebucket, dateRange)
    sdkInstance?._emitEvent('timeupdate', {
      period,
      timeBucket: newTimebucket,
      dateRange,
    })
  }

  const openSettingsHandler = () => {
    history.push(_replace(routes.project_settings, ':id', id))
  }

  const exportAsImageHandler = async () => {
    setShowIcons(false)
    try {
      const blob = await domToImage.toBlob(dashboardRef.current)
      saveAs(blob, `swetrix-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.png`)
    } catch (e) {
      showError(t('project.exportImgError'))
      console.error('[ERROR] Error while generating export image.')
      console.error(e)
    } finally {
      setShowIcons(true)
    }
  }

  useEffect(() => {
    try {
      const url = new URL(window.location)
      const { searchParams } = url
      const intialPeriod = searchParams.get('period')
      if (!_includes(validPeriods, intialPeriod) || (!isSharedProject && id !== SWETRIX_PID && !isPaidTierUsed && _includes(paidPeriods, intialPeriod))) {
        return
      }

      if (intialPeriod === 'custom') {
        const from = new Date(searchParams.get('from'))
        const to = new Date(searchParams.get('to'))
        if (from.getDate() && to.getDate()) {
          onRangeDateChange([from, to], true)
          setDateRange([from, to])
        }
        return
      }

      setPeriodPairs(tbPeriodPairs(t))
      setDateRange(null)
      updatePeriod({ period: intialPeriod })
    } finally {
      setArePeriodParsed(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetFilters = () => {
    const url = new URL(window.location)
    const { searchParams } = url
    // eslint-disable-next-line lodash/prefer-lodash-method
    searchParams.forEach((value, key) => {
      if (!_includes(validFilters, key)) {
        return
      }
      searchParams.delete(key)
    })
    const { pathname, search } = url
    history.push({
      pathname,
      search,
      state: {
        scrollToTopDisable: true,
      },
    })
    setFilters([])
    loadAnalytics(true, [])
  }

  const exportTypes = [
    { label: t('project.asImage'), onClick: exportAsImageHandler },
    { label: t('project.asCSV'), onClick: () => onCSVExportClick(panelsData, id, tnMapping, language) },
  ]

  if (!isLoading) {
    return (
      <Title title={name}>
        <EventsRunningOutBanner />
        <div
          className={cx(
            'bg-gray-50 dark:bg-gray-800 py-6 px-4 sm:px-6 lg:px-8',
            {
              'min-h-min-footer': authenticated,
              'min-h-min-footer-ad': !authenticated,
            },
          )}
          ref={dashboardRef}
        >
          <div className='flex flex-col md:flex-row items-center md:items-start justify-between h-10'>
            <h2 className='text-3xl font-bold text-gray-900 dark:text-gray-50 break-words'>
              {name}
            </h2>
            <div className='flex mt-3 md:mt-0'>
              <div className='md:border-r border-gray-200 dark:border-gray-600 md:pr-3 mr-3'>
                <button
                  type='button'
                  onClick={refreshStats}
                  className={cx('relative shadow-sm rounded-md mt-[1px] px-3 md:px-4 py-2 bg-white text-sm font-medium hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200', {
                    'cursor-not-allowed opacity-50': isLoading || dataLoading,
                  })}
                >
                  <ArrowPathIcon className='w-5 h-5 text-gray-700 dark:text-gray-50' />
                </button>
              </div>
              <div className='md:border-r border-gray-200 dark:border-gray-600 md:pr-3 mr-3'>
                <span className='relative z-0 inline-flex shadow-sm rounded-md'>
                  {_map(activePeriod.tbs, (tb, index, { length }) => (
                    <button
                      key={tb}
                      type='button'
                      onClick={() => updateTimebucket(tb)}
                      className={cx(
                        'relative capitalize inline-flex items-center px-3 md:px-4 py-2 border bg-white text-sm font-medium hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200',
                        {
                          '-ml-px': index > 0,
                          'rounded-l-md': index === 0,
                          'rounded-r-md': 1 + index === length,
                          'z-10 border-indigo-500 text-indigo-600 dark:border-gray-200 dark:text-gray-50': timeBucket === tb,
                          'text-gray-700 dark:text-gray-50 border-gray-300 dark:border-gray-800 ': timeBucket !== tb,
                        },
                      )}
                    >
                      {t(`project.${tb}`)}
                    </button>
                  ))}
                </span>
              </div>
              <Dropdown
                items={periodPairs}
                title={activePeriod.label}
                labelExtractor={(pair) => {
                  const label = pair.dropdownLabel || pair.label

                  // disable limitation for shared projects as project hosts already have a paid plan
                  // disable limitation for Swetrix public project (for demonstration purposes)
                  if (!isSharedProject && id !== SWETRIX_PID && !isPaidTierUsed && pair.access === 'paid') {
                    return (
                      <span className='flex items-center'>
                        <CurrencyDollarIcon className='w-4 h-4 mr-1' />
                        {label}
                      </span>
                    )
                  }

                  return label
                }}
                keyExtractor={(pair) => pair.label}
                onSelect={(pair) => {
                  if (!isSharedProject && id !== SWETRIX_PID && !isPaidTierUsed && pair.access === 'paid') {
                    setIsPaidFeatureOpened(true)
                    return
                  }

                  if (pair.isCustomDate) {
                    setTimeout(() => {
                      refCalendar.current.openCalendar()
                    }, 100)
                  } else {
                    setPeriodPairs(tbPeriodPairs(t))
                    setDateRange(null)
                    updatePeriod(pair)
                  }
                }}
              />
              <FlatPicker
                ref={refCalendar}
                onChange={(date) => setDateRange(date)}
                value={dateRange}
                maxDateMonths={(isPaidTierUsed || id === SWETRIX_PID || isSharedProject) ? MAX_MONTHS_IN_PAST : MAX_MONTHS_IN_PAST_FREE}
              />
            </div>
          </div>
          <div className='flex flex-row flex-wrap items-center justify-center md:justify-end h-10 mt-16 md:mt-5 mb-4'>
            <Checkbox
              className={cx({ hidden: isPanelsDataEmpty || analyticsLoading })}
              label={t('project.showAll')}
              id='views'
              checked={showTotal}
              onChange={(e) => setShowTotal(e.target.checked)}
            />
            <Dropdown
              items={[...exportTypes, ...customExportTypes]}
              title={[
                <ArrowDownTrayIcon key='download-icon' className='w-5 h-5 mr-2' />,
                <Fragment key='export-data'>
                  {t('project.exportData')}
                </Fragment>,
              ]}
              labelExtractor={item => item.label}
              keyExtractor={item => item.label}
              onSelect={item => item.onClick(panelsData, t)}
              className={cx('ml-3', { hidden: isPanelsDataEmpty || analyticsLoading })}
            />
            {(!isProjectPublic && !(sharedRoles === roleViewer.role)) && (
              <Button
                onClick={openSettingsHandler}
                className='relative flex justify-center items-center py-2 !pr-3 !pl-1 md:pr-4 md:pl-2 ml-3 text-sm dark:text-gray-50 dark:border-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600'
                secondary
              >
                <Cog8ToothIcon className='w-5 h-5 mr-1' />
                {t('common.settings')}
              </Button>
            )}
          </div>
          {analyticsLoading && (
            <Loader />
          )}
          {isPanelsDataEmpty && (
            <NoEvents t={t} filters={filters} resetFilters={resetFilters} />
          )}
          <div className={cx('pt-4 md:pt-0', { hidden: isPanelsDataEmpty || analyticsLoading })}>
            <div className='h-80' id='dataChart' />
            <Filters
              filters={filters}
              onRemoveFilter={filterHandler}
              onChangeExclusive={onChangeExclusive}
              language={language}
              t={t}
              tnMapping={tnMapping}
            />
            {dataLoading && (
              <div className='loader bg-transparent static mt-4' id='loader'>
                <div className='loader-head'>
                  <div className='first' />
                  <div className='second' />
                </div>
              </div>
            )}
            <div className='mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
              {!_isEmpty(project.overall) && (
                <Overview
                  t={t}
                  overall={project.overall}
                  chartData={chartData}
                  activePeriod={activePeriod}
                  live={project.live}
                />
              )}
              {_map(panelsData.types, (type) => {
                const panelName = tnMapping[type]
                const panelIcon = panelIconMapping[type]
                const customTabs = _filter(customPanelTabs, tab => tab.panelID === type)

                if (type === 'cc') {
                  return (
                    <Panel
                      t={t}
                      key={type}
                      icon={panelIcon}
                      id={type}
                      onFilter={filterHandler}
                      name={panelName}
                      data={panelsData.data[type]}
                      customTabs={customTabs}
                      rowMapper={(rowName) => (
                        <CCRow rowName={rowName} language={language} />
                      )}
                    />
                  )
                }

                if (type === 'dv') {
                  return (
                    <Panel
                      t={t}
                      key={type}
                      icon={panelIcon}
                      id={type}
                      onFilter={filterHandler}
                      name={panelName}
                      data={panelsData.data[type]}
                      customTabs={customTabs}
                      capitalize
                    />
                  )
                }

                if (type === 'ref') {
                  return (
                    <Panel
                      t={t}
                      key={type}
                      icon={panelIcon}
                      id={type}
                      onFilter={filterHandler}
                      name={panelName}
                      data={panelsData.data[type]}
                      customTabs={customTabs}
                      rowMapper={(rowName) => (
                        <RefRow rowName={rowName} showIcons={showIcons} />
                      )}
                    />
                  )
                }

                return (
                  <Panel
                    t={t}
                    key={type}
                    icon={panelIcon}
                    id={type}
                    onFilter={filterHandler}
                    name={panelName}
                    data={panelsData.data[type]}
                    customTabs={customTabs}
                  />
                )
              })}
              {!_isEmpty(panelsData.customs) && (
                <CustomEvents
                  t={t}
                  customs={panelsData.customs}
                  chartData={chartData}
                />
              )}
            </div>
          </div>
        </div>
        {!authenticated && (
          <div className='bg-indigo-600'>
            <div className='w-11/12 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 lg:flex lg:items-center lg:justify-between'>
              <h2 className='text-3xl sm:text-4xl font-bold tracking-tight text-gray-900'>
                <span className='block text-white'>{t('project.ad')}</span>
                <span className='block text-gray-300'>
                  {t('main.exploreService')}
                </span>
              </h2>
              <div className='mt-6 space-y-4 sm:space-y-0 sm:flex sm:space-x-5'>
                <Link
                  to={routes.signup}
                  className='flex items-center justify-center px-3 py-2 border border-transparent text-lg font-medium rounded-md shadow-sm text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
                >
                  {t('common.getStarted')}
                </Link>
                <Link
                  to={routes.main}
                  className='flex items-center justify-center px-3 py-2 border border-transparent text-lg font-medium rounded-md shadow-sm text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
                >
                  {t('common.explore')}
                </Link>
              </div>
            </div>
          </div>
        )}
        <PaidFeature
          isOpened={isPaidFeatureOpened}
          onClose={() => setIsPaidFeatureOpened(false)}
        />
      </Title>
    )
  }

  return (
    <Title title={name}>
      <div className='min-h-min-footer bg-gray-50 dark:bg-gray-800'>
        <Loader />
      </div>
    </Title>
  )
}

ViewProject.propTypes = {
  projects: PropTypes.arrayOf(PropTypes.object).isRequired,
  sharedProjects: PropTypes.arrayOf(PropTypes.object).isRequired,
  cache: PropTypes.objectOf(PropTypes.object).isRequired,
  projectViewPrefs: PropTypes.objectOf(PropTypes.object).isRequired,
  showError: PropTypes.func.isRequired,
  setProjectCache: PropTypes.func.isRequired,
  setProjectViewPrefs: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  setPublicProject: PropTypes.func.isRequired,
  setLiveStatsForProject: PropTypes.func.isRequired,
  authenticated: PropTypes.bool.isRequired,
  isPaidTierUsed: PropTypes.bool.isRequired,
  timezone: PropTypes.string,
}

ViewProject.defaultProps = {
  timezone: DEFAULT_TIMEZONE,
}

export default memo(ViewProject)
