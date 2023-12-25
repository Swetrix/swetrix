import React, { memo } from 'react'
import { ArrowLongLeftIcon, ArrowLongRightIcon } from '@heroicons/react/24/solid'
import _map from 'lodash/map'
import cx from 'clsx'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
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
    <nav className={cx('border-t-0 border-gray-200 px-4 flex items-center justify-between sm:px-0', className)}>
      <div className='-mt-px w-0 flex-1 flex group'>
        {page > 1 && (
          <button
            type='button'
            onClick={() => setPage(page - 1)}
            className='pt-4 pr-1 inline-flex items-center text-sm font-medium dark:group-hover:text-gray-400 group-hover:text-gray-700 dark:text-gray-300 text-gray-500'
          >
            <ArrowLongLeftIcon
              className='mr-3 h-5 w-5 dark:group-hover:text-gray-400 group-hover:text-gray-700 dark:text-gray-300 text-gray-500 transition-none'
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
                className='border-transparent text-gray-500 dark:text-gray-300 border-t-2 pt-4 px-4 inline-flex items-center text-sm font-medium'
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
                'border-slate-900 text-slate-900 dark:text-gray-50 dark:border-gray-50 border-t-2 pt-4 px-4 inline-flex items-center text-sm font-medium':
                  item === page,
                'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-400 hover:border-gray-300 border-t-2 pt-4 px-4 inline-flex items-center text-sm font-medium':
                  item !== page,
              })}
            >
              {item}
            </button>
          )
        })}
      </div>
      <div className='-mt-px w-0 flex-1 flex justify-end group'>
        {page !== pageAmount && (
          <button
            type='button'
            onClick={() => setPage(page + 1)}
            className='pt-4 pl-1 inline-flex items-center text-sm font-medium dark:group-hover:text-gray-400 group-hover:text-gray-700 dark:text-gray-300 text-gray-500'
          >
            {t('project.next')}
            <ArrowLongRightIcon
              className='ml-3 h-5 w-5 dark:group-hover:text-gray-400 group-hover:text-gray-700 dark:text-gray-300 text-gray-500 transition-none'
              aria-hidden='true'
            />
          </button>
        )}
      </div>
    </nav>
  )
}

Pagination.propTypes = {
  page: PropTypes.number.isRequired,
  setPage: PropTypes.func.isRequired,
  pageAmount: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  className: PropTypes.string,
}

Pagination.defaultProps = {
  className: '',
}

export default memo(Pagination)
