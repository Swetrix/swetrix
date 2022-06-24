import React from 'react'
import { ArrowNarrowLeftIcon, ArrowNarrowRightIcon } from '@heroicons/react/solid'
import _map from 'lodash/map'
import cx from 'clsx'

const Pagination = ({ page, setPage, pageAmount }) => {
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
              Previous
            </button>
          )
        }
      </div>
      <div className='hidden md:-mt-px md:flex'>
        {
          _map(Array(pageAmount), (_, index) => {
            // if (pageAmount > 6 && Math.ceil(pageAmount / 2) + page === index && page < pageAmount - 3 && page !== pageAmount) {
            //   return (
            //     <span className='border-transparent text-gray-500 border-t-2 pt-4 px-4 inline-flex items-center text-sm font-medium' key={index}>
            //       true
            //     </span>
            //   )
            // }

            // if (pageAmount > 6 && Math.ceil(pageAmount / 2) + page === index && page < pageAmount - 3 && page !== pageAmount) {
            //   return (
            //     <span className='border-transparent text-gray-500 border-t-2 pt-4 px-4 inline-flex items-center text-sm font-medium' key={index}>
            //       false
            //     </span>
            //   )
            // }

            // if (index >= pageAmount && index < pageAmount - 3) {
            //   return (
            //     <div className='sr-only' key={index} />
            //   )
            // }

            return (
              <button
                key={index}
                type='button'
                onClick={() => setPage(index + 1)}
                className={cx({
                  'border-indigo-500 text-indigo-600 border-t-2 pt-4 px-4 inline-flex items-center text-sm font-medium': index + 1 === page,
                  'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 border-t-2 pt-4 px-4 inline-flex items-center text-sm font-medium': index + 1 !== page,
                })}
              >
                {index + 1}
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
              Next
              <ArrowNarrowRightIcon className='ml-3 h-5 w-5 text-gray-400' aria-hidden='true' />
            </button>
          )
        }
      </div>
    </nav>
  )
}

export default Pagination
