import _isEmpty from 'lodash/isEmpty'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/ui/Text'

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
      <div className='mt-5 flex min-h-[78vh] flex-col py-6 sm:px-6 lg:px-8'>
        <div className='mx-auto w-full max-w-7xl'>
          <Text as='h2' size='4xl' weight='semibold' className='my-3 text-center leading-tight'>
            {t('project.noEvTitle')}
          </Text>
          <Text as='h3' size='2xl' className='mb-8 text-center leading-snug'>
            {t('project.noEvContent')}
          </Text>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className='mt-4'>
        <Filters tnMapping={tnMapping} />
      </div>
      <div className='mt-5 flex min-h-[78vh] flex-col py-6 sm:px-6 lg:px-8'>
        <div className='mx-auto w-full max-w-7xl'>
          <Text as='h2' size='4xl' weight='semibold' className='my-3 text-center leading-tight'>
            {t('project.noEvTitle')}
          </Text>
          <Text as='h3' size='2xl' className='mb-8 text-center leading-snug'>
            {t('project.noEventsFiltersDesc')}
          </Text>
        </div>
      </div>
    </>
  )
}

export default memo(NoEvents)
