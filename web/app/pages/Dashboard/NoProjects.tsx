import { FolderPlusIcon } from '@heroicons/react/24/outline'
import { FolderSimpleIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

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
      <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800'>
        <FolderSimpleIcon
          className='size-7 text-gray-700 dark:text-gray-200'
          strokeWidth={1.5}
        />
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
        <button
          type='button'
          onClick={onClick}
          className='inline-flex items-center justify-center rounded-md border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 dark:border-gray-800 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
        >
          <FolderPlusIcon className='mr-2 h-5 w-5' />
          {t('dashboard.newProject')}
        </button>
      </div>
    </div>
  )
}
