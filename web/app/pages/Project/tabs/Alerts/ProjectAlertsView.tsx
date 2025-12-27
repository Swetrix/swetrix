import cx from 'clsx'
import dayjs from 'dayjs'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _reduce from 'lodash/reduce'
import _values from 'lodash/values'
import {
  PencilIcon,
  Trash2Icon,
  BellRingIcon,
  TriangleAlertIcon,
  PlusIcon,
  EyeIcon,
  MousePointerClickIcon,
  UsersIcon,
  BugIcon,
  FileTextIcon,
  BellOffIcon,
} from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
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
import LoadingBar from '~/ui/LoadingBar'
import Modal from '~/ui/Modal'
import Pagination from '~/ui/Pagination'
import StatusPage from '~/ui/StatusPage'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

import ProjectAlertsSettings from './ProjectAlertsSettings'

const NoNotificationChannelSet = () => {
  const { t } = useTranslation('common')

  return (
    <div className='mb-4 flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-500/20 dark:bg-yellow-500/10'>
      <TriangleAlertIcon className='size-5 shrink-0 text-yellow-600 dark:text-yellow-500' strokeWidth={1.5} />
      <p className='flex-1 text-sm text-yellow-800 dark:text-yellow-200'>{t('alert.noNotificationChannel')}</p>
      <Link
        to={routes.user_settings}
        className='shrink-0 rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-500'
      >
        {t('common.fixIt')}
      </Link>
    </div>
  )
}

const COLOUR_QUERY_METRIC_MAPPING: Record<(typeof QUERY_METRIC)[keyof typeof QUERY_METRIC], BadgeProps['colour']> = {
  [QUERY_METRIC.PAGE_VIEWS]: 'yellow',
  [QUERY_METRIC.UNIQUE_PAGE_VIEWS]: 'indigo',
  [QUERY_METRIC.ONLINE_USERS]: 'sky',
  [QUERY_METRIC.CUSTOM_EVENTS]: 'green',
  [QUERY_METRIC.ERRORS]: 'red',
}

const METRIC_ICON_MAPPING: Record<
  (typeof QUERY_METRIC)[keyof typeof QUERY_METRIC],
  { icon: React.ElementType; className: string }
> = {
  [QUERY_METRIC.PAGE_VIEWS]: { icon: FileTextIcon, className: 'text-yellow-500' },
  [QUERY_METRIC.UNIQUE_PAGE_VIEWS]: { icon: EyeIcon, className: 'text-indigo-500' },
  [QUERY_METRIC.ONLINE_USERS]: { icon: UsersIcon, className: 'text-sky-500' },
  [QUERY_METRIC.CUSTOM_EVENTS]: { icon: MousePointerClickIcon, className: 'text-green-500' },
  [QUERY_METRIC.ERRORS]: { icon: BugIcon, className: 'text-red-500' },
}

interface AlertRowProps {
  id: string
  name: string
  active: boolean
  queryMetric: (typeof QUERY_METRIC)[keyof typeof QUERY_METRIC]
  lastTriggered: string | null
  deleteAlert: (id: string) => void
  openAlert: (id: string) => void
  queryMetricTMapping: any
}

