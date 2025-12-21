import { XCircleIcon } from '@heroicons/react/24/outline'
import cx from 'clsx'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import {
  FlaskConicalIcon,
  Trash2Icon,
  PencilIcon,
  PlusIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  BarChart3Icon,
} from 'lucide-react'
import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import {
  deleteExperiment as deleteExperimentApi,
  getProjectExperiments,
  startExperiment as startExperimentApi,
  pauseExperiment as pauseExperimentApi,
  completeExperiment as completeExperimentApi,
  DEFAULT_EXPERIMENTS_TAKE,
  type Experiment,
  type ExperimentStatus,
} from '~/api'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import Button from '~/ui/Button'
import Spin from '~/ui/icons/Spin'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'
import Modal from '~/ui/Modal'
import Pagination from '~/ui/Pagination'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

import ExperimentResults from './ExperimentResults'
import ExperimentSettingsModal from './ExperimentSettingsModal'

dayjs.extend(relativeTime)

const STATUS_COLORS: Record<ExperimentStatus, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400' },
  running: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400' },
  paused: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-400' },
  completed: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-400' },
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
  const isEditDisabled = experiment.status === 'running' || experiment.status === 'completed'

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
      <li className='relative mb-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-colors dark:border-slate-800/25 dark:bg-slate-800/70'>
        <div className='flex justify-between gap-x-6 px-4 py-4 sm:px-6'>
          <div className='flex min-w-0 gap-x-4'>
            <div className='min-w-0 flex-auto'>
              <div className='flex items-center gap-x-2'>
                <Text as='p' weight='semibold' truncate className='flex items-center gap-x-1.5'>
                  <FlaskConicalIcon className='size-4 text-purple-500' strokeWidth={1.5} />
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
                    {t('experiments.startedAt')}: {dayjs(experiment.startedAt).format('MMM D, YYYY')}
                  </span>
                ) : null}
                {experiment.endedAt ? (
                  <span>
                    {t('experiments.endedAt')}: {dayjs(experiment.endedAt).format('MMM D, YYYY')}
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
                title={!experiment.goalId ? t('experiments.needGoal') : undefined}
                ghost
                small
              >
                {actionLoading ? <Spin className='size-4' /> : <PlayIcon className='mr-1 size-4' strokeWidth={1.5} />}
                {t('experiments.start')}
              </Button>
            ) : null}
            {experiment.status === 'running' ? (
              <>
                <Button onClick={handlePause} disabled={actionLoading} ghost small>
                  {actionLoading ? (
                    <Spin className='size-4' />
                  ) : (
                    <PauseIcon className='mr-1 size-4' strokeWidth={1.5} />
                  )}
                  {t('experiments.pause')}
                </Button>
                <Button onClick={() => onViewResults(experiment.id)} ghost small>
                  <BarChart3Icon className='mr-1 size-4' strokeWidth={1.5} />
                  {t('experiments.results')}
                </Button>
              </>
            ) : null}
            {experiment.status === 'paused' ? (
              <>
                <Button onClick={handleStart} disabled={actionLoading} ghost small>
                  {actionLoading ? <Spin className='size-4' /> : <PlayIcon className='mr-1 size-4' strokeWidth={1.5} />}
                  {t('experiments.resume')}
                </Button>
                <Button onClick={() => setShowCompleteModal(true)} disabled={actionLoading} ghost small>
                  <CheckCircleIcon className='mr-1 size-4' strokeWidth={1.5} />
                  {t('experiments.complete')}
                </Button>
              </>
            ) : null}
            {experiment.status === 'completed' ? (
              <Button onClick={() => onViewResults(experiment.id)} ghost small>
                <BarChart3Icon className='mr-1 size-4' strokeWidth={1.5} />
                {t('experiments.viewResults')}
              </Button>
            ) : null}

            {/* Edit/Delete buttons */}
            <div className='flex items-center gap-1 border-l border-gray-200 pl-2 dark:border-slate-700'>
              <button
                type='button'
                onClick={() => (!isEditDisabled ? onEdit(experiment.id) : undefined)}
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
                  'rounded-md border border-transparent p-1.5 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 dark:hover:text-slate-300',
                  isEditDisabled && 'cursor-not-allowed opacity-50 hover:border-transparent hover:bg-transparent',
                )}
              >
                <PencilIcon className='size-4' strokeWidth={1.5} />
              </button>
              <button
                type='button'
                onClick={() => setShowDeleteModal(true)}
                aria-label={t('common.delete')}
                className='rounded-md border border-transparent p-1.5 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 dark:hover:text-slate-300'
              >
                <Trash2Icon className='size-4' strokeWidth={1.5} />
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

