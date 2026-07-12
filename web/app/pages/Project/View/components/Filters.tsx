import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _truncate from 'lodash/truncate'
import { FunnelIcon, XIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { memo, MouseEvent, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '~/ui/Link'
import { useSearchParams } from 'react-router'

import { V2Filter, V2FilterOperator } from '~/api/v2/types'
import {
  filterToUrlKey,
  filterToUrlValue,
  isFilterUrlKey,
  parseFilterKey,
} from '~/utils/analyticsUrl'
import { getLocaleDisplayName, cn } from '~/utils/generic'
import countries from '~/utils/isoCountries'

import { splitProjectViewFiltersByTab } from '../utils/projectViewSegments'
import { useViewProjectContext } from '../ViewProject'

const OPERATOR_CYCLE: Record<V2FilterOperator, V2FilterOperator> = {
  is: 'is_not',
  is_not: 'contains',
  contains: 'contains_not',
  contains_not: 'is',
}

const TOGGLE_TITLE_KEY: Record<V2FilterOperator, string> = {
  is: 'toggleFilterToIsNot',
  is_not: 'toggleFilterToContains',
  contains: 'toggleFilterToNotContains',
  contains_not: 'toggleFilterToIs',
}

const operatorLabel = (
  t: (key: string) => string,
  operator: V2FilterOperator,
) => {
  if (operator === 'contains') {
    return t('project.contains.is')
  }

  if (operator === 'contains_not') {
    return t('project.contains.not')
  }

  return t(`common.${operator === 'is_not' ? 'isNot' : 'is'}`)
}

/**
 * Returns true if a URL search param entry represents the given filter. Legacy
 * v1 keys (cc, pg, ...) parse to the same shape, so old shared links can be
 * removed / toggled too.
 */
const isFilterUrlEntry = (
  filter: V2Filter,
  rawKey: string,
  rawValue: string,
) => {
  const parsed = parseFilterKey(rawKey)

  if (
    !parsed ||
    parsed.dimension !== filter.dimension ||
    parsed.key !== filter.key ||
    parsed.operator !== filter.operator
  ) {
    return false
  }

  const normalisedValue =
    rawValue === '' || rawValue === 'null' ? null : rawValue

  return normalisedValue === (filter.value ?? null)
}

interface FilterProps {
  filter: V2Filter
  tnMapping: Record<string, string>
  canChangeExclusive?: boolean
  removable?: boolean
  onChangeExclusive?: (e: MouseEvent) => void
  onRemoveFilter?: (e: MouseEvent) => void
}

const Filter = ({
  filter,
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

  const { dimension, operator, key } = filter
  const value = Array.isArray(filter.value)
    ? filter.value.map((item) => item ?? 'null').join(', ')
    : filter.value

  let displayColumn = tnMapping[dimension] || dimension
  let displayFilter: string = value ?? 'null'

  if (dimension === 'country' && value) {
    displayFilter = countries.getName(value, language) || value
  }

  if (dimension === 'page') {
    displayFilter = value || t('common.notSet')
  }

  if (dimension === 'locale' && value) {
    displayFilter = getLocaleDisplayName(value, language)
  }

  // Normalise "null" filter values to human-friendly labels
  if (value === null || value.toLowerCase() === 'null') {
    if (dimension === 'referrer') {
      displayFilter = t('project.directNone')
    } else if (dimension === 'host') {
      displayFilter = t('project.unknownHost')
    } else {
      displayFilter = t('common.notSet')
    }
  }

  if (key) {
    displayColumn = t(
      `project.metamapping.${dimension === 'page_property' ? 'tag' : 'ev'}.dynamicKey`,
      {
        key,
      },
    )
  }

  const truncatedFilter = _truncate(displayFilter)

  const createRemoveFilterPath = () => {
    const newSearchParams = new URLSearchParams()

    for (const [rawKey, rawValue] of searchParams.entries()) {
      if (isFilterUrlEntry(filter, rawKey, rawValue)) {
        continue
      }

      newSearchParams.append(rawKey, rawValue)
    }

    return { search: newSearchParams.toString() }
  }

  const createToggleExclusivePath = () => {
    const newSearchParams = new URLSearchParams()

    for (const [rawKey, rawValue] of searchParams.entries()) {
      if (isFilterUrlEntry(filter, rawKey, rawValue)) {
        continue
      }

      newSearchParams.append(rawKey, rawValue)
    }

    const nextFilter: V2Filter = {
      ...filter,
      operator: OPERATOR_CYCLE[operator],
    }

    newSearchParams.append(
      filterToUrlKey(nextFilter),
      filterToUrlValue(nextFilter),
    )

    return { search: newSearchParams.toString() }
  }

  const toggleLabel = t(`project.${TOGGLE_TITLE_KEY[operator]}`, {
    column: displayColumn,
    filter: truncatedFilter,
  })

  return (
    <span
      title={truncatedFilter === displayFilter ? undefined : displayFilter}
      className={cn(
        'm-1 inline-flex items-center rounded-md border border-gray-200 bg-white py-0.5 pr-1 pl-2.5 text-sm font-medium text-gray-700 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-gray-200',
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
            'text-green-600 dark:text-green-400': operator === 'is',
            'text-red-600 dark:text-red-400': operator === 'is_not',
            'text-yellow-600 dark:text-yellow-400': operator === 'contains',
            'text-orange-600 dark:text-orange-400': operator === 'contains_not',
          })}
          onClick={(e: MouseEvent) => {
            if (dataLoading) {
              e.preventDefault()
              return
            }
            onChangeExclusive?.(e)
          }}
          title={toggleLabel}
          aria-label={toggleLabel}
        >
          {operatorLabel(t, operator)}
        </Link>
      ) : (
        <span>{operatorLabel(t, operator)}</span>
      )}
      &nbsp;
      <span className='font-semibold text-gray-800 dark:text-gray-50'>
        {truncatedFilter}
      </span>
      {removable ? (
        <Link
          to={createRemoveFilterPath()}
          className={cn(
            'ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:bg-gray-100 focus:text-gray-700 focus:outline-hidden dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-200 dark:focus:bg-slate-700 dark:focus:text-gray-200',
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
          <svg
            className='h-2 w-2'
            stroke='currentColor'
            fill='none'
            viewBox='0 0 8 8'
          >
            <path
              strokeLinecap='round'
              strokeWidth='1.5'
              d='M1 1l6 6m0-6L1 7'
            />
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

const getFilterKey = (filter: V2Filter) =>
  `${filterToUrlKey(filter)}-${filterToUrlValue(filter)}`

const Filters = ({ tnMapping, className }: FiltersProps) => {
  const { activeTab, dataLoading, filters } = useViewProjectContext()
  const { t } = useTranslation('common')
  const [searchParams] = useSearchParams()
  const { supported, unsupported } = useMemo(
    () => splitProjectViewFiltersByTab(filters, activeTab),
    [activeTab, filters],
  )

  const filterlessSearch = useMemo(() => {
    const newSearchParams = new URLSearchParams(searchParams.toString())

    const entries = Array.from(searchParams.entries())

    for (const [key] of entries) {
      if (!isFilterUrlKey(key)) {
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
        'flex items-center justify-between rounded-lg border border-gray-200 bg-white px-2 py-1 dark:border-slate-800/60 dark:bg-slate-900/25',
        className,
      )}
    >
      <div className='flex min-w-0 flex-1 items-center gap-1'>
        <FunnelIcon className='size-5 shrink-0 text-gray-500 dark:text-gray-400' />
        <div className='flex flex-wrap'>
          <AnimatePresence mode='popLayout' initial={false}>
            {_map(supported, (filter) => (
              <motion.span
                key={getFilterKey(filter)}
                layout
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                className='inline-flex'
              >
                <Filter
                  tnMapping={tnMapping}
                  canChangeExclusive
                  removable
                  filter={filter}
                />
              </motion.span>
            ))}
            {_map(unsupported, (filter) => (
              <motion.span
                key={`unsupported-${getFilterKey(filter)}`}
                layout
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 0.6, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                className='inline-flex'
              >
                <Filter tnMapping={tnMapping} removable filter={filter} />
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
        {unsupported.length > 0 ? (
          <span className='ml-1 shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200 ring-inset dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20'>
            {t('project.segmentUnsupportedFilters', {
              count: unsupported.length,
            })}
          </span>
        ) : null}
      </div>
      <Link
        title={t('project.resetFilters')}
        aria-label={t('project.resetFilters')}
        to={{
          search: filterlessSearch,
        }}
        className={cn('shrink-0', {
          'cursor-wait': dataLoading,
        })}
      >
        <XIcon className='size-5 cursor-pointer rounded-md p-0.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-200' />
      </Link>
    </div>
  )
}

export default memo(Filters)
