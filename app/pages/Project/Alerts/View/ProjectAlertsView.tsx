import React, { useMemo, memo, useState } from 'react'
import dayjs from 'dayjs'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'
import _replace from 'lodash/replace'
import _values from 'lodash/values'
import _reduce from 'lodash/reduce'
import _filter from 'lodash/filter'
import { useNavigate, Link } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  BellIcon,
  CurrencyDollarIcon,
  AdjustmentsVerticalIcon,
  TrashIcon,
  PlusCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

import routes from 'routesPath'
import Button from 'ui/Button'
import Modal from 'ui/Modal'
import PaidFeature from 'modals/PaidFeature'
import { QUERY_METRIC, PLAN_LIMITS } from 'redux/constants'
import UIActions from 'redux/reducers/ui'
import { alertsActions } from 'redux/reducers/alerts'
import { errorsActions } from 'redux/reducers/errors'
import { deleteAlert as deleteAlertApi } from 'api'
import { StateType } from 'redux/store'

const Separator = () => (
  <svg viewBox='0 0 2 2' className='h-0.5 w-0.5 flex-none fill-gray-400'>
    <circle cx={1} cy={1} r={1} />
  </svg>
)

const NoNotificationChannelSet = () => {
  const { t } = useTranslation('common')

  return (
    <div className='rounded-lg bg-yellow-300 dark:bg-yellow-500'>
      <div className='mx-auto max-w-7xl px-3 py-3 sm:px-6 lg:px-8'>
        <div className='flex flex-wrap items-center justify-between'>
          <div className='flex flex-1 items-center'>
            <span className='flex rounded-lg bg-yellow-500 p-2 dark:bg-yellow-600'>
              <ExclamationTriangleIcon className='h-6 w-6 text-white' aria-hidden='true' />
            </span>
            <p className='ml-3 font-medium text-black'>{t('alert.noNotificationChannel')}</p>
          </div>
          <div className='order-3 mt-2 w-full flex-shrink-0 sm:order-2 sm:mt-0 sm:w-auto'>
            <Link
              to={routes.user_settings}
              className='flex cursor-pointer items-center justify-center rounded-md border border-transparent bg-gray-50 px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-yellow-50 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
            >
              {t('common.fixIt')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

interface IAlertCard {
  id: string
  name: string
  queryMetric: string | number
  lastTriggered: string | null
  deleteAlert: (id: string) => void
  openAlert: (id: string) => void
  queryMetricTMapping: any
}

const AlertCard = ({
  id,
  name,
  queryMetric,
  lastTriggered,
  openAlert,
  deleteAlert,
  queryMetricTMapping,
}: IAlertCard): JSX.Element => {
  const {
    t,
    i18n: { language },
  } = useTranslation()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  return (
    <>
      <li
        onClick={() => openAlert(id)}
        className='min-h-[120px] cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-slate-800/25 dark:bg-[#162032] dark:hover:bg-slate-800'
      >
        <div className='px-4 py-4'>
          <div className='flex justify-between'>
            <div>
              <p className='flex items-center gap-x-2 text-lg text-slate-900 dark:text-gray-50'>
                <span className='font-semibold'>{name}</span>
                <Separator />
                <span>{queryMetricTMapping[queryMetric]}</span>
              </p>
              <p className='text-base text-slate-900 dark:text-gray-50'>
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
            <div className='flex gap-2'>
              <AdjustmentsVerticalIcon
                role='button'
                aria-label={t('common.settings')}
                onClick={(e) => {
                  e.stopPropagation()
                  openAlert(id)
                }}
                className='h-6 w-6 text-gray-800 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-500'
              />
              <TrashIcon
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDeleteModal(true)
                }}
                role='button'
                aria-label={t('common.delete')}
                className='h-6 w-6 text-gray-800 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-500'
              />
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

interface IAddAlert {
  handleNewAlert: () => void
  isLimitReached: boolean
}

const AddAlert = ({ handleNewAlert, isLimitReached }: IAddAlert): JSX.Element => {
  const { t } = useTranslation()

  return (
    <li
      onClick={handleNewAlert}
      className='group flex h-auto min-h-[120px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 dark:border-gray-500 dark:hover:border-gray-600'
    >
      <div>
        {isLimitReached ? (
          <CurrencyDollarIcon className='mx-auto h-12 w-12 text-gray-400 group-hover:text-gray-500 dark:text-gray-200 group-hover:dark:text-gray-400' />
        ) : (
          <PlusCircleIcon className='mx-auto h-12 w-12 text-gray-400 group-hover:text-gray-500 dark:text-gray-200 group-hover:dark:text-gray-400' />
        )}
        <span className='mt-2 block text-sm font-semibold text-gray-900 dark:text-gray-50 group-hover:dark:text-gray-400'>
          {t('alert.add')}
        </span>
      </div>
    </li>
  )
}

interface IProjectAlerts {
  projectId: string
}

const ProjectAlerts = ({ projectId }: IProjectAlerts): JSX.Element => {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { loading, total, alerts } = useSelector((state: StateType) => state.ui.alerts)
  const { user, authenticated } = useSelector((state: StateType) => state.auth)
  const [isPaidFeatureOpened, setIsPaidFeatureOpened] = useState<boolean>(false)
  const navigate = useNavigate()

  // @ts-ignore
  const limits = PLAN_LIMITS[user?.planCode] || PLAN_LIMITS.trial
  const isLimitReached = authenticated && total >= limits?.maxAlerts

  const projectAlerts = useMemo(() => {
    if (loading) return []
    return _filter(alerts, ({ pid }) => pid === projectId)
  }, [projectId, alerts, loading])

  const queryMetricTMapping: {
    [key: string]: string
  } = useMemo(() => {
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
    return !_isEmpty(user) && user.telegramChatId && user.isTelegramChatIdConfirmed
  }, [user])

  const handleNewAlert = () => {
    if (isLimitReached) {
      setIsPaidFeatureOpened(true)
      return
    }

    navigate(_replace(routes.create_alert, ':pid', projectId))
  }

  const onDelete = async (id: string) => {
    try {
      await deleteAlertApi(id)
      dispatch(UIActions.setProjectAlerts(_filter(alerts, (a) => a.id !== id)))
      dispatch(
        UIActions.setProjectAlertsTotal({
          total: total - 1,
        }),
      )
      dispatch(
        alertsActions.generateAlerts({
          message: t('alertsSettings.alertDeleted'),
          type: 'success',
        }),
      )
    } catch (reason: any) {
      dispatch(
        errorsActions.genericError({
          message: reason?.response?.data?.message || reason?.message || 'Something went wrong',
        }),
      )
    }
  }

  return (
    <div>
      <div className='mt-4'>
        {loading && <div>{t('common.loading')}</div>}
        {!loading && _isEmpty(projectAlerts) && (
          <div className='mt-5 rounded-xl bg-gray-700 p-5'>
            <div className='flex items-center text-gray-50'>
              <BellIcon className='mr-2 h-8 w-8' />
              <p className='text-3xl font-bold'>{t('dashboard.alerts')}</p>
            </div>
            <p className='mt-2 whitespace-pre-wrap text-lg text-gray-100'>{t('dashboard.alertsDesc')}</p>
            <Button
              onClick={handleNewAlert}
              className='mt-6 rounded-md border border-transparent bg-white px-3 py-2 text-base font-medium text-gray-700 hover:bg-indigo-50 md:px-4'
              secondary
              large
            >
              <>
                {isLimitReached && <CurrencyDollarIcon className='mr-1 h-5 w-5' />}
                {t('alert.add')}
              </>
            </Button>
          </div>
        )}
        {!loading && !_isEmpty(projectAlerts) && (
          <>
            {!isIntegrationLinked && <NoNotificationChannelSet />}
            <ul className='mt-4 grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-3 lg:gap-y-6'>
              {_map(projectAlerts, (alert) => (
                <AlertCard
                  key={alert.id}
                  {...alert}
                  openAlert={(id) => {
                    navigate(_replace(_replace(routes.alert_settings, ':pid', projectId), ':id', id))
                  }}
                  deleteAlert={onDelete}
                  queryMetricTMapping={queryMetricTMapping}
                />
              ))}
              <AddAlert handleNewAlert={handleNewAlert} isLimitReached={isLimitReached} />
            </ul>
          </>
        )}
      </div>
      <PaidFeature isOpened={isPaidFeatureOpened} onClose={() => setIsPaidFeatureOpened(false)} />
    </div>
  )
}

export default memo(ProjectAlerts)
