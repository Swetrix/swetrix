/* eslint-disable react/forbid-prop-types, react/no-unstable-nested-components, react/display-name */
import React, {
  useState, useEffect, useMemo, memo, useRef, Fragment,
} from 'react'
import useSize from 'hooks/useSize'
import { useNavigate, useParams, Link } from '@remix-run/react'
// @ts-ignore
import domToImage from 'dom-to-image'
// @ts-ignore
import { saveAs } from 'file-saver'
import bb from 'billboard.js'
import {
  ArrowDownTrayIcon, Cog8ToothIcon, ArrowPathIcon, PresentationChartBarIcon, PresentationChartLineIcon,
} from '@heroicons/react/24/outline'
import cx from 'clsx'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _includes from 'lodash/includes'
import _last from 'lodash/last'
import _isEmpty from 'lodash/isEmpty'
import _replace from 'lodash/replace'
import _find from 'lodash/find'
import _filter from 'lodash/filter'
import _startsWith from 'lodash/startsWith'
import _debounce from 'lodash/debounce'
import _some from 'lodash/some'
import PropTypes from 'prop-types'

import { getItem, setItem } from 'utils/localstorage'
import EventsRunningOutBanner from 'components/EventsRunningOutBanner'
import {
  tbPeriodPairs, getProjectCaptchaCacheKey, timeBucketToDays, getProjectCacheCustomKey, roleAdmin,
  MAX_MONTHS_IN_PAST, TimeFormat, chartTypes, TITLE_SUFFIX,
} from 'redux/constants'
import { ICaptchaProject, IProject, ILiveStats } from 'redux/models/IProject'
import { IUser } from 'redux/models/IUser'
import Button from 'ui/Button'
import Loader from 'ui/Loader'
import Dropdown from 'ui/Dropdown'
import Checkbox from 'ui/Checkbox'
import FlatPicker from 'ui/Flatpicker'
import routes from 'routesPath'
import {
  getProject, getOverallStats, getLiveVisitors, getCaptchaData,
} from 'api'
import {
  Panel, CustomEvents, // Overview,
} from './Panels'
import {
  onCSVExportClick, getFormatDate, panelIconMapping, typeNameMapping, validFilters, validPeriods,
  validTimeBacket, noRegionPeriods, getSettings, CHART_METRICS_MAPPING,
} from './ViewCaptcha.helpers'
import CCRow from './components/CCRow'
import RefRow from './components/RefRow'
import NoEvents from './components/NoEvents'
import Filters from './components/Filters'

