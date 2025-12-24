import { XMarkIcon } from '@heroicons/react/24/outline'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _replace from 'lodash/replace'
import _startsWith from 'lodash/startsWith'
import _truncate from 'lodash/truncate'
import { FilterIcon } from 'lucide-react'
import { memo, MouseEvent, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import { getLocaleDisplayName, cn } from '~/utils/generic'
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
  isContains?: boolean
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
  isContains,
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
    displayFilter = filter || t('common.notSet')
  }

  if (column === 'lc') {
    displayFilter = getLocaleDisplayName(displayFilter, language)
  }

  // Normalise "null" filter values to human-friendly labels
  if ((displayFilter as unknown as string)?.toString().toLowerCase() === 'null') {
    if (column === 'ref') {
      displayFilter = t('project.directNone')
    } else if (column === 'host') {
      displayFilter = t('project.unknownHost')
    } else {
      displayFilter = t('common.notSet')
    }
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
    const paramKeyInUrl = isContains ? (isExclusive ? `^${column}` : `~${column}`) : isExclusive ? `!${column}` : column
    newSearchParams.delete(paramKeyInUrl, filter)
    return { search: newSearchParams.toString() }
  }

  const createToggleExclusivePath = () => {
    const newSearchParams = new URLSearchParams(searchParams.toString())

    const getKey = (contains: boolean, exclusive: boolean) =>
      contains ? (exclusive ? `^${column}` : `~${column}`) : exclusive ? `!${column}` : column

    const c = Boolean(isContains)
    const e = Boolean(isExclusive)

    const oldParamKey = getKey(c, e)

    let nextContains = c
    let nextExclusive = e

    if (!c && !e) {
      // is -> is not
      nextContains = false
      nextExclusive = true
    } else if (!c && e) {
      // is not -> contains
      nextContains = true
      nextExclusive = false
    } else if (c && !e) {
      // contains -> not contains
      nextContains = true
      nextExclusive = true
    } else {
      // not contains -> is
      nextContains = false
      nextExclusive = false
    }

    const newParamKey = getKey(nextContains, nextExclusive)

    newSearchParams.delete(oldParamKey, filter)
    newSearchParams.append(newParamKey, filter)

    return { search: newSearchParams.toString() }
  }

  return (
    <span
      title={truncatedFilter === displayFilter ? undefined : displayFilter}
      className={cn(
        'm-1 inline-flex items-center rounded-md bg-gray-50 py-0.5 pr-1 pl-2.5 text-sm font-medium text-gray-700 dark:bg-slate-800 dark:text-gray-200',
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
          className={cn('cursor-pointer hover:underline', {
            'cursor-wait': dataLoading,
            'text-green-600 dark:text-green-400': !isExclusive && !isContains,
            'text-red-600 dark:text-red-400': isExclusive && !isContains,
            'text-yellow-600 dark:text-yellow-400': !isExclusive && isContains,
            'text-orange-600 dark:text-orange-400': isExclusive && isContains,
          })}
          onClick={(e: MouseEvent) => {
            if (dataLoading) {
              e.preventDefault()
              return
            }
            onChangeExclusive?.(e)
          }}
          title={(() => {
            const c = Boolean(isContains)
            const e = Boolean(isExclusive)
            const nextKey =
              !c && !e
                ? 'toggleFilterToIsNot'
                : !c && e
                  ? 'toggleFilterToContains'
                  : c && !e
                    ? 'toggleFilterToNotContains'
                    : 'toggleFilterToIs'
            return t(`project.${nextKey}`, { column: displayColumn, filter: truncatedFilter })
          })()}
          aria-label={(() => {
            const c = Boolean(isContains)
            const e = Boolean(isExclusive)
            const nextKey =
              !c && !e
                ? 'toggleFilterToIsNot'
                : !c && e
                  ? 'toggleFilterToContains'
                  : c && !e
                    ? 'toggleFilterToNotContains'
                    : 'toggleFilterToIs'
            return t(`project.${nextKey}`, { column: displayColumn, filter: truncatedFilter })
          })()}
        >
          {isContains
            ? t(`project.contains.${isExclusive ? 'not' : 'is'}`)
            : t(`common.${isExclusive ? 'isNot' : 'is'}`)}
        </Link>
      ) : (
        <span>
          {isContains
            ? t(`project.contains.${isExclusive ? 'not' : 'is'}`)
            : t(`common.${isExclusive ? 'isNot' : 'is'}`)}
        </span>
      )}
      &nbsp;
      <span className='font-semibold text-gray-800 dark:text-gray-50'>{truncatedFilter}</span>
      {removable ? (
        <Link
          to={createRemoveFilterPath()}
          className={cn(
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
  className?: string
}

const Filters = ({ tnMapping, className }: FiltersProps) => {
  const { dataLoading, filters } = useViewProjectContext()
  const { t } = useTranslation('common')
  const [searchParams] = useSearchParams()

  const filterlessSearch = useMemo(() => {
    const newSearchParams = new URLSearchParams(searchParams.toString())

    const entries = Array.from(searchParams.entries())

    for (const [key] of entries) {
      let processedKey = key
      if (key.startsWith('!') || key.startsWith('~') || key.startsWith('^')) {
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
    <div
      className={cn(
        'flex items-center justify-between rounded-md border border-gray-300 bg-slate-200 p-1 dark:border-slate-800/50 dark:bg-slate-800/25',
        className,
      )}
    >
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
        className={cn({
          'cursor-wait': dataLoading,
        })}
      >
        <XMarkIcon className='box-content size-6 shrink-0 cursor-pointer rounded-md stroke-2 p-1 text-gray-800 hover:bg-slate-100 dark:text-gray-200 dark:hover:bg-slate-800/80' />
      </Link>
    </div>
  )
}

export default memo(Filters)
