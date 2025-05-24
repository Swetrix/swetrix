import { XMarkIcon } from '@heroicons/react/24/outline'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _replace from 'lodash/replace'
import _startsWith from 'lodash/startsWith'
import _truncate from 'lodash/truncate'
import { FilterIcon } from 'lucide-react'
import { memo, MouseEvent, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import { getLocaleDisplayName } from '~/utils/generic'
import countries from '~/utils/isoCountries'

import { isFilterValid } from '../utils/filters'
import { useViewProjectContext } from '../ViewProject'

interface FilterProps {
  column: string
  filter: string
  isExclusive: boolean
  tnMapping: Record<string, string>
  canChangeExclusive?: boolean
  removable?: boolean
  onChangeExclusive?: (e: MouseEvent) => void
  onRemoveFilter?: (e: MouseEvent) => void
}

export const Filter = ({
  column,
  filter,
  isExclusive,
  tnMapping,
  canChangeExclusive,
  removable,
  onChangeExclusive,
  onRemoveFilter,
}: FilterProps) => {
  const { dataLoading } = useViewProjectContext()
  const [searchParams] = useSearchParams()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

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

  const createRemoveFilterPath = () => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    const paramKeyInUrl = isExclusive ? `!${column}` : column
    newSearchParams.delete(paramKeyInUrl, filter)
    return { search: newSearchParams.toString() }
  }

  const createToggleExclusivePath = () => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    const oldParamKey = isExclusive ? `!${column}` : column
    const newParamKey = isExclusive ? column : `!${column}`

    newSearchParams.delete(oldParamKey, filter)
    newSearchParams.append(newParamKey, filter)

    return { search: newSearchParams.toString() }
  }

  return (
    <span
      title={truncatedFilter === displayFilter ? undefined : displayFilter}
      className={cx(
        'm-1 inline-flex items-center rounded-md bg-gray-50 py-0.5 pr-1 pl-2.5 text-sm font-medium text-gray-800 dark:bg-slate-800 dark:text-gray-50',
        {
          'pr-2': !removable,
        },
      )}
    >
      {displayColumn}
      &nbsp;
      {canChangeExclusive ? (
        <Link
          to={createToggleExclusivePath()}
          className={cx(
            'cursor-pointer border-b-2 border-dotted border-blue-400 text-blue-400 hover:border-blue-500 hover:text-blue-500',
            {
              'cursor-wait': dataLoading,
            },
          )}
          onClick={(e: MouseEvent) => {
            if (dataLoading) {
              e.preventDefault()
              return
            }
            onChangeExclusive?.(e)
          }}
          title={
            isExclusive
              ? t('project.toggleFilterToIs', { column: displayColumn, filter: truncatedFilter })
              : t('project.toggleFilterToIsNot', { column: displayColumn, filter: truncatedFilter })
          }
          aria-label={
            isExclusive
              ? t('project.toggleFilterToIs', { column: displayColumn, filter: truncatedFilter })
              : t('project.toggleFilterToIsNot', { column: displayColumn, filter: truncatedFilter })
          }
        >
          {t(`common.${isExclusive ? 'isNot' : 'is'}`)}
        </Link>
      ) : (
        <span>{t(`common.${isExclusive ? 'isNot' : 'is'}`)}</span>
      )}
      &nbsp;&quot;
      {truncatedFilter}
      &quot;
      {removable ? (
        <Link
          to={createRemoveFilterPath()}
          className={cx(
            'ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-gray-800 hover:bg-gray-300 hover:text-gray-900 focus:bg-gray-300 focus:text-gray-900 focus:outline-hidden dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-300 dark:focus:bg-gray-800 dark:focus:text-gray-300',
            {
              'cursor-wait': dataLoading,
            },
          )}
          title={t('project.removeFilter')}
          aria-label={t('project.removeFilter')}
          onClick={(e: MouseEvent) => {
            if (dataLoading) {
              e.preventDefault()
              return
            }
            onRemoveFilter?.(e)
          }}
        >
          <svg className='h-2 w-2' stroke='currentColor' fill='none' viewBox='0 0 8 8'>
            <path strokeLinecap='round' strokeWidth='1.5' d='M1 1l6 6m0-6L1 7' />
          </svg>
        </Link>
      ) : null}
    </span>
  )
}

interface FiltersProps {
  tnMapping: Record<string, string>
}

const Filters = ({ tnMapping }: FiltersProps) => {
  const { dataLoading, filters } = useViewProjectContext()
  const { t } = useTranslation('common')
  const [searchParams] = useSearchParams()

  const filterlessSearch = useMemo(() => {
    const newSearchParams = new URLSearchParams(searchParams.toString())

    const entries = Array.from(searchParams.entries())

    for (const [key] of entries) {
      let processedKey = key
      if (key.startsWith('!')) {
        processedKey = key.substring(1)
      }

      if (!isFilterValid(processedKey, true)) {
        continue
      }

      newSearchParams.delete(key)
    }

    return newSearchParams.toString()
  }, [searchParams])

  if (_isEmpty(filters)) {
    return null
  }

  return (
    <div className='flex items-center justify-between rounded-md border border-gray-300 bg-slate-200 p-1 dark:border-slate-800/50 dark:bg-slate-800/25'>
      <div className='flex items-center'>
        <FilterIcon className='box-content size-6 shrink-0 px-1 text-gray-700 dark:text-gray-200' strokeWidth={1.5} />
        <div className='flex flex-wrap'>
          {_map(filters, (props) => {
            const { column, filter } = props
            const key = `${column}${filter}`

            return <Filter key={key} tnMapping={tnMapping} canChangeExclusive removable {...props} />
          })}
        </div>
      </div>
      <Link
        title={t('project.resetFilters')}
        aria-label={t('project.resetFilters')}
        to={{
          search: filterlessSearch,
        }}
        className={cx({
          'cursor-wait': dataLoading,
        })}
      >
        <XMarkIcon className='box-content size-6 shrink-0 cursor-pointer stroke-2 px-1 text-gray-800 hover:text-gray-600 dark:text-gray-200 dark:hover:text-gray-300' />
      </Link>
    </div>
  )
}

export default memo(Filters)