const ExperimentsView = ({ period, from = '', to = '', timezone }: ExperimentsViewProps) => {
  const { id } = useCurrentProject()
  const { experimentsRefreshTrigger, timeBucket } = useViewProjectContext()
  const { t } = useTranslation()

  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const isLoadingRef = useRef(false)
  const isMountedRef = useRef(true)
  const [total, setTotal] = useState(0)
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExperimentId, setEditingExperimentId] = useState<string | null>(null)

  // Results view state
  const [viewingResultsId, setViewingResultsId] = useState<string | null>(null)
  const [resultsRefreshTrigger, setResultsRefreshTrigger] = useState(0)
  const [shouldRefreshListOnReturn, setShouldRefreshListOnReturn] = useState(false)

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const pageAmount = Math.ceil(total / DEFAULT_EXPERIMENTS_TAKE)

  const loadExperiments = async (take: number, skip: number, showLoading = true) => {
    if (isLoadingRef.current) {
      return
    }
    isLoadingRef.current = true

    // `showLoading` means "show either initial Loader or refresh LoadingBar".
    if (showLoading) {
      setIsLoading(true)
    }

    try {
      const result = await getProjectExperiments(id, take, skip)
      if (isMountedRef.current) {
        setExperiments(result.results)
        setTotal(result.total)
        setError(null) // Clear any previous error on success
      }
    } catch (reason: any) {
      if (isMountedRef.current) {
        setError(reason?.message || reason?.toString() || 'Unknown error')
      }
    } finally {
      isLoadingRef.current = false
      if (isMountedRef.current && showLoading) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    loadExperiments(DEFAULT_EXPERIMENTS_TAKE, (page - 1) * DEFAULT_EXPERIMENTS_TAKE)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  // Refresh experiments data when refresh button is clicked.
  // If user is viewing results, refresh results instead and defer list refresh until they return.
  useEffect(() => {
    if (experimentsRefreshTrigger > 0) {
      if (viewingResultsId) {
        setResultsRefreshTrigger((prev) => prev + 1)
        setShouldRefreshListOnReturn(true)
        return
      }

      // Refresh list (show LoadingBar if we already have data)
      loadExperiments(DEFAULT_EXPERIMENTS_TAKE, (page - 1) * DEFAULT_EXPERIMENTS_TAKE, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experimentsRefreshTrigger, viewingResultsId, page])

  // If refresh happened while in results view, refresh list once upon returning.
  useEffect(() => {
    if (!viewingResultsId && shouldRefreshListOnReturn) {
      setShouldRefreshListOnReturn(false)
      loadExperiments(DEFAULT_EXPERIMENTS_TAKE, (page - 1) * DEFAULT_EXPERIMENTS_TAKE, true)
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
    loadExperiments(DEFAULT_EXPERIMENTS_TAKE, (page - 1) * DEFAULT_EXPERIMENTS_TAKE)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleDeleteExperiment = async (experimentId: string) => {
    try {
      await deleteExperimentApi(experimentId)
      toast.success(t('experiments.deleted'))
      loadExperiments(DEFAULT_EXPERIMENTS_TAKE, (page - 1) * DEFAULT_EXPERIMENTS_TAKE)
    } catch (reason: any) {
      toast.error(reason?.response?.data?.message || reason?.message || t('apiNotifications.somethingWentWrong'))
    }
  }

  const handleStartExperiment = async (experimentId: string) => {
    try {
      await startExperimentApi(experimentId)
      toast.success(t('experiments.started'))
      loadExperiments(DEFAULT_EXPERIMENTS_TAKE, (page - 1) * DEFAULT_EXPERIMENTS_TAKE)
    } catch (reason: any) {
      toast.error(reason?.response?.data?.message || reason?.message || t('apiNotifications.somethingWentWrong'))
    }
  }

  const handlePauseExperiment = async (experimentId: string) => {
    try {
      await pauseExperimentApi(experimentId)
      toast.success(t('experiments.paused'))
      loadExperiments(DEFAULT_EXPERIMENTS_TAKE, (page - 1) * DEFAULT_EXPERIMENTS_TAKE)
    } catch (reason: any) {
      toast.error(reason?.response?.data?.message || reason?.message || t('apiNotifications.somethingWentWrong'))
    }
  }

  const handleCompleteExperiment = async (experimentId: string) => {
    try {
      await completeExperimentApi(experimentId)
      toast.success(t('experiments.completed'))
      loadExperiments(DEFAULT_EXPERIMENTS_TAKE, (page - 1) * DEFAULT_EXPERIMENTS_TAKE)
    } catch (reason: any) {
      toast.error(reason?.response?.data?.message || reason?.message || t('apiNotifications.somethingWentWrong'))
    }
  }

  const handleViewResults = (experimentId: string) => {
    setViewingResultsId(experimentId)
  }

  // Only show the big error state if we have no cached data to display.
  if (error && isLoading === false && _isEmpty(experiments)) {
    return (
      <div className='bg-gray-50 px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8 dark:bg-slate-900'>
        <div className='mx-auto max-w-max'>
          <main className='sm:flex'>
            <XCircleIcon className='h-12 w-12 text-red-400' aria-hidden='true' />
            <div className='sm:ml-6'>
              <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
                <h1 className='text-4xl font-extrabold text-gray-900 sm:text-5xl dark:text-gray-50'>
                  {t('apiNotifications.somethingWentWrong')}
                </h1>
                <p className='mt-4 text-2xl font-medium text-gray-700 dark:text-gray-200'>
                  {t('apiNotifications.errorCode', { error })}
                </p>
              </div>
              <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
                <button
                  type='button'
                  onClick={() => window.location.reload()}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden'
                >
                  {t('dashboard.reloadPage')}
                </button>
                <Link
                  to={routes.contact}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700 dark:focus:ring-gray-50'
                >
                  {t('notFoundPage.support')}
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Show Loader only on initial load (no existing data)
  if ((isLoading === null || isLoading) && _isEmpty(experiments)) {
    return (
      <div className='mt-4'>
        <Loader />
      </div>
    )
  }

  // If viewing results, show the results component
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
        {_isEmpty(experiments) ? (
          <div className='mt-5 rounded-xl bg-gray-700 p-5'>
            <div className='flex items-center text-gray-50'>
              <FlaskConicalIcon className='mr-2 h-8 w-8' strokeWidth={1.5} />
              <p className='text-3xl font-bold'>{t('experiments.title')}</p>
            </div>
            <p className='mt-2 text-sm whitespace-pre-wrap text-gray-100'>{t('experiments.description')}</p>
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
            {/* Header with add button */}
            <div className='mb-4 flex items-center justify-center lg:justify-end'>
              <Button onClick={handleNewExperiment} primary regular>
                <PlusIcon className='mr-1.5 size-4' strokeWidth={2} />
                {t('experiments.create')}
              </Button>
            </div>

            {/* Experiments list */}
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
