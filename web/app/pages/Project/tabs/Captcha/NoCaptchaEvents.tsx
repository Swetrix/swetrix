import { FunnelIcon, CalendarIcon } from '@phosphor-icons/react'
import _isEmpty from 'lodash/isEmpty'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/ui/Text'

import Filters from '../../View/components/Filters'
import { Filter } from '../../View/interfaces/traffic'

import { captchaTypeNameMapping } from './CaptchaView'

interface NoCaptchaEventsProps {
  filters: Filter[]
}

const NoCaptchaEvents = ({ filters }: NoCaptchaEventsProps) => {
  const { t } = useTranslation('common')
  const tnMapping = captchaTypeNameMapping(t)
  const hasFilters = !_isEmpty(filters)

  return (
    <>
      {hasFilters ? <Filters tnMapping={tnMapping} /> : null}
      <div className='mx-auto w-full max-w-2xl py-16 text-center'>
        <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-900'>
          {hasFilters ? (
            <FunnelIcon className='size-7 text-gray-700 dark:text-gray-200' />
          ) : (
            <CalendarIcon className='size-7 text-gray-700 dark:text-gray-200' />
          )}
        </div>
        <Text as='h3' size='xl' weight='medium' className='tracking-tight'>
          {t('project.noEvTitle')}
        </Text>
        <Text
          as='p'
          size='sm'
          colour='secondary'
          className='mx-auto mt-2 max-w-md'
        >
          {hasFilters
            ? t('project.noEventsFiltersDesc')
            : t('project.noEvContent')}
        </Text>
      </div>
    </>
  )
}

export default memo(NoCaptchaEvents)
