import React, { memo } from 'react'
import { useTranslation } from 'react-i18next'
import _isEmpty from 'lodash/isEmpty'

import { Filter } from '../interfaces/traffic'
import Filters from './Filters'
import { typeNameMapping } from '../ViewProject.helpers'

interface NoEventsProps {
  filters: Filter[]
  filterHandler: (column: string, filter: any) => void
  onChangeExclusive: (column: string, filter: any, isExclusive: boolean) => void
  resetActiveTabFilters: () => void
}

const NoEvents = ({ filters, filterHandler, onChangeExclusive, resetActiveTabFilters }: NoEventsProps) => {
  const { t } = useTranslation('common')
  const tnMapping = typeNameMapping(t)

  if (_isEmpty(filters)) {
    return (
      <div className='mt-5 flex flex-col py-6 sm:px-6 lg:px-8'>
        <div className='mx-auto w-full max-w-7xl text-gray-900 dark:text-gray-50'>
          <h2 className='my-3 text-center text-4xl leading-tight font-semibold'>{t('project.noEvTitle')}</h2>
          <h3 className='mb-8 text-center font-mono text-2xl leading-snug'>{t('project.noEvContent')}</h3>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className='mt-4'>
        <Filters
          onRemoveFilter={filterHandler}
          onChangeExclusive={onChangeExclusive}
          tnMapping={tnMapping}
          resetFilters={resetActiveTabFilters}
        />
      </div>
      <div className='mt-5 flex flex-col py-6 sm:px-6 lg:px-8'>
        <div className='mx-auto w-full max-w-7xl text-gray-900 dark:text-gray-50'>
          <h2 className='my-3 text-center text-4xl leading-tight font-semibold'>{t('project.noEvTitle')}</h2>
          <h3 className='mb-8 text-center font-mono text-2xl leading-snug'>{t('project.noEventsFiltersDesc')}</h3>
        </div>
      </div>
    </>
  )
}

export default memo(NoEvents)
