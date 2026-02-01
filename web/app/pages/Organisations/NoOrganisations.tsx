import { BuildingOfficeIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/ui/Text'

interface NoOrganisationsProps {
  onClick: () => void
}

export const NoOrganisations = ({ onClick }: NoOrganisationsProps) => {
  const { t } = useTranslation('common')

  return (
    <div className='mx-auto w-full max-w-2xl py-16 text-center'>
      <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800'>
        <BuildingOfficeIcon className='size-7 text-gray-700 dark:text-gray-200' />
      </div>
      <Text as='h3' size='xl' weight='medium' className='tracking-tight'>
        {t('organisations.noOrganisations')}
      </Text>
      <Text
        as='p'
        size='sm'
        colour='secondary'
        className='mx-auto mt-2 max-w-md'
      >
        {t('organisations.createOrganisation')}
      </Text>
      <button
        type='button'
        onClick={onClick}
        className='mt-6 rounded-md border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 dark:border-gray-800 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
      >
        {t('organisations.new')}
      </button>
    </div>
  )
}
