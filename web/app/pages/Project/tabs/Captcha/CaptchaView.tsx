import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import {
  CompassIcon,
  MapPinIcon,
  MonitorIcon,
  DevicesIcon,
  GaugeIcon,
  WarningIcon,
  ClockIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react'
import { useMemo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import {
  useCompareSummaryQuery,
  useSummaryQuery,
  useTimeseriesQuery,
} from '~/hooks/v2/useV2Queries'
import { chartTypes } from '~/lib/constants'
import { Entry } from '~/lib/models/Entry'
import { MetricCard } from '~/pages/Project/tabs/Traffic/MetricCards'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import Loader from '~/ui/Loader'
import { nFormatter } from '~/utils/generic'

import CCRow from '../../View/components/CCRow'
import DashboardHeader from '../../View/components/DashboardHeader'
import Filters from '../../View/components/Filters'
import ProjectViewHeaderActions from '../../View/components/ProjectViewHeaderActions'
import { BreakdownPanel, BreakdownSubTab } from '../../View/v2/BreakdownPanel'
import { useViewProjectContext } from '../../View/ViewProject'
import { getDeviceRowMapper } from '../../View/ViewProject.helpers'

import { pivotCaptchaTimeseries } from './adapters'
import { CaptchaChart } from './CaptchaChart'
import NoCaptchaEvents from './NoCaptchaEvents'
import WaitingForCaptchaEvent from './WaitingForCaptchaEvent'

const PANELS_ORDER = [
  'country',
  'browser',
  'os',
  'device',
  'captcha_event',
  'captcha_difficulty',
  'solve_time',
  'captcha_reason',
] as const

const iconClassName = 'w-6 h-6'
const panelIconMapping: Record<string, React.ReactNode> = {
  country: <MapPinIcon className={iconClassName} />,
  device: <DevicesIcon className={iconClassName} />,
  browser: <CompassIcon className={iconClassName} />,
  os: <MonitorIcon className={iconClassName} />,
  captcha_event: <ShieldCheckIcon className={iconClassName} />,
  captcha_difficulty: <GaugeIcon className={iconClassName} />,
  captcha_reason: <WarningIcon className={iconClassName} />,
  solve_time: <ClockIcon className={iconClassName} />,
}

export const captchaTypeNameMapping = (t: any) => ({
  country: t('project.mapping.cc'),
  device: t('project.mapping.dv'),
  browser: t('project.mapping.br'),
  os: t('project.mapping.os'),
  captcha_event: t('project.mapping.captcha_event'),
  captcha_difficulty: t('project.mapping.captcha_difficulty'),
  captcha_reason: t('project.mapping.captcha_reason'),
  solve_time: t('project.mapping.solve_time'),
})

interface CaptchaViewProps {
  projectId: string
}

const CaptchaView = (_props: CaptchaViewProps) => {
  const { theme } = useTheme()
  const { project } = useCurrentProject()
  const { timeBucket, timeFormat, filters, rotateXAxis } =
    useViewProjectContext()

  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const hasShownContentRef = useRef(false)

  const summaryQuery = useSummaryQuery('captcha')
  const compareSummaryQuery = useCompareSummaryQuery('captcha')
  const timeseriesQuery = useTimeseriesQuery('captcha')

  const summary = summaryQuery.data?.data
  const summaryData = summary?.current ?? null
  const summaryCompareData =
    compareSummaryQuery.data?.data.current ?? summary?.previous ?? null

  const chartData = useMemo(
    () => pivotCaptchaTimeseries(timeseriesQuery.data?.data),
    [timeseriesQuery.data],
  )

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

  const tnMapping = captchaTypeNameMapping(t)

  const summaryLoaded = Boolean(summaryQuery.data)

  const isPanelsDataEmptyRaw =
    summaryLoaded && !summaryData?.generated && !summaryData?.passed

  if (summaryLoaded && !isPanelsDataEmptyRaw) {
    hasShownContentRef.current = true
  }

  const isPanelsDataEmpty = isPanelsDataEmptyRaw && !hasShownContentRef.current

  // Queries keep previous data across period/filter changes, so `isLoading` only
  // ever means "nothing cached to show yet" — exactly when a spinner is wanted.
  const isChartLoading = summaryQuery.isLoading || timeseriesQuery.isLoading

  const panels = useMemo(
    () =>
      _map(PANELS_ORDER, (dimension) => ({
        dimension,
        name: tnMapping[dimension],
        subTabs: [
          { id: dimension, label: tnMapping[dimension], dimension },
        ] as BreakdownSubTab[],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  )

  const formatReason = useCallback(
    (value?: string | null) =>
      value
        ? t(`project.captchaAnalytics.reasons.${value}`, {
            defaultValue: value,
          })
        : 'N/A',
    [t],
  )

  const formatDifficulty = useCallback(
    (value?: string | null) => {
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
    },
    [t],
  )

  const rowMapper = useCallback(
    (entry: Entry, subTabId: string) => {
      const { name: entryName, cc } = entry

      if (subTabId === 'country') {
        if (cc !== undefined) {
          return (
            <CCRow cc={cc} name={entryName || undefined} language={language} />
          )
        }
        return <CCRow cc={entryName} language={language} />
      }

      if (
        subTabId === 'browser' ||
        subTabId === 'os' ||
        subTabId === 'device'
      ) {
        const v1Tab =
          subTabId === 'browser' ? 'br' : subTabId === 'os' ? 'os' : 'dv'
        const mapper = getDeviceRowMapper(v1Tab, theme, t) as
          | ((entry: Entry) => React.ReactNode)
          | undefined
        return mapper ? mapper(entry) : entryName
      }

      if (subTabId === 'captcha_event') {
        return t(`project.captchaAnalytics.events.${entryName}`, {
          defaultValue: entryName ?? 'N/A',
        })
      }

      if (subTabId === 'captcha_reason') {
        return formatReason(entryName)
      }

      if (subTabId === 'captcha_difficulty') {
        return formatDifficulty(entryName)
      }

      return entryName
    },
    [language, theme, t, formatReason, formatDifficulty],
  )

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
          label: t('project.captchaAnalytics.passed'),
          value: summaryData.passed || 0,
          change: summaryCompareData
            ? (summaryData.passed || 0) - (summaryCompareData.passed || 0)
            : undefined,
          goodChangeDirection: 'down' as const,
          valueMapper: formatNumber,
        },
        {
          label: t('project.captchaAnalytics.passRate'),
          value: summaryData.passRate as number,
          change:
            summaryCompareData &&
            isFiniteNumber(summaryData.passRate) &&
            isFiniteNumber(summaryCompareData.passRate)
              ? summaryData.passRate - summaryCompareData.passRate
              : undefined,
          goodChangeDirection: 'down' as const,
          valueMapper: formatPercent,
        },
        {
          label: t('project.captchaAnalytics.medianSolve'),
          value: summaryData.solveP50 || 0,
          change:
            summaryCompareData &&
            (summaryData.solveP50 || 0) > 0 &&
            (summaryCompareData.solveP50 || 0) > 0
              ? (summaryData.solveP50 || 0) - (summaryCompareData.solveP50 || 0)
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

  const headerRightContent = <ProjectViewHeaderActions tnMapping={tnMapping} />

  if (isPanelsDataEmpty) {
    return (
      <>
        <DashboardHeader
          showLiveVisitors={false}
          rightContent={headerRightContent}
        />
        <NoCaptchaEvents filters={filters} />
      </>
    )
  }

  return (
    <>
      <DashboardHeader
        showLiveVisitors={false}
        rightContent={headerRightContent}
      />
      <div>
        <Filters className='mb-3' tnMapping={tnMapping} />
        {isChartLoading ? (
          <div className='flex h-80 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
            <Loader className='pt-0!' />
          </div>
        ) : null}
        {!_isEmpty(chartData.x) ? (
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
          {panels.map((panel) => (
            <BreakdownPanel
              key={panel.dimension}
              dataType='captcha'
              panelId={panel.dimension}
              name={panel.name}
              icon={panelIconMapping[panel.dimension]}
              subTabs={panel.subTabs}
              primaryMetric='events'
              rowMapper={rowMapper}
              capitalize={['device']}
            />
          ))}
        </div>
      </div>
    </>
  )
}

export default CaptchaView
