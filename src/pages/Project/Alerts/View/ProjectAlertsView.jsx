import React, { useMemo } from 'react'
import dayjs from 'dayjs'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'
import _replace from 'lodash/replace'
import _values from 'lodash/values'
import _reduce from 'lodash/reduce'
import routes from 'routes'
import { useHistory } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Button from 'ui/Button'
import { QUERY_METRIC } from 'redux/constants'

const ProjectAlerts = ({
  projectId, alerts, loading,
}) => {
  const { t, i18n: { language } } = useTranslation()
  const history = useHistory()

  const queryMetricTMapping = useMemo(() => {
    const values = _values(QUERY_METRIC)

    return _reduce(values, (prev, curr) => ({
      ...prev,
      [curr]: t(`alert.metrics.${curr}`),
    }), {})
  }, [t])

  return (
    <div>
      <div className='flex justify-between items-center'>
        <h2 className='text-2xl font-bold dark:text-white text-gray-800'>Alerts</h2>
        <Button
          className='mt-4'
          type='button'
          primary
          large
          onClick={() => {
            history.push(_replace(routes.create_alert, ':pid', projectId))
          }}
        >
          {t('alert.add')}
        </Button>
      </div>
      <div className='mt-4'>
        {loading && (
          <div>
            {t('common.loading')}
          </div>
        )}
        {(!loading && !_isEmpty(alerts)) && (
          <div className='flex flex-col'>
            {_map(alerts, ({ id, name, queryMetric, lastTriggered }) => (
              <div key={id} className='flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4'>
                <div className='flex justify-between items-center'>
                  <div className='flex flex-col'>
                    <div className='text-lg font-bold dark:text-white text-gray-800'>{name}</div>
                    <div className='text-sm dark:text-gray-400 text-gray-600'>{queryMetricTMapping[queryMetric]}</div>
                  </div>
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
                  <Button
                    onClick={() => {
                      history.push(_replace(_replace(routes.alert_settings, ':pid', projectId), ':id', id))
                    }}
                    className='dark:text-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600'
                    secondary
                    large
                  >
                    {t('common.edit')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectAlerts
