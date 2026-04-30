import { FolderSimpleIcon, FolderPlusIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

import Button from '~/ui/Button'
import { Text } from '~/ui/Text'

interface NoProjectsProps {
  onClick: () => void
  search: string
}

export const NoProjects = ({ onClick, search }: NoProjectsProps) => {
  const { t } = useTranslation('common')

  if (search) {
    return (
      <div className='mt-5 flex flex-col py-6 sm:px-6 lg:px-8'>
        <div className='mx-auto w-full max-w-6xl'>
          <Text as='h3' size='xl' className='mb-8 text-center leading-snug'>
            {t('dashboard.noProjectsForCriteria')}
          </Text>
        </div>
      </div>
    )
  }

  return (
    <div className='mx-auto w-full max-w-2xl py-16 text-center'>
      <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-900'>
        <FolderSimpleIcon className='size-7 text-gray-700 dark:text-gray-200' />
      </div>
      <Text as='h3' size='xl' weight='medium' className='tracking-tight'>
        {t('dashboard.noProjects')}
      </Text>
      <Text
        as='p'
        size='sm'
        colour='secondary'
        className='mx-auto mt-2 max-w-md'
      >
        {t('dashboard.createProject')}
      </Text>
      <div className='mt-6'>
        <Button size='lg' onClick={onClick}>
          <FolderPlusIcon className='mr-2 size-5' />
          {t('dashboard.newProject')}
        </Button>
      </div>
    </div>
  )
}
