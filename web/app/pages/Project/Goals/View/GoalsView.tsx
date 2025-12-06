import { ChevronRightIcon, XCircleIcon } from '@heroicons/react/24/outline'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import { TargetIcon, Trash2Icon, PencilIcon, PlusIcon, SearchIcon, FileTextIcon, ZapIcon } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import {
  deleteGoal as deleteGoalApi,
  getProjectGoals,
  getGoalStats,
  DEFAULT_GOALS_TAKE,
  type Goal,
  type GoalStats,
} from '~/api'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { Badge, type BadgeProps } from '~/ui/Badge'
import Button from '~/ui/Button'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import Pagination from '~/ui/Pagination'
import routes from '~/utils/routes'

import GoalSettingsModal from './GoalSettingsModal'

const GOAL_TYPE_BADGE_COLOURS: Record<Goal['type'], BadgeProps['colour']> = {
  pageview: 'indigo',
  custom_event: 'green',
}

interface GoalRowProps {
  goal: Goal
  stats: GoalStats | null
  statsLoading: boolean
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onClick: (id: string) => void
}

const Separator = () => (
  <svg viewBox='0 0 2 2' className='h-0.5 w-0.5 flex-none fill-gray-400'>
    <circle cx={1} cy={1} r={1} />
  </svg>
)

const GoalRow = ({ goal, stats, statsLoading, onDelete, onEdit, onClick }: GoalRowProps) => {
  const { t } = useTranslation()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const typeLabel = goal.type === 'pageview' ? t('goals.typePageview') : t('goals.typeCustomEvent')

  const patternDisplay = useMemo(() => {
    if (!goal.value) return null
    const matchPrefix =
      goal.matchType === 'exact' ? '= ' : goal.matchType === 'contains' ? '~ ' : goal.matchType === 'regex' ? '⁓ ' : ''
    return `${matchPrefix}${goal.value}`
  }, [goal.value, goal.matchType])

  return (
    <>
      <li
        onClick={() => onClick(goal.id)}
        className='relative mb-3 flex cursor-pointer justify-between gap-x-6 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 transition-colors hover:bg-gray-200/70 sm:px-6 dark:border-slate-800/25 dark:bg-slate-800/70 dark:hover:bg-slate-700/60'
      >
        <div className='flex min-w-0 gap-x-4'>
          <div className='min-w-0 flex-auto'>
            <p className='flex items-center gap-x-2 text-sm leading-6 font-semibold text-gray-900 dark:text-gray-50'>
              {goal.type === 'pageview' ? (
                <FileTextIcon className='size-4 text-indigo-500' strokeWidth={1.5} />
              ) : (
                <ZapIcon className='size-4 text-green-500' strokeWidth={1.5} />
              )}
              <span>{goal.name}</span>
              <Badge colour={GOAL_TYPE_BADGE_COLOURS[goal.type]} label={typeLabel} />
            </p>
            {patternDisplay && (
              <p className='mt-1 flex flex-wrap items-center gap-x-2 text-xs leading-5 text-gray-500 dark:text-gray-300'>
                <code className='rounded bg-gray-200/80 px-1.5 py-0.5 font-mono text-xs text-gray-600 dark:bg-slate-700 dark:text-gray-300'>
                  {patternDisplay}
                </code>
              </p>
            )}
            {/* Mobile stats */}
            <p className='mt-2 flex items-center gap-x-3 text-xs leading-5 text-gray-500 sm:hidden dark:text-gray-300'>
              {statsLoading ? (
                <Loader size='sm' />
              ) : stats ? (
                <>
                  <span>
                    <span className='font-semibold text-gray-900 dark:text-gray-50'>
                      {stats.conversions.toLocaleString()}
                    </span>{' '}
                    {t('goals.conversions').toLowerCase()}
                  </span>
                  <Separator />
                  <span>
                    <span className='font-semibold text-gray-900 dark:text-gray-50'>{stats.conversionRate}%</span>{' '}
                    {t('goals.conversionRate').toLowerCase()}
                  </span>
                </>
              ) : (
                <span>{t('goals.noData')}</span>
              )}
            </p>
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-x-4'>
          <div className='hidden sm:flex sm:flex-col sm:items-end'>
            {statsLoading ? (
              <Loader size='sm' />
            ) : stats ? (
              <>
                <p className='text-sm leading-6 text-gray-900 dark:text-gray-50'>
                  <span className='font-semibold'>{stats.conversions.toLocaleString()}</span>{' '}
                  <span className='text-gray-500 dark:text-gray-400'>{t('goals.conversions').toLowerCase()}</span>
                </p>
                <p className='mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400'>
                  <span className='font-medium text-gray-700 dark:text-gray-300'>{stats.conversionRate}%</span>{' '}
                  {t('goals.conversionRate').toLowerCase()}
                </p>
              </>
            ) : (
              <p className='text-sm text-gray-500 dark:text-gray-400'>{t('goals.noData')}</p>
            )}
          </div>
          {/* Action buttons */}
          <div className='flex items-center gap-x-1'>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(goal.id)
              }}
              aria-label={t('common.edit')}
              className='rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-slate-700 dark:hover:text-gray-300'
            >
              <PencilIcon className='size-4' strokeWidth={1.5} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteModal(true)
              }}
              aria-label={t('common.delete')}
              className='rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-900/30 dark:hover:text-red-400'
            >
              <Trash2Icon className='size-4' strokeWidth={1.5} />
            </button>
          </div>
          <ChevronRightIcon className='h-5 w-5 flex-none text-gray-400' aria-hidden='true' />
        </div>
      </li>
      <Modal
        onClose={() => setShowDeleteModal(false)}
        onSubmit={() => {
          onDelete(goal.id)
          setShowDeleteModal(false)
        }}
        submitText={t('goals.delete')}
        closeText={t('common.close')}
        title={t('goals.deleteConfirmTitle')}
        message={t('goals.deleteConfirmMessage')}
        submitType='danger'
        type='error'
        isOpened={showDeleteModal}
      />
    </>
  )
}

