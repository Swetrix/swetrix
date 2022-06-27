import React, { memo } from 'react'
import { ArrowNarrowLeftIcon, ArrowNarrowRightIcon } from '@heroicons/react/solid'
import _map from 'lodash/map'
import cx from 'clsx'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { usePagination, DOTS } from 'hooks/usePagination'

const Pagination = ({
  page, setPage, pageAmount, total,
}) => {
  const { t } = useTranslation('common')
  const paginationRange = usePagination(total, page)

  return (
    <nav className='border-t border-gray-200 px-4 flex items-center justify-between sm:px-0'>
      <div className='-mt-px w-0 flex-1 flex'>
        {
          page > 1 && (
            <button
              type='button'
              onClick={() => setPage(page - 1)}
              className='border-t-2 border-transparent pt-4 pr-1 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300'
            >
              <ArrowNarrowLeftIcon className='mr-3 h-5 w-5 text-gray-400' aria-hidden='true' />
              { t('project.prev') }
            </button>
          )
        }
      </div>
      <div className='hidden md:-mt-px md:flex'>
        {
          _map(paginationRange, (item, index) => {
            if (item === DOTS) {
              return (
                <span className='border-transparent text-gray-500 border-t-2 pt-4 px-4 inline-flex items-center text-sm font-medium' key={item + index}>
                  { DOTS }
                </span>
              )
            }

            return (
              <button
                key={item}
                type='button'
                onClick={() => setPage(item)}
                className={cx({
                  'border-indigo-500 text-indigo-600 border-t-2 pt-4 px-4 inline-flex items-center text-sm font-medium': item === page,
                  'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 border-t-2 pt-4 px-4 inline-flex items-center text-sm font-medium': item !== page,
                })}
              >
                {item}
              </button>
            )
          })
        }
      </div>
      <div className='-mt-px w-0 flex-1 flex justify-end'>
        {
          page !== pageAmount && (
            <button
              type='button'
              onClick={() => setPage(page + 1)}
              className='border-t-2 border-transparent pt-4 pl-1 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300'
            >
              { t('project.next') }
              <ArrowNarrowRightIcon className='ml-3 h-5 w-5 text-gray-400' aria-hidden='true' />
            </button>
          )
        }
      </div>
    </nav>
  )
}

Pagination.propTypes = {
  page: PropTypes.number.isRequired,
  setPage: PropTypes.func.isRequired,
  pageAmount: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
}

export default memo(Pagination)
