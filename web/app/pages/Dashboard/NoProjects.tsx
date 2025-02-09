import React from 'react'
import { FolderPlusIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

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
    <Link
      to={routes.new_project}
      onClick={onClick}
      className='relative mx-auto block max-w-lg rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden'
    >
      <FolderPlusIcon className='mx-auto h-12 w-12 text-gray-400 dark:text-gray-200' />
      <span className='mt-2 block text-sm font-semibold text-gray-900 dark:text-gray-50'>
        {t('dashboard.createProject')}
      </span>
    </Link>
  )
}
