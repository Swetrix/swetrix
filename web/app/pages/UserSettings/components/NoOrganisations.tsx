import React from 'react'
import { useTranslation } from 'react-i18next'

const NoOrganisations = () => {
  const { t } = useTranslation('common')

  return (
    <div className='flex flex-col py-6 sm:px-6 lg:px-8'>
      <div className='mx-auto w-full max-w-7xl text-gray-900 dark:text-gray-50'>
        <h2 className='mb-4 text-center text-2xl leading-snug'>{t('profileSettings.noOrganisations')}</h2>
      </div>
    </div>
  )
}

export default NoOrganisations
