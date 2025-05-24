import _isEmpty from 'lodash/isEmpty'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Filter } from '../interfaces/traffic'
import { typeNameMapping } from '../ViewProject.helpers'

import Filters from './Filters'

interface NoEventsProps {
  filters: Filter[]
}

const NoEvents = ({ filters }: NoEventsProps) => {
  const { t } = useTranslation('common')
  const tnMapping = typeNameMapping(t)

  if (_isEmpty(filters)) {
    return (
      <div className='mt-5 flex flex-col py-6 sm:px-6 lg:px-8'>
        <div className='mx-auto w-full max-w-7xl text-gray-900 dark:text-gray-50'>
          <h2 className='my-3 text-center text-4xl leading-tight font-semibold'>{t('project.noEvTitle')}</h2>
          <h3 className='mb-8 text-center text-2xl leading-snug'>{t('project.noEvContent')}</h3>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className='mt-4'>
        <Filters tnMapping={tnMapping} />
      </div>
      <div className='mt-5 flex flex-col py-6 sm:px-6 lg:px-8'>
        <div className='mx-auto w-full max-w-7xl text-gray-900 dark:text-gray-50'>
          <h2 className='my-3 text-center text-4xl leading-tight font-semibold'>{t('project.noEvTitle')}</h2>
          <h3 className='mb-8 text-center text-2xl leading-snug'>{t('project.noEventsFiltersDesc')}</h3>
        </div>
      </div>
    </>
  )
}

export default memo(NoEvents)
