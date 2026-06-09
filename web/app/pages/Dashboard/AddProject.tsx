import { FolderPlusIcon } from '@phosphor-icons/react'
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
        'group transform-gpu cursor-pointer border-2 border-dashed border-gray-300 transition-[background-color,border-color,transform] duration-150 ease-out hover:border-gray-400 active:scale-[0.99] motion-safe:hover:-translate-y-0.5 dark:border-slate-700 dark:hover:border-slate-600',
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
            'h-12 w-12 text-gray-400 transition-[color,transform] duration-150 ease-out group-hover:scale-105 group-hover:text-gray-500 dark:text-gray-200 group-hover:dark:text-gray-300',
            viewMode === 'list' ? 'mr-2' : 'mx-auto',
          )}
        />
        <span className='mt-2 block text-sm font-semibold text-gray-900 transition-colors duration-150 ease-out dark:text-gray-50 group-hover:dark:text-gray-300'>
          {t('dashboard.newProject')}
        </span>
      </div>
    </button>
  )
}
