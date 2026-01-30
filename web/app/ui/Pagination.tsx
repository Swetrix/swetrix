import cx from 'clsx'
import _map from 'lodash/map'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { memo } from 'react'
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

  const processedPageSizeOptions = _map(pageSizeOptions, (option) =>
    option.toString(),
  )

  const start = (page - 1) * pageSize + 1
  const end = Math.min(start + pageSize - 1, total)

  return (
    <div
      className={cx(
        'flex items-center justify-between border-t border-gray-200 py-3 dark:border-slate-700/80',
        className,
      )}
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
            'relative inline-flex items-center rounded-md border-0 bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 ring-inset dark:bg-slate-900 dark:text-gray-50 dark:ring-slate-700/80',
            {
              'cursor-not-allowed opacity-50': page === 1,
              'hover:bg-gray-50 dark:hover:bg-slate-800': page !== 1,
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
            'relative ml-3 inline-flex items-center rounded-md border-0 bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 ring-inset dark:bg-slate-900 dark:text-gray-50 dark:ring-slate-700/80',
            {
              'cursor-not-allowed opacity-50': page === pageAmount,
              'hover:bg-gray-50 dark:hover:bg-slate-800': page !== pageAmount,
            },
          )}
        >
          {t('project.next')}
        </button>
      </div>
      <div className='hidden w-full sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-y-4'>
        <p className='text-sm text-gray-700 dark:text-gray-200'>
          <Trans
            t={t}
            i18nKey='common.pagination'
            values={{ start, end, total }}
          >
            <span className='font-medium' />
          </Trans>
        </p>
        <div className='flex items-center gap-4'>
          {pageSizeOptions && onPageSizeChange ? (
            <div className='flex items-center gap-2'>
              <span className='text-sm text-gray-700 dark:text-gray-200'>
                {t('common.resultsPerPage')}
              </span>
              <Select<string>
                label={t('common.resultsPerPage')}
                fieldLabelClassName='sr-only'
                title={pageSize.toString()}
                items={processedPageSizeOptions}
                onSelect={(item) => onPageSizeChange(Number(item))}
                labelClassName='!overflow-visible'
                selectedItem={pageSize.toString()}
              />
            </div>
          ) : null}
          <nav
            className='isolate inline-flex -space-x-px rounded-md'
            aria-label='Pagination'
          >
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
                'relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-gray-400 focus:z-20 dark:border-slate-700/80 dark:bg-slate-900 dark:text-gray-500',
                {
                  'cursor-not-allowed opacity-50': page === 1,
                  'hover:bg-gray-50 dark:hover:bg-slate-800': page !== 1,
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
                      const middlePage = Math.floor(
                        (lastShownPage + nextShownPage) / 2,
                      )

                      setPage(middlePage)
                    }}
                    className='relative inline-flex items-center border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700/80 dark:bg-slate-900 dark:text-gray-50 dark:hover:bg-slate-800'
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
                    'relative inline-flex items-center border border-gray-300 px-4 py-2 text-sm font-semibold focus:z-20 dark:border-slate-700/80',
                    {
                      'z-10 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900':
                        item === page,
                      'bg-white text-gray-900 hover:bg-gray-50 dark:bg-slate-900 dark:text-gray-50 dark:hover:bg-slate-800':
                        item !== page,
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
                'relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-gray-400 focus:z-20 dark:border-slate-700/80 dark:bg-slate-900 dark:text-gray-500',
                {
                  'cursor-not-allowed opacity-50': page === pageAmount,
                  'hover:bg-gray-50 dark:hover:bg-slate-800':
                    page !== pageAmount,
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
