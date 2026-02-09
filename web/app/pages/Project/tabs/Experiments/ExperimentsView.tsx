import cx from 'clsx'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import _debounce from 'lodash/debounce'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
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
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import {
  useViewProjectContext,
  useRefreshTriggers,
} from '~/pages/Project/View/ViewProject'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import type { ProjectViewActionData } from '~/routes/projects.$id'
import Button from '~/ui/Button'
import Spin from '~/ui/icons/Spin'
import LoadingBar from '~/ui/LoadingBar'
import Modal from '~/ui/Modal'
import Pagination from '~/ui/Pagination'
import StatusPage from '~/ui/StatusPage'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

import ExperimentResults from './ExperimentResults'
import ExperimentSettingsModal from './ExperimentSettingsModal'
import { LoaderView } from '../../View/components/LoaderView'

dayjs.extend(relativeTime)

const STATUS_COLORS: Record<ExperimentStatus, { bg: string; text: string }> = {
  draft: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-600 dark:text-gray-400',
  },
  running: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-400',
  },
  paused: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-400',
  },
  completed: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-400',
  },
}

const DEFAULT_EXPERIMENTS_TAKE = 20

type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed'

type ExposureTrigger = 'feature_flag' | 'custom_event'

type MultipleVariantHandling = 'exclude' | 'first_exposure'

type FeatureFlagMode = 'create' | 'link'

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
  onViewResults: (id: string) => void
}