const AlertRow = ({
  id,
  name,
  active,
  queryMetric,
  lastTriggered,
  openAlert,
  deleteAlert,
  queryMetricTMapping,
}: AlertRowProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const MetricIcon = METRIC_ICON_MAPPING[queryMetric]?.icon || FileTextIcon
  const metricIconClass = METRIC_ICON_MAPPING[queryMetric]?.className || 'text-gray-500'

  const lastTriggeredText = lastTriggered
    ? language === 'en'
      ? dayjs(lastTriggered).locale(language).format('MMM D, YYYY')
      : dayjs(lastTriggered).locale(language).format('D MMM, YYYY')
    : null

  return (
    <>
      <li
        onClick={() => openAlert(id)}
        className='group relative mb-3 cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-colors hover:bg-gray-100 dark:border-slate-800/25 dark:bg-slate-800/70 dark:hover:bg-slate-700/60'
      >
        <div className='flex items-center justify-between gap-4 px-4 py-3 sm:px-5'>
          {/* Left section: Icon + Name + Badge */}
          <div className='flex min-w-0 flex-1 items-center gap-3'>
            <div
              className={cx(
                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                active ? 'bg-gray-100 dark:bg-slate-700/50' : 'bg-gray-100/50 opacity-60 dark:bg-slate-700/30',
              )}
            >
              <MetricIcon className={cx('size-4', metricIconClass, !active && 'opacity-50')} strokeWidth={1.5} />
            </div>

            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-2'>
                <Text as='span' weight='semibold' truncate className={cx(!active && 'opacity-60')}>
                  {name}
                </Text>
                {!active ? (
                  <span className='inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-slate-700 dark:text-gray-400'>
                    <BellOffIcon className='size-3' strokeWidth={1.5} />
                    {t('alert.disabled')}
                  </span>
                ) : null}
              </div>
              <div className='mt-0.5 flex items-center gap-2'>
                <Badge
                  colour={COLOUR_QUERY_METRIC_MAPPING[queryMetric]}
                  label={queryMetricTMapping[queryMetric]}
                  className='text-[10px]'
                />
                {/* Mobile: Show last triggered */}
                <Text as='span' size='xs' colour='muted' className='sm:hidden'>
                  {lastTriggeredText ? `• ${lastTriggeredText}` : `• ${t('alert.never')}`}
                </Text>
              </div>
            </div>
          </div>

          {/* Right section: Last triggered + Actions */}
          <div className='flex shrink-0 items-center gap-3'>
            {/* Desktop: Last triggered */}
            <div className='hidden text-right sm:block'>
              <Text as='p' size='xs' colour='muted'>
                {t('alert.lastTriggered')}
              </Text>
              <Text as='p' size='sm' colour={lastTriggeredText ? 'primary' : 'muted'}>
                {lastTriggeredText || t('alert.never')}
              </Text>
            </div>

            {/* Action buttons */}
            <div className='flex items-center gap-1'>
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation()
                  openAlert(id)
                }}
                aria-label={t('common.edit')}
                className='rounded-md border border-transparent p-1.5 text-gray-500 transition-colors hover:border-gray-300 hover:bg-white hover:text-gray-700 dark:text-slate-400 hover:dark:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300'
              >
                <PencilIcon className='size-4' strokeWidth={1.5} />
              </button>
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDeleteModal(true)
                }}
                aria-label={t('common.delete')}
                className='rounded-md border border-transparent p-1.5 text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 hover:dark:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400'
              >
                <Trash2Icon className='size-4' strokeWidth={1.5} />
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

