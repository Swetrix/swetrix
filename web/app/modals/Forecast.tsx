import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import _isNaN from 'lodash/isNaN'
import _map from 'lodash/map'
import cx from 'clsx'

import Modal from 'ui/Modal'
import Input from 'ui/Input'
import { FORECAST_MAX_MAPPING } from 'redux/constants'
import _toString from 'lodash/toString'
import { Bars3BottomRightIcon, ChartBarIcon } from '@heroicons/react/24/outline'

const DEFAULT_PERIOD = '3'

interface IForecast {
  onClose: () => void
  onSubmit: (
    type: 'chart' | 'details',
    options?: {
      period: string
    },
  ) => void
  isOpened: boolean
  activeTB: string
  tb: string
}

const Forecast = ({ onClose, onSubmit, isOpened, activeTB, tb }: IForecast): JSX.Element => {
  const { t } = useTranslation('common')
  const [period, setPeriod] = useState<string>(DEFAULT_PERIOD)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'chart' | 'details'>('chart')

  const tabs = useMemo(() => {
    return [
      {
        id: 'chart' as const,
        label: t('modals.forecast.chart'),
        icon: ChartBarIcon,
      },
      {
        id: 'details' as const,
        label: t('modals.forecast.details'),
        icon: Bars3BottomRightIcon,
      },
    ]
  }, [t])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target

    setPeriod(value)
    setError(null)
  }

  const _onSubmit = () => {
    if (activeTab === 'details') {
      return onSubmit(activeTab)
    }

    const processedPeriod = Number(period)

    if (_isNaN(processedPeriod)) {
      setError(t('apiNotifications.enterACorrectNumber'))
      return
    }

    if (processedPeriod <= 0) {
      setError(t('apiNotifications.numberCantBeNegative'))
      return
    }

    if (processedPeriod > FORECAST_MAX_MAPPING[tb]) {
      setError(
        t('apiNotifications.forecastNumberCantBeBigger', {
          max: FORECAST_MAX_MAPPING[tb],
        }),
      )
      return
    }

    onSubmit(activeTab, {
      period: _toString(processedPeriod),
    })
  }

  const _onClose = () => {
    setPeriod(DEFAULT_PERIOD)
    setError(null)
    onClose()
  }

  return (
    <Modal
      onClose={_onClose}
      onSubmit={_onSubmit}
      submitText={t('common.continue')}
      closeText={t('common.cancel')}
      message={
        <div>
          <div className='mb-4 flex space-x-4 overflow-x-auto' aria-label='Forecast type selector'>
            {_map(tabs, (tab) => {
              const isCurrent = tab.id === activeTab

              return (
                <div
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                  }}
                  className={cx(
                    'text-md group inline-flex cursor-pointer items-center whitespace-nowrap border-b-2 px-1 py-2 font-bold',
                    {
                      'border-slate-900 text-slate-900 dark:border-gray-50 dark:text-gray-50': isCurrent,
                      'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-300 dark:hover:text-gray-300':
                        !isCurrent,
                    },
                  )}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  <tab.icon
                    className={cx(
                      isCurrent
                        ? 'text-slate-900 dark:text-gray-50'
                        : 'text-gray-500 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300',
                      '-ml-0.5 mr-2 h-5 w-5',
                    )}
                    aria-hidden='true'
                  />
                  <span>{tab.label}</span>
                </div>
              )
            })}
          </div>

          {activeTab === 'chart' && (
            <>
              {t('modals.forecast.desc')}

              <Input
                name='forecast-input'
                label={t('modals.forecast.input', {
                  frequency: activeTB,
                })}
                value={period}
                placeholder={DEFAULT_PERIOD}
                className='mt-4'
                onChange={handleInput}
                error={error}
              />
            </>
          )}

          {activeTab === 'details' && t('modals.forecast.detailsDesc')}
        </div>
      }
      title={t('modals.forecast.title')}
      isOpened={isOpened}
    />
  )
}

export default Forecast