interface GoalsViewProps {
  period: string
  from?: string
  to?: string
  timezone?: string
}

const GoalsView = ({ period, from = '', to = '', timezone }: GoalsViewProps) => {
  const { id } = useCurrentProject()
  const { goalsRefreshTrigger } = useViewProjectContext()
  const { t } = useTranslation()

  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const [total, setTotal] = useState(0)
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalStats, setGoalStats] = useState<Record<string, GoalStats | null>>({})
  const [statsLoading, setStatsLoading] = useState<Record<string, boolean>>({})
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)

  const pageAmount = Math.ceil(total / DEFAULT_GOALS_TAKE)

  const filteredGoals = useMemo(() => {
    if (!filterQuery.trim()) return goals
    const query = filterQuery.toLowerCase()
    return goals.filter(
      (goal) => goal.name.toLowerCase().includes(query) || (goal.value && goal.value.toLowerCase().includes(query)),
    )
  }, [goals, filterQuery])

  const loadGoals = async (take: number, skip: number) => {
    if (isLoading) {
      return
    }
    setIsLoading(true)

    try {
      const result = await getProjectGoals(id, take, skip)
      setGoals(result.results)
      setTotal(result.total)
    } catch (reason: any) {
      setError(reason)
    } finally {
      setIsLoading(false)
    }
  }

  const loadGoalStats = async (goalId: string) => {
    setStatsLoading((prev) => ({ ...prev, [goalId]: true }))
    try {
      const stats = await getGoalStats(goalId, period, from, to, timezone)
      setGoalStats((prev) => ({ ...prev, [goalId]: stats }))
    } catch (err) {
      console.error('Failed to load goal stats:', err)
      setGoalStats((prev) => ({ ...prev, [goalId]: null }))
    } finally {
      setStatsLoading((prev) => ({ ...prev, [goalId]: false }))
    }
  }

  useEffect(() => {
    loadGoals(DEFAULT_GOALS_TAKE, (page - 1) * DEFAULT_GOALS_TAKE)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  useEffect(() => {
    // Load stats for all goals when goals change or date range changes
    goals.forEach((goal) => {
      loadGoalStats(goal.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals, period, from, to, timezone])

  // Refresh goals data when refresh button is clicked
  useEffect(() => {
    if (goalsRefreshTrigger > 0) {
      loadGoals(DEFAULT_GOALS_TAKE, (page - 1) * DEFAULT_GOALS_TAKE)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalsRefreshTrigger])

  const handleNewGoal = () => {
    setEditingGoalId(null)
    setIsModalOpen(true)
  }

  const handleEditGoal = (goalId: string) => {
    setEditingGoalId(goalId)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingGoalId(null)
  }

  const handleModalSuccess = () => {
    loadGoals(DEFAULT_GOALS_TAKE, (page - 1) * DEFAULT_GOALS_TAKE)
  }

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoalApi(goalId)
      toast.success(t('goals.deleted'))
      // Reload goals
      loadGoals(DEFAULT_GOALS_TAKE, (page - 1) * DEFAULT_GOALS_TAKE)
    } catch (reason: any) {
      toast.error(reason?.response?.data?.message || reason?.message || t('apiNotifications.somethingWentWrong'))
    }
  }

  if (error && isLoading === false) {
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

  if (isLoading || isLoading === null) {
    return (
      <div className='mt-4'>
        <Loader />
      </div>
    )
  }

  return (
    <div className='mt-4'>
      {_isEmpty(goals) ? (
        <div className='mt-5 rounded-xl bg-gray-700 p-5'>
          <div className='flex items-center text-gray-50'>
            <TargetIcon className='mr-2 h-8 w-8' strokeWidth={1.5} />
            <p className='text-3xl font-bold'>{t('goals.title')}</p>
          </div>
          <p className='mt-2 text-sm whitespace-pre-wrap text-gray-100'>{t('goals.description')}</p>
          <Button
            onClick={handleNewGoal}
            className='mt-6 block max-w-max rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-indigo-50 md:px-4'
            secondary
            large
          >
            {t('goals.add')}
          </Button>
        </div>
      ) : (
        <>
          {/* Header with filter and add button */}
          <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='relative'>
              <SearchIcon className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400' strokeWidth={1.5} />
              <input
                type='text'
                placeholder={t('goals.filterGoals')}
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className='w-full rounded-lg border border-gray-300 bg-white py-2 pr-4 pl-9 text-sm text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none sm:w-64 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:border-indigo-400 dark:focus:ring-indigo-400'
              />
            </div>
            <Button onClick={handleNewGoal} primary regular>
              <PlusIcon className='mr-1.5 size-4' strokeWidth={2} />
              {t('goals.addGoal')}
            </Button>
          </div>

          {/* Goals list */}
          <ul className='mt-4'>
            {_map(filteredGoals, (goal) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                stats={goalStats[goal.id] || null}
                statsLoading={statsLoading[goal.id] || false}
                onDelete={handleDeleteGoal}
                onEdit={handleEditGoal}
                onClick={handleEditGoal}
              />
            ))}
          </ul>

          {filteredGoals.length === 0 && filterQuery && (
            <p className='py-8 text-center text-sm text-gray-500 dark:text-gray-400'>{t('goals.noGoalsMatchFilter')}</p>
          )}
        </>
      )}
      {pageAmount > 1 && !filterQuery ? (
        <Pagination
          className='mt-4'
          page={page}
          pageAmount={pageAmount}
          setPage={setPage}
          total={total}
          pageSize={DEFAULT_GOALS_TAKE}
        />
      ) : null}

      <GoalSettingsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
        projectId={id}
        goalId={editingGoalId}
      />
    </div>
  )
}

export default GoalsView
