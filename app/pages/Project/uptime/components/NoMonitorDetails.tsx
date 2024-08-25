import React from 'react'
import { useTranslation } from 'react-i18next'

const NoMonitorEvents = () => {
  const { t } = useTranslation('common')

  return (
    <div className='mt-5 flex flex-col py-6 sm:px-6 lg:px-8'>
      <div className='mx-auto w-full max-w-7xl text-gray-900 dark:text-gray-50'>
        <h2 className='my-3 text-center text-4xl leading-tight'>{t('monitor.noEvents')}</h2>
        <h2 className='mb-8 text-center text-2xl leading-snug'>{t('monitor.noEventsDesc')}</h2>
      </div>
    </div>
  )
}

export default NoMonitorEvents
