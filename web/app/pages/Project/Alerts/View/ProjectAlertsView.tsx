import { XCircleIcon } from '@heroicons/react/24/outline'
import cx from 'clsx'
import dayjs from 'dayjs'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _reduce from 'lodash/reduce'
import _replace from 'lodash/replace'
import _values from 'lodash/values'
import {
  Settings2Icon,
  Trash2Icon,
  BellRingIcon,
  CirclePlusIcon,
  DollarSignIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link } from 'react-router'
import { toast } from 'sonner'

import { deleteAlert as deleteAlertApi, getProjectAlerts } from '~/api'
import { QUERY_METRIC, PLAN_LIMITS, DEFAULT_ALERTS_TAKE } from '~/lib/constants'
import { Alerts } from '~/lib/models/Alerts'
import PaidFeature from '~/modals/PaidFeature'
import { useAuth } from '~/providers/AuthProvider'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { Badge, type BadgeProps } from '~/ui/Badge'
import Button from '~/ui/Button'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import Pagination from '~/ui/Pagination'
import routes from '~/utils/routes'

const Separator = ({ className }: { className?: string }) => (
  <svg viewBox='0 0 2 2' className={cx('h-0.5 w-0.5 flex-none fill-gray-400', className)}>
    <circle cx={1} cy={1} r={1} />
  </svg>
)

