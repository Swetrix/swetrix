import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import _isNaN from 'lodash/isNaN'

import Modal from 'ui/Modal'
import Input from 'ui/Input'
import { FORECAST_MAX_MAPPING } from 'redux/constants'
import _toString from 'lodash/toString'

const DEFAULT_PERIOD = '3'

interface IForecast {
  onClose: () => void
  onSubmit: (period: string) => void
  isOpened: boolean
  activeTB: string
  tb: string
}

const Forecast = ({ onClose, onSubmit, isOpened, activeTB, tb }: IForecast): JSX.Element => {
  const { t } = useTranslation('common')
  const [period, setPeriod] = useState<string>(DEFAULT_PERIOD)
  const [error, setError] = useState<string | null>(null)

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target

    setPeriod(value)
    setError(null)
  }

  const _onSubmit = () => {
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

    onSubmit(_toString(processedPeriod))
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
        </div>
      }
      title={t('modals.forecast.title')}
      isOpened={isOpened}
    />
  )
}

export default Forecast
