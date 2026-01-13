import { FolderPlusIcon } from '@heroicons/react/24/outline'
import cx from 'clsx'
import React from 'react'
import { useTranslation } from 'react-i18next'

interface AddProjectProps {
  onClick: () => void
  sitesCount: number
  viewMode: 'grid' | 'list'
}

export const AddProject = ({
  onClick,
  sitesCount,
  viewMode,
}: AddProjectProps) => {
  const { t } = useTranslation('common')

  return (
    <button
      type='button'
      onClick={onClick}
      className={cx(
        'group cursor-pointer border-2 border-dashed border-gray-300 hover:border-gray-400',
        viewMode === 'list'
          ? 'flex h-[72px] items-center justify-center rounded-lg'
          : cx(
              'flex h-auto min-h-[153.1px] items-center justify-center rounded-lg',
              {
                'lg:min-h-auto': sitesCount % 3 !== 0,
              },
            ),
      )}
    >
      <div className={cx(viewMode === 'list' && 'flex items-center')}>
        <FolderPlusIcon
          className={cx(
            'h-12 w-12 text-gray-400 group-hover:text-gray-500 dark:text-gray-200 group-hover:dark:text-gray-400',
            viewMode === 'list' ? 'mr-2' : 'mx-auto',
          )}
        />
        <span className='mt-2 block text-sm font-semibold text-gray-900 dark:text-gray-50 group-hover:dark:text-gray-400'>
          {t('dashboard.newProject')}
        </span>
      </div>
    </button>
  )
}
