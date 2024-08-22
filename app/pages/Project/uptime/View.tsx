import React, { useMemo, memo, useState } from 'react'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'
import _replace from 'lodash/replace'
import _filter from 'lodash/filter'
import { Link, useNavigate } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  CurrencyDollarIcon,
  AdjustmentsVerticalIcon,
  TrashIcon,
  PlusCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

import routes from 'utils/routes'
import Button from 'ui/Button'
import Modal from 'ui/Modal'
import PaidFeature from 'modals/PaidFeature'
import { PLAN_LIMITS } from 'redux/constants'
import UIActions from 'redux/reducers/ui'
import { alertsActions } from 'redux/reducers/alerts'
import { errorsActions } from 'redux/reducers/errors'
import { deleteMonitor as deleteMonitorApi } from 'api'
import { StateType } from 'redux/store'
import { Monitor } from 'redux/models/Uptime'

// const Separator = () => (
//   <svg viewBox='0 0 2 2' className='h-0.5 w-0.5 flex-none fill-gray-400'>
//     <circle cx={1} cy={1} r={1} />
//   </svg>
// )

interface IMonitorCard {
  monitor: Monitor
  deleteMonitor: (id: string) => void
}

const MonitorCard = ({ monitor, deleteMonitor }: IMonitorCard): JSX.Element => {
  const { t } = useTranslation()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  return (
    <>
      <Link to={_replace(_replace(routes.uptime_settings, ':pid', monitor.projectId), ':id', monitor.id)}>
        <li className='min-h-[120px] cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-slate-800/25 dark:bg-[#162032] dark:hover:bg-slate-800'>
          <div className='px-4 py-4'>
            <div className='flex justify-between'>
              <div>
                <p className='flex items-center gap-x-2 text-lg text-slate-900 dark:text-gray-50'>
                  <span className='font-semibold'>{monitor.name}</span>
                  {/* <Separator />
                <span>{queryMetric}</span> */}
                </p>
              </div>
              <div className='flex gap-2'>
                <Link
                  to={_replace(_replace(routes.uptime_settings, ':pid', monitor.projectId), ':id', monitor.id)}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                >
                  <AdjustmentsVerticalIcon
                    role='button'
                    aria-label={t('common.settings')}
                    className='h-6 w-6 text-gray-800 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-500'
                  />
                </Link>
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
      </Link>
      <Modal
        onClose={() => setShowDeleteModal(false)}
        onSubmit={() => deleteMonitor(monitor.id)}
        submitText={t('monitor.delete')}
        closeText={t('common.close')}
        title={t('monitor.qDelete')}
        message={t('monitor.deleteHint')}
        submitType='danger'
        type='error'
        isOpened={showDeleteModal}
      />
    </>
  )
}

interface AddMonitorProps {
  handleNewMonitor: () => void
  isLimitReached: boolean
}

const AddMonitor = ({ handleNewMonitor, isLimitReached }: AddMonitorProps): JSX.Element => {
  const { t } = useTranslation()

  return (
    <li
      onClick={handleNewMonitor}
      className='group flex h-auto min-h-[120px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 dark:border-gray-500 dark:hover:border-gray-600'
    >
      <div>
        {isLimitReached ? (
          <CurrencyDollarIcon className='mx-auto h-12 w-12 text-gray-400 group-hover:text-gray-500 dark:text-gray-200 group-hover:dark:text-gray-400' />
        ) : (
          <PlusCircleIcon className='mx-auto h-12 w-12 text-gray-400 group-hover:text-gray-500 dark:text-gray-200 group-hover:dark:text-gray-400' />
        )}
        <span className='mt-2 block text-sm font-semibold text-gray-900 dark:text-gray-50 group-hover:dark:text-gray-400'>
          {t('monitor.create')}
        </span>
      </div>
    </li>
  )
}

interface UptimeProps {
  projectId: string
}

const Uptime = ({ projectId }: UptimeProps): JSX.Element => {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { loading, total, monitors } = useSelector((state: StateType) => state.ui.monitors)
  const { user, authenticated } = useSelector((state: StateType) => state.auth)
  const [isPaidFeatureOpened, setIsPaidFeatureOpened] = useState<boolean>(false)
  const navigate = useNavigate()

  const limits = PLAN_LIMITS[user?.planCode] || PLAN_LIMITS.trial
  const isLimitReached = authenticated && total >= limits?.maxMonitors

  const projectMonitors = useMemo(() => {
    if (loading) return []
    return _filter(monitors, (monitor) => monitor.projectId === projectId)
  }, [projectId, monitors, loading])

  const handleNewMonitor = () => {
    if (isLimitReached) {
      setIsPaidFeatureOpened(true)
      return
    }

    navigate(_replace(routes.create_uptime, ':pid', projectId))
  }

  const onDelete = async (id: string) => {
    try {
      await deleteMonitorApi(projectId, id)
      dispatch(UIActions.setMonitors(_filter(monitors, (a) => a.id !== id)))
      dispatch(
        UIActions.setMonitorsTotal({
          total: total - 1,
        }),
      )
      dispatch(
        alertsActions.generateAlerts({
          message: t('monitor.monitorDeleted'),
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
        {!loading && _isEmpty(projectMonitors) && (
          <div className='mt-5 rounded-xl bg-gray-700 p-5'>
            <div className='flex items-center text-gray-50'>
              <ClockIcon className='mr-2 h-8 w-8' />
              <p className='text-3xl font-bold'>{t('dashboard.uptime')}</p>
            </div>
            <p className='mt-2 whitespace-pre-wrap text-lg text-gray-100'>{t('dashboard.uptimeDesc')}</p>
            <Button
              onClick={handleNewMonitor}
              className='mt-6 rounded-md border border-transparent bg-white px-3 py-2 text-base font-medium text-gray-700 hover:bg-indigo-50 md:px-4'
              secondary
              large
            >
              <>
                {isLimitReached && <CurrencyDollarIcon className='mr-1 h-5 w-5' />}
                {t('monitor.create')}
              </>
            </Button>
          </div>
        )}
        {!loading && !_isEmpty(projectMonitors) && (
          <ul className='mt-4 grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-3 lg:gap-y-6'>
            {_map(projectMonitors, (monitor) => (
              <MonitorCard key={monitor.id} monitor={monitor} deleteMonitor={onDelete} />
            ))}
            <AddMonitor handleNewMonitor={handleNewMonitor} isLimitReached={isLimitReached} />
          </ul>
        )}
      </div>
      <PaidFeature isOpened={isPaidFeatureOpened} onClose={() => setIsPaidFeatureOpened(false)} />
    </div>
  )
}

export default memo(Uptime) as typeof Uptime
