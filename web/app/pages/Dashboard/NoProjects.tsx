import { FolderPlusIcon } from '@heroicons/react/24/outline'
import { FolderInputIcon } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import routes from '~/utils/routes'

import { DASHBOARD_TABS } from './Tabs'

interface NoProjectsProps {
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void
  activeTab: (typeof DASHBOARD_TABS)[number]['id']
  search: string
}

export const NoProjects = ({ onClick, activeTab, search }: NoProjectsProps) => {
  const { t } = useTranslation('common')

  if (activeTab !== 'default' || search) {
    return (
      <div className='mt-5 flex flex-col py-6 sm:px-6 lg:px-8'>
        <div className='mx-auto w-full max-w-6xl text-gray-900 dark:text-gray-50'>
          <h3 className='mb-8 text-center text-xl leading-snug'>{t('dashboard.noProjectsForCriteria')}</h3>
        </div>
      </div>
    )
  }

  return (
    <div className='mx-auto w-full max-w-2xl py-16 text-center text-gray-900 dark:text-gray-50'>
      <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800'>
        <FolderInputIcon className='size-7 text-gray-700 dark:text-gray-200' strokeWidth={1.5} />
      </div>
      <h3 className='text-xl font-medium tracking-tight'>{t('dashboard.noProjects')}</h3>
      <p className='mx-auto mt-2 max-w-md text-sm text-gray-600 dark:text-gray-300'>{t('dashboard.createProject')}</p>
      <div className='mt-6'>
        <Link
          to={routes.new_project}
          onClick={onClick}
          className='inline-flex items-center justify-center rounded-md border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 dark:border-gray-800 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
        >
          <FolderPlusIcon className='mr-2 h-5 w-5' />
          {t('dashboard.newProject')}
        </Link>
      </div>
    </div>
  )
}
