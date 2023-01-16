/* eslint-disable react/forbid-prop-types */
import React, {
  useMemo, memo, useState,
} from 'react'
import dayjs from 'dayjs'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'
import _replace from 'lodash/replace'
import _values from 'lodash/values'
import _reduce from 'lodash/reduce'
import _filter from 'lodash/filter'
import _trucate from 'lodash/truncate'
import { useHistory } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import {
  BellIcon, CurrencyDollarIcon, PencilSquareIcon, FolderPlusIcon,
} from '@heroicons/react/24/outline'

import routes from 'routes'
import Button from 'ui/Button'
import PaidFeature from 'modals/PaidFeature'
import { QUERY_METRIC, PLAN_LIMITS } from 'redux/constants'

const ProjectAlerts = ({
  projectId, alerts, loading, user, total, authenticated,
}) => {
  const { t, i18n: { language } } = useTranslation()
  const [isPaidFeatureOpened, setIsPaidFeatureOpened] = useState(false)
  const history = useHistory()

  const limits = PLAN_LIMITS[user?.planCode]
  const isLimitReached = authenticated && (total >= limits?.maxAlerts)

  const projectAlerts = useMemo(() => {
    if (loading) return []
    return _filter(alerts, ({ pid }) => pid === projectId)
  }, [projectId, alerts, loading])

  const queryMetricTMapping = useMemo(() => {
    const values = _values(QUERY_METRIC)

    return _reduce(values, (prev, curr) => ({
      ...prev,
      [curr]: t(`alert.metrics.${curr}`),
    }), {})
  }, [t])

  const isIntegrationLinked = useMemo(() => {
    return !_isEmpty(user) && user.telegramChatId && user.isTelegramChatIdConfirmed
  }, [user])

  const handleNewAlert = () => {
    if (isLimitReached) {
      setIsPaidFeatureOpened(true)
      return
    }

    history.push(_replace(routes.create_alert, ':pid', projectId))
  }

  return (
    <div>
      <div className='flex justify-between items-center mt-4'>
        {!loading && !_isEmpty(projectAlerts) && (
          <>
            <h2 className='text-2xl font-bold dark:text-white text-gray-800'>
              {t('dashboard.alerts')}
            </h2>
            <Button
              type='button'
              primary
              large
              onClick={handleNewAlert}
            >
              {isLimitReached ? (
                <CurrencyDollarIcon className='w-5 h-5 mr-1' />
              ) : (
                <FolderPlusIcon className='w-5 h-5 mr-1' />
              )}
              {t('alert.add')}
            </Button>
          </>
        )}
      </div>
      <div className='mt-4'>
        {loading && (
          <div>
            {t('common.loading')}
          </div>
        )}
        {(!loading && _isEmpty(projectAlerts)) && (
          <div className='p-5 mt-5 bg-gray-700 rounded-xl'>
            <div className='flex items-center text-gray-50'>
              <BellIcon className='w-8 h-8 mr-2' />
              <p className='font-bold text-3xl'>
                {t('dashboard.alerts')}
              </p>
            </div>
            <p className='text-lg whitespace-pre-wrap mt-2 text-gray-100'>
              {t('dashboard.alertsDesc')}
            </p>
            <Button
              onClick={handleNewAlert}
              className='mt-6 bg-white py-2 px-3 md:px-4 border border-transparent rounded-md text-base font-medium text-gray-700 hover:bg-indigo-50'
              secondary
              large
            >
              {isLimitReached && (
                <CurrencyDollarIcon className='w-5 h-5 mr-1' />
              )}
              {t('alert.add')}
            </Button>
          </div>
        )}

        {(!loading && !_isEmpty(projectAlerts)) && (
          <table className='w-full mb-3 border-separate border-spacing-y-4'>
            <tbody>
              {_map(projectAlerts, ({
                id, name, queryMetric, lastTriggered,
              }) => (
                <tr key={id} className='bg-white dark:bg-gray-800 rounded-lg shadow-lg'>
                  <td className='p-4 pr-0 rounded-l-lg justify-start'>
                    <div className='flex flex-col'>
                      <div className='text-lg font-bold dark:text-white text-gray-800 hidden lg:block'>{name}</div>
                      <div className='text-lg font-bold dark:text-white text-gray-800 hidden md:block lg:hidden'>{_trucate(name, { length: 35 })}</div>
                      <div className='text-lg font-bold dark:text-white text-gray-800 hidden sm:block md:hidden'>{_trucate(name, { length: 20 })}</div>
                      <div className='text-lg font-bold dark:text-white text-gray-800 sm:hidden'>{_trucate(name, { length: 10 })}</div>
                      <div className='text-sm dark:text-gray-400 text-gray-600'>{queryMetricTMapping[queryMetric]}</div>
                    </div>

                  </td>
                  <td className='py-4'>
                    <div className='flex flex-col'>
                      <div className='text-sm dark:text-gray-400 text-gray-600'>
                        {t('alert.lastTriggered')}
                      </div>
                      <div className='text-lg font-bold dark:text-white text-gray-800'>
                        {lastTriggered
                          ? (language === 'en'
                            ? dayjs(lastTriggered).locale(language).format('MMMM D, YYYY')
                            : dayjs(lastTriggered).locale(language).format('D MMMM, YYYY'))
                          : t('alert.never')}
                      </div>
                    </div>

                  </td>
                  <td className='rounded-r-lg p-4 pl-0'>
                    <div className='flex items-center justify-end'>
                      {!isIntegrationLinked && (
                      <p className='text-gray-800 dark:text-gray-200 text-sm mr-3'>
                        {t('alert.noNotification')}
                      </p>
                      )}
                      <Button
                        onClick={() => {
                          history.push(_replace(_replace(routes.alert_settings, ':pid', projectId), ':id', id))
                        }}
                        className='dark:text-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600'
                        secondary
                        large
                      >
                        <PencilSquareIcon className='w-4 h-4 mr-1' />
                        {t('common.edit')}
                      </Button>
                    </div>

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <PaidFeature
        isOpened={isPaidFeatureOpened}
        onClose={() => setIsPaidFeatureOpened(false)}
      />
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