const ProjectAlerts = () => {
  const { id, project } = useCurrentProject()
  const { t } = useTranslation()
  const { user, isAuthenticated } = useAuth()
  const [isPaidFeatureOpened, setIsPaidFeatureOpened] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const [total, setTotal] = useState(0)
  const [alerts, setAlerts] = useState<Alerts[]>([])
  const [page, setPage] = useState(1)

  const [error, setError] = useState<string | null>(null)

  const pageAmount = Math.ceil(total / DEFAULT_ALERTS_TAKE)

  const limits = PLAN_LIMITS[user?.planCode || 'trial']
  const isLimitReached = isAuthenticated && total >= limits?.maxAlerts

  // Check if user has permission to view alerts
  const canManageAlerts = project?.role === 'owner' && isAuthenticated

  // Get active alert from URL params
  const activeAlertId = searchParams.get('alertId')
  const isCreatingAlert = searchParams.get('newAlert') === 'true'

  // Search params without the alert params. Needed for the back button.
  const pureSearchParams = useMemo(() => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('alertId')
    newSearchParams.delete('newAlert')
    return newSearchParams.toString()
  }, [searchParams])

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
    if (!canManageAlerts) {
      return
    }

    loadAlerts(DEFAULT_ALERTS_TAKE, (page - 1) * DEFAULT_ALERTS_TAKE)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, canManageAlerts])

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

    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.set('newAlert', 'true')
    setSearchParams(newSearchParams)
  }

  const openAlert = (alertId: string) => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.set('alertId', alertId)
    setSearchParams(newSearchParams)
  }

  const closeAlertSettings = () => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('alertId')
    newSearchParams.delete('newAlert')
    setSearchParams(newSearchParams)
  }

  const handleAlertSaved = () => {
    closeAlertSettings()
    // Reload alerts after saving
    loadAlerts(DEFAULT_ALERTS_TAKE, (page - 1) * DEFAULT_ALERTS_TAKE)
  }

  const onDelete = async (alertId: string) => {
    try {
      await deleteAlertApi(alertId)
      toast.success(t('alertsSettings.alertDeleted'))
      // Reload alerts after deletion
      loadAlerts(DEFAULT_ALERTS_TAKE, (page - 1) * DEFAULT_ALERTS_TAKE)
    } catch (reason: any) {
      toast.error(reason?.response?.data?.message || reason?.message || 'Something went wrong')
    }
  }

  if (!canManageAlerts) {
    return (
      <div className='mt-5 rounded-lg bg-gray-700 p-5'>
        <div className='flex items-center text-gray-50'>
          <BellRingIcon className='mr-2 h-8 w-8' strokeWidth={1.5} />
          <p className='text-3xl font-bold'>{t('dashboard.alerts')}</p>
        </div>
        <p className='mt-2 text-sm whitespace-pre-wrap text-gray-100'>{t('dashboard.alertsDesc')}</p>
        <Link
          to={routes.signup}
          className='mt-6 block max-w-max rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-indigo-50 md:px-4'
          aria-label={t('titles.signup')}
        >
          {t('header.startForFree')}
        </Link>
      </div>
    )
  }

  if (error && isLoading === false) {
    return (
      <StatusPage
        type='error'
        title={t('apiNotifications.somethingWentWrong')}
        description={t('apiNotifications.errorCode', { error })}
        actions={[
          { label: t('dashboard.reloadPage'), onClick: () => window.location.reload(), primary: true },
          { label: t('notFoundPage.support'), to: routes.contact },
        ]}
      />
    )
  }

  if (isLoading || isLoading === null) {
    return (
      <div className='mt-4'>
        <Loader />
      </div>
    )
  }

  // Show alert settings view when editing or creating an alert
  if (activeAlertId || isCreatingAlert) {
    return (
      <ProjectAlertsSettings
        alertId={activeAlertId}
        projectId={id}
        isSettings={!!activeAlertId}
        onClose={closeAlertSettings}
        onSave={handleAlertSaved}
        backLink={`?${pureSearchParams}`}
      />
    )
  }

  return (
    <>
      {isLoading && !_isEmpty(alerts) ? <LoadingBar /> : null}
      <div className='mt-4'>
        {_isEmpty(alerts) ? (
          <div className='mt-5 rounded-lg bg-gray-700 p-5'>
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
              {t('alert.add')}
            </Button>
          </div>
        ) : (
          <>
            {!isIntegrationLinked ? <NoNotificationChannelSet /> : null}

            {/* Header with add button */}
            <div className='mb-4 flex items-center justify-between'>
              <Text as='p' size='sm' colour='muted'>
                {t('alert.totalCount', { count: total })}
              </Text>
              <Button onClick={handleNewAlert} primary regular>
                <PlusIcon className='mr-1.5 size-4' strokeWidth={2} />
                {t('alert.add')}
              </Button>
            </div>

            {/* Alerts list */}
            <ul>
              {_map(alerts, (alert) => (
                <AlertRow
                  key={alert.id}
                  {...alert}
                  openAlert={openAlert}
                  deleteAlert={onDelete}
                  queryMetricTMapping={queryMetricTMapping}
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
            pageSize={DEFAULT_ALERTS_TAKE}
          />
        ) : null}
      </div>
      <PaidFeature isOpened={isPaidFeatureOpened} onClose={() => setIsPaidFeatureOpened(false)} />
    </>
  )
}

export default ProjectAlerts
