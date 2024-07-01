import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import React, { memo } from 'react'
import type i18next from 'i18next'
import cx from 'clsx'
import _truncate from 'lodash/truncate'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _startsWith from 'lodash/startsWith'
import _replace from 'lodash/replace'
import { useTranslation } from 'react-i18next'

import countries from 'utils/isoCountries'
import { getLocaleDisplayName } from 'utils/generic'

interface IFilter {
  column: string
  filter: string
  isExclusive: boolean
  // eslint-disable-next-line no-shadow
  onRemoveFilter: (column: string, filter: string) => void
  // eslint-disable-next-line no-shadow
  onChangeExclusive: (column: string, filter: string, isExclusive: boolean) => void
  tnMapping: Record<string, string>
  language: string
  t: typeof i18next.t
  canChangeExclusive?: boolean
  removable?: boolean
}

/**
 * This component is used for showing the filter in panel
 * @returns {JSX.Element}
 */
export const Filter = ({
  column,
  filter,
  isExclusive,
  onRemoveFilter,
  onChangeExclusive,
  tnMapping,
  language,
  t,
  canChangeExclusive,
  removable,
}: IFilter): JSX.Element => {
  let displayColumn = tnMapping[column]
  let displayFilter = filter

  if (column === 'cc') {
    displayFilter = countries.getName(filter, language) as string
  }

  if (column === 'pg') {
    displayFilter = filter || t('project.redactedPage')
  }

  if (column === 'lc') {
    displayFilter = getLocaleDisplayName(displayFilter, language)
  }

  if (_startsWith(column, 'ev:key:')) {
    const key = _replace(column, /^ev:key:/, '')
    displayColumn = t('project.metamapping.ev.dynamicKey', {
      key,
    })
  }

  if (_startsWith(column, 'tag:key:')) {
    const key = _replace(column, /^tag:key:/, '')
    displayColumn = t('project.metamapping.tag.dynamicKey', {
      key,
    })
  }

  const truncatedFilter = _truncate(displayFilter)

  return (
    <span
      title={truncatedFilter === displayFilter ? undefined : displayFilter}
      className={cx(
        'm-1 inline-flex items-center rounded-md bg-gray-50 py-0.5 pl-2.5 pr-1 text-sm font-medium text-gray-800 dark:bg-slate-800 dark:text-gray-50',
        {
          'pr-2': !removable,
        },
      )}
    >
      {displayColumn}
      &nbsp;
      {canChangeExclusive ? (
        <span
          className='cursor-pointer border-b-2 border-dotted border-blue-400 text-blue-400'
          onClick={() => onChangeExclusive(column, filter, !isExclusive)}
        >
          {t(`common.${isExclusive ? 'isNot' : 'is'}`)}
        </span>
      ) : (
        <span>{t(`common.${isExclusive ? 'isNot' : 'is'}`)}</span>
      )}
      &nbsp; &quot;
      {truncatedFilter}
      &quot;
      {removable && (
        <button
          onClick={() => onRemoveFilter(column, filter)}
          type='button'
          className='ml-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-gray-800 hover:bg-gray-300 hover:text-gray-900 focus:bg-gray-300 focus:text-gray-900 focus:outline-none dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-300 dark:focus:bg-gray-800 dark:focus:text-gray-300 '
        >
          <span className='sr-only'>Remove filter</span>
          <svg className='h-2 w-2' stroke='currentColor' fill='none' viewBox='0 0 8 8'>
            <path strokeLinecap='round' strokeWidth='1.5' d='M1 1l6 6m0-6L1 7' />
          </svg>
        </button>
      )}
    </span>
  )
}

interface IFilters {
  filters: {
    column: string
    filter: string
    isExclusive: boolean
  }[]
  // eslint-disable-next-line no-shadow
  onRemoveFilter: (column: string, filter: string) => void
  // eslint-disable-next-line no-shadow
  onChangeExclusive: (column: string, filter: string, isExclusive: boolean) => void
  tnMapping: Record<string, string>
  resetFilters: () => void
}

const Filters = ({ filters, onRemoveFilter, onChangeExclusive, tnMapping, resetFilters }: IFilters) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  if (_isEmpty(filters)) {
    return null
  }

  return (
    <div className='flex items-center justify-between rounded-md bg-slate-200 p-1 shadow dark:border dark:border-slate-800/50 dark:bg-slate-800/25'>
      <div className=' flex items-center'>
        <FunnelIcon className='box-content size-6 flex-shrink-0 px-1 text-gray-700 dark:text-gray-200' />
        <div className='flex flex-wrap'>
          {_map(filters, (props) => {
            const { column, filter } = props
            const key = `${column}${filter}`

            return (
              <Filter
                key={key}
                onRemoveFilter={onRemoveFilter}
                onChangeExclusive={onChangeExclusive}
                language={language}
                t={t}
                tnMapping={tnMapping}
                canChangeExclusive
                removable
                {...props}
              />
            )
          })}
        </div>
      </div>
      <XMarkIcon
        className='box-content size-6 flex-shrink-0 cursor-pointer stroke-2 px-1 text-gray-800 hover:text-gray-600 dark:text-gray-200 dark:hover:text-gray-300'
        onClick={resetFilters}
      />
    </div>
  )
}

export default memo(Filters)
