import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import _isNaN from 'lodash/isNaN'

import Modal from 'ui/Modal'
import Input from 'ui/Input'
import { FORECAST_MAX_MAPPING } from 'redux/constants'

const DEFAULT_PERIOD = 3

const Forecast = ({
  onClose, onSubmit, isOpened, activeTB, tb,
}: {
  onClose: () => void,
  onSubmit: (period: number) => void,
  isOpened: boolean,
  activeTB: string,
  tb: string,
}): JSX.Element => {
  const { t }: {
    t: (key: string, options?: { [key: string]: string | number }) => string,
  } = useTranslation('common')
  const [period, setPeriod] = useState<string | number>(DEFAULT_PERIOD)
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
      setError(t('apiNotifications.forecastNumberCantBeBigger', {
        max: FORECAST_MAX_MAPPING[tb],
      }))
      return
    }

    onSubmit(processedPeriod)
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
      message={(
        <div>
          {t('modals.forecast.desc')}

          <Input
            name='forecast-input'
            id='forecast-input'
            type='text'
            label={t('modals.forecast.input', {
              frequency: activeTB,
            })}
            value={period}
            placeholder={`${DEFAULT_PERIOD}`}
            className='mt-4'
            onChange={handleInput}
            error={error}
          />
        </div>
      )}
      title={t('modals.forecast.title')}
      isOpened={isOpened}
      isBeta
    />
  )
}

Forecast.propTypes = {
  onClose: PropTypes.func.isRequired,
  isOpened: PropTypes.bool.isRequired,
  onSubmit: PropTypes.func.isRequired,
  activeTB: PropTypes.string.isRequired,
  tb: PropTypes.string.isRequired,
}

export default Forecast
