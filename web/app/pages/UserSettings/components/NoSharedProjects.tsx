import React from 'react'
import type i18next from 'i18next'

const NoSharedProjects = ({ t }: { t: typeof i18next.t }): JSX.Element => (
  <div className='flex flex-col py-6 sm:px-6 lg:px-8'>
    <div className='mx-auto w-full max-w-7xl text-gray-900 dark:text-gray-50'>
      <h2 className='mb-4 text-center text-2xl leading-snug'>{t('profileSettings.noSharedProjects')}</h2>
    </div>
  </div>
)

export default NoSharedProjects
