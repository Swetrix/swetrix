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
    <div className='flex flex-col py-6 sm:px-6 lg:px-8 mt-5'>
      <div className='max-w-7xl w-full mx-auto text-gray-900 dark:text-gray-50'>
        <h2 className='text-4xl text-center leading-tight my-3'>{t('project.noEvTitle')}</h2>
        <h2 className='text-2xl mb-8 text-center leading-snug'>{t('project.noEvContent')}</h2>
        {!_isEmpty(filters) && (
          <div className='!flex !mx-auto'>
            <Button onClick={resetFilters} className='!flex !mx-auto' primary giant>
              {t('project.resetFilters')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(NoEvents)
