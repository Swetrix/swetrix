import { SmileySadIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/ui/Text'

const NoSessionDetails = () => {
  const { t } = useTranslation('common')

  return (
    <div className='mx-auto w-full max-w-2xl py-16 text-center'>
      <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-900'>
        <SmileySadIcon className='size-7 text-gray-700 dark:text-gray-200' />
      </div>
      <Text as='h3' size='xl' weight='medium' className='tracking-tight'>
        {t('project.noSessionDetails')}
      </Text>
      <Text
        as='p'
        size='sm'
        colour='secondary'
        className='mx-auto mt-2 max-w-md whitespace-pre-line'
      >
        {t('project.noSessionDesc')}
      </Text>
    </div>
  )
}

export default NoSessionDetails
