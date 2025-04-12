import { GlobeAltIcon } from '@heroicons/react/24/outline'
import billboard from 'billboard.js'
import cx from 'clsx'
import _filter from 'lodash/filter'
import _find from 'lodash/find'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _last from 'lodash/last'
import _map from 'lodash/map'
import _replace from 'lodash/replace'
import _startsWith from 'lodash/startsWith'
import { DownloadIcon, RotateCw, SettingsIcon } from 'lucide-react'
import { useState, useEffect, useMemo, memo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'

import { getCaptchaData } from '~/api'
import EventsRunningOutBanner from '~/components/EventsRunningOutBanner'
import useSize from '~/hooks/useSize'
import {
  captchaTbPeriodPairs,
  timeBucketToDays,
  MAX_MONTHS_IN_PAST,
  TimeFormat,
  chartTypes,
  TITLE_SUFFIX,
  KEY_FOR_ALL_TIME,
  BROWSER_LOGO_MAP,
  OS_LOGO_MAP,
  OS_LOGO_MAP_DARK,
  isBrowser,
  ThemeType,
  DEFAULT_TIMEZONE,
} from '~/lib/constants'
import { StateType } from '~/lib/store'
import { Panel } from '~/pages/Project/View/Panels'
import { useCurrentProject } from '~/pages/Project/View/providers/CurrentProjectProvider'
import { parseFiltersFromUrl } from '~/pages/Project/View/utils/filters'
import { ViewProjectContext } from '~/pages/Project/View/ViewProject'
import { deviceIconMapping, onCSVExportClick } from '~/pages/Project/View/ViewProject.helpers'
import Dropdown from '~/ui/Dropdown'
import FlatPicker from '~/ui/Flatpicker'
import BarChart from '~/ui/icons/BarChart'
import LineChart from '~/ui/icons/LineChart'
import Loader from '~/ui/Loader'
import { getItem, setItem } from '~/utils/localstorage'
import routes from '~/utils/routes'

import CCRow from '../../Project/View/components/CCRow'

import Filters from './components/Filters'
import NoEvents from './components/NoEvents'
import TBPeriodSelector from './components/TBPeriodSelector'
import {
  getFormatDate,
  panelIconMapping,
  typeNameMapping,
  validFilters,
  validPeriods,
  validTimeBacket,
  noRegionPeriods,
  getSettings,
  getColumns,
  PANELS_ORDER,
} from './ViewCaptcha.helpers'

const PageLoader = () => (
  <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
    <Loader />
  </div>
)

interface ViewCaptchaProps {
  ssrTheme: ThemeType
}

const ViewCaptcha = ({ ssrTheme }: ViewCaptchaProps) => {
  const { id, project, preferences, updatePreferences } = useCurrentProject()

  const { loading: authLoading, user } = useSelector((state: StateType) => state.auth)
  const { theme } = useSelector((state: StateType) => state.ui.theme)

  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const [periodPairs, setPeriodPairs] = useState(captchaTbPeriodPairs(t, undefined, undefined, language))
  const dashboardRef = useRef(null)
  const navigate = useNavigate()

  const [areFiltersParsed, setAreFiltersParsed] = useState(false)
  const [panelsData, setPanelsData] = useState<any>({})
  const [isPanelsDataEmpty, setIsPanelsDataEmpty] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [period, setPeriod] = useState<string>(preferences?.period || periodPairs[4].period)
  const [timeBucket, setTimebucket] = useState<string>(preferences?.timeBucket || periodPairs[4].tbs[1])
  const activePeriod: {
    period: string
    label: string
    tbs: string[]
  } = useMemo(
    () =>
      _find(periodPairs, (p) => p.period === period) || {
        period: periodPairs[3].period,
        tbs: periodPairs[3].tbs,
        label: periodPairs[3].label,
      },
    [period, periodPairs],
  )
  const [chartData, setChartData] = useState<any>({})
  const [dataLoading, setDataLoading] = useState(false)
  const [filters, setFilters] = useState<any[]>([])
  const tnMapping = typeNameMapping(t)
  const refCalendar = useRef(null)
  const [dateRange, setDateRange] = useState<Date[] | null>(
    preferences?.rangeDate ? [new Date(preferences.rangeDate[0]), new Date(preferences.rangeDate[1])] : null,
  )

  const [searchParams] = useSearchParams()

  const timeFormat = useMemo(() => user.timeFormat || TimeFormat['12-hour'], [user])
  const [ref, size] = useSize() as any
  const rotateXAxias = useMemo(() => size.width > 0 && size.width < 500, [size])
  const [chartType, setChartType] = useState<string>((getItem('chartType') as string) || chartTypes.line)
  const [mainChart, setMainChart] = useState<any>(null)

  const _theme = isBrowser ? theme : ssrTheme

  const { timezone = DEFAULT_TIMEZONE } = user || {}

  useEffect(() => {
    if (!project) {
      // TODO: Probably should display something like "Loading..."
      return
    }

    let pageTitle = project.name || t('titles.main')

    pageTitle += ` ${TITLE_SUFFIX}`

    document.title = pageTitle
  }, [project, t])

  const dataNames = useMemo(() => {
    return {
      results: t('project.results'),
    }
  }, [t])

  const loadCaptcha = async () => {
    setDataLoading(true)

    try {
      let data
      let from
      let to

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      if (period === 'custom' && dateRange) {
        data = await getCaptchaData(id, timeBucket, '', filters, from, to)
      } else {
        data = await getCaptchaData(id, timeBucket, period, filters, '', '')
      }

      if (_isEmpty(data)) {
        setAnalyticsLoading(false)
        setDataLoading(false)
        setIsPanelsDataEmpty(true)
        return
      }

      const { chart, params, customs, timeBucket: timeBucketFromResponse } = data

      let newTimebucket = timeBucket

      if (period === KEY_FOR_ALL_TIME && !_isEmpty(timeBucketFromResponse)) {
        newTimebucket = _includes(timeBucketFromResponse, timeBucket) ? timeBucket : timeBucketFromResponse[0]
        setPeriodPairs((prev) => {
          // find in prev state period === KEY_FOR_ALL_TIME and change tbs
          const newPeriodPairs = _map(prev, (item) => {
            if (item.period === KEY_FOR_ALL_TIME) {
              return {
                ...item,
                tbs:
                  timeBucketFromResponse.length > 2
                    ? [timeBucketFromResponse[0], timeBucketFromResponse[1]]
                    : timeBucketFromResponse,
              }
            }
            return item
          })
          return newPeriodPairs
        })
        setTimebucket(newTimebucket)
      }

      if (_isEmpty(params)) {
        setIsPanelsDataEmpty(true)
      } else {
        const applyRegions = !_includes(noRegionPeriods, activePeriod.period)
        const bbSettings: any = getSettings(
          chart,
          newTimebucket,
          applyRegions,
          timeFormat,
          rotateXAxias,
          chartTypes.line, // chartType,
        )
        setChartData(chart)

        setPanelsData({
          types: _keys(params),
          data: params,
          customs,
        })

        setIsPanelsDataEmpty(false)
        setMainChart(() => {
          const generete = billboard.generate(bbSettings)
          generete.data.names(dataNames)
          return generete
        })
      }

      setAnalyticsLoading(false)
      setDataLoading(false)
    } catch (reason) {
      setAnalyticsLoading(false)
      setDataLoading(false)
      setIsPanelsDataEmpty(true)
      console.error('[ERROR](loadAnalytics) Loading analytics data failed:', reason)
    }
  }

  useEffect(() => {
    if (mainChart) {
      mainChart.load({
        columns: getColumns({ ...chartData }),
      })
    }
  }, [chartData, mainChart])

  useEffect(() => {
    if (!areFiltersParsed || authLoading || !project) return

    loadCaptcha()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areFiltersParsed, filters, authLoading, project, dateRange, period, timeBucket])

  // this funtion is used for requesting the data from the API when the filter is changed
  const filterHandler = (column: any, filter: any, isExclusive = false) => {
    let newFilters

    if (_find(filters, (f) => f.column === column) /* && f.filter === filter) */) {
      // selected filter is already included into the filters array -> removing it
      // removing filter from the state
      newFilters = _filter(filters, (f) => f.column !== column)
      setFilters(newFilters)

      // removing filter from the page URL
      // @ts-expect-error
      const url = new URL(window.location)
      url.searchParams.delete(column)
      const { pathname, search } = url
      navigate(`${pathname}${search}`)
    } else {
      // selected filter is not present in the filters array -> applying it
      // sroting filter in the state
      newFilters = [...filters, { column, filter, isExclusive }]
      setFilters(newFilters)

      // storing filter in the page URL
      // @ts-expect-error
      const url = new URL(window.location)
      url.searchParams.append(column, filter)
      const { pathname, search } = url
      navigate(`${pathname}${search}`)
    }
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

    // storing exclusive filter in the page URL
    // @ts-expect-error
    const url = new URL(window.location)

    url.searchParams.delete(column)
    url.searchParams.append(column, filter)

    const { pathname, search } = url
    navigate(`${pathname}${search}`)
  }

  const refreshStats = () => {
    if (authLoading || dataLoading) {
      return
    }

    loadCaptcha()
  }

  // Parsing initial filters from the address bar
  useEffect(() => {
    try {
      // @ts-expect-error
      const url = new URL(window.location)
      const { searchParams } = url
      const intialTimeBucket: string = searchParams.get('timeBucket') || ''
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
    } catch (reason) {
      console.error('[ERROR](useEffect) Setting timebucket failed:', reason)
    }

    try {
      // @ts-expect-error
      const url = new URL(window.location)
      const { searchParams } = url
      const initialPeriod = searchParams.get('period') || preferences?.period || '7d'
      if (!_includes(validPeriods, initialPeriod)) {
        return
      }

      if (initialPeriod === 'custom') {
        // @ts-expect-error
        const from = new Date(searchParams.get('from'))
        // @ts-expect-error
        const to = new Date(searchParams.get('to'))
        if (from.getDate() && to.getDate()) {
          onRangeDateChange([from, to], true)
          setDateRange([from, to])
        }
        return
      }

      setPeriodPairs(captchaTbPeriodPairs(t, undefined, undefined, language))
      setDateRange(null)
      updatePeriod({ period: initialPeriod })
    } catch (reason) {
      console.error('[ERROR](useEffect) Setting period failed:', reason)
    }

    try {
      // @ts-expect-error
      const url = new URL(window.location)
      const { searchParams } = url
      const initialFilters: any[] = []
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
    } catch (reason) {
      console.error('[ERROR](useEffect) Setting filters failed:', reason)
    }

    setAreFiltersParsed(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    parseFiltersFromUrl('', searchParams, setFilters)

    const parsePeriodFilters = () => {
      try {
        const initialPeriod = searchParams.get('period') || preferences?.period || '7d'

        if (!_includes(validPeriods, initialPeriod)) {
          return
        }

        if (initialPeriod === 'custom') {
          // @ts-expect-error
          const from = new Date(searchParams.get('from'))
          // @ts-expect-error
          const to = new Date(searchParams.get('to'))
          if (from.getDate() && to.getDate()) {
            onRangeDateChange([from, to], true)
            setDateRange([from, to])
          }
          return
        }

        setPeriodPairs(captchaTbPeriodPairs(t, undefined, undefined, language))
        setDateRange(null)
        updatePeriod({
          period: initialPeriod,
        })
      } catch {
        //
      }
    }

    parsePeriodFilters()

    try {
      const initialTimeBucket = searchParams.get('timeBucket')

      if (_includes(validTimeBacket, initialTimeBucket)) {
        const newPeriodFull = _find(periodPairs, (el) => el.period === period)
        if (_includes(newPeriodFull?.tbs, initialTimeBucket)) {
          setTimebucket(initialTimeBucket || periodPairs[3].tbs[1])
        }
      }
    } catch {
      //
    }

    setAreFiltersParsed(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onRangeDateChange = (dates: Date[], onRender?: any) => {
    const days = Math.ceil(Math.abs(dates[1].getTime() - dates[0].getTime()) / (1000 * 3600 * 24))
    // @ts-expect-error
    const url = new URL(window.location)

    // setting allowed time buckets for the specified date range (period)

    for (const index in timeBucketToDays) {
      if (timeBucketToDays[index].lt >= days) {
        let eventEmitTimeBucket = timeBucket

        if (!onRender && !_includes(timeBucketToDays[index].tb, timeBucket)) {
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

        setPeriodPairs(captchaTbPeriodPairs(t, timeBucketToDays[index].tb, dates, language))
        setPeriod('custom')

        updatePreferences({
          period: 'custom',
          timeBucket: timeBucketToDays[index].tb[0],
          rangeDate: dates,
        })

        break
      }
    }
  }

  useEffect(() => {
    if (dateRange && areFiltersParsed) {
      onRangeDateChange(dateRange)
    }
  }, [dateRange, areFiltersParsed]) // eslint-disable-line

  const updatePeriod = (newPeriod: any) => {
    const newPeriodFull = _find(periodPairs, (el) => el.period === newPeriod.period)
    let tb: any = timeBucket
    // @ts-expect-error
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
      updatePreferences({
        period: newPeriod.period,
        timeBucket: tb,
        rangeDate: undefined,
      })
      setPeriod(newPeriod.period)
      setDateRange(null)
    }
    const { pathname, search } = url
    navigate(`${pathname}${search}`)
  }

  const updateTimebucket = (newTimebucket: string) => {
    // @ts-expect-error
    const url = new URL(window.location)
    url.searchParams.delete('timeBucket')
    url.searchParams.append('timeBucket', newTimebucket)
    const { pathname, search } = url
    navigate(`${pathname}${search}`)
    setTimebucket(newTimebucket)
    updatePreferences({
      timeBucket: newTimebucket,
    })
  }

  const openSettingsHandler = () => {
    navigate(_replace(routes.captcha_settings, ':id', id))
  }

  const resetFilters = () => {
    // @ts-expect-error
    const url: URL = new URL(window.location)
    const { searchParams } = url
    for (const [key] of Array.from(searchParams.entries())) {
      if (!_includes(validFilters, key)) {
        continue
      }
      searchParams.delete(key)
    }
    const { pathname, search } = url
    navigate(`${pathname}${search}`)
    setFilters([])
  }

  const exportTypes = [
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

  if (authLoading || !project) {
    return <PageLoader />
  }

  return (
    <ClientOnly fallback={<PageLoader />}>
      {() => (
        <ViewProjectContext.Provider
          value={{
            // States
            timezone,
            dateRange,
            isLoading: authLoading,
            timeBucket,
            period,
            activePeriod,
            periodPairs,
            timeFormat,
            size,
            allowedToManage: project.role === 'admin' || project.role === 'owner',
            dataLoading,
            activeTab: 'traffic',
            filters,

            // Functions
            setDateRange,
            updatePeriod,
            updateTimebucket,
            setPeriodPairs,

            // Refs
            refCalendar,
          }}
        >
          <>
            <EventsRunningOutBanner />
            <div ref={ref} className='bg-gray-50 dark:bg-slate-900'>
              <div
                className='min-h-min-footer mx-auto w-full max-w-[1584px] px-2 py-6 sm:px-4 lg:px-8'
                ref={dashboardRef}
              >
                <div className='mt-2 flex flex-col items-center justify-between lg:flex-row lg:items-start'>
                  <h2 className='text-xl font-bold break-words break-all text-gray-900 dark:text-gray-50'>
                    {project.name}
                  </h2>
                  <div className='mx-auto mt-3 flex w-full max-w-[420px] flex-wrap items-center justify-between sm:mx-0 sm:w-auto sm:max-w-none lg:mt-0'>
                    <button
                      type='button'
                      title={t('project.refreshStats')}
                      onClick={refreshStats}
                      className={cx(
                        'relative mr-3 rounded-md border border-gray-50/0 bg-gray-50 p-2 text-sm font-medium hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 hover:dark:border-slate-800/50 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
                        {
                          'cursor-not-allowed opacity-50': authLoading || dataLoading,
                        },
                      )}
                    >
                      <RotateCw className='h-5 w-5 text-gray-700 dark:text-gray-50' />
                    </button>
                    <Dropdown
                      header={t('project.exportData')}
                      items={exportTypes}
                      title={[<DownloadIcon key='download-icon' className='h-5 w-5' strokeWidth={1.5} />]}
                      labelExtractor={(item) => item.label}
                      keyExtractor={(item) => item.label}
                      onSelect={(item) => item.onClick()}
                      className={cx('mr-3', { hidden: isPanelsDataEmpty || analyticsLoading })}
                      chevron='mini'
                      buttonClassName='!p-2 rounded-md hover:bg-white border border-gray-50/0 hover:border-gray-300 hover:dark:border-slate-800/50 dark:hover:bg-slate-800 focus:z-10 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:dark:ring-gray-200'
                      headless
                    />
                    <div
                      className={cx('space-x-2 border-gray-200 sm:mr-3 lg:border-x lg:px-3 dark:border-gray-600', {
                        // TODO: Fix a crash when user selects 'bar' chart and refreshes the page:
                        // Uncaught TypeError: can't access property "create", point5 is undefined
                        hidden: isPanelsDataEmpty || analyticsLoading || true,
                      })}
                    >
                      <button
                        type='button'
                        title={t('project.barChart')}
                        onClick={() => setChartTypeOnClick(chartTypes.bar)}
                        className={cx(
                          'relative rounded-md fill-gray-700 p-2 text-sm font-medium focus:z-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:fill-gray-50 focus:dark:border-gray-200 focus:dark:ring-gray-200',
                          {
                            'border border-gray-300 bg-white stroke-white dark:border-slate-800/50 dark:bg-slate-800 dark:stroke-slate-800':
                              chartType === chartTypes.bar,
                            'bg-gray-50 stroke-gray-50 dark:bg-slate-900 dark:stroke-slate-900 [&_svg]:hover:fill-gray-500 [&_svg]:hover:dark:fill-gray-200':
                              chartType !== chartTypes.bar,
                          },
                        )}
                      >
                        <BarChart className='h-5 w-5 [&_path]:stroke-[3.5%]' />
                      </button>
                      <button
                        type='button'
                        title={t('project.lineChart')}
                        onClick={() => setChartTypeOnClick(chartTypes.line)}
                        className={cx(
                          'relative rounded-md fill-gray-700 p-2 text-sm font-medium focus:z-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:fill-gray-50 focus:dark:border-gray-200 focus:dark:ring-gray-200',
                          {
                            'border border-gray-300 bg-white stroke-white dark:border-slate-800/50 dark:bg-slate-800 dark:stroke-slate-800':
                              chartType === chartTypes.line,
                            'bg-gray-50 stroke-gray-50 dark:bg-slate-900 dark:stroke-slate-900 [&_svg]:hover:fill-gray-500 [&_svg]:hover:dark:fill-gray-200':
                              chartType !== chartTypes.line,
                          },
                        )}
                      >
                        <LineChart className='h-5 w-5 [&_path]:stroke-[3.5%]' />
                      </button>
                    </div>
                    <TBPeriodSelector
                      activePeriod={activePeriod}
                      updateTimebucket={updateTimebucket}
                      timeBucket={timeBucket}
                      items={_filter(periodPairs, (item) => !_includes(['all', '1h'], item.period))}
                      title={activePeriod?.label}
                      onSelect={(pair) => {
                        if (pair.isCustomDate) {
                          setTimeout(() => {
                            // @ts-expect-error
                            refCalendar.current.openCalendar()
                          }, 100)
                        } else {
                          setPeriodPairs(captchaTbPeriodPairs(t, undefined, undefined, language))
                          setDateRange(null)
                          updatePeriod(pair)
                        }
                      }}
                    />
                    {project.role === 'admin' || project.role === 'owner' ? (
                      <button
                        type='button'
                        onClick={openSettingsHandler}
                        className='flex px-3 text-sm font-medium text-gray-700 hover:text-gray-600 dark:text-gray-50 dark:hover:text-gray-200'
                      >
                        <>
                          <SettingsIcon className='mr-1 h-5 w-5' strokeWidth={1.5} />
                          {t('common.settings')}
                        </>
                      </button>
                    ) : null}
                    <FlatPicker
                      ref={refCalendar}
                      onChange={(date) => setDateRange(date)}
                      value={dateRange || []}
                      maxDateMonths={MAX_MONTHS_IN_PAST}
                    />
                  </div>
                </div>
                {analyticsLoading ? <Loader /> : null}
                {isPanelsDataEmpty ? <NoEvents filters={filters} resetFilters={resetFilters} /> : null}
                <div className={cx('pt-4', { hidden: isPanelsDataEmpty || analyticsLoading })}>
                  <div className='h-80'>
                    <div className='h-80 [&_svg]:!overflow-visible' id='captchaChart' />
                  </div>
                  <Filters
                    filters={filters}
                    onRemoveFilter={filterHandler}
                    onChangeExclusive={onChangeExclusive}
                    tnMapping={tnMapping}
                    resetFilters={resetFilters}
                  />
                  {dataLoading ? (
                    <div className='static mt-4 !bg-transparent' id='loader'>
                      <div className='loader-head dark:!bg-slate-800'>
                        <div className='first dark:!bg-slate-600' />
                        <div className='second dark:!bg-slate-600' />
                      </div>
                    </div>
                  ) : null}
                  <div className='mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                    {!_isEmpty(panelsData.types)
                      ? _map(PANELS_ORDER, (type: keyof typeof tnMapping) => {
                          const panelName = tnMapping[type]
                          const panelIcon = panelIconMapping[type]

                          if (type === 'cc') {
                            const rowMapper = (entry: any) => {
                              const { name: entryName, cc } = entry

                              if (cc) {
                                return <CCRow cc={cc} name={entryName} language={language} />
                              }

                              return <CCRow cc={entryName} language={language} />
                            }

                            return (
                              <Panel
                                key={type}
                                icon={panelIcon}
                                id={type}
                                onFilter={filterHandler}
                                name={panelName}
                                data={panelsData.data[type]}
                                rowMapper={rowMapper}
                              />
                            )
                          }

                          if (type === 'dv') {
                            return (
                              <Panel
                                key={type}
                                icon={panelIcon}
                                id={type}
                                onFilter={filterHandler}
                                name={panelName}
                                data={panelsData.data[type]}
                                rowMapper={(entry: { name: keyof typeof deviceIconMapping }) => {
                                  const { name: entryName } = entry

                                  const icon = deviceIconMapping[entryName]

                                  if (!icon) {
                                    return entryName
                                  }

                                  return (
                                    <>
                                      {icon}
                                      &nbsp;
                                      {entryName}
                                    </>
                                  )
                                }}
                                capitalize
                              />
                            )
                          }

                          if (type === 'br') {
                            const rowMapper = (entry: any) => {
                              const { name: entryName } = entry
                              // @ts-expect-error
                              const logoUrl = BROWSER_LOGO_MAP[entryName]

                              if (!logoUrl) {
                                return (
                                  <>
                                    <GlobeAltIcon className='h-5 w-5' />
                                    &nbsp;
                                    {entryName}
                                  </>
                                )
                              }

                              return (
                                <>
                                  <img src={logoUrl} className='h-5 w-5' alt='' />
                                  &nbsp;
                                  {entryName}
                                </>
                              )
                            }

                            return (
                              <Panel
                                key={type}
                                icon={panelIcon}
                                id={type}
                                onFilter={filterHandler}
                                name={panelName}
                                data={panelsData.data[type]}
                                rowMapper={rowMapper}
                              />
                            )
                          }

                          if (type === 'os') {
                            const rowMapper = (entry: any) => {
                              const { name: entryName } = entry
                              // @ts-expect-error
                              const logoPathLight = OS_LOGO_MAP[entryName]
                              // @ts-expect-error
                              const logoPathDark = OS_LOGO_MAP_DARK[entryName]

                              let logoPath = _theme === 'dark' ? logoPathDark : logoPathLight
                              logoPath ||= logoPathLight

                              if (!logoPath) {
                                return (
                                  <>
                                    <GlobeAltIcon className='h-5 w-5' />
                                    &nbsp;
                                    {entryName}
                                  </>
                                )
                              }

                              const logoUrl = `/${logoPath}`

                              return (
                                <>
                                  <img src={logoUrl} className='h-5 w-5 dark:fill-gray-50' alt='' />
                                  &nbsp;
                                  {entryName}
                                </>
                              )
                            }

                            return (
                              <Panel
                                key={type}
                                icon={panelIcon}
                                id={type}
                                onFilter={filterHandler}
                                name={panelName}
                                data={panelsData.data[type]}
                                rowMapper={rowMapper}
                              />
                            )
                          }

                          return (
                            <Panel
                              key={type}
                              icon={panelIcon}
                              id={type}
                              onFilter={filterHandler}
                              name={panelName}
                              data={panelsData.data[type]}
                            />
                          )
                        })
                      : null}
                  </div>
                </div>
              </div>
            </div>
          </>
        </ViewProjectContext.Provider>
      )}
    </ClientOnly>
  )
}

export default memo(ViewCaptcha)
