/* eslint-disable react/forbid-prop-types */
import React, { useMemo, memo, useState } from 'react'
import dayjs from 'dayjs'
import cx from 'clsx'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'
import _replace from 'lodash/replace'
import _values from 'lodash/values'
import _reduce from 'lodash/reduce'
import _filter from 'lodash/filter'
import { useNavigate, Link } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
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
import PaidFeature from 'modals/PaidFeature'
import { QUERY_METRIC, PLAN_LIMITS } from 'redux/constants'
import { IAlerts } from 'redux/models/IAlerts'
import { IUser } from 'redux/models/IUser'

const Separator = () => (
  <svg viewBox='0 0 2 2' className='h-0.5 w-0.5 flex-none fill-gray-400'>
    <circle cx={1} cy={1} r={1} />
  </svg>
)

const NoNotificationChannelSet = () => {
  const { t } = useTranslation('common')

  return (
    <div className='bg-yellow-300 dark:bg-yellow-500 rounded-lg'>
      <div className='max-w-7xl mx-auto py-3 px-3 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between flex-wrap'>
          <div className='flex-1 flex items-center'>
            <span className='flex p-2 rounded-lg bg-yellow-500 dark:bg-yellow-600'>
              <ExclamationTriangleIcon className='h-6 w-6 text-white' aria-hidden='true' />
            </span>
            <p className='ml-3 font-medium text-black'>{t('alert.noNotificationChannel')}</p>
          </div>
          <div className='order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto'>
            <Link
              to={routes.user_settings}
              className='flex items-center justify-center cursor-pointer px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-800 bg-gray-50 hover:bg-yellow-50 dark:text-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700'
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

  return (
    <li
      onClick={() => openAlert(id)}
      className='overflow-hidden min-h-[120px] rounded-xl border border-gray-200 cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-[#162032] dark:hover:bg-slate-800 dark:border-slate-800/25'
    >
      <div className='py-4 px-4'>
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
              className='w-6 h-6 text-gray-800 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-500'
            />
            <TrashIcon
              onClick={(e) => {
                e.stopPropagation()
                deleteAlert(id)
              }}
              role='button'
              aria-label={t('common.delete')}
              className={cx('w-6 h-6 text-gray-800 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-500', {
                // 'cursor-not-allowed': loading,
              })}
            />
          </div>
        </div>
      </div>
    </li>
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
      className='flex cursor-pointer justify-center items-center rounded-lg border-2 border-dashed h-auto min-h-[120px] group border-gray-300 hover:border-gray-400 dark:border-gray-500 dark:hover:border-gray-600'
    >
      <div>
        {isLimitReached ? (
          <CurrencyDollarIcon className='mx-auto h-12 w-12 text-gray-400 dark:text-gray-200 group-hover:text-gray-500 group-hover:dark:text-gray-400' />
        ) : (
          <PlusCircleIcon className='mx-auto h-12 w-12 text-gray-400 dark:text-gray-200 group-hover:text-gray-500 group-hover:dark:text-gray-400' />
        )}
        <span className='mt-2 block text-sm font-semibold text-gray-900 dark:text-gray-50 group-hover:dark:text-gray-400'>
          {t('alert.add')}
        </span>
      </div>
    </li>
  )
}

const ProjectAlerts = ({
  projectId,
  alerts,
  loading,
  user,
  total,
  authenticated,
}: {
  projectId: string
  alerts: IAlerts[]
  loading: boolean
  user: IUser
  total: number
  authenticated: boolean
}): JSX.Element => {
  const { t } = useTranslation()
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

  return (
    <div>
      <div className='mt-4'>
        {loading && <div>{t('common.loading')}</div>}
        {!loading && _isEmpty(projectAlerts) && (
          <div className='p-5 mt-5 bg-gray-700 rounded-xl'>
            <div className='flex items-center text-gray-50'>
              <BellIcon className='w-8 h-8 mr-2' />
              <p className='font-bold text-3xl'>{t('dashboard.alerts')}</p>
            </div>
            <p className='text-lg whitespace-pre-wrap mt-2 text-gray-100'>{t('dashboard.alertsDesc')}</p>
            <Button
              onClick={handleNewAlert}
              className='mt-6 bg-white py-2 px-3 md:px-4 border border-transparent rounded-md text-base font-medium text-gray-700 hover:bg-indigo-50'
              secondary
              large
            >
              <>
                {isLimitReached && <CurrencyDollarIcon className='w-5 h-5 mr-1' />}
                {t('alert.add')}
              </>
            </Button>
          </div>
        )}
        {!loading && !_isEmpty(projectAlerts) && (
          <>
            {!isIntegrationLinked && <NoNotificationChannelSet />}
            <ul className='grid grid-cols-1 gap-x-6 gap-y-3 lg:gap-y-6 lg:grid-cols-3 mt-4'>
              {_map(projectAlerts, (alert) => (
                <AlertCard
                  key={alert.id}
                  {...alert}
                  openAlert={(id) => {
                    navigate(_replace(_replace(routes.alert_settings, ':pid', projectId), ':id', id))
                  }}
                  deleteAlert={() => {}}
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

ProjectAlerts.propTypes = {
  projectId: PropTypes.string.isRequired,
  alerts: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  user: PropTypes.object.isRequired,
  total: PropTypes.number.isRequired,
  authenticated: PropTypes.bool.isRequired,
}

export default memo(ProjectAlerts)
