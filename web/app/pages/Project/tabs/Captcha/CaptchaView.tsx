import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
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
import { MetricCard } from '~/pages/Project/tabs/Traffic/MetricCards'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'
import { nFormatter } from '~/utils/generic'

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
  'cc',
  'br',
  'os',
  'dv',
  'captcha_event',
  'captcha_difficulty',
  'solve_time',
  'captcha_reason',
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
  const [summaryCompareData, setSummaryCompareData] = useState<any | null>(null)
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
      validationFailed: t('project.captchaAnalytics.events.validation_fail'),
      replayed: t('project.captchaAnalytics.events.replay'),
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

      const requestParams = {
        timeBucket,
        period: period === 'custom' && dateRange ? '' : period,
        filters,
        from: period === 'custom' && dateRange ? from : '',
        to: period === 'custom' && dateRange ? to : '',
      }
      const compareFrom = searchParams.get('compareFrom') || ''
      const compareTo = searchParams.get('compareTo') || ''
      const compareEnabled =
        searchParams.get('compare') === 'true' && compareFrom && compareTo

      const [data, compareData] = await Promise.all([
        captchaProxy.fetchCaptcha(projectId, requestParams),
        compareEnabled
          ? captchaProxy.fetchCaptcha(projectId, {
              ...requestParams,
              period: '',
              from: compareFrom,
              to: compareTo,
            })
          : Promise.resolve(null),
      ])

      if (!isMountedRef.current) return

      if (_isEmpty(data)) {
        setAnalyticsLoading(false)
        setDataLoading(false)
        setIsPanelsDataEmpty(true)
        setChartData(null)
        setSummaryData(null)
        setSummaryCompareData(null)
        return
      }

      const { params, chart, summary } = data

      if (chart && chart.x) {
        setChartData(chart)
      } else {
        setChartData(null)
      }

      const hasData =
        !_isEmpty(params) || !_isEmpty(chart?.x) || !_isEmpty(summary)

      setPanelsData({
        types: PANELS_ORDER,
        data: params || {},
      })
      setIsPanelsDataEmpty(!hasData)

      setSummaryData(summary || null)
      setSummaryCompareData(compareData?.summary || null)
      setAnalyticsLoading(false)
      setDataLoading(false)
    } catch (reason) {
      if (!isMountedRef.current) return
      setAnalyticsLoading(false)
      setDataLoading(false)
      setIsPanelsDataEmpty(true)
      setChartData(null)
      setSummaryData(null)
      setSummaryCompareData(null)
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
  const formatNumber = (value: number, type: 'main' | 'badge') =>
    `${type === 'badge' && value > 0 ? '+' : ''}${nFormatter(value, 1)}`
  const isFiniteNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value)
  const formatPercent = (
    value: number | null | undefined,
    type: 'main' | 'badge',
  ) => {
    if (!isFiniteNumber(value)) {
      return 'N/A'
    }

    return `${type === 'badge' && value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }
  const formatSeconds = (value?: number) =>
    value ? `${Number(value).toFixed(2)}s` : 'N/A'
  const formatSecondsChange = (value: number) =>
    `${value > 0 ? '+' : value < 0 ? '-' : ''}${Math.abs(Number(value || 0)).toFixed(2)}s`
  const formatReason = (value?: string | null) =>
    value
      ? t(`project.captchaAnalytics.reasons.${value}`, { defaultValue: value })
      : 'N/A'
  const formatDifficulty = (value?: string | null) => {
    switch (Number(value)) {
      case 2:
        return t('project.settings.captcha.difficultyLevels.veryEasy')
      case 3:
        return t('project.settings.captcha.difficultyLevels.easy')
      case 4:
        return t('project.settings.captcha.difficultyLevels.medium')
      case 5:
        return t('project.settings.captcha.difficultyLevels.hard')
      case 6:
        return t('project.settings.captcha.difficultyLevels.veryHard')
      default:
        return t('project.captchaAnalytics.difficultyValue', { value })
    }
  }
  const summaryCards = summaryData
    ? [
        {
          label: t('project.captchaAnalytics.generated'),
          value: summaryData.generated || 0,
          change: summaryCompareData
            ? (summaryData.generated || 0) - (summaryCompareData.generated || 0)
            : undefined,
          goodChangeDirection: 'down' as const,
          valueMapper: formatNumber,
        },
        {
          label: t('project.captchaAnalytics.passRate'),
          value: summaryData.passRate,
          change: summaryCompareData
            ? isFiniteNumber(summaryData.passRate) &&
              isFiniteNumber(summaryCompareData.passRate)
              ? summaryData.passRate - summaryCompareData.passRate
              : undefined
            : undefined,
          goodChangeDirection: 'down' as const,
          valueMapper: formatPercent,
        },
        {
          label: t('project.captchaAnalytics.medianSolve'),
          value: summaryData.solveP50 || 0,
          change:
            summaryCompareData &&
            summaryData.solveP50 > 0 &&
            summaryCompareData.solveP50 > 0
              ? summaryData.solveP50 - summaryCompareData.solveP50
              : undefined,
          goodChangeDirection: 'up' as const,
          valueMapper: (value: number, type: 'main' | 'badge') =>
            type === 'badge'
              ? formatSecondsChange(value)
              : formatSeconds(value),
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
          {chartData ? (
            <CaptchaChart
              chart={chartData}
              timeBucket={timeBucket}
              timeFormat={timeFormat}
              rotateXAxis={rotateXAxis}
              chartType={chartTypes.line}
              dataNames={dataNames}
            >
              {summaryCards.length ? (
                <div className='mb-5 flex flex-wrap justify-center gap-5 lg:justify-start'>
                  {summaryCards.map((card) => (
                    <MetricCard
                      key={card.label}
                      label={card.label}
                      value={card.value}
                      change={card.change}
                      goodChangeDirection={card.goodChangeDirection}
                      valueMapper={card.valueMapper}
                    />
                  ))}
                </div>
              ) : null}
            </CaptchaChart>
          ) : null}
          <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
            {panelsData.types
              ? _map(PANELS_ORDER, (type: keyof typeof tnMapping) => {
                  const panelName = tnMapping[type]
                  const panelIcon = panelIconMapping[type]
                  const panelData = panelsData.data?.[type] || []

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
                        data={panelData}
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
                        data={panelData}
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
                        data={panelData}
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
                        data={panelData}
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
                        data={panelData}
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
                        data={panelData}
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
                        data={panelData}
                        rowMapper={(entry: any) => formatDifficulty(entry.name)}
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
                      data={panelData}
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
