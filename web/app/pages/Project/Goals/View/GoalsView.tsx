import { XCircleIcon } from '@heroicons/react/24/outline'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import {
  TargetIcon,
  Trash2Icon,
  Settings2Icon,
  PlusIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  FileTextIcon,
  ZapIcon,
} from 'lucide-react'
import { useState, useEffect } from 'react'
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

interface GoalCardProps {
  goal: Goal
  stats: GoalStats | null
  statsLoading: boolean
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onClick: (id: string) => void
}

const GoalCard = ({ goal, stats, statsLoading, onDelete, onEdit, onClick }: GoalCardProps) => {
  const { t } = useTranslation()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const typeLabel = goal.type === 'pageview' ? t('goals.typePageview') : t('goals.typeCustomEvent')

  return (
    <>
      <li
        onClick={() => onClick(goal.id)}
        className='min-h-[140px] cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-colors hover:bg-gray-200/70 dark:border-slate-800/25 dark:bg-slate-800/70 dark:hover:bg-slate-700/60'
      >
        <div className='px-4 py-4'>
          <div className='flex items-start justify-between'>
            <div className='min-w-0 flex-1'>
              <div className='mb-2 flex items-center gap-2'>
                {goal.type === 'pageview' ? (
                  <FileTextIcon className='h-5 w-5 text-indigo-500' strokeWidth={1.5} />
                ) : (
                  <ZapIcon className='h-5 w-5 text-green-500' strokeWidth={1.5} />
                )}
                <p className='truncate text-lg font-semibold text-slate-900 dark:text-gray-50'>{goal.name}</p>
              </div>
              <Badge colour={GOAL_TYPE_BADGE_COLOURS[goal.type]} label={typeLabel} />
              {goal.value && (
                <p className='mt-2 truncate text-sm text-gray-600 dark:text-gray-400'>
                  {goal.matchType === 'exact' && '= '}
                  {goal.matchType === 'contains' && '~ '}
                  {goal.matchType === 'regex' && '⁓ '}
                  {goal.value}
                </p>
              )}
            </div>
            <div className='ml-2 flex items-center gap-1'>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(goal.id)
                }}
                aria-label={t('common.settings')}
                className='rounded-md border border-transparent p-1.5 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 dark:hover:text-slate-300'
              >
                <Settings2Icon className='size-5' strokeWidth={1.5} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDeleteModal(true)
                }}
                aria-label={t('common.delete')}
                className='rounded-md border border-transparent p-1.5 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 dark:hover:text-slate-300'
              >
                <Trash2Icon className='size-5' strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Stats section */}
          <div className='mt-4 grid grid-cols-2 gap-4'>
            {statsLoading ? (
              <div className='col-span-2 flex justify-center py-2'>
                <Loader size='sm' />
              </div>
            ) : stats ? (
              <>
                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>{t('goals.conversions')}</p>
                  <p className='text-xl font-bold text-slate-900 dark:text-gray-50'>
                    {stats.conversions.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>{t('goals.conversionRate')}</p>
                  <div className='flex items-center gap-2'>
                    <p className='text-xl font-bold text-slate-900 dark:text-gray-50'>{stats.conversionRate}%</p>
                    {stats.trend !== 0 && (
                      <span
                        className={cx('flex items-center text-sm', {
                          'text-green-500': stats.trend > 0,
                          'text-red-500': stats.trend < 0,
                        })}
                      >
                        {stats.trend > 0 ? (
                          <TrendingUpIcon className='mr-0.5 h-4 w-4' />
                        ) : (
                          <TrendingDownIcon className='mr-0.5 h-4 w-4' />
                        )}
                        {Math.abs(stats.trend)}%
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className='col-span-2 text-sm text-gray-500 dark:text-gray-400'>{t('goals.noData')}</p>
            )}
          </div>
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

interface AddGoalProps {
  onClick: () => void
}

const AddGoal = ({ onClick }: AddGoalProps) => {
  const { t } = useTranslation()

  return (
    <li
      onClick={onClick}
      className='group flex h-auto min-h-[140px] cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 transition-colors hover:border-gray-400 dark:border-gray-500 dark:hover:border-gray-600'
    >
      <div>
        <PlusIcon
          className='mx-auto h-12 w-12 text-gray-400 transition-colors group-hover:text-gray-500 dark:text-gray-200 group-hover:dark:text-gray-400'
          strokeWidth={1}
        />
        <span className='mt-2 block text-sm font-semibold text-gray-900 dark:text-gray-50 group-hover:dark:text-gray-400'>
          {t('goals.add')}
        </span>
      </div>
    </li>
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

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)

  const pageAmount = Math.ceil(total / DEFAULT_GOALS_TAKE)

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
          <ul className='mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3'>
            {_map(goals, (goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                stats={goalStats[goal.id] || null}
                statsLoading={statsLoading[goal.id] || false}
                onDelete={handleDeleteGoal}
                onEdit={handleEditGoal}
                onClick={handleEditGoal}
              />
            ))}
            <AddGoal onClick={handleNewGoal} />
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
