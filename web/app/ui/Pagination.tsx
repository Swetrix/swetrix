import cx from 'clsx'
import _map from 'lodash/map'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
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

const navButtonClasses =
  'inline-flex size-8 items-center justify-center rounded-md text-gray-500 transition-[background-color,color,box-shadow] duration-150 ease-out hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500 dark:text-gray-400 dark:hover:bg-slate-800/80 dark:hover:text-gray-50 dark:focus-visible:ring-slate-300'

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
        'flex items-center justify-between border-t border-gray-200 py-3 dark:border-slate-700/60',
        className,
      )}
    >
      <div className='flex flex-1 justify-between sm:hidden'>
        <button
          type='button'
          onClick={() => page > 1 && setPage(page - 1)}
          disabled={page === 1}
          className={cx(
            'inline-flex items-center rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition-colors duration-150 ease-out ring-inset',
            page === 1
              ? 'cursor-not-allowed opacity-50'
              : 'hover:bg-gray-50 dark:hover:bg-slate-900',
            'dark:bg-slate-950 dark:text-gray-50 dark:ring-slate-700/80',
          )}
        >
          {t('project.prev')}
        </button>
        <button
          type='button'
          onClick={() => page < pageAmount && setPage(page + 1)}
          disabled={page === pageAmount}
          className={cx(
            'ml-3 inline-flex items-center rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition-colors duration-150 ease-out ring-inset',
            page === pageAmount
              ? 'cursor-not-allowed opacity-50'
              : 'hover:bg-gray-50 dark:hover:bg-slate-900',
            'dark:bg-slate-950 dark:text-gray-50 dark:ring-slate-700/80',
          )}
        >
          {t('project.next')}
        </button>
      </div>
      <div className='hidden w-full sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-y-4'>
        <p className='text-sm text-gray-700 dark:text-gray-300'>
          <Trans
            t={t}
            i18nKey='common.pagination'
            values={{ start, end, total }}
          >
            <span className='font-medium text-gray-900 tabular-nums dark:text-gray-100' />
          </Trans>
        </p>
        <div className='flex items-center gap-4'>
          {pageSizeOptions && onPageSizeChange ? (
            <div className='flex items-center gap-2'>
              <span className='text-sm text-gray-700 dark:text-gray-300'>
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
            className='inline-flex items-center gap-0.5'
            aria-label='Pagination'
          >
            <button
              type='button'
              onClick={() => page > 1 && setPage(page - 1)}
              disabled={page === 1}
              className={navButtonClasses}
              aria-label={t('project.prev')}
            >
              <CaretLeftIcon
                className='size-4'
                weight='bold'
                aria-hidden='true'
              />
            </button>
            {_map(paginationRange, (item, index) => {
              if (item === DOTS) {
                return (
                  <button
                    type='button'
                    key={`dots-${index}`}
                    onClick={() => {
                      const lastShownPage = paginationRange[index - 1] as number
                      const nextShownPage = paginationRange[index + 1] as number
                      const middlePage = Math.floor(
                        (lastShownPage + nextShownPage) / 2,
                      )

                      setPage(middlePage)
                    }}
                    className={cx(navButtonClasses, 'tabular-nums')}
                    aria-label={`Jump to page ${Math.floor(((paginationRange[index - 1] as number) + (paginationRange[index + 1] as number)) / 2)}`}
                  >
                    {DOTS}
                  </button>
                )
              }

              const isActive = item === page

              return (
                <button
                  type='button'
                  key={item}
                  onClick={() => setPage(item)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={`Page ${item}`}
                  className={cx(
                    'inline-flex size-8 items-center justify-center rounded-md text-sm font-medium tabular-nums transition-[background-color,color,box-shadow] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden dark:focus-visible:ring-slate-300',
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-800/80 dark:hover:text-gray-50',
                  )}
                >
                  {item}
                </button>
              )
            })}
            <button
              type='button'
              onClick={() => page < pageAmount && setPage(page + 1)}
              disabled={page === pageAmount}
              className={navButtonClasses}
              aria-label={t('project.next')}
            >
              <CaretRightIcon
                className='size-4'
                weight='bold'
                aria-hidden='true'
              />
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}

export default memo(Pagination)
