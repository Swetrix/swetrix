import { useTranslation } from 'react-i18next'
import { BuildingOfficeIcon } from '@phosphor-icons/react'

import { Text } from '~/ui/Text'

const NoOrganisations = () => {
  const { t } = useTranslation('common')

  return (
    <div className='flex flex-col items-center justify-center py-8 text-center'>
      <div className='mb-3 flex size-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-800'>
        <BuildingOfficeIcon className='size-5 text-gray-400 dark:text-slate-500' />
      </div>
      <Text as='p' size='sm' colour='secondary'>
        {t('profileSettings.noOrganisations')}
      </Text>
    </div>
  )
}

export default NoOrganisations
