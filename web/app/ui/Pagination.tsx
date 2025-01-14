import React, { memo } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import _map from 'lodash/map'
import cx from 'clsx'
import { Trans, useTranslation } from 'react-i18next'
import { usePagination, DOTS } from '~/hooks/usePagination'
import Select from './Select'

interface PaginationProps {
  page: number
  setPage: (item: number) => void
  pageAmount: number
  total: number
  className?: string
  pageSize?: number
  pageSizeOptions?: number[]
  onPageSizeChange?: (size: number) => void
}

const Pagination = ({
  page,
  setPage,
  pageAmount,
  total,
  className,
  pageSize = 10,
  pageSizeOptions,
  onPageSizeChange,
}: PaginationProps) => {
  const { t } = useTranslation('common')
  const paginationRange = usePagination(total, page, 1, pageSize)

  const processedPageSizeOptions = _map(pageSizeOptions, (option) => option.toString())

  const start = (page - 1) * pageSize + 1
  const end = Math.min(start + pageSize - 1, total)

  return (
    <div
      className={cx('flex items-center justify-between border-t border-gray-200 py-3 dark:border-gray-700', className)}
    >
      <div className='flex flex-1 justify-between sm:hidden'>
        <button
          type='button'
          onClick={() => {
            if (page === 1) {
              return
            }

            setPage(page - 1)
          }}
          disabled={page === 1}
          className={cx(
            'relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-200',
            {
              'cursor-not-allowed': page === 1,
              'hover:bg-gray-100 dark:hover:bg-slate-700': page !== 1,
            },
          )}
        >
          {t('project.prev')}
        </button>
        <button
          type='button'
          onClick={() => {
            if (page === pageAmount) {
              return
            }

            setPage(page + 1)
          }}
          disabled={page === pageAmount}
          className={cx(
            'relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-200',
            {
              'cursor-not-allowed': page === pageAmount,
              'hover:bg-gray-100 dark:hover:bg-slate-700': page !== pageAmount,
            },
          )}
        >
          {t('project.next')}
        </button>
      </div>
      <div className='hidden w-full sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-y-4'>
        <p className='text-sm text-gray-700 dark:text-gray-200'>
          <Trans t={t} i18nKey='common.pagination' values={{ start, end, total }}>
            <span className='font-medium' />
          </Trans>
        </p>
        <div className='flex items-center gap-4'>
          {pageSizeOptions && onPageSizeChange && (
            <Select<string>
              label={t('common.resultsPerPage')}
              title={pageSize.toString()}
              items={processedPageSizeOptions}
              onSelect={(item) => onPageSizeChange(Number(item))}
              labelClassName='!overflow-visible'
            />
          )}
          <nav className='isolate inline-flex -space-x-px rounded-md shadow-sm' aria-label='Pagination'>
            <button
              type='button'
              onClick={() => {
                if (page === 1) {
                  return
                }

                setPage(page - 1)
              }}
              disabled={page === 1}
              className={cx(
                'relative inline-flex items-center rounded-l-md border border-gray-300 px-2 py-2 text-gray-400 focus:z-20 dark:border-gray-800',
                {
                  'cursor-not-allowed': page === 1,
                  'hover:bg-gray-100 dark:hover:bg-slate-700': page !== 1,
                },
              )}
            >
              <span className='sr-only'>{t('project.prev')}</span>
              <ChevronLeftIcon className='h-5 w-5' aria-hidden='true' />
            </button>
            {_map(paginationRange, (item, index) => {
              if (item === DOTS) {
                return (
                  <button
                    type='button'
                    key={item + index}
                    onClick={() => {
                      const lastShownPage = paginationRange[index - 1] as number
                      const nextShownPage = paginationRange[index + 1] as number
                      const middlePage = Math.floor((lastShownPage + nextShownPage) / 2)

                      setPage(middlePage)
                    }}
                    className='relative inline-flex items-center border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-slate-700'
                  >
                    {DOTS}
                  </button>
                )
              }

              return (
                <button
                  type='button'
                  key={item}
                  onClick={() => setPage(item)}
                  className={cx(
                    'relative inline-flex items-center border border-gray-300 px-4 py-2 text-sm font-semibold focus:z-20 dark:border-gray-800',
                    {
                      'z-10 bg-slate-800 text-white dark:bg-slate-700': item === page,
                      'text-gray-900 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-700': item !== page,
                    },
                  )}
                >
                  {item}
                </button>
              )
            })}
            <button
              type='button'
              onClick={() => {
                if (page === pageAmount) {
                  return
                }

                setPage(page + 1)
              }}
              disabled={page === pageAmount}
              className={cx(
                'relative inline-flex items-center rounded-r-md border border-gray-300 px-2 py-2 text-gray-400 focus:z-20 dark:border-gray-800',
                {
                  'cursor-not-allowed': page === pageAmount,
                  'hover:bg-gray-100 dark:hover:bg-slate-700': page !== pageAmount,
                },
              )}
            >
              <span className='sr-only'>{t('project.next')}</span>
              <ChevronRightIcon className='h-5 w-5' aria-hidden='true' />
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}

export default memo(Pagination)
