import { GlobeAltIcon } from '@heroicons/react/24/outline'
import billboard from 'billboard.js'
import cx from 'clsx'
import _filter from 'lodash/filter'
import _find from 'lodash/find'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _replace from 'lodash/replace'
import { DownloadIcon, RotateCw, SettingsIcon } from 'lucide-react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, LinkProps, useSearchParams } from 'react-router'
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
  BROWSER_LOGO_MAP,
  OS_LOGO_MAP,
  OS_LOGO_MAP_DARK,
  DEFAULT_TIMEZONE,
  VALID_PERIODS,
  type Period,
  TBPeriodPairsProps,
  TimeBucket,
  VALID_TIME_BUCKETS,
} from '~/lib/constants'
import Filters from '~/pages/Project/View/components/Filters'
import NoEvents from '~/pages/Project/View/components/NoEvents'
import { Filter } from '~/pages/Project/View/interfaces/traffic'
import { Panel } from '~/pages/Project/View/Panels'
import { parseFilters } from '~/pages/Project/View/utils/filters'
import { ViewProjectContext } from '~/pages/Project/View/ViewProject'
import { deviceIconMapping, onCSVExportClick } from '~/pages/Project/View/ViewProject.helpers'
import { useAuth } from '~/providers/AuthProvider'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import DatePicker from '~/ui/Datepicker'
import Dropdown from '~/ui/Dropdown'
import Loader from '~/ui/Loader'
import routes from '~/utils/routes'

import CCRow from '../../Project/View/components/CCRow'

