import React from 'react'
import { FolderPlusIcon } from '@heroicons/react/24/outline'
import { Link } from '@remix-run/react'
import { useTranslation } from 'react-i18next'

import routes from '~/utils/routes'

interface NoProjectsProps {
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

export const NoProjects = ({ onClick }: NoProjectsProps) => {
  const { t } = useTranslation('common')

  return (
    <Link
      to={routes.new_project}
      onClick={onClick}
      className='relative mx-auto block max-w-lg rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
    >
      <FolderPlusIcon className='mx-auto h-12 w-12 text-gray-400 dark:text-gray-200' />
      <span className='mt-2 block text-sm font-semibold text-gray-900 dark:text-gray-50'>
        {t('dashboard.createProject')}
      </span>
    </Link>
  )
}
