import { FunnelIcon } from '@heroicons/react/24/outline'
import _isEmpty from 'lodash/isEmpty'
import { UserIcon } from '@phosphor-icons/react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import Filters from '~/pages/Project/View/components/Filters'
import { Filter } from '~/pages/Project/View/interfaces/traffic'
import { typeNameMapping } from '~/pages/Project/View/ViewProject.helpers'
import { Text } from '~/ui/Text'

interface NoProfilesProps {
  filters: Filter[]
}

const NoProfiles = ({ filters }: NoProfilesProps) => {
  const { t } = useTranslation('common')
  const tnMapping = typeNameMapping(t)
  const hasFilters = !_isEmpty(filters)

  return (
    <>
      {hasFilters ? <Filters tnMapping={tnMapping} /> : null}
      <div className='mx-auto w-full max-w-2xl py-16 text-center'>
        <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800'>
          {hasFilters ? (
            <FunnelIcon className='size-7 text-gray-700 dark:text-gray-200' />
          ) : (
            <UserIcon className='size-7 text-gray-700 dark:text-gray-200' />
          )}
        </div>
        <Text as='h3' size='xl' weight='medium' className='tracking-tight'>
          {t('project.noProfilesTitle')}
        </Text>
        <Text
          as='p'
          size='sm'
          colour='secondary'
          className='mx-auto mt-2 max-w-md'
        >
          {hasFilters
            ? t('project.noProfilesFiltersDesc')
            : t('project.noProfilesContent')}
        </Text>
      </div>
    </>
  )
}

export default memo(NoProfiles)
