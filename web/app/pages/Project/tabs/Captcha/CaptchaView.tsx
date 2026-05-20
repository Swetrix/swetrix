import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import {
  CompassIcon,
  MapPinIcon,
  MonitorIcon,
  DevicesIcon,
  GlobeIcon,
  GaugeIcon,
  WarningIcon,
  ClockIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react'
import { useState, useEffect, useMemo, useContext, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { useCaptchaProxy } from '~/hooks/useAnalyticsProxy'
import useSize from '~/hooks/useSize'
import {
  chartTypes,
  BROWSER_LOGO_MAP,
  OS_LOGO_MAP,
  OS_LOGO_MAP_DARK,
} from '~/lib/constants'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'

import CCRow from '../../View/components/CCRow'
import DashboardHeader from '../../View/components/DashboardHeader'
import Filters from '../../View/components/Filters'
import ProjectViewHeaderActions from '../../View/components/ProjectViewHeaderActions'
import { Filter } from '../../View/interfaces/traffic'
import { Panel } from '../../View/Panels'
import { parseFilters } from '../../View/utils/filters'
import {
  ViewProjectContext,
  RefreshTriggersContext,
} from '../../View/ViewProject'
import { deviceIconMapping } from '../../View/ViewProject.helpers'

import { CaptchaChart } from './CaptchaChart'
import NoCaptchaEvents from './NoCaptchaEvents'
import WaitingForCaptchaEvent from './WaitingForCaptchaEvent'

const PANELS_ORDER = [
  'captcha_event',
  'captcha_difficulty',
  'captcha_reason',
  'solve_time',
  'cc',
  'br',
  'os',
  'dv',
]

const iconClassName = 'w-6 h-6'
const panelIconMapping: Record<string, React.ReactNode> = {
  cc: <MapPinIcon className={iconClassName} />,
  dv: <DevicesIcon className={iconClassName} />,
  br: <CompassIcon className={iconClassName} />,
  os: <MonitorIcon className={iconClassName} />,
  captcha_event: <ShieldCheckIcon className={iconClassName} />,
  captcha_difficulty: <GaugeIcon className={iconClassName} />,
  captcha_reason: <WarningIcon className={iconClassName} />,
  solve_time: <ClockIcon className={iconClassName} />,
}

export const captchaTypeNameMapping = (t: any) => ({
  cc: t('project.mapping.cc'),
  dv: t('project.mapping.dv'),
  br: t('project.mapping.br'),
  os: t('project.mapping.os'),
  captcha_event: t('project.mapping.captcha_event'),
  captcha_difficulty: t('project.mapping.captcha_difficulty'),
  captcha_reason: t('project.mapping.captcha_reason'),
  solve_time: t('project.mapping.solve_time'),
})

interface CaptchaViewProps {
  projectId: string
}

const CaptchaView = ({ projectId }: CaptchaViewProps) => {
  const { theme } = useTheme()
  const { project } = useCurrentProject()
  const { captchaRefreshTrigger } = useContext(RefreshTriggersContext)
  const { period, timeBucket, dateRange, timeFormat, size } =
    useContext(ViewProjectContext)
  const [searchParams] = useSearchParams()
  const isEmbedded = searchParams.get('embedded') === 'true'
  const isMountedRef = useRef(true)
  const captchaProxy = useCaptchaProxy()

  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const [panelsData, setPanelsData] = useState<any>({})
  const [chartData, setChartData] = useState<{
    x: string[]
    results?: number[]
    generated?: number[]
    passed?: number[]
    failed?: number[]
    validationFailed?: number[]
    replayed?: number[]
  } | null>(null)
  const [summaryData, setSummaryData] = useState<any | null>(null)
  const [isPanelsDataEmpty, setIsPanelsDataEmpty] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)

  const rotateXAxis = useMemo(() => size.width > 0 && size.width < 500, [size])

  const dataNames = useMemo(
    () => ({
      results: t('project.captchaCompletions'),
      generated: t('project.captchaAnalytics.generated'),
      passed: t('project.captchaAnalytics.passed'),
      failed: t('project.captchaAnalytics.failed'),
      validationFailed: t('project.captchaAnalytics.validationFailed'),
      replayed: t('project.captchaAnalytics.replayed'),
    }),
    [t],
  )

  const filters = useMemo<Filter[]>(() => {
    return parseFilters(searchParams)
  }, [searchParams])

  const tnMapping = captchaTypeNameMapping(t)
  const [ref] = useSize() as any

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const getFormatDate = (date: Date) => {
    const yyyy = date.getFullYear()
    let mm: string | number = date.getMonth() + 1
    let dd: string | number = date.getDate()
    if (dd < 10) dd = `0${dd}`
    if (mm < 10) mm = `0${mm}`
    return `${yyyy}-${mm}-${dd}`
  }

  const loadCaptcha = async () => {
    setDataLoading(true)

    try {
      let from = ''
      let to = ''

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      const data = await captchaProxy.fetchCaptcha(projectId, {
        timeBucket,
        period: period === 'custom' && dateRange ? '' : period,
        filters,
        from: period === 'custom' && dateRange ? from : '',
        to: period === 'custom' && dateRange ? to : '',
      })

      if (!isMountedRef.current) return

      if (_isEmpty(data)) {
        setAnalyticsLoading(false)
        setDataLoading(false)
        setIsPanelsDataEmpty(true)
        setChartData(null)
        setSummaryData(null)
        return
      }

      const { params, chart, summary } = data

      if (chart && chart.x && chart.results) {
        setChartData(chart)
      } else {
        setChartData(null)
      }

      if (_isEmpty(params)) {
        setIsPanelsDataEmpty(true)
      } else {
        setPanelsData({
          types: _keys(params),
          data: params,
        })
        setIsPanelsDataEmpty(false)
      }

      setSummaryData(summary || null)
      setAnalyticsLoading(false)
      setDataLoading(false)
    } catch (reason) {
      if (!isMountedRef.current) return
      setAnalyticsLoading(false)
      setDataLoading(false)
      setIsPanelsDataEmpty(true)
      setChartData(null)
      setSummaryData(null)
      console.error('[ERROR](loadCaptcha) Loading captcha data failed:', reason)
    }
  }

  useEffect(() => {
    loadCaptcha()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, dateRange, period, timeBucket, projectId])

  // Refresh captcha data when refresh button is clicked
  useEffect(() => {
    if (captchaRefreshTrigger > 0) {
      loadCaptcha()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captchaRefreshTrigger])

  const getFilterLink = (column: string, value: string | null) => {
    const isFilterActive =
      filters.findIndex(
        (filter) => filter.column === column && filter.filter === value,
      ) >= 0
    const newSearchParams = new URLSearchParams(searchParams.toString())

    if (isFilterActive) {
      newSearchParams.delete(column, value ?? 'null')
    } else {
      newSearchParams.append(column, value ?? 'null')
    }

    return { search: newSearchParams.toString() }
  }

  // Check if we have existing data
  const hasExistingData = chartData !== null || !_isEmpty(panelsData.types)
  const formatPercent = (value?: number) => `${Number(value || 0).toFixed(1)}%`
  const formatSeconds = (value?: number) =>
    value ? `${Number(value).toFixed(2)}s` : 'N/A'
  const formatReason = (value?: string | null) =>
    value
      ? t(`project.captchaAnalytics.reasons.${value}`, { defaultValue: value })
      : 'N/A'
  const summaryCards = summaryData
    ? [
        {
          label: t('project.captchaAnalytics.generated'),
          value: summaryData.generated || 0,
        },
        {
          label: t('project.captchaAnalytics.passRate'),
          value: formatPercent(summaryData.passRate),
        },
        {
          label: t('project.captchaAnalytics.failRate'),
          value: formatPercent(summaryData.failRate),
        },
        {
          label: t('project.captchaAnalytics.validationFailed'),
          value: summaryData.validationFailed || 0,
        },
        {
          label: t('project.captchaAnalytics.replayed'),
          value: summaryData.replayed || 0,
        },
        {
          label: t('project.captchaAnalytics.medianSolve'),
          value: formatSeconds(summaryData.solveP50),
        },
        {
          label: t('project.captchaAnalytics.topAutoReason'),
          value: formatReason(summaryData.reasons?.[0]?.name),
        },
      ]
    : []

  // Show waiting state if project has no captcha data yet
  if (!_isEmpty(project) && !project?.isCaptchaDataExists) {
    return <WaitingForCaptchaEvent />
  }

  // Show Loader only on initial load (no existing data)
  if (analyticsLoading && !hasExistingData) {
    return (
      <div
        className={cx('flex flex-col bg-gray-50 dark:bg-slate-950', {
          'min-h-including-header': !isEmbedded,
          'min-h-screen': isEmbedded,
        })}
      >
        <Loader />
      </div>
    )
  }

  if (isPanelsDataEmpty && !dataLoading) {
    return (
      <>
        <DashboardHeader
          showLiveVisitors={false}
          rightContent={<ProjectViewHeaderActions tnMapping={tnMapping} />}
        />
        <NoCaptchaEvents filters={filters} />
      </>
    )
  }

  return (
    <>
      <DashboardHeader
        showLiveVisitors={false}
        rightContent={<ProjectViewHeaderActions tnMapping={tnMapping} />}
      />
      <div ref={ref}>
        {dataLoading && hasExistingData ? <LoadingBar /> : null}
        <div>
          <Filters className='mb-3' tnMapping={tnMapping} />
          {summaryCards.length ? (
            <div className='mb-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7'>
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className='rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-800/60 dark:bg-slate-900/25'
                >
                  <div className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                    {card.label}
                  </div>
                  <div className='mt-1 truncate text-lg font-semibold text-gray-900 dark:text-gray-50'>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {chartData ? (
            <CaptchaChart
              chart={chartData}
              timeBucket={timeBucket}
              timeFormat={timeFormat}
              rotateXAxis={rotateXAxis}
              chartType={chartTypes.line}
              dataNames={dataNames}
            />
          ) : null}
          <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
            {!_isEmpty(panelsData.types)
              ? _map(PANELS_ORDER, (type: keyof typeof tnMapping) => {
                  if (_isEmpty(panelsData.data[type])) {
                    return null
                  }

                  const panelName = tnMapping[type]
                  const panelIcon = panelIconMapping[type]

                  if (type === 'cc') {
                    const rowMapper = (entry: any) => {
                      const { name: entryName, cc } = entry
                      if (cc) {
                        return (
                          <CCRow cc={cc} name={entryName} language={language} />
                        )
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
                        activeTabId={type}
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
                        rowMapper={(entry: {
                          name: keyof typeof deviceIconMapping
                        }) => {
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
                        activeTabId={type}
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
                            <GlobeIcon className='h-5 w-5' />
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
                        activeTabId={type}
                      />
                    )
                  }

                  if (type === 'os') {
                    const rowMapper = (entry: any) => {
                      const { name: entryName } = entry
                      // @ts-expect-error
                      const logoUrlLight = OS_LOGO_MAP[entryName]
                      // @ts-expect-error
                      const logoUrlDark = OS_LOGO_MAP_DARK[entryName]
                      let logoUrl =
                        theme === 'dark' ? logoUrlDark : logoUrlLight
                      logoUrl ||= logoUrlLight

                      if (!logoUrl) {
                        return (
                          <>
                            <GlobeIcon className='h-5 w-5' />
                            &nbsp;
                            {entryName}
                          </>
                        )
                      }

                      return (
                        <>
                          <img
                            src={logoUrl}
                            className='h-5 w-5 dark:fill-gray-50'
                            alt=''
                          />
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
                        activeTabId={type}
                      />
                    )
                  }

                  if (type === 'captcha_event') {
                    return (
                      <Panel
                        key={type}
                        icon={panelIcon}
                        id={type}
                        getFilterLink={getFilterLink}
                        name={panelName}
                        data={panelsData.data[type]}
                        rowMapper={(entry: any) =>
                          t(`project.captchaAnalytics.events.${entry.name}`, {
                            defaultValue: entry.name,
                          })
                        }
                        activeTabId={type}
                      />
                    )
                  }

                  if (type === 'captcha_reason') {
                    return (
                      <Panel
                        key={type}
                        icon={panelIcon}
                        id={type}
                        getFilterLink={getFilterLink}
                        name={panelName}
                        data={panelsData.data[type]}
                        rowMapper={(entry: any) => formatReason(entry.name)}
                        activeTabId={type}
                      />
                    )
                  }

                  if (type === 'captcha_difficulty') {
                    return (
                      <Panel
                        key={type}
                        icon={panelIcon}
                        id={type}
                        getFilterLink={getFilterLink}
                        name={panelName}
                        data={panelsData.data[type]}
                        rowMapper={(entry: any) =>
                          t('project.captchaAnalytics.difficultyValue', {
                            value: entry.name,
                          })
                        }
                        activeTabId={type}
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
                      activeTabId={type}
                    />
                  )
                })
              : null}
          </div>
        </div>
      </div>
    </>
  )
}

export default CaptchaView