const ExperimentRow = ({
  experiment,
  onDelete,
  onEdit,
  onStart,
  onPause,
  onComplete,
  onViewResults,
}: ExperimentRowProps) => {
  const { t } = useTranslation()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const statusColors = STATUS_COLORS[experiment.status]
  const variantsCount = experiment.variants?.length || 0
  const isEditDisabled =
    experiment.status === 'running' || experiment.status === 'completed'

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
      <li className='relative mb-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-colors dark:border-slate-800/60 dark:bg-slate-900/25'>
        <div className='flex justify-between gap-x-6 px-4 py-4 sm:px-6'>
          <div className='flex min-w-0 gap-x-4'>
            <div className='min-w-0 flex-auto'>
              <div className='flex items-center gap-x-2'>
                <Text
                  as='p'
                  weight='semibold'
                  truncate
                  className='flex items-center gap-x-1.5'
                >
                  <FlaskIcon className='size-4 text-purple-500' />
                  <span>{experiment.name}</span>
                </Text>
                {/* Status badge */}
                <span
                  className={cx(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                    statusColors.bg,
                    statusColors.text,
                  )}
                >
                  {t(`experiments.status.${experiment.status}`)}
                </span>
                {/* Variants count badge */}
                <span className='inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'>
                  {variantsCount} {t('experiments.variants')}
                </span>
              </div>
              {experiment.description ? (
                <Text className='mt-1' as='p' size='sm' colour='secondary'>
                  {experiment.description}
                </Text>
              ) : null}
              {experiment.hypothesis ? (
                <Text className='mt-1 italic' as='p' size='xs' colour='muted'>
                  {t('experiments.hypothesis')}: {experiment.hypothesis}
                </Text>
              ) : null}
              {/* Timestamps */}
              <div className='mt-2 flex items-center gap-x-3 text-xs text-gray-500 dark:text-gray-400'>
                {experiment.startedAt ? (
                  <span>
                    {t('experiments.startedAt')}:{' '}
                    {dayjs(experiment.startedAt).format('MMM D, YYYY')}
                  </span>
                ) : null}
                {experiment.endedAt ? (
                  <span>
                    {t('experiments.endedAt')}:{' '}
                    {dayjs(experiment.endedAt).format('MMM D, YYYY')}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className='flex shrink-0 items-center gap-x-1'>
            {/* Action buttons based on status */}
            {experiment.status === 'draft' ? (
              <Button
                onClick={handleStart}
                disabled={actionLoading || !experiment.goalId}
                title={
                  !experiment.goalId ? t('experiments.needGoal') : undefined
                }
                ghost
                small
              >
                {actionLoading ? (
                  <Spin className='size-4' />
                ) : (
                  <PlayIcon className='mr-1 size-4' />
                )}
                {t('experiments.start')}
              </Button>
            ) : null}
            {experiment.status === 'running' ? (
              <>
                <Button
                  onClick={handlePause}
                  disabled={actionLoading}
                  ghost
                  small
                >
                  {actionLoading ? (
                    <Spin className='size-4' />
                  ) : (
                    <PauseIcon className='mr-1 size-4' />
                  )}
                  {t('experiments.pause')}
                </Button>
                <Button
                  onClick={() => onViewResults(experiment.id)}
                  ghost
                  small
                >
                  <ChartBarIcon className='mr-1 size-4' />
                  {t('experiments.results')}
                </Button>
              </>
            ) : null}
            {experiment.status === 'paused' ? (
              <>
                <Button
                  onClick={handleStart}
                  disabled={actionLoading}
                  ghost
                  small
                >
                  {actionLoading ? (
                    <Spin className='size-4' />
                  ) : (
                    <PlayIcon className='mr-1 size-4' />
                  )}
                  {t('experiments.resume')}
                </Button>
                <Button
                  onClick={() => setShowCompleteModal(true)}
                  disabled={actionLoading}
                  ghost
                  small
                >
                  <CheckCircleIcon className='mr-1 size-4' />
                  {t('experiments.complete')}
                </Button>
              </>
            ) : null}
            {experiment.status === 'completed' ? (
              <Button onClick={() => onViewResults(experiment.id)} ghost small>
                <ChartBarIcon className='mr-1 size-4' />
                {t('experiments.viewResults')}
              </Button>
            ) : null}

            {/* Edit/Delete buttons */}
            <div className='flex items-center gap-1 border-l border-gray-200 pl-2 dark:border-slate-700'>
              <button
                type='button'
                onClick={() =>
                  !isEditDisabled ? onEdit(experiment.id) : undefined
                }
                disabled={isEditDisabled}
                aria-label={t('common.edit')}
                title={
                  experiment.status === 'running'
                    ? 'Pause this experiment to edit settings.'
                    : experiment.status === 'completed'
                      ? 'Completed experiments can’t be edited.'
                      : t('common.edit')
                }
                className={cx(
                  'rounded-md border border-transparent p-1.5 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 hover:dark:border-slate-700/80 dark:hover:bg-slate-900 dark:hover:text-slate-300',
                  isEditDisabled &&
                    'cursor-not-allowed opacity-50 hover:border-transparent hover:bg-transparent',
                )}
              >
                <PencilIcon className='size-4' />
              </button>
              <button
                type='button'
                onClick={() => setShowDeleteModal(true)}
                aria-label={t('common.delete')}
                className='rounded-md border border-transparent p-1.5 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 hover:dark:border-slate-700/80 dark:hover:bg-slate-900 dark:hover:text-slate-300'
              >
                <TrashIcon className='size-4' />
              </button>
            </div>
          </div>
        </div>
      </li>

      {/* Delete confirmation modal */}
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

      {/* Complete confirmation modal */}
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
  const { timeBucket } = useViewProjectContext()
  const { t } = useTranslation()
  const listFetcher = useFetcher<ProjectViewActionData>()
  const actionFetcher = useFetcher<ProjectViewActionData>()

  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const isMountedRef = useRef(true)
  const [total, setTotal] = useState(0)
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const processedActionRef = useRef<string | null>(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExperimentId, setEditingExperimentId] = useState<string | null>(
    null,
  )

  // Results view state
  const [viewingResultsId, setViewingResultsId] = useState<string | null>(null)
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

  const pageAmount = Math.ceil(total / DEFAULT_EXPERIMENTS_TAKE)

  const loadExperiments = useCallback(
    (take: number, skip: number, showLoading = true, search?: string) => {
      if (showLoading) {
        setIsLoading(true)
      }

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
          setExperiments(result.results)
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
          DEFAULT_EXPERIMENTS_TAKE,
          (page - 1) * DEFAULT_EXPERIMENTS_TAKE,
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
          DEFAULT_EXPERIMENTS_TAKE,
          (page - 1) * DEFAULT_EXPERIMENTS_TAKE,
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
          DEFAULT_EXPERIMENTS_TAKE,
          (page - 1) * DEFAULT_EXPERIMENTS_TAKE,
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
          DEFAULT_EXPERIMENTS_TAKE,
          (page - 1) * DEFAULT_EXPERIMENTS_TAKE,
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
    page,
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
      setPage(1)
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
    loadExperiments(
      DEFAULT_EXPERIMENTS_TAKE,
      (page - 1) * DEFAULT_EXPERIMENTS_TAKE,
      true,
      filterQuery || undefined,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

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
        DEFAULT_EXPERIMENTS_TAKE,
        (page - 1) * DEFAULT_EXPERIMENTS_TAKE,
        true,
        filterQuery || undefined,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experimentsRefreshTrigger, viewingResultsId, isModalOpen, page])

  useEffect(() => {
    if (!viewingResultsId && shouldRefreshListOnReturn) {
      setShouldRefreshListOnReturn(false)
      loadExperiments(
        DEFAULT_EXPERIMENTS_TAKE,
        (page - 1) * DEFAULT_EXPERIMENTS_TAKE,
        true,
        filterQuery || undefined,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingResultsId, shouldRefreshListOnReturn, page])

  const handleNewExperiment = useCallback(() => {
    setEditingExperimentId(null)
    setIsModalOpen(true)
  }, [])

  const handleEditExperiment = useCallback((experimentId: string) => {
    setEditingExperimentId(experimentId)
    setIsModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    setEditingExperimentId(null)
  }, [])

  const handleModalSuccess = useCallback(() => {
    loadExperiments(
      DEFAULT_EXPERIMENTS_TAKE,
      (page - 1) * DEFAULT_EXPERIMENTS_TAKE,
      true,
      filterQuery || undefined,
    )
  }, [page, filterQuery, loadExperiments])

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

  const handleViewResults = (experimentId: string) => {
    setViewingResultsId(experimentId)
  }

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
        onBack={() => setViewingResultsId(null)}
      />
    )
  }

  return (
    <>
      <DashboardHeader showLiveVisitors />
      <div>
        {isLoading && !_isEmpty(experiments) ? <LoadingBar /> : null}
        {_isEmpty(experiments) && !filterQuery ? (
          <div className='mt-5 rounded-lg bg-slate-700 p-5 dark:bg-slate-900'>
            <div className='flex items-center text-gray-50'>
              <FlaskIcon className='mr-2 h-8 w-8' />
              <p className='text-3xl font-bold'>{t('experiments.title')}</p>
            </div>
            <p className='mt-2 text-sm whitespace-pre-wrap text-gray-100'>
              {t('experiments.description')}
            </p>
            <Button
              onClick={handleNewExperiment}
              className='mt-6 block max-w-max rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-indigo-50 md:px-4'
              secondary
              large
            >
              {t('experiments.create')}
            </Button>
          </div>
        ) : (
          <>
            <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div className='relative'>
                <MagnifyingGlassIcon className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400' />
                <input
                  type='text'
                  placeholder={t('experiments.filterExperiments')}
                  value={filterQuery}
                  onChange={handleSearchChange}
                  className='w-full rounded-lg border-0 bg-white py-2 pr-4 pl-9 text-sm text-gray-900 placeholder-gray-500 ring-1 ring-gray-300 ring-inset focus:ring-slate-900 focus:outline-none sm:w-64 dark:bg-slate-950 dark:text-gray-50 dark:placeholder-gray-400 dark:ring-slate-700/80 dark:focus:ring-slate-300'
                />
              </div>
              <Button onClick={handleNewExperiment} primary regular>
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
                  onViewResults={handleViewResults}
                />
              ))}
            </ul>

            {_isEmpty(experiments) && filterQuery ? (
              <p className='py-8 text-center text-sm text-gray-500 dark:text-gray-400'>
                {t('experiments.noExperimentsMatchFilter')}
              </p>
            ) : null}
          </>
        )}
        {pageAmount > 1 ? (
          <Pagination
            className='mt-4'
            page={page}
            pageAmount={pageAmount}
            setPage={setPage}
            total={total}
            pageSize={DEFAULT_EXPERIMENTS_TAKE}
          />
        ) : null}

        <ExperimentSettingsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={handleModalSuccess}
          projectId={id}
          experimentId={editingExperimentId}
        />
      </div>
    </>
  )
}

export default memo(ExperimentsView)
