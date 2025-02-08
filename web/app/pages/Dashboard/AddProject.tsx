import React from 'react'
import { FolderPlusIcon } from '@heroicons/react/24/outline'
import { Link } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import cx from 'clsx'

import routes from '~/utils/routes'

interface AddProjectProps {
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void
  sitesCount: number
  viewMode: 'grid' | 'list'
}

export const AddProject = ({ onClick, sitesCount, viewMode }: AddProjectProps) => {
  const { t } = useTranslation('common')

  return (
    <Link
      to={routes.new_project}
      onClick={onClick}
      className={cx(
        'group cursor-pointer border-2 border-dashed border-gray-300 hover:border-gray-400',
        viewMode === 'list'
          ? 'flex h-[72px] items-center justify-center rounded-lg'
          : cx('flex h-auto min-h-[153.1px] items-center justify-center rounded-lg', {
              'lg:min-h-[auto]': sitesCount % 3 !== 0,
            }),
      )}
    >
      <div className={cx('flex items-center font-mono', viewMode === 'list' && 'gap-2')}>
        <FolderPlusIcon className='h-12 w-12 text-gray-400 group-hover:text-gray-500 dark:text-gray-200 group-hover:dark:text-gray-400' />
        <span className='mt-2 block text-sm font-semibold text-gray-900 dark:text-gray-50 group-hover:dark:text-gray-400'>
          {t('dashboard.newProject')}
        </span>
      </div>
    </Link>
  )
}