const NoNotificationChannelSet = () => {
  const { t } = useTranslation('common')

  return (
    <div className='rounded-lg bg-yellow-100 ring-1 ring-yellow-600/20 ring-inset dark:bg-yellow-400/10 dark:text-yellow-500 dark:ring-yellow-400/20'>
      <div className='mx-auto max-w-7xl px-3 py-3 sm:px-6 lg:px-8'>
        <div className='flex flex-wrap items-center justify-between'>
          <div className='flex flex-1 items-center'>
            <span className='flex rounded-lg bg-yellow-500 p-2 dark:bg-yellow-600'>
              <TriangleAlertIcon className='h-6 w-6 text-white' aria-hidden='true' />
            </span>
            <p className='ml-3 font-medium text-slate-900 dark:text-gray-50'>{t('alert.noNotificationChannel')}</p>
          </div>
          <div className='order-3 mt-2 w-full shrink-0 sm:order-2 sm:mt-0 sm:w-auto'>
            <Link
              to={routes.user_settings}
              className='cursor-pointer rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-gray-50 transition-colors duration-200 hover:bg-slate-700 dark:hover:bg-slate-900'
            >
              {t('common.fixIt')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

interface AlertCardProps {
  id: string
  name: string
  queryMetric: (typeof QUERY_METRIC)[keyof typeof QUERY_METRIC]
  lastTriggered: string | null
  deleteAlert: (id: string) => void
  openAlert: (id: string) => void
  queryMetricTMapping: any
}

const COLOUR_QUERY_METRIC_MAPPING: Record<(typeof QUERY_METRIC)[keyof typeof QUERY_METRIC], BadgeProps['colour']> = {
  [QUERY_METRIC.PAGE_VIEWS]: 'yellow',
  [QUERY_METRIC.UNIQUE_PAGE_VIEWS]: 'indigo',
  [QUERY_METRIC.ONLINE_USERS]: 'sky',
  [QUERY_METRIC.CUSTOM_EVENTS]: 'green',
  [QUERY_METRIC.ERRORS]: 'red',
}

const AlertCard = ({
  id,
  name,
  queryMetric,
  lastTriggered,
  openAlert,
  deleteAlert,
  queryMetricTMapping,
}: AlertCardProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  return (
    <>
      <li
        onClick={() => openAlert(id)}
        className='min-h-[120px] cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-colors hover:bg-gray-200/70 dark:border-slate-800/25 dark:bg-slate-800/70 dark:hover:bg-slate-700/60'
      >
        <div className='px-4 py-4'>
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-lg text-slate-900 dark:text-gray-50'>
                <span className='text-base font-semibold'>{name}</span>
                <Separator className='mx-2 inline-block align-middle' />
                <Badge colour={COLOUR_QUERY_METRIC_MAPPING[queryMetric]} label={queryMetricTMapping[queryMetric]} />
              </p>
              <p className='mt-1 text-sm text-slate-900 dark:text-gray-50'>
                {lastTriggered
                  ? t('alert.lastTriggeredOn', {
                      date:
                        language === 'en'
                          ? dayjs(lastTriggered).locale(language).format('MMMM D, YYYY')
                          : dayjs(lastTriggered).locale(language).format('D MMMM, YYYY'),
                    })
                  : t('alert.notYetTriggered')}
              </p>
            </div>
            <div className='flex items-center gap-1'>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openAlert(id)
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
        </div>
      </li>
      <Modal
        onClose={() => setShowDeleteModal(false)}
        onSubmit={() => deleteAlert(id)}
        submitText={t('alert.delete')}
        closeText={t('common.close')}
        title={t('alert.qDelete')}
        message={t('alert.deleteHint')}
        submitType='danger'
        type='error'
        isOpened={showDeleteModal}
      />
    </>
  )
}

interface AddAlertProps {
  handleNewAlert: () => void
  isLimitReached: boolean
}

const AddAlert = ({ handleNewAlert, isLimitReached }: AddAlertProps) => {
  const { t } = useTranslation()

  return (
    <li
      onClick={handleNewAlert}
      className='group flex h-auto min-h-[120px] cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 hover:border-gray-400 dark:border-gray-500 dark:hover:border-gray-600'
    >
      <div>
        {isLimitReached ? (
          <DollarSignIcon
            className='mx-auto h-12 w-12 text-gray-400 group-hover:text-gray-500 dark:text-gray-200 group-hover:dark:text-gray-400'
            strokeWidth={1.5}
          />
        ) : (
          <CirclePlusIcon
            className='mx-auto h-12 w-12 text-gray-400 group-hover:text-gray-500 dark:text-gray-200 group-hover:dark:text-gray-400'
            strokeWidth={1.5}
          />
        )}
        <span className='mt-2 block text-sm font-semibold text-gray-900 dark:text-gray-50 group-hover:dark:text-gray-400'>
          {t('alert.add')}
        </span>
      </div>
    </li>
  )
}

const ProjectAlerts = () => {
  const { id } = useCurrentProject()
  const { t } = useTranslation()
  const { user, isAuthenticated } = useAuth()
  const [isPaidFeatureOpened, setIsPaidFeatureOpened] = useState(false)

  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const [total, setTotal] = useState(0)
  const [alerts, setAlerts] = useState<Alerts[]>([])
  const [page, setPage] = useState(1)

  const [error, setError] = useState<string | null>(null)

  const pageAmount = Math.ceil(total / DEFAULT_ALERTS_TAKE)

  const navigate = useNavigate()

  const limits = PLAN_LIMITS[user?.planCode || 'trial']
  const isLimitReached = isAuthenticated && total >= limits?.maxAlerts

  const loadAlerts = async (take: number, skip: number) => {
    if (isLoading) {
      return
    }
    setIsLoading(true)

    try {
      const result = await getProjectAlerts(id, take, skip)
      setAlerts(result.results)
      setTotal(result.total)
    } catch (reason: any) {
      setError(reason)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts(DEFAULT_ALERTS_TAKE, (page - 1) * DEFAULT_ALERTS_TAKE)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const queryMetricTMapping: Record<string, string> = useMemo(() => {
    const values = _values(QUERY_METRIC)

    return _reduce(
      values,
      (prev, curr) => ({
        ...prev,
        [curr]: t(`alert.metrics.${curr}`),
      }),
      {},
    )
  }, [t])

  const isIntegrationLinked = useMemo(() => {
    if (_isEmpty(user)) {
      return false
    }

    return Boolean(
      (user.telegramChatId && user.isTelegramChatIdConfirmed) || user.slackWebhookUrl || user.discordWebhookUrl,
    )
  }, [user])

  const handleNewAlert = () => {
    if (isLimitReached) {
      setIsPaidFeatureOpened(true)
      return
    }

    navigate(_replace(routes.create_alert, ':pid', id))
  }

  const onDelete = async (id: string) => {
    try {
      await deleteAlertApi(id)
      toast.success(t('alertsSettings.alertDeleted'))
    } catch (reason: any) {
      toast.error(reason?.response?.data?.message || reason?.message || 'Something went wrong')
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
    <>
      <div className='mt-4'>
        {_isEmpty(alerts) ? (
          <div className='mt-5 rounded-xl bg-gray-700 p-5'>
            <div className='flex items-center text-gray-50'>
              <BellRingIcon className='mr-2 h-8 w-8' strokeWidth={1.5} />
              <p className='text-3xl font-bold'>{t('dashboard.alerts')}</p>
            </div>
            <p className='mt-2 text-sm whitespace-pre-wrap text-gray-100'>{t('dashboard.alertsDesc')}</p>
            <Button
              onClick={handleNewAlert}
              className='mt-6 block max-w-max rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-indigo-50 md:px-4'
              secondary
              large
            >
              {isLimitReached ? <DollarSignIcon className='mr-1 h-5 w-5' strokeWidth={1.5} /> : null}
              {t('alert.add')}
            </Button>
          </div>
        ) : (
          <>
            {!isIntegrationLinked ? <NoNotificationChannelSet /> : null}
            <ul className='mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3'>
              {_map(alerts, (alert) => (
                <AlertCard
                  key={alert.id}
                  {...alert}
                  openAlert={(alertId) => {
                    navigate(_replace(_replace(routes.alert_settings, ':pid', id), ':id', alertId))
                  }}
                  deleteAlert={onDelete}
                  queryMetricTMapping={queryMetricTMapping}
                />
              ))}
              <AddAlert handleNewAlert={handleNewAlert} isLimitReached={isLimitReached} />
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
            pageSize={DEFAULT_ALERTS_TAKE}
          />
        ) : null}
      </div>
      <PaidFeature isOpened={isPaidFeatureOpened} onClose={() => setIsPaidFeatureOpened(false)} />
    </>
  )
}

export default ProjectAlerts