const ViewProject = ({
  projects, isLoading: _isLoading, showError, cache, setProjectCache, projectViewPrefs, setProjectViewPrefs, authenticated, user, setProjects, liveStats,
}: {
  projects: ICaptchaProject[],
  isLoading: boolean,
  showError: (message: string) => void,
  cache: any,
  setProjectCache: (pid: string, data: any, key: string) => void,
  projectViewPrefs: any,
  setProjectViewPrefs: (pid: string, period: string, timeBucket: string, rangeDate?: Date[] | null) => void,
  authenticated: boolean,
  user: IUser,
  // eslint-disable-next-line no-unused-vars, no-shadow
  setProjects: (projects: ICaptchaProject[]) => void,
  liveStats: ILiveStats,
}): JSX.Element => {
  const { t, i18n: { language } }: {
    t: (key: string, options?: {
      [key: string]: string | number | boolean | undefined | null,
    }) => string,
    i18n: { language: string },
  } = useTranslation('common')
  const [periodPairs, setPeriodPairs] = useState(tbPeriodPairs(t))
  const dashboardRef = useRef(null)
  // @ts-ignore
  const { id }: {
    id: string,
  } = useParams()
  const navigate = useNavigate()
  const project: ICaptchaProject = useMemo(() => _find(projects, p => p.id === id) || {} as ICaptchaProject, [projects, id])
  const [areFiltersParsed, setAreFiltersParsed] = useState<boolean>(false)
  const [areTimeBucketParsed, setAreTimeBucketParsed] = useState<boolean>(false)
  const [arePeriodParsed, setArePeriodParsed] = useState<boolean>(false)
  const [panelsData, setPanelsData] = useState<any>({})
  const [isPanelsDataEmpty, setIsPanelsDataEmpty] = useState<boolean>(false)
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(true)
  const [period, setPeriod] = useState<string>(projectViewPrefs ? projectViewPrefs[id]?.period || periodPairs[3].period : periodPairs[3].period)
  const [timeBucket, setTimebucket] = useState<string>(projectViewPrefs ? projectViewPrefs[id]?.timeBucket || periodPairs[3].tbs[1] : periodPairs[3].tbs[1])
  const activePeriod: {
    period: string,
    label: string,
    tbs: string[],
  } = useMemo(() => _find(periodPairs, p => p.period === period) || {
    period: periodPairs[3].period,
    tbs: periodPairs[3].tbs,
    label: periodPairs[3].label,
  }, [period, periodPairs])
  const [chartData, setChartData] = useState<any>({})
  const [dataLoading, setDataLoading] = useState<boolean>(false)
  const [activeChartMetrics, setActiveChartMetrics] = useState<{
    [key: string]: boolean,
  }>({
    [CHART_METRICS_MAPPING.results]: true,
  })
  const checkIfAllMetricsAreDisabled = useMemo(() => !_some(activeChartMetrics, (value) => value), [activeChartMetrics])
  const [filters, setFilters] = useState<any[]>([])
  // That is needed when using 'Export as image' feature,
  // Because headless browser cannot do a request to the DDG API due to absense of The Same Origin Policy header
  const [showIcons, setShowIcons] = useState<boolean>(true)
  const isLoading = authenticated ? _isLoading : false
  const tnMapping = typeNameMapping(t)
  const refCalendar = useRef(null)
  const localStorageDateRange = projectViewPrefs ? projectViewPrefs[id]?.rangeDate : null
  const [dateRange, setDateRange] = useState<Date[] | null>(localStorageDateRange ? [new Date(localStorageDateRange[0]), new Date(localStorageDateRange[1])] : null)

  const timeFormat = useMemo(() => user.timeFormat || TimeFormat['12-hour'], [user])
  const [ref, size] = useSize() as any
  const rotateXAxias = useMemo(() => (size.width > 0 && size.width < 500), [size])
  const [chartType, setChartType] = useState<string>(getItem('chartType') as string || chartTypes.line)

  const { name } = project as IProject

  useEffect(() => {
    let pageTitle = name

    if (!name) {
      pageTitle = t('titles.main')
    }

    pageTitle += ` ${TITLE_SUFFIX}`

    document.title = pageTitle
  }, [name, t])

  // @ts-ignore
  const sharedRoles = useMemo(() => _find(user.sharedProjects, p => p.project.id === id)?.role || {}, [user, id])

  const chartMetrics = useMemo(() => {
    return [
      {
        id: CHART_METRICS_MAPPING.results,
        label: t('project.results'),
        active: activeChartMetrics[CHART_METRICS_MAPPING.results],
      },
    ]
  }, [t, activeChartMetrics])

  const dataNames = useMemo(() => {
    return {
      results: t('project.results'),
    }
  }, [t])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const switchActiveChartMetric = _debounce((pairID) => {
    setActiveChartMetrics(prev => ({ ...prev, [pairID]: !prev[pairID] }))
  })

  const onErrorLoading = () => {
    showError(t('project.noExist'))
    navigate(routes.dashboard)
  }

  // this function is used for requesting the data from the API
  const loadAnalytics = async (forced: boolean = false, newFilters: any = null) => {
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
        key = getProjectCacheCustomKey(from, to, timeBucket, newFilters || filters)
      } else {
        key = getProjectCaptchaCacheKey(period, timeBucket, newFilters || filters)
      }

      if (!forced && !_isEmpty(cache[id]) && !_isEmpty(cache[id][key])) {
        data = cache[id][key]
      } else {
        if (period === 'custom' && dateRange) {
          data = await getCaptchaData(id, timeBucket, '', newFilters || filters, from, to)
        } else {
          data = await getCaptchaData(id, timeBucket, period, newFilters || filters, '', '')
        }

        setProjectCache(id, data || {}, key)
      }

      if (_isEmpty(data)) {
        setAnalyticsLoading(false)
        setDataLoading(false)
        setIsPanelsDataEmpty(true)
        return
      }

      const {
        chart, params, customs, appliedFilters,
      } = data

      if (!_isEmpty(appliedFilters)) {
        setFilters(appliedFilters)
      }

      if (_isEmpty(params)) {
        setIsPanelsDataEmpty(true)
      } else {
        const applyRegions = !_includes(noRegionPeriods, activePeriod.period)
        const bbSettings: any = getSettings(chart, timeBucket, activeChartMetrics, applyRegions, timeFormat, rotateXAxias, chartType)
        setChartData(chart)

        setPanelsData({
          types: _keys(params),
          data: params,
          customs,
        })

        const generete = bb.generate(bbSettings)
        generete.data.names(dataNames)

        setIsPanelsDataEmpty(false)
      }

      setAnalyticsLoading(false)
      setDataLoading(false)
    } catch (e) {
      setAnalyticsLoading(false)
      setDataLoading(false)
      setIsPanelsDataEmpty(true)
      console.error('[ERROR](loadAnalytics) Loading analytics data failed')
      console.error(e)
    }
  }

  useEffect(() => {
    loadAnalytics()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType])

  // this funtion is used for requesting the data from the API when the filter is changed
  const filterHandler = (column: any, filter: any, isExclusive: boolean = false) => {
    let newFilters

    // eslint-disable-next-line no-lonely-if
    if (_find(filters, (f) => f.column === column) /* && f.filter === filter) */) {
      // selected filter is already included into the filters array -> removing it
      // removing filter from the state
      newFilters = _filter(filters, (f) => f.column !== column)
      setFilters(newFilters)

      // removing filter from the page URL
      // @ts-ignore
      const url = new URL(window.location)
      url.searchParams.delete(column)
      const { pathname, search } = url
      navigate(`${pathname}${search}`)
    } else {
      // selected filter is not present in the filters array -> applying it
      // sroting filter in the state
      newFilters = [
        ...filters,
        { column, filter, isExclusive },
      ]
      setFilters(newFilters)

      // storing filter in the page URL
      // @ts-ignore
      const url = new URL(window.location)
      url.searchParams.append(column, filter)
      const { pathname, search } = url
      navigate(`${pathname}${search}`)
    }

    loadAnalytics(true, newFilters)
  }

  // this function is used for requesting the data from the API when the exclusive filter is changed
  const onChangeExclusive = (column: any, filter: any, isExclusive: boolean) => {
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
    // @ts-ignore
    const url = new URL(window.location)

    url.searchParams.delete(column)
    url.searchParams.append(column, filter)

    const { pathname, search } = url
    navigate(`${pathname}${search}`)
  }

  const refreshStats = () => {
    if (!isLoading && !dataLoading) {
      loadAnalytics(true)
    }
  }

  // Parsing initial filters from the address bar
  useEffect(() => {
    // using try/catch because new URL is not supported by browsers like IE, so at least analytics would work without parsing filters
    try {
      // @ts-ignore
      const url = new URL(window.location)
      const { searchParams } = url
      const initialFilters: any[] = []
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
        // @ts-ignore
        const url = new URL(window.location)
        const { searchParams } = url
        const intialTimeBucket: string = searchParams.get('timeBucket') || ''
        // eslint-disable-next-line lodash/prefer-lodash-method
        if (!_includes(validTimeBacket, intialTimeBucket)) {
          return
        }
        const newPeriodFull = _find(periodPairs, (el) => el.period === period) || {
          period: '',
          tbs: [],
          label: '',
        }
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

  const onRangeDateChange = (dates: Date[], onRender?: any) => {
    const days = Math.ceil(Math.abs(dates[1].getTime() - dates[0].getTime()) / (1000 * 3600 * 24))
    // @ts-ignore
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
          navigate(`${pathname}${search}`)
          setTimebucket(eventEmitTimeBucket)
        }

        url.searchParams.delete('period')
        url.searchParams.delete('from')
        url.searchParams.delete('to')
        url.searchParams.append('period', 'custom')
        url.searchParams.append('from', dates[0].toISOString())
        url.searchParams.append('to', dates[1].toISOString())

        const { pathname, search } = url
        navigate(`${pathname}${search}`)

        setPeriodPairs(tbPeriodPairs(t, timeBucketToDays[index].tb, dates))
        setPeriod('custom')
        setProjectViewPrefs(id, 'custom', timeBucketToDays[4].tb[0], dates)

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
    if (!isLoading && _isEmpty(project)) {
      getProject(id, true)
        .then(projectRes => {
          if (!_isEmpty(projectRes)) {
            getOverallStats([id])
              .then(res => {
                setProjects([...(projects as any[]), {
                  ...projectRes,
                  overall: res[id],
                  live: 'N/A',
                }])
              })
              .then(() => {
                return getLiveVisitors([id])
              })
              .catch(e => {
                console.error(e)
                onErrorLoading()
              })
          } else {
            onErrorLoading()
          }
        })
        .catch(e => {
          console.error(e)
          onErrorLoading()
        })
    }
  }, [isLoading, project, id]) // eslint-disable-line

  const updatePeriod = (newPeriod: any) => {
    const newPeriodFull = _find(periodPairs, (el) => el.period === newPeriod.period)
    let tb: any = timeBucket
    // @ts-ignore
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
    navigate(`${pathname}${search}`)
  }

  const updateTimebucket = (newTimebucket: string) => {
    // @ts-ignore
    const url = new URL(window.location)
    url.searchParams.delete('timeBucket')
    url.searchParams.append('timeBucket', newTimebucket)
    const { pathname, search } = url
    navigate(`${pathname}${search}`)
    setTimebucket(newTimebucket)
    setProjectViewPrefs(id, period, newTimebucket, dateRange)
  }

  const openSettingsHandler = () => {
    navigate(_replace(routes.captcha_settings, ':id', id))
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
      // @ts-ignore
      const url = new URL(window.location)
      const { searchParams } = url
      const intialPeriod = projectViewPrefs ? searchParams.get('period') || projectViewPrefs[id]?.period : searchParams.get('period') || '7d'
      if (!_includes(validPeriods, intialPeriod)) {
        return
      }

      if (intialPeriod === 'custom') {
        // @ts-ignore
        const from = new Date(searchParams.get('from'))
        // @ts-ignore
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
    // @ts-ignore
    const url: URL = new URL(window.location)
    const { searchParams } = url
    // eslint-disable-next-line lodash/prefer-lodash-method
    searchParams.forEach((value, key) => {
      if (!_includes(validFilters, key)) {
        return
      }
      searchParams.delete(key)
    })
    const { pathname, search } = url
    navigate(`${pathname}${search}`)
    setFilters([])
    loadAnalytics(true, [])
  }

  const exportTypes = [
    { label: t('project.asImage'), onClick: exportAsImageHandler },
    {
      label: t('project.asCSV'),
      onClick: () => {
        return onCSVExportClick(panelsData, id, tnMapping, language)
      },
    },
  ]

  // function set chart type and save to local storage
  const setChartTypeOnClick = (type: string) => {
    setItem('chartType', type)
    setChartType(type)
  }

  // useEffect to change chart if we change chart type
  useEffect(() => {
    loadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType])

  if (!isLoading) {
    return (
      <>
        <EventsRunningOutBanner />
        <div ref={ref} className='bg-gray-50 dark:bg-slate-900'>
          <div
            className={cx(
              'max-w-[1584px] w-full mx-auto py-6 px-2 sm:px-4 lg:px-8',
              {
                'min-h-min-footer': authenticated,
                'min-h-min-footer-ad': !authenticated,
              },
            )}
            ref={dashboardRef}
          >
            <div className='flex flex-col md:flex-row items-center md:items-start justify-between mt-2'>
              <h2 className='text-3xl font-bold text-gray-900 dark:text-gray-50 break-words break-all'>
                {name}
              </h2>
              <div className='flex mt-3 md:mt-0 max-w-[420px] flex-wrap items-center sm:max-w-none justify-between w-full sm:w-auto mx-auto sm:mx-0'>
                <div className='md:border-r border-gray-200 dark:border-gray-600 md:pr-3 sm:mr-3'>
                  <button
                    type='button'
                    title={t('project.refreshStats')}
                    onClick={refreshStats}
                    className={cx('relative shadow-sm rounded-md mt-[1px] px-3 md:px-4 py-2 bg-white text-sm font-medium hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200', {
                      'cursor-not-allowed opacity-50': isLoading || dataLoading,
                    })}
                  >
                    <ArrowPathIcon className='w-5 h-5 text-gray-700 dark:text-gray-50' />
                  </button>
                </div>
                <div className='md:border-r border-gray-200 dark:border-gray-600 md:pr-3 sm:mr-3'>
                  <span className='relative z-0 inline-flex shadow-sm rounded-md'>
                    {_map(activePeriod.tbs, (tb, index, { length }) => (
                      <button
                        key={tb}
                        type='button'
                        onClick={() => updateTimebucket(tb)}
                        className={cx(
                          'relative capitalize inline-flex items-center px-3 md:px-4 py-2 border bg-white text-sm font-medium hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200',
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
                  labelExtractor={(pair) => pair.dropdownLabel || pair.label}
                  keyExtractor={(pair) => pair.label}
                  onSelect={(pair) => {
                    if (pair.isCustomDate) {
                      setTimeout(() => {
                        // @ts-ignore
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
                  value={dateRange || []}
                  maxDateMonths={MAX_MONTHS_IN_PAST}
                />
              </div>
            </div>
            <div>
              <div className='flex flex-row flex-wrap items-center justify-center md:justify-end h-10 mt-2 md:mt-5 mb-4'>
                {!isPanelsDataEmpty && (
                <Dropdown
                  items={chartMetrics}
                  title={t('project.metricVis')}
                  labelExtractor={(pair) => {
                    const {
                      label, id: pairID, active,
                    } = pair

                    return (
                      <Checkbox
                        className={cx({ hidden: isPanelsDataEmpty || analyticsLoading })}
                        label={label}
                        id={pairID}
                        checked={active}
                      />
                    )
                  }}
                  keyExtractor={(pair) => pair.id}
                  onSelect={({ id: pairID }) => {
                    switchActiveChartMetric(pairID)
                  }}
                />
                )}
                <Dropdown
                  items={exportTypes}
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
                {(project?.isOwner || sharedRoles === roleAdmin.role) && (
                  <Button
                    onClick={openSettingsHandler}
                    className='relative flex justify-center items-center !pr-3 pl-2 py-2 md:pr-4 ml-3 text-sm dark:text-gray-50 dark:border-gray-800 dark:bg-slate-800 dark:hover:bg-slate-700'
                    secondary
                  >
                    <>
                      <Cog8ToothIcon className='w-5 h-5 mr-1' />
                      {t('common.settings')}
                    </>
                  </Button>
                )}
              </div>
            </div>
            <div
              className={cx({
                hidden: isPanelsDataEmpty || analyticsLoading,
              })}
            >
              <div className='mt-14 xs:mt-0' />
              <div className='relative'>
                <div className='absolute right-0 z-10 -top-2'>
                  <button
                    type='button'
                    title={t('project.barChart')}
                    onClick={() => setChartTypeOnClick(chartTypes.bar)}
                    className={cx('px-2.5 py-1.5 text-xs rounded-md text-gray-700 bg-white hover:bg-gray-50 border-transparent !border-0 dark:text-gray-50 dark:bg-slate-900 dark:hover:bg-gray-700 focus:outline-none focus:!ring-0 focus:!ring-offset-0 focus:!ring-transparent', {
                      'text-indigo-600 dark:text-indigo-500 shadow-md': chartType === chartTypes.bar,
                      'text-gray-400 dark:text-gray-500': chartType !== chartTypes.bar,
                    })}
                  >
                    <PresentationChartBarIcon className='w-6 h-6' />
                  </button>
                  <button
                    type='button'
                    title={t('project.lineChart')}
                    onClick={() => setChartTypeOnClick(chartTypes.line)}
                    className={cx('px-2.5 py-1.5 text-xs rounded-md text-gray-700 bg-white hover:bg-gray-50 border-transparent !border-0 dark:text-gray-50 dark:bg-slate-900 dark:hover:bg-gray-700 focus:!outline-0 focus:!ring-0 focus:!ring-offset-0 focus:!ring-transparent', {
                      'text-indigo-600 dark:text-indigo-500 shadow-md': chartType === chartTypes.line,
                      'text-gray-400 dark:text-gray-500': chartType !== chartTypes.line,
                    })}
                  >
                    <PresentationChartLineIcon className='w-6 h-6' />
                  </button>
                </div>
              </div>
            </div>
            {(analyticsLoading) && (
              <Loader />
            )}
            {(isPanelsDataEmpty) && (
              <NoEvents filters={filters} resetFilters={resetFilters} />
            )}
            <div className={cx('pt-4 md:pt-0', { hidden: isPanelsDataEmpty || analyticsLoading })}>
              <div
                className={cx('h-80', {
                  hidden: checkIfAllMetricsAreDisabled,
                })}
              >
                <div className='h-80' id='dataChart' />
              </div>
              <Filters
                filters={filters}
                onRemoveFilter={filterHandler}
                onChangeExclusive={onChangeExclusive}
                tnMapping={tnMapping}
              />
              {dataLoading && (
              <div className='loader bg-transparent static mt-4' id='loader'>
                <div className='loader-head dark:bg-slate-800'>
                  <div className='first dark:bg-slate-600' />
                  <div className='second dark:bg-slate-600' />
                </div>
              </div>
              )}
              <div className='mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                {/* {!_isEmpty(project.overall) && (
                  <Overview
                    t={t}
                    overall={project.overall}
                    chartData={chartData}
                    activePeriod={activePeriod}
                    sessionDurationAVG={sessionDurationAVG}
                    live={liveStats[id] || 'N/A'}
                    projectId={id}
                  />
                )} */}
                {_map(panelsData.types, (type: keyof typeof tnMapping) => {
                  const panelName = tnMapping[type]
                  // @ts-ignore
                  const panelIcon = panelIconMapping[type]

                  if (type === 'cc') {
                    return (
                      <Panel
                        t={t}
                        icon={panelIcon}
                        id={type}
                        key={type}
                        onFilter={filterHandler}
                        name={panelName}
                        data={panelsData.data[type]}
                        rowMapper={({ name: entryName, cc }) => (
                          <CCRow cc={cc} name={entryName} language={language} />
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
                        rowMapper={({ name: entryName }) => (
                          <RefRow rowName={entryName} showIcons={showIcons} />
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
                    />
                  )
                })}
                {!_isEmpty(panelsData.customs) && (
                <CustomEvents
                  t={t}
                  customs={panelsData.customs}
                  onFilter={filterHandler}
                  chartData={chartData}
                />
                )}
              </div>
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
                  aria-label={t('titles.signup')}
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
      </>
    )
  }

  return (
    <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
      <Loader />
    </div>
  )
}

ViewProject.propTypes = {
  projects: PropTypes.arrayOf(PropTypes.object).isRequired,
  cache: PropTypes.objectOf(PropTypes.object).isRequired,
  projectViewPrefs: PropTypes.objectOf(PropTypes.object).isRequired,
  showError: PropTypes.func.isRequired,
  setProjectCache: PropTypes.func.isRequired,
  setProjectViewPrefs: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  authenticated: PropTypes.bool.isRequired,
}

export default memo(ViewProject)
