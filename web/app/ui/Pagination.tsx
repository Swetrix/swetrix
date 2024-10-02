import React, { memo } from 'react'
import { ArrowLongLeftIcon, ArrowLongRightIcon } from '@heroicons/react/24/solid'
import _map from 'lodash/map'
import cx from 'clsx'
import { useTranslation } from 'react-i18next'
import { usePagination, DOTS } from 'hooks/usePagination'

interface IPagination {
  page: number
  setPage: (item: number) => void
  pageAmount: number
  total: number
  className?: string
}

const Pagination = ({ page, setPage, pageAmount, total, className }: IPagination): JSX.Element => {
  const { t } = useTranslation('common')
  const paginationRange = usePagination(total, page)

  return (
    <nav className={cx('flex items-center justify-between border-t-0 border-gray-200 px-4 sm:px-0', className)}>
      <div className='group -mt-px flex w-0 flex-1'>
        {page > 1 && (
          <button
            type='button'
            onClick={() => setPage(page - 1)}
            className='inline-flex items-center pr-1 pt-4 text-sm font-medium text-gray-500 group-hover:text-gray-700 dark:text-gray-300 dark:group-hover:text-gray-400'
          >
            <ArrowLongLeftIcon
              className='mr-3 h-5 w-5 text-gray-500 transition-none group-hover:text-gray-700 dark:text-gray-300 dark:group-hover:text-gray-400'
              aria-hidden='true'
            />
            {t('project.prev')}
          </button>
        )}
      </div>
      <div className='hidden md:-mt-px md:flex'>
        {_map(paginationRange, (item, index) => {
          if (item === DOTS) {
            return (
              <span
                className='inline-flex items-center border-t-2 border-transparent px-4 pt-4 text-sm font-medium text-gray-500 dark:text-gray-300'
                key={item + index}
              >
                {DOTS}
              </span>
            )
          }

          return (
            <button
              key={item}
              type='button'
              onClick={() => setPage(item)}
              className={cx({
                'inline-flex items-center border-t-2 border-slate-900 px-4 pt-4 text-sm font-medium text-slate-900 dark:border-gray-50 dark:text-gray-50':
                  item === page,
                'inline-flex items-center border-t-2 border-transparent px-4 pt-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-400':
                  item !== page,
              })}
            >
              {item}
            </button>
          )
        })}
      </div>
      <div className='group -mt-px flex w-0 flex-1 justify-end'>
        {page !== pageAmount && (
          <button
            type='button'
            onClick={() => setPage(page + 1)}
            className='inline-flex items-center pl-1 pt-4 text-sm font-medium text-gray-500 group-hover:text-gray-700 dark:text-gray-300 dark:group-hover:text-gray-400'
          >
            {t('project.next')}
            <ArrowLongRightIcon
              className='ml-3 h-5 w-5 text-gray-500 transition-none group-hover:text-gray-700 dark:text-gray-300 dark:group-hover:text-gray-400'
              aria-hidden='true'
            />
          </button>
        )}
      </div>
    </nav>
  )
}

export default memo(Pagination)
