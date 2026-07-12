import cx from 'clsx'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import _debounce from 'lodash/debounce'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import type { TFunction } from 'i18next'
import {
  FlaskIcon,
  TrashIcon,
  PencilIcon,
  PlusIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
} from '@phosphor-icons/react'
import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from '~/ui/Link'
import { useFetcher, useLocation, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import type {
  AnalyticsFilter,
  ExperimentResults as ExperimentResultsSummary,
  ExperimentVariantResult,
} from '~/api/api.server'
import { DOCS_URL } from '~/lib/constants'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import {
  useViewProjectContext,
  useRefreshTriggers,
} from '~/pages/Project/View/ViewProject'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import type { ProjectViewActionData } from '~/routes/projects.$id'
import Button from '~/ui/Button'
import { Badge } from '~/ui/Badge'
import Input from '~/ui/Input'
import Spin from '~/ui/icons/Spin'
import InfiniteScrollTrigger from '~/ui/InfiniteScrollTrigger'
import LoadingBar from '~/ui/LoadingBar'
import Modal from '~/ui/Modal'
import StatusPage from '~/ui/StatusPage'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { v2FilterToLegacy } from '~/utils/analyticsUrl'
import routes from '~/utils/routes'

import ExperimentResults from './ExperimentResults'
import ExperimentSettingsModal from './ExperimentSettingsModal'
import { LoaderView } from '../../View/components/LoaderView'

dayjs.extend(relativeTime)

const EXPERIMENTS_DOCS_URL = `${DOCS_URL}/analytics-dashboard/experiments`
const DEFAULT_EXPERIMENTS_TAKE = 20

type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed'

type ExposureTrigger = 'feature_flag' | 'custom_event'

type MultipleVariantHandling = 'exclude' | 'first_exposure'

type FeatureFlagMode = 'create' | 'link'

const VARIANT_RAIL_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-red-500',
  'bg-sky-500',
  'bg-violet-500',
]

interface ExperimentVariant {
  id?: string
  name: string
  key: string
  description?: string | null
  rolloutPercentage: number
  isControl: boolean
}

interface Experiment {
  id: string
  name: string
  description: string | null
  hypothesis: string | null
  status: ExperimentStatus
  // Exposure criteria
  exposureTrigger: ExposureTrigger
  customEventName: string | null
  multipleVariantHandling: MultipleVariantHandling
  filterInternalUsers: boolean
  // Feature flag configuration
  featureFlagMode: FeatureFlagMode
  featureFlagKey: string | null
  startedAt: string | null
  endedAt: string | null
  pid: string
  goalId: string | null
  featureFlagId: string | null
  variants: ExperimentVariant[]
  created: string
}

interface ExperimentRowProps {
  experiment: Experiment
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onStart: (id: string) => void
  onPause: (id: string) => void
  onComplete: (id: string) => void
  period: string
  timeBucket: string
  from: string
  to: string
  timezone?: string
  filters: AnalyticsFilter[]
}