import TBPeriodSelector from './components/TBPeriodSelector'
import {
  getFormatDate,
  panelIconMapping,
  typeNameMapping,
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

const ViewCaptcha = () => {
  const { id, project, preferences, updatePreferences } = useCurrentProject()

  const { user, isLoading: authLoading } = useAuth()
  const { theme } = useTheme()

  const [searchParams, setSearchParams] = useSearchParams()

  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const dashboardRef = useRef(null)

  const [panelsData, setPanelsData] = useState<any>({})
  const [isPanelsDataEmpty, setIsPanelsDataEmpty] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  const period = useMemo<Period>(() => {
    const urlPeriod = searchParams.get('period') as Period

    if (VALID_PERIODS.includes(urlPeriod)) {
      return urlPeriod
    }

    return preferences.period || '7d'
  }, [searchParams, preferences.period])

  const [chartData, setChartData] = useState<any>({})
  const [dataLoading, setDataLoading] = useState(false)

  const filters = useMemo<Filter[]>(() => {
    return parseFilters(searchParams)
  }, [searchParams])

  const tnMapping = typeNameMapping(t)
  const refCalendar = useRef(null)

  const dateRange = useMemo<Date[] | null>(() => {
    if (period !== 'custom') {
      return null
    }

    let initialDateRange: Date[] | null = preferences.rangeDate
      ? [new Date(preferences.rangeDate[0]), new Date(preferences.rangeDate[1])]
      : null

    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (from && to) {
      const fromDate = new Date(from)
      const toDate = new Date(to)

      if (fromDate.getDate() && toDate.getDate()) {
        initialDateRange = [fromDate, toDate]
      }
    }

    return initialDateRange
  }, [period, searchParams, preferences.rangeDate])

  const periodPairs = useMemo<TBPeriodPairsProps[]>(() => {
    let tbs = null

    if (dateRange) {
      const days = Math.ceil(Math.abs(dateRange[1].getTime() - dateRange[0].getTime()) / (1000 * 3600 * 24))

      for (const index in timeBucketToDays) {
        if (timeBucketToDays[index].lt >= days) {
          tbs = timeBucketToDays[index].tb
        }
      }
    }

    return captchaTbPeriodPairs(t, tbs, dateRange, language)
  }, [t, language, dateRange])

  const timeBucket = useMemo<TimeBucket>(() => {
    let _timeBucket = preferences.timeBucket || periodPairs[4].tbs[1]
    const urlTimeBucket = searchParams.get('timeBucket') as TimeBucket
    const currentPeriodPair = _find(periodPairs, (el) => el.period === period)

    // If the time bucket from preferences is not compatible with the current period, use the first time bucket of the period
    if (currentPeriodPair && !currentPeriodPair.tbs.includes(urlTimeBucket)) {
      _timeBucket = currentPeriodPair.tbs[0]
    }

    // Or use the time bucket from the URL if it's compatible with the current period
    if (VALID_TIME_BUCKETS.includes(urlTimeBucket)) {
      if (currentPeriodPair?.tbs?.includes(urlTimeBucket)) {
        _timeBucket = urlTimeBucket
      }
    }

    if (dateRange) {
      const days = Math.ceil(Math.abs(dateRange[1].getTime() - dateRange[0].getTime()) / (1000 * 3600 * 24))

      for (const index in timeBucketToDays) {
        if (timeBucketToDays[index].lt >= days) {
          if (!timeBucketToDays[index].tb?.includes(_timeBucket)) {
            _timeBucket = timeBucketToDays[index].tb[0]
          }

          break
        }
      }
    }

    return _timeBucket
  }, [searchParams, preferences.timeBucket, periodPairs, period, dateRange])

  const activePeriod = useMemo(() => _find(periodPairs, (p) => p.period === period), [period, periodPairs])

  const timeFormat = useMemo<'12-hour' | '24-hour'>(() => user?.timeFormat || TimeFormat['12-hour'], [user])
  const [ref, size] = useSize() as any
  const rotateXAxias = useMemo(() => size.width > 0 && size.width < 500, [size])
  const [mainChart, setMainChart] = useState<any>(null)

  const { timezone = DEFAULT_TIMEZONE } = user || {}

  useEffect(() => {
    if (!project) {
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

      if (period === 'all' && !_isEmpty(timeBucketFromResponse)) {
        newTimebucket = _includes(timeBucketFromResponse, timeBucket) ? timeBucket : timeBucketFromResponse[0]

        const newSearchParams = new URLSearchParams(searchParams.toString())
        newSearchParams.set('timeBucket', newTimebucket)
        setSearchParams(newSearchParams)
      }

      if (_isEmpty(params)) {
        setIsPanelsDataEmpty(true)
      } else {
        const applyRegions = !_includes(noRegionPeriods, activePeriod?.period)
        const bbSettings: any = getSettings(
          chart,
          newTimebucket,
          applyRegions,
          timeFormat,
          rotateXAxias,
          chartTypes.line,
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
    if (authLoading || !project) return

    loadCaptcha()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, authLoading, project, dateRange, period, timeBucket])

  const getFilterLink = (column: string, value: string): LinkProps['to'] => {
    const isFilterActive = filters.findIndex((filter) => filter.column === column && filter.filter === value) >= 0

    const newSearchParams = new URLSearchParams(searchParams.toString())
    let searchString = ''

    if (isFilterActive) {
      newSearchParams.delete(column)
      searchString = newSearchParams.toString()
    } else {
      newSearchParams.append(column, value)
      searchString = newSearchParams.toString()
    }

    return {
      search: searchString,
    }
  }

  const refreshStats = () => {
    if (authLoading || dataLoading) {
      return
    }

    loadCaptcha()
  }

  // We can assume period provided is never custom, as it's handled separately in the Flatpickr callback function
  const updatePeriod = ({ period: newPeriod }: { period: Period }) => {
    if (period === newPeriod) {
      return
    }

    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('from')
    newSearchParams.delete('to')
    newSearchParams.set('period', newPeriod)

    updatePreferences({
      period: newPeriod,
      rangeDate: undefined,
    })

    setSearchParams(newSearchParams)
  }

  const resetDateRange = () => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('from')
    newSearchParams.delete('to')
    setSearchParams(newSearchParams)
  }

  const updateTimebucket = (newTimebucket: TimeBucket) => {
    if (dataLoading) {
      return
    }

    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.set('timeBucket', newTimebucket)
    setSearchParams(newSearchParams)

    updatePreferences({
      timeBucket: newTimebucket,
    })
  }

  const exportTypes = [
    {
      label: t('project.asCSV'),
      onClick: () => {
        return onCSVExportClick(panelsData, id, tnMapping, language)
      },
    },
  ]

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
            dataLoading,
            activeTab: 'traffic',
            filters,
            customPanelTabs: [],

            // Functions
            updatePeriod,
            updateTimebucket,

            // Refs
            refCalendar,
          }}
        >
          <>
            <EventsRunningOutBanner />
            <div ref={ref} className='bg-gray-50 dark:bg-slate-900'>
              <div className='mx-auto min-h-min-footer w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8' ref={dashboardRef}>
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
                          resetDateRange()
                          updatePeriod(pair)
                        }
                      }}
                    />
                    {project.role === 'admin' || project.role === 'owner' ? (
                      <Link
                        to={_replace(routes.captcha_settings, ':id', id)}
                        className='flex px-3 text-sm font-medium text-gray-700 hover:text-gray-600 dark:text-gray-50 dark:hover:text-gray-200'
                      >
                        <>
                          <SettingsIcon className='mr-1 h-5 w-5' strokeWidth={1.5} />
                          {t('common.settings')}
                        </>
                      </Link>
                    ) : null}
                    <DatePicker
                      className='!mx-0 w-0'
                      ref={refCalendar}
                      onChange={([from, to]) => {
                        const newSearchParams = new URLSearchParams(searchParams.toString())
                        newSearchParams.set('from', from.toISOString())
                        newSearchParams.set('to', to.toISOString())
                        newSearchParams.set('period', 'custom')
                        setSearchParams(newSearchParams)
                      }}
                      value={dateRange || []}
                      maxDateMonths={MAX_MONTHS_IN_PAST}
                    />
                  </div>
                </div>
                {analyticsLoading ? <Loader /> : null}
                {isPanelsDataEmpty ? <NoEvents filters={filters} /> : null}
                <div className={cx('pt-4', { hidden: isPanelsDataEmpty || analyticsLoading })}>
                  <div className='h-80'>
                    <div className='h-80 [&_svg]:!overflow-visible' id='captchaChart' />
                  </div>
                  <Filters tnMapping={tnMapping} />
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
                                getFilterLink={getFilterLink}
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
                                getFilterLink={getFilterLink}
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
                                getFilterLink={getFilterLink}
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

                              let logoPath = theme === 'dark' ? logoPathDark : logoPathLight
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
                                getFilterLink={getFilterLink}
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
                              getFilterLink={getFilterLink}
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

export default ViewCaptcha
