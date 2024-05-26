import React, { memo } from 'react'
import { useTranslation } from 'react-i18next'
import _isEmpty from 'lodash/isEmpty'

import Button from 'ui/Button'

interface INoEvents {
  filters: {
    column: string
    filter: string
    isExclusive: boolean
  }[]
  resetFilters: () => void
}

const NoEvents = ({ filters, resetFilters }: INoEvents): JSX.Element => {
  const { t } = useTranslation('common')

  return (
    <div className='mt-5 flex flex-col py-6 sm:px-6 lg:px-8'>
      <div className='mx-auto w-full max-w-7xl text-gray-900 dark:text-gray-50'>
        <h2 className='my-3 text-center text-4xl leading-tight'>{t('project.noEvTitle')}</h2>
        <h2 className='mb-8 text-center text-2xl leading-snug'>{t('project.noEvContent')}</h2>
        {!_isEmpty(filters) && (
          <div className='!mx-auto !flex'>
            <Button onClick={resetFilters} className='!mx-auto !flex' primary giant>
              {t('project.resetFilters')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(NoEvents)