const normaliseProbability = (value: number) => {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

const formatProbability = (value: number) => {
  const safeValue = normaliseProbability(value)
  return Number.isInteger(safeValue)
    ? `${safeValue}%`
    : `${safeValue.toFixed(2)}%`
}

const sortResultVariants = (
  variants: ExperimentVariantResult[],
  experimentVariants: ExperimentVariant[],
) => {
  const variantOrder = new Map(
    experimentVariants.map((variant, index) => [variant.key, index]),
  )

  return [...variants].sort((a, b) => {
    const aOrder = variantOrder.get(a.key) ?? Number.MAX_SAFE_INTEGER
    const bOrder = variantOrder.get(b.key) ?? Number.MAX_SAFE_INTEGER

    if (aOrder !== bOrder) return aOrder - bOrder
    if (a.isControl && !b.isControl) return -1
    if (!a.isControl && b.isControl) return 1
    return b.probabilityOfBeingBest - a.probabilityOfBeingBest
  })
}

const ExperimentWinningRail = ({
  experiment,
  period,
  timeBucket,
  from,
  to,
  timezone,
  filters,
}: {
  experiment: Experiment
  period: string
  timeBucket: string
  from: string
  to: string
  timezone?: string
  filters: AnalyticsFilter[]
}) => {
  const { t } = useTranslation()
  const {
    data: winningData,
    state: winningState,
    submit: submitWinning,
  } = useFetcher<ProjectViewActionData>()
  const filtersPayload = useMemo(() => JSON.stringify(filters), [filters])
  const shouldLoadResults = experiment.status !== 'draft'

  useEffect(() => {
    if (!shouldLoadResults) return

    submitWinning(
      {
        intent: 'get-experiment-results',
        experimentId: experiment.id,
        period,
        timeBucket,
        from,
        to,
        timezone: timezone || '',
        filters: filtersPayload,
      },
      { method: 'POST' },
    )
  }, [
    experiment.id,
    filtersPayload,
    from,
    period,
    shouldLoadResults,
    submitWinning,
    timeBucket,
    timezone,
    to,
  ])

  const results =
    winningData?.success && winningData.data
      ? (winningData.data as ExperimentResultsSummary)
      : null
  const resultVariants = useMemo(
    () => sortResultVariants(results?.variants || [], experiment.variants),
    [experiment.variants, results?.variants],
  )
  const totalProbability = resultVariants.reduce(
    (sum, variant) =>
      sum + normaliseProbability(variant.probabilityOfBeingBest),
    0,
  )
  const hasResultData =
    Boolean(results?.totalExposures) &&
    resultVariants.length > 0 &&
    totalProbability > 0
  const isLoading = shouldLoadResults && winningState !== 'idle' && !results
  const leader = hasResultData
    ? resultVariants.reduce((current, variant) =>
        variant.probabilityOfBeingBest > current.probabilityOfBeingBest
          ? variant
          : current,
      )
    : null
  const isDeclaredWinner = Boolean(
    results?.hasWinner && leader && results.winnerKey === leader.key,
  )

  if (isLoading) {
    return (
      <div>
        <span className='block rounded-full py-1'>
          <span className='block h-1.5 animate-pulse rounded-full bg-gray-200 dark:bg-slate-800' />
        </span>
        <Text
          as='p'
          size='xs'
          colour='muted'
          className='mt-1 text-right tabular-nums'
        >
          {t('common.loading')}
        </Text>
      </div>
    )
  }

  if (!hasResultData || !leader) {
    return (
      <div>
        <span className='block rounded-full py-1'>
          <span className='block h-1.5 rounded-full bg-gray-200 dark:bg-slate-800' />
        </span>
        <Text
          as='p'
          size='xs'
          colour='muted'
          className='mt-1 text-right tabular-nums'
        >
          {t('experiments.noDataYet')}
        </Text>
      </div>
    )
  }

  const leaderLabel = `${leader.name} ${formatProbability(
    leader.probabilityOfBeingBest,
  )}`

  return (
    <div>
      <Tooltip
        asChild
        ariaLabel={t('experiments.probabilityOfWinning')}
        contentVariant='chart'
        text={
          <ul className='m-0 max-h-[250px] min-w-56 list-none overflow-y-auto p-0 md:max-h-[350px]'>
            <li className='sticky top-0 mb-1 border-b border-gray-200 bg-gray-50 pb-1 dark:border-slate-800 dark:bg-slate-900'>
              <Text
                as='div'
                size='xs'
                weight='semibold'
                colour='primary'
                truncate
                className='max-w-[220px] md:text-sm'
              >
                {t('experiments.probabilityOfWinning')}
              </Text>
            </li>
            {resultVariants.map((variant, index) => {
              const colour =
                VARIANT_RAIL_COLORS[index % VARIANT_RAIL_COLORS.length]
              const isWinner =
                results?.hasWinner && results.winnerKey === variant.key

              return (
                <li
                  key={variant.key}
                  className='flex items-center justify-between gap-3 py-px leading-snug'
                >
                  <div className='mr-4 flex min-w-0 items-center gap-2'>
                    <span className={cx('size-2 rounded-full', colour)} />
                    <Text
                      as='span'
                      size='xs'
                      colour='secondary'
                      truncate
                      className='md:text-sm'
                    >
                      {variant.name}
                    </Text>
                    {variant.isControl ? (
                      <Text
                        as='span'
                        size='xxs'
                        colour='secondary'
                        className='rounded bg-gray-100 px-1.5 py-0.5 ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700'
                      >
                        {t('experiments.control')}
                      </Text>
                    ) : null}
                    {isWinner ? (
                      <Text
                        as='span'
                        size='xxs'
                        colour='success'
                        className='rounded bg-emerald-50 px-1.5 py-0.5 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:ring-emerald-800/70'
                      >
                        {t('experiments.winner')}
                      </Text>
                    ) : null}
                  </div>
                  <Text
                    as='span'
                    size='xs'
                    colour='primary'
                    className='font-mono whitespace-nowrap tabular-nums md:text-sm'
                  >
                    {formatProbability(variant.probabilityOfBeingBest)}
                  </Text>
                </li>
              )
            })}
          </ul>
        }
        tooltipNode={
          <span className='block cursor-help rounded-full py-1'>
            <span className='flex h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800'>
              {resultVariants.map((variant, index) => (
                <span
                  key={variant.key}
                  className={
                    VARIANT_RAIL_COLORS[index % VARIANT_RAIL_COLORS.length]
                  }
                  style={{
                    width: `${
                      (normaliseProbability(variant.probabilityOfBeingBest) /
                        totalProbability) *
                      100
                    }%`,
                  }}
                />
              ))}
            </span>
          </span>
        }
      />
      <Text
        as='p'
        size='xs'
        colour={isDeclaredWinner ? 'success' : 'muted'}
        weight={isDeclaredWinner ? 'semibold' : 'normal'}
        truncate
        title={leaderLabel}
        className='mt-1 text-right tabular-nums'
      >
        {leaderLabel}
      </Text>
    </div>
  )
}

const getLaunchGuardrails = (experiment: Experiment, t: TFunction) => {
  const blockers: string[] = []
  const warnings: string[] = []
  const variants = experiment.variants || []
  const totalAllocation = variants.reduce(
    (sum, variant) => sum + variant.rolloutPercentage,
    0,
  )
  const allocations = variants.map((variant) => variant.rolloutPercentage)
  const minAllocation = allocations.length ? Math.min(...allocations) : 0
  const maxAllocation = allocations.length ? Math.max(...allocations) : 0

  if (!experiment.goalId) {
    blockers.push(t('experiments.guardrails.missingGoal'))
  }

  if (variants.length < 2) {
    blockers.push(t('experiments.guardrails.needsTwoVariants'))
  }

  if (variants.filter((variant) => variant.isControl).length !== 1) {
    blockers.push(t('experiments.guardrails.needsOneControl'))
  }

  if (totalAllocation !== 100) {
    blockers.push(t('experiments.guardrails.allocationTotal'))
  }

  if (variants.some((variant) => variant.rolloutPercentage <= 0)) {
    blockers.push(t('experiments.guardrails.everyVariantTraffic'))
  }

  if (
    experiment.exposureTrigger === 'custom_event' &&
    !experiment.customEventName?.trim()
  ) {
    blockers.push(t('experiments.guardrails.missingExposureEvent'))
  }

  if (experiment.featureFlagMode === 'link' && !experiment.featureFlagId) {
    blockers.push(t('experiments.guardrails.missingLinkedFeatureFlag'))
  }

  if (maxAllocation - minAllocation > 10) {
    warnings.push(t('experiments.guardrails.unevenAllocation'))
  }

  if (minAllocation > 0 && minAllocation < 10) {
    warnings.push(t('experiments.guardrails.lowTrafficVariant'))
  }

  if (!experiment.hypothesis?.trim()) {
    warnings.push(t('experiments.guardrails.noHypothesis'))
  }

  return { blockers, warnings }
}

const ExperimentRow = ({
  experiment,
  onDelete,
  onEdit,
  onStart,
  onPause,
  onComplete,
  period,
  timeBucket,
  from,
  to,
  timezone,
  filters,
}: ExperimentRowProps) => {
  const { t } = useTranslation()
  const location = useLocation()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const variantsCount = experiment.variants?.length || 0
  const launchGuardrails = useMemo(
    () => getLaunchGuardrails(experiment, t),
    [experiment, t],
  )
  const launchBlockerText = launchGuardrails.blockers.join(', ')
  const timingLabel = useMemo(() => {
    if (experiment.status === 'completed' && experiment.endedAt) {
      return t('experiments.endedAtDate', {
        date: dayjs(experiment.endedAt).format('MMM D, YYYY'),
      })
    }

    if (experiment.startedAt) {
      return t('experiments.startedAtDate', {
        date: dayjs(experiment.startedAt).format('MMM D, YYYY'),
      })
    }

    return dayjs(experiment.created).fromNow()
  }, [
    experiment.created,
    experiment.endedAt,
    experiment.startedAt,
    experiment.status,
    t,
  ])
  const isEditDisabled =
    experiment.status === 'running' || experiment.status === 'completed'
  const statusBadgeColour: 'slate' | 'green' | 'yellow' | 'sky' =
    useMemo(() => {
      if (experiment.status === 'running') return 'green'
      if (experiment.status === 'paused') return 'yellow'
      if (experiment.status === 'completed') return 'sky'
      return 'slate'
    }, [experiment.status])

  const resultsSearch = useMemo(() => {
    const params = new URLSearchParams(location.search)
    params.set('experimentId', experiment.id)
    params.delete('newExperiment')
    params.delete('editExperimentId')
    return params.toString()
  }, [location.search, experiment.id])

  const neutralActionButtonClass =
    'inline-flex items-center justify-center rounded-md border border-transparent p-2 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 sm:p-1.5 dark:text-slate-400 hover:dark:border-slate-700/80 dark:hover:bg-slate-900 dark:hover:text-slate-300'
  const positiveActionButtonClass =
    'inline-flex items-center justify-center rounded-md border border-transparent p-2 transition-colors sm:p-1.5 text-green-600 hover:border-green-300 hover:bg-green-50 dark:text-green-400 hover:dark:border-green-700/80 dark:hover:bg-green-900/30'

  const handleStart = async () => {
    setActionLoading(true)
    try {
      await onStart(experiment.id)
    } finally {
      setActionLoading(false)
    }
  }

  const handlePause = async () => {
    setActionLoading(true)
    try {
      await onPause(experiment.id)
    } finally {
      setActionLoading(false)
    }
  }

  const handleComplete = async () => {
    setActionLoading(true)
    try {
      await onComplete(experiment.id)
      setShowCompleteModal(false)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      <li className='relative mb-2 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-colors hover:bg-gray-200/70 dark:border-slate-800/60 dark:bg-slate-900/25 dark:hover:bg-slate-900/60'>
        <div className='flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-x-4 sm:px-5'>
          <Link
            to={{ search: resultsSearch }}
            className='grid min-w-0 flex-auto gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center dark:focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-900'
          >
            <div className='min-w-0'>
              <div className='flex min-w-0 flex-wrap items-center gap-2'>
                <Text as='p' weight='semibold' truncate>
                  {experiment.name}
                </Text>
                <Badge
                  label={t(`experiments.status.${experiment.status}`)}
                  colour={statusBadgeColour}
                  className='text-[0.625rem] leading-3'
                />
                {launchGuardrails.blockers.length > 0 &&
                experiment.status === 'draft' ? (
                  <Badge
                    colour='red'
                    label={t('experiments.launchBlocked')}
                    className='text-[0.625rem] leading-3'
                  />
                ) : null}
                {launchGuardrails.blockers.length === 0 &&
                launchGuardrails.warnings.length > 0 &&
                experiment.status === 'draft' ? (
                  <Badge
                    colour='yellow'
                    label={t('experiments.reviewConfig')}
                    className='text-[0.625rem] leading-3'
                  />
                ) : null}
              </div>
              <div className='mt-1 flex flex-wrap items-center gap-x-2 gap-y-1'>
                <Text as='span' size='xs' colour='muted'>
                  {t('experiments.variantsCountLabel', {
                    count: variantsCount,
                  })}
                </Text>
                <span className='size-1 rounded-full bg-gray-300 dark:bg-slate-700' />
                <Text as='span' size='xs' colour='muted'>
                  {timingLabel}
                </Text>
              </div>
            </div>
            <div>
              <ExperimentWinningRail
                experiment={experiment}
                period={period}
                timeBucket={timeBucket}
                from={from}
                to={to}
                timezone={timezone}
                filters={filters}
              />
            </div>
          </Link>
          <div className='flex w-full flex-wrap items-center gap-1 sm:w-auto sm:shrink-0 sm:justify-end'>
            {experiment.status === 'draft' ? (
              <>
                {launchGuardrails.blockers.length > 0 ? (
                  <Tooltip
                    text={launchBlockerText || t('experiments.needGoal')}
                    tooltipNode={
                      <span className='inline-flex'>
                        <button
                          type='button'
                          disabled
                          aria-label={t('experiments.start')}
                          className={cx(
                            positiveActionButtonClass,
                            'cursor-not-allowed opacity-50',
                          )}
                        >
                          <PlayIcon className='size-4' />
                        </button>
                      </span>
                    }
                  />
                ) : (
                  <Tooltip
                    text={t('experiments.start')}
                    tooltipNode={
                      <span className='inline-flex'>
                        <button
                          type='button'
                          onClick={handleStart}
                          disabled={actionLoading}
                          aria-label={t('experiments.start')}
                          className={cx(positiveActionButtonClass, {
                            'cursor-not-allowed opacity-50': actionLoading,
                          })}
                        >
                          {actionLoading ? (
                            <Spin className='size-4' />
                          ) : (
                            <PlayIcon className='size-4' />
                          )}
                        </button>
                      </span>
                    }
                  />
                )}
              </>
            ) : null}
            {experiment.status === 'running' ? (
              <>
                <Tooltip
                  text={t('experiments.pause')}
                  tooltipNode={
                    <span className='inline-flex'>
                      <button
                        type='button'
                        onClick={handlePause}
                        disabled={actionLoading}
                        aria-label={t('experiments.pause')}
                        className={cx(neutralActionButtonClass, {
                          'cursor-not-allowed opacity-50': actionLoading,
                        })}
                      >
                        {actionLoading ? (
                          <Spin className='size-4' />
                        ) : (
                          <PauseIcon className='size-4' />
                        )}
                      </button>
                    </span>
                  }
                />
              </>
            ) : null}
            {experiment.status === 'paused' ? (
              <>
                <Tooltip
                  text={t('experiments.resume')}
                  tooltipNode={
                    <span className='inline-flex'>
                      <button
                        type='button'
                        onClick={handleStart}
                        disabled={actionLoading}
                        aria-label={t('experiments.resume')}
                        className={cx(positiveActionButtonClass, {
                          'cursor-not-allowed opacity-50': actionLoading,
                        })}
                      >
                        {actionLoading ? (
                          <Spin className='size-4' />
                        ) : (
                          <PlayIcon className='size-4' />
                        )}
                      </button>
                    </span>
                  }
                />
                <Tooltip
                  text={t('experiments.complete')}
                  tooltipNode={
                    <span className='inline-flex'>
                      <button
                        type='button'
                        onClick={() => setShowCompleteModal(true)}
                        disabled={actionLoading}
                        aria-label={t('experiments.complete')}
                        className={cx(neutralActionButtonClass, {
                          'cursor-not-allowed opacity-50': actionLoading,
                        })}
                      >
                        <CheckCircleIcon className='size-4' />
                      </button>
                    </span>
                  }
                />
              </>
            ) : null}
            {experiment.status === 'completed' ? (
              <Tooltip
                text={t('experiments.viewResults')}
                tooltipNode={
                  <span className='inline-flex'>
                    <Link
                      to={{ search: resultsSearch }}
                      aria-label={t('experiments.viewResults')}
                      className={neutralActionButtonClass}
                    >
                      <ChartBarIcon className='size-4' />
                    </Link>
                  </span>
                }
              />
            ) : null}

            <div className='ml-auto flex items-center gap-1 sm:ml-0'>
              {isEditDisabled ? (
                <Tooltip
                  text={
                    experiment.status === 'running'
                      ? t('experiments.editDisabledRunning')
                      : t('experiments.editDisabledCompleted')
                  }
                  tooltipNode={
                    <span className='inline-flex'>
                      <button
                        type='button'
                        disabled
                        aria-label={t('common.edit')}
                        className={cx(
                          neutralActionButtonClass,
                          'cursor-not-allowed opacity-50',
                        )}
                      >
                        <PencilIcon className='size-4' />
                      </button>
                    </span>
                  }
                />
              ) : (
                <Tooltip
                  text={t('common.edit')}
                  tooltipNode={
                    <span className='inline-flex'>
                      <button
                        type='button'
                        onClick={() => onEdit(experiment.id)}
                        aria-label={t('common.edit')}
                        className={neutralActionButtonClass}
                      >
                        <PencilIcon className='size-4' />
                      </button>
                    </span>
                  }
                />
              )}
              <Tooltip
                text={t('common.delete')}
                tooltipNode={
                  <span className='inline-flex'>
                    <button
                      type='button'
                      onClick={() => setShowDeleteModal(true)}
                      aria-label={t('common.delete')}
                      className={neutralActionButtonClass}
                    >
                      <TrashIcon className='size-4' />
                    </button>
                  </span>
                }
              />
            </div>
          </div>
        </div>
      </li>

      <Modal
        onClose={() => setShowDeleteModal(false)}
        onSubmit={() => {
          onDelete(experiment.id)
          setShowDeleteModal(false)
        }}
        submitText={t('experiments.delete')}
        closeText={t('common.close')}
        title={t('experiments.deleteConfirmTitle')}
        message={t('experiments.deleteConfirmMessage')}
        submitType='danger'
        type='error'
        isOpened={showDeleteModal}
      />

      <Modal
        onClose={() => setShowCompleteModal(false)}
        onSubmit={handleComplete}
        submitText={t('experiments.complete')}
        closeText={t('common.cancel')}
        title={t('experiments.completeConfirmTitle')}
        message={t('experiments.completeConfirmMessage')}
        submitType='regular'
        type='info'
        isOpened={showCompleteModal}
      />
    </>
  )
}

interface ExperimentsViewProps {
  period: string
  from?: string
  to?: string
  timezone?: string
}

const ExperimentsView = ({
  period,
  from = '',
  to = '',
  timezone,
}: ExperimentsViewProps) => {
  const { id } = useCurrentProject()
  const { experimentsRefreshTrigger } = useRefreshTriggers()
  const { filters, timeBucket } = useViewProjectContext()
  // experiments endpoints are still v1 — convert filters at the boundary
  const legacyFilters = useMemo(() => filters.map(v2FilterToLegacy), [filters])
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const listFetcher = useFetcher<ProjectViewActionData>()
  const actionFetcher = useFetcher<ProjectViewActionData>()

  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const isMountedRef = useRef(true)
  const [total, setTotal] = useState(0)
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [experimentsServerSkip, setExperimentsServerSkip] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const processedActionRef = useRef<string | null>(null)
  const experimentsRequestModeRef = useRef<'replace' | 'append'>('replace')

  // Results view state
  const viewingResultsId = useMemo(
    () => searchParams.get('experimentId'),
    [searchParams],
  )
  const editingExperimentId = useMemo(
    () => searchParams.get('editExperimentId'),
    [searchParams],
  )
  const isCreatingExperiment = useMemo(
    () => searchParams.get('newExperiment') === 'true',
    [searchParams],
  )
  const isModalOpen = isCreatingExperiment || !!editingExperimentId
  const [resultsRefreshTrigger, setResultsRefreshTrigger] = useState(0)
  const [shouldRefreshListOnReturn, setShouldRefreshListOnReturn] =
    useState(false)

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const updateExperimentSearchParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString())
      updater(nextSearchParams)
      setSearchParams(nextSearchParams)
    },
    [searchParams, setSearchParams],
  )

  const loadExperiments = useCallback(
    (
      take: number,
      skip: number,
      showLoading = true,
      search?: string,
      mode: 'replace' | 'append' = 'replace',
    ) => {
      if (showLoading) {
        setIsLoading(true)
      }
      experimentsRequestModeRef.current = mode

      listFetcher.submit(
        {
          intent: 'get-project-experiments',
          take: String(take),
          skip: String(skip),
          search: search || '',
        },
        { method: 'POST' },
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listFetcher.submit],
  )

  // Handle list fetcher response
  useEffect(() => {
    if (listFetcher.data?.intent === 'get-project-experiments') {
      if (isMountedRef.current) {
        setIsLoading(false)
        if (listFetcher.data.success && listFetcher.data.data) {
          const result = listFetcher.data.data as {
            results: Experiment[]
            total: number
          }
          if (experimentsRequestModeRef.current === 'append') {
            setExperimentsServerSkip((prev) => prev + result.results.length)
            setExperiments((prev) => {
              const existingIds = new Set(
                prev.map((experiment) => experiment.id),
              )
              const uniqueExperiments = result.results.filter(
                (experiment) => !existingIds.has(experiment.id),
              )
              return [...prev, ...uniqueExperiments]
            })
          } else {
            setExperimentsServerSkip(result.results.length)
            setExperiments(result.results)
          }
          setTotal(result.total)
          setError(null)
        } else if (listFetcher.data.error) {
          setError(listFetcher.data.error)
        }
      }
    }
  }, [listFetcher.data])

  // Handle action fetcher responses (delete, start, pause, complete)
  useEffect(() => {
    if (!actionFetcher.data || actionFetcher.state !== 'idle') return

    const { intent, success, error, data } = actionFetcher.data
    const responseData = actionFetcher.data as Record<string, unknown>
    const uniqueSuffix =
      responseData.requestId ?? responseData.timestamp ?? actionFetcher.state
    const actionKey = `${intent}-${success ?? false}-${error ?? ''}-${uniqueSuffix}-${JSON.stringify(data)}`
    if (processedActionRef.current === actionKey) return
    processedActionRef.current = actionKey

    if (actionFetcher.data.intent === 'delete-experiment') {
      if (actionFetcher.data.success) {
        toast.success(t('experiments.deleted'))
        loadExperiments(
          Math.max(experiments.length, DEFAULT_EXPERIMENTS_TAKE),
          0,
          true,
          filterQuery || undefined,
        )
      } else if (actionFetcher.data.error) {
        toast.error(actionFetcher.data.error)
      }
    } else if (actionFetcher.data.intent === 'start-experiment') {
      if (actionFetcher.data.success) {
        toast.success(t('experiments.started'))
        loadExperiments(
          Math.max(experiments.length, DEFAULT_EXPERIMENTS_TAKE),
          0,
          true,
          filterQuery || undefined,
        )
      } else if (actionFetcher.data.error) {
        toast.error(actionFetcher.data.error)
      }
    } else if (actionFetcher.data.intent === 'pause-experiment') {
      if (actionFetcher.data.success) {
        toast.success(t('experiments.paused'))
        loadExperiments(
          Math.max(experiments.length, DEFAULT_EXPERIMENTS_TAKE),
          0,
          true,
          filterQuery || undefined,
        )
      } else if (actionFetcher.data.error) {
        toast.error(actionFetcher.data.error)
      }
    } else if (actionFetcher.data.intent === 'complete-experiment') {
      if (actionFetcher.data.success) {
        toast.success(t('experiments.completed'))
        loadExperiments(
          Math.max(experiments.length, DEFAULT_EXPERIMENTS_TAKE),
          0,
          true,
          filterQuery || undefined,
        )
      } else if (actionFetcher.data.error) {
        toast.error(actionFetcher.data.error)
      }
    }
  }, [
    actionFetcher.data,
    actionFetcher.state,
    t,
    loadExperiments,
    experiments.length,
    filterQuery,
  ])

  const debouncedLoadExperiments = useMemo(
    () =>
      _debounce((search: string) => {
        loadExperiments(DEFAULT_EXPERIMENTS_TAKE, 0, true, search || undefined)
      }, 300),
    [loadExperiments],
  )

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setFilterQuery(value)
      debouncedLoadExperiments(value)
    },
    [debouncedLoadExperiments],
  )

  useEffect(() => {
    return () => {
      debouncedLoadExperiments.cancel()
    }
  }, [debouncedLoadExperiments])

  useEffect(() => {
    loadExperiments(DEFAULT_EXPERIMENTS_TAKE, 0, true, filterQuery || undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (experimentsRefreshTrigger > 0) {
      if (viewingResultsId) {
        setResultsRefreshTrigger((prev) => prev + 1)
        setShouldRefreshListOnReturn(true)
        return
      }
      if (isModalOpen) {
        return
      }
      loadExperiments(
        Math.max(experiments.length, DEFAULT_EXPERIMENTS_TAKE),
        0,
        true,
        filterQuery || undefined,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experimentsRefreshTrigger, viewingResultsId, isModalOpen])

  useEffect(() => {
    if (!viewingResultsId && shouldRefreshListOnReturn) {
      setShouldRefreshListOnReturn(false)
      loadExperiments(
        Math.max(experiments.length, DEFAULT_EXPERIMENTS_TAKE),
        0,
        true,
        filterQuery || undefined,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingResultsId, shouldRefreshListOnReturn])

  const handleNewExperiment = useCallback(() => {
    updateExperimentSearchParams((params) => {
      params.set('newExperiment', 'true')
      params.delete('editExperimentId')
      params.delete('experimentId')
    })
  }, [updateExperimentSearchParams])

  const handleEditExperiment = useCallback(
    (experimentId: string) => {
      updateExperimentSearchParams((params) => {
        params.set('editExperimentId', experimentId)
        params.delete('newExperiment')
        params.delete('experimentId')
      })
    },
    [updateExperimentSearchParams],
  )

  const handleCloseModal = useCallback(() => {
    updateExperimentSearchParams((params) => {
      params.delete('newExperiment')
      params.delete('editExperimentId')
    })
  }, [updateExperimentSearchParams])

  const handleModalSuccess = useCallback(() => {
    loadExperiments(
      Math.max(experiments.length, DEFAULT_EXPERIMENTS_TAKE),
      0,
      true,
      filterQuery || undefined,
    )
  }, [experiments.length, filterQuery, loadExperiments])

  const handleDeleteExperiment = useCallback(
    (experimentId: string) => {
      processedActionRef.current = null
      actionFetcher.submit(
        { intent: 'delete-experiment', experimentId },
        { method: 'POST' },
      )
    },
    [actionFetcher],
  )

  const handleStartExperiment = useCallback(
    (experimentId: string) => {
      processedActionRef.current = null
      actionFetcher.submit(
        { intent: 'start-experiment', experimentId },
        { method: 'POST' },
      )
    },
    [actionFetcher],
  )

  const handlePauseExperiment = useCallback(
    (experimentId: string) => {
      processedActionRef.current = null
      actionFetcher.submit(
        { intent: 'pause-experiment', experimentId },
        { method: 'POST' },
      )
    },
    [actionFetcher],
  )

  const handleCompleteExperiment = useCallback(
    (experimentId: string) => {
      processedActionRef.current = null
      actionFetcher.submit(
        { intent: 'complete-experiment', experimentId },
        { method: 'POST' },
      )
    },
    [actionFetcher],
  )

  const handleBackToExperiments = useCallback(() => {
    updateExperimentSearchParams((params) => {
      params.delete('experimentId')
    })
  }, [updateExperimentSearchParams])

  const canLoadMoreExperiments = experimentsServerSkip < total
  const loadMoreExperiments = useCallback(() => {
    if (isLoading || !canLoadMoreExperiments) {
      return
    }

    loadExperiments(
      DEFAULT_EXPERIMENTS_TAKE,
      experimentsServerSkip,
      true,
      filterQuery || undefined,
      'append',
    )
  }, [
    canLoadMoreExperiments,
    experimentsServerSkip,
    filterQuery,
    isLoading,
    loadExperiments,
  ])

  if (error && isLoading === false && _isEmpty(experiments)) {
    return (
      <StatusPage
        type='error'
        title={t('apiNotifications.somethingWentWrong')}
        description={t('apiNotifications.errorCode', { error })}
        actions={[
          {
            label: t('dashboard.reloadPage'),
            onClick: () => window.location.reload(),
            primary: true,
          },
          { label: t('notFoundPage.support'), to: routes.contact },
        ]}
      />
    )
  }

  if ((isLoading === null || isLoading) && _isEmpty(experiments)) {
    return <LoaderView />
  }

  if (viewingResultsId) {
    return (
      <ExperimentResults
        experimentId={viewingResultsId}
        period={period}
        timeBucket={timeBucket}
        from={from}
        to={to}
        timezone={timezone}
        refreshTrigger={resultsRefreshTrigger}
        onBack={handleBackToExperiments}
      />
    )
  }

  return (
    <>
      <DashboardHeader showLiveVisitors />
      <div>
        {isLoading && !_isEmpty(experiments) ? <LoadingBar /> : null}
        {_isEmpty(experiments) && !filterQuery ? (
          <div className='mx-auto w-full max-w-2xl py-16 text-center'>
            <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-900'>
              <FlaskIcon className='size-7 text-gray-700 dark:text-gray-200' />
            </div>
            <Text as='h3' size='xl' weight='medium' className='tracking-tight'>
              {t('experiments.title')}
            </Text>
            <Text
              as='p'
              size='sm'
              colour='secondary'
              className='mx-auto mt-2 max-w-md whitespace-pre-wrap'
            >
              <Trans
                t={t}
                i18nKey='experiments.description'
                components={{
                  docs: (
                    <a
                      href={EXPERIMENTS_DOCS_URL}
                      aria-label={t('ariaLabels.openExperimentsGuide')}
                      className='font-medium underline decoration-dashed hover:decoration-solid'
                      target='_blank'
                      rel='noreferrer noopener'
                    />
                  ),
                }}
              />
            </Text>
            <div className='mt-6'>
              <Button size='lg' onClick={handleNewExperiment}>
                <PlusIcon className='mr-1.5 size-4' />
                {t('experiments.create')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <Input
                type='search'
                aria-label={t('experiments.filterExperiments')}
                placeholder={t('experiments.filterExperiments')}
                value={filterQuery}
                onChange={handleSearchChange}
                className='sm:w-64'
                leadingIcon={<MagnifyingGlassIcon className='size-4' />}
              />
              <Button onClick={handleNewExperiment}>
                <PlusIcon className='mr-1.5 size-4' />
                {t('experiments.create')}
              </Button>
            </div>

            <ul className='mt-4'>
              {_map(experiments, (experiment) => (
                <ExperimentRow
                  key={experiment.id}
                  experiment={experiment}
                  onDelete={handleDeleteExperiment}
                  onEdit={handleEditExperiment}
                  onStart={handleStartExperiment}
                  onPause={handlePauseExperiment}
                  onComplete={handleCompleteExperiment}
                  period={period}
                  timeBucket={timeBucket}
                  from={from}
                  to={to}
                  timezone={timezone}
                  filters={legacyFilters}
                />
              ))}
            </ul>

            {_isEmpty(experiments) && filterQuery ? (
              <Text
                as='p'
                size='sm'
                colour='muted'
                className='py-8 text-center'
              >
                {t('experiments.noExperimentsMatchFilter')}
              </Text>
            ) : null}
          </>
        )}
        <InfiniteScrollTrigger
          hasMore={canLoadMoreExperiments}
          isLoading={!!isLoading}
          onLoadMore={loadMoreExperiments}
          disabled={!!isLoading}
          className='mt-2'
        />

        <ExperimentSettingsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={handleModalSuccess}
          projectId={id}
          experimentId={isCreatingExperiment ? null : editingExperimentId}
        />
      </div>
    </>
  )
}

export default memo(ExperimentsView)
