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
import { Link, useFetcher, useLocation, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import {
  useViewProjectContext,
  useRefreshTriggers,
} from '~/pages/Project/View/ViewProject'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import type { ProjectViewActionData } from '~/routes/projects.$id'
import Button from '~/ui/Button'
import { Badge } from '~/ui/Badge'
import Spin from '~/ui/icons/Spin'
import LoadingBar from '~/ui/LoadingBar'
import Modal from '~/ui/Modal'
import Pagination from '~/ui/Pagination'
import StatusPage from '~/ui/StatusPage'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import routes from '~/utils/routes'

import ExperimentResults from './ExperimentResults'
import ExperimentSettingsModal from './ExperimentSettingsModal'
import { LoaderView } from '../../View/components/LoaderView'

dayjs.extend(relativeTime)

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
}

const ExperimentRow = ({
  experiment,
  onDelete,
  onEdit,
  onStart,
  onPause,
  onComplete,
}: ExperimentRowProps) => {
  const { t } = useTranslation()
  const location = useLocation()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const variantsCount = experiment.variants?.length || 0
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
    'rounded-md border border-transparent p-2 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 sm:p-1.5 dark:text-slate-400 hover:dark:border-slate-700/80 dark:hover:bg-slate-900 dark:hover:text-slate-300'
  const positiveActionButtonClass =
    'rounded-md border border-transparent p-2 transition-colors sm:p-1.5 text-green-600 hover:border-green-300 hover:bg-green-50 dark:text-green-400 hover:dark:border-green-700/80 dark:hover:bg-green-900/30'

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
      <li className='relative mb-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-colors hover:bg-gray-200/70 dark:border-slate-800/60 dark:bg-slate-900/25 dark:hover:bg-slate-900/60'>
        <div className='flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-x-6 sm:px-6'>
          <Link
            to={{ search: resultsSearch }}
            className='flex min-w-0 flex-auto gap-x-4 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900'
          >
            <div className='min-w-0 flex-auto'>
              <div className='flex flex-wrap items-center gap-2'>
                <Text as='p' weight='semibold' truncate>
                  {experiment.name}
                </Text>
                <Badge
                  label={t(`experiments.status.${experiment.status}`)}
                  colour={statusBadgeColour}
                />
                <Badge
                  colour='indigo'
                  label={`${variantsCount} ${t('experiments.variants')}`}
                />
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
              <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400'>
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
          </Link>
          <div className='flex w-full flex-wrap items-center gap-1 pt-2 sm:w-auto sm:shrink-0 sm:justify-end sm:pt-0'>
            {/* Action buttons based on status */}
            {experiment.status === 'draft' ? (
              <>
                {!experiment.goalId ? (
                  <Tooltip
                    text={t('experiments.needGoal')}
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

            {/* Edit/Delete buttons */}
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
  const [searchParams, setSearchParams] = useSearchParams()
  const isEmbedded = searchParams.get('embedded') === 'true'
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

  const pageAmount = Math.ceil(total / DEFAULT_EXPERIMENTS_TAKE)

  const updateExperimentSearchParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString())
      updater(nextSearchParams)
      setSearchParams(nextSearchParams)
    },
    [searchParams, setSearchParams],
  )

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

  const handleBackToExperiments = useCallback(() => {
    updateExperimentSearchParams((params) => {
      params.delete('experimentId')
    })
  }, [updateExperimentSearchParams])

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
          <div
            className={cx('flex flex-col bg-gray-50 dark:bg-slate-950', {
              'min-h-including-header': !isEmbedded,
              'min-h-screen': isEmbedded,
            })}
          >
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
          experimentId={isCreatingExperiment ? null : editingExperimentId}
        />
      </div>
    </>
  )
}

export default memo(ExperimentsView)
