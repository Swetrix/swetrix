import React, { memo } from 'react'
import type i18next from 'i18next'
import cx from 'clsx'
import _truncate from 'lodash/truncate'
import _map from 'lodash/map'
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
  const displayColumn = tnMapping[column]
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

  const truncatedFilter = _truncate(displayFilter)

  return (
    <span
      title={truncatedFilter === displayFilter ? undefined : displayFilter}
      className={cx(
        'mr-2 mt-2 inline-flex items-center rounded-md bg-gray-200 py-0.5 pl-2.5 pr-1 text-sm font-medium text-gray-800 dark:bg-slate-800 dark:text-gray-50',
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
}

const Filters = ({ filters, onRemoveFilter, onChangeExclusive, tnMapping }: IFilters) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  return (
    <div className='-mt-2 flex flex-wrap justify-center md:justify-start'>
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
  )
}

export default memo(Filters)
