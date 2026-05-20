import {
  Listbox,
  Transition,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from '@headlessui/react'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import { CheckIcon, CaretUpDownIcon, TrashIcon } from '@phosphor-icons/react'
import {
  useState,
  useEffect,
  useCallback,
  Fragment,
  useMemo,
  useRef,
} from 'react'
import { useTranslation } from 'react-i18next'

import { useFiltersProxy } from '~/hooks/useAnalyticsProxy'
import {
  FILTERS_PANELS_ORDER,
  ERRORS_FILTERS_PANELS_ORDER,
} from '~/lib/constants'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import FilterValueInput, {
  filterCategoryIcons,
  createVersionValue,
  parseVersionValue,
} from '~/ui/FilterValueInput'
import { Text } from '~/ui/Text'
import countries from '~/utils/isoCountries'

import { Filter as FilterType } from '../interfaces/traffic'
import { cn } from '~/utils/generic'

type FilterOperator = 'is' | 'isNot' | 'contains' | 'notContains'

interface FilterRow {
  id: string
  column: string
  operator: FilterOperator
  value: string
}

interface FilterRowsEditorProps {
  active: boolean
  tnMapping: Record<string, string>
  initialFilters?: FilterType[]
  currentFilters?: FilterType[]
  type: 'traffic' | 'errors'
  filterOptions?: string[]
  onChange: (filters: FilterType[]) => void
  resetKey?: string
  prefetchOnOpen?: boolean
  showCurrentFilters?: boolean
}

const EMPTY_FILTERS: FilterType[] = []

const OPERATORS: { value: FilterOperator; labelKey: string }[] = [
  { value: 'is', labelKey: 'common.is' },
  { value: 'isNot', labelKey: 'common.isNot' },
  { value: 'contains', labelKey: 'project.contains.is' },
  { value: 'notContains', labelKey: 'project.contains.not' },
]

const getMetadataColumnBase = (column: string) => {
  if (column === 'ev:key' || column.startsWith('ev:key:')) return 'ev:key'
  if (column === 'tag:key' || column.startsWith('tag:key:')) return 'tag:key'
  if (column === 'ev:value') return 'ev:value'
  if (column === 'tag:value') return 'tag:value'
  return column
}

const getOperatorsForColumn = (column: string) => {
  if (column === 'ev:key' || column === 'tag:key') {
    return OPERATORS.filter(
      (operator) => operator.value === 'is' || operator.value === 'isNot',
    )
  }

  return OPERATORS
}

const normalizeFilterOperator = (
  column: string,
  operator: FilterOperator,
): FilterOperator => {
  const operatorOptions = getOperatorsForColumn(column)

  return operatorOptions.some((option) => option.value === operator)
    ? operator
    : operatorOptions[0]?.value || 'is'
}

const createFilterRow = ({
  column = '',
  operator = 'is',
  value = '',
}: Partial<Omit<FilterRow, 'id'>> = {}): FilterRow => ({
  id: crypto.randomUUID(),
  column,
  operator: normalizeFilterOperator(column, operator),
  value,
})

const createEmptyFilterRow = (): FilterRow => createFilterRow()

const operatorToFilter = (
  operator: FilterOperator,
): { isExclusive: boolean; isContains: boolean } => {
  switch (operator) {
    case 'is':
      return { isExclusive: false, isContains: false }
    case 'isNot':
      return { isExclusive: true, isContains: false }
    case 'contains':
      return { isExclusive: false, isContains: true }
    case 'notContains':
      return { isExclusive: true, isContains: true }
  }
}

const filterToOperator = ({
  isExclusive,
  isContains,
}: FilterType): FilterOperator => {
  if (isContains && isExclusive) return 'notContains'
  if (isContains) return 'contains'
  if (isExclusive) return 'isNot'
  return 'is'
}

const filtersToRows = (filters: FilterType[] = []): FilterRow[] => {
  const usedIndexes = new Set<number>()

  return filters.flatMap((filter, index) => {
    if (usedIndexes.has(index)) {
      return []
    }

    if (filter.column === 'br' || filter.column === 'os') {
      const versionColumn = filter.column === 'br' ? 'brv' : 'osv'
      const operator = filterToOperator(filter)
      const versionIndex = filters.findIndex(
        (candidate, candidateIndex) =>
          candidateIndex !== index &&
          !usedIndexes.has(candidateIndex) &&
          candidate.column === versionColumn &&
          filterToOperator(candidate) === operator,
      )

      if (versionIndex !== -1) {
        usedIndexes.add(index)
        usedIndexes.add(versionIndex)

        return [
          createFilterRow({
            column: versionColumn,
            operator,
            value: createVersionValue(
              filter.filter,
              filters[versionIndex].filter,
            ),
          }),
        ]
      }
    }

    usedIndexes.add(index)

    return [
      createFilterRow({
        column: filter.column,
        operator: filterToOperator(filter),
        value: filter.filter,
      }),
    ]
  })
}

const InlineButton = ({
  text,
  onClick,
  className,
}: {
  text: string
  onClick: () => void
  className?: string
}) => (
  <button
    type='button'
    onClick={onClick}
    className={cn(
      'text-sm font-medium text-indigo-600 underline decoration-dashed transition-colors hover:decoration-solid dark:text-indigo-400',
      className,
    )}
  >
    {text}
  </button>
)

const filterRowsToFilters = (filterRows: FilterRow[], language: string) => {
  const validFilters: FilterType[] = []

  filterRows
    .filter((row) => row.column && row.value)
    .forEach((row) => {
      const { isExclusive, isContains } = operatorToFilter(row.operator)

      if (row.column === 'brv') {
        const parsed = parseVersionValue(row.value)
        if (parsed) {
          validFilters.push({
            column: 'br',
            filter: parsed.parent,
            isExclusive,
            isContains,
          })
          validFilters.push({
            column: 'brv',
            filter: parsed.version,
            isExclusive,
            isContains,
          })
        } else {
          validFilters.push({
            column: 'brv',
            filter: row.value,
            isExclusive,
            isContains,
          })
        }
        return
      }

      if (row.column === 'osv') {
        const parsed = parseVersionValue(row.value)
        if (parsed) {
          validFilters.push({
            column: 'os',
            filter: parsed.parent,
            isExclusive,
            isContains,
          })
          validFilters.push({
            column: 'osv',
            filter: parsed.version,
            isExclusive,
            isContains,
          })
        } else {
          validFilters.push({
            column: 'osv',
            filter: row.value,
            isExclusive,
            isContains,
          })
        }
        return
      }

      let processedValue = row.value
      if (row.column === 'cc') {
        const alpha2 = countries.getAlpha2Code(row.value, language)
        if (alpha2) {
          processedValue = alpha2
        }
      }

      validFilters.push({
        column: row.column,
        filter: processedValue,
        isExclusive,
        isContains,
      })
    })

  return validFilters
}

const FilterRowsEditor = ({
  active,
  tnMapping,
  initialFilters = EMPTY_FILTERS,
  currentFilters = EMPTY_FILTERS,
  type,
  filterOptions,
  onChange,
  resetKey,
  prefetchOnOpen,
  showCurrentFilters,
}: FilterRowsEditorProps) => {
  const { id } = useCurrentProject()
  const { theme } = useTheme()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const [filterRows, setFilterRows] = useState<FilterRow[]>([])
  const [filterValuesCache, setFilterValuesCache] = useState<
    Record<string, string[]>
  >({})
  const [loadingColumns, setLoadingColumns] = useState<Set<string>>(new Set())
  const inFlightRef = useRef<Set<string>>(new Set())
  const { fetchFilters, fetchErrorsFilters, fetchVersionFilters } =
    useFiltersProxy()

  const panelOptions = filterOptions?.length
    ? filterOptions
    : type === 'traffic'
      ? FILTERS_PANELS_ORDER
      : ERRORS_FILTERS_PANELS_ORDER

  const filters = useMemo(
    () => filterRowsToFilters(filterRows, language),
    [filterRows, language],
  )

  const getColumnLabel = useCallback(
    (column: string) => {
      if (column.startsWith('ev:key:')) {
        return t('project.metamapping.ev.dynamicKey', {
          key: column.replace(/^ev:key:/, ''),
        })
      }

      if (column.startsWith('tag:key:')) {
        return t('project.metamapping.tag.dynamicKey', {
          key: column.replace(/^tag:key:/, ''),
        })
      }

      return tnMapping[column] || t(`project.mapping.${column}`)
    },
    [t, tnMapping],
  )

  const getColumnIcon = useCallback((column: string) => {
    const baseColumn = getMetadataColumnBase(column)
    return filterCategoryIcons[column] || filterCategoryIcons[baseColumn]
  }, [])

  useEffect(() => {
    if (!active) {
      return
    }

    onChange(filters)
  }, [active, filters, onChange])

  const fetchFilterValues = useCallback(
    async (column: string) => {
      if (getMetadataColumnBase(column) !== column || column.includes(':')) {
        setFilterValuesCache((prev) =>
          prev[column] ? prev : { ...prev, [column]: [] },
        )
        return
      }

      if (
        filterValuesCache[column] ||
        loadingColumns.has(column) ||
        inFlightRef.current.has(column)
      ) {
        return
      }

      inFlightRef.current.add(column)
      setLoadingColumns((prev) => new Set(prev).add(column))
      try {
        let result: string[] = []

        if (column === 'brv') {
          const dataType = type === 'errors' ? 'errors' : 'traffic'
          const pairs = await fetchVersionFilters(id, dataType, 'br')
          if (pairs) {
            result = pairs.map((p) => createVersionValue(p.name, p.version))
          }
        } else if (column === 'osv') {
          const dataType = type === 'errors' ? 'errors' : 'traffic'
          const pairs = await fetchVersionFilters(id, dataType, 'os')
          if (pairs) {
            result = pairs.map((p) => createVersionValue(p.name, p.version))
          }
        } else if (type === 'errors') {
          result = (await fetchErrorsFilters(id, column)) || []
        } else {
          result = (await fetchFilters(id, column)) || []
        }
        setFilterValuesCache((prev) => ({ ...prev, [column]: result }))
      } catch (error) {
        console.error('Failed to fetch filter values:', error)
        setFilterValuesCache((prev) => ({ ...prev, [column]: [] }))
      } finally {
        inFlightRef.current.delete(column)
        setLoadingColumns((prev) => {
          const next = new Set(prev)
          next.delete(column)
          return next
        })
      }
    },
    [
      id,
      type,
      filterValuesCache,
      loadingColumns,
      fetchFilters,
      fetchErrorsFilters,
      fetchVersionFilters,
    ],
  )

  useEffect(() => {
    const inFlight = inFlightRef.current

    return () => {
      inFlight.clear()
    }
  }, [])

  useEffect(() => {
    if (!active) {
      return
    }

    const nextRows = filtersToRows(initialFilters).map((row) => ({
      ...row,
      operator: normalizeFilterOperator(row.column, row.operator),
    }))
    setFilterRows(nextRows.length ? nextRows : [createEmptyFilterRow()])
  }, [active, initialFilters, resetKey])

  useEffect(() => {
    if (!active || !prefetchOnOpen) {
      return
    }

    panelOptions.forEach((column) => {
      if (!filterValuesCache[column] && !inFlightRef.current.has(column)) {
        fetchFilterValues(column)
      }
    })
  }, [
    active,
    prefetchOnOpen,
    panelOptions,
    fetchFilterValues,
    filterValuesCache,
  ])

  const addFilterRow = () => {
    setFilterRows((prev) => [...prev, createEmptyFilterRow()])
  }

  const removeFilterRow = (rowId: string) => {
    setFilterRows((prev) => {
      const nextRows = prev.filter((row) => row.id !== rowId)
      return nextRows.length ? nextRows : [createEmptyFilterRow()]
    })
  }

  const updateFilterRow = (
    rowId: string,
    field: keyof FilterRow,
    fieldValue: string,
  ) => {
    setFilterRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row

        if (field === 'column') {
          if (
            fieldValue &&
            !filterValuesCache[fieldValue] &&
            !loadingColumns.has(fieldValue)
          ) {
            fetchFilterValues(fieldValue)
          }
          const operator = normalizeFilterOperator(fieldValue, row.operator)

          return { ...row, column: fieldValue, operator, value: '' }
        }

        return { ...row, [field]: fieldValue }
      }),
    )
  }

  const clearAllFilters = () => {
    setFilterRows([createEmptyFilterRow()])
  }

  const hasValidFilters = filterRows.some((row) => row.column && row.value)

  return (
    <div className='space-y-4'>
      <div className='space-y-3'>
        {filterRows.map((row) => {
          const operatorOptions = getOperatorsForColumn(row.column)

          return (
            <div
              key={row.id}
              className='grid gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,8rem)_minmax(0,1fr)_auto]'
            >
              <Listbox
                value={row.column}
                onChange={(value) => updateFilterRow(row.id, 'column', value)}
              >
                {({ open }) => (
                  <div className='relative min-w-0'>
                    <ListboxButton className='relative w-full rounded-md border border-gray-300 bg-white py-2 pr-8 pl-3 text-left text-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 focus:outline-hidden dark:border-gray-700 dark:bg-slate-900 dark:text-gray-50 dark:hover:bg-slate-800 dark:focus:ring-slate-300'>
                      <span
                        className={cx('flex items-center gap-2 truncate', {
                          'text-gray-400': !row.column,
                        })}
                      >
                        {row.column ? getColumnIcon(row.column) : null}
                        {row.column
                          ? getColumnLabel(row.column)
                          : t('project.selectColumn')}
                      </span>
                      <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
                        <CaretUpDownIcon className='h-4 w-4 text-gray-400' />
                      </span>
                    </ListboxButton>
                    <Transition
                      show={open}
                      as={Fragment}
                      enter='transition ease-in duration-100'
                      enterFrom='opacity-0'
                      enterTo='opacity-100'
                      leave='transition ease-in duration-100'
                      leaveFrom='opacity-100'
                      leaveTo='opacity-0'
                    >
                      <ListboxOptions
                        static
                        className='absolute z-50 mt-1 max-h-60 w-full min-w-[180px] overflow-auto rounded-md bg-white py-1 text-sm ring-1 ring-black/10 focus:outline-hidden dark:bg-slate-900'
                      >
                        {panelOptions.map((option) => (
                          <ListboxOption
                            key={option}
                            value={option}
                            className={({ focus }) =>
                              cx(
                                'relative cursor-pointer py-2 pr-4 pl-3 select-none',
                                {
                                  'bg-gray-100 dark:bg-slate-700': focus,
                                  'text-gray-700 dark:text-gray-50': !focus,
                                },
                              )
                            }
                          >
                            {({ selected }) => (
                              <span
                                className={cx('flex items-center gap-2', {
                                  'font-medium': selected,
                                })}
                              >
                                <span className='shrink-0 text-gray-500 dark:text-gray-400'>
                                  {getColumnIcon(option)}
                                </span>
                                <span className='truncate'>
                                  {getColumnLabel(option)}
                                </span>
                                {selected ? (
                                  <CheckIcon className='ml-auto h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400' />
                                ) : null}
                              </span>
                            )}
                          </ListboxOption>
                        ))}
                      </ListboxOptions>
                    </Transition>
                  </div>
                )}
              </Listbox>

              <Listbox
                value={row.operator}
                onChange={(value) => updateFilterRow(row.id, 'operator', value)}
              >
                {({ open }) => (
                  <div className='relative min-w-0'>
                    <ListboxButton className='relative w-full rounded-md border border-gray-300 bg-white py-2 pr-8 pl-3 text-left text-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 focus:outline-hidden dark:border-gray-700 dark:bg-slate-900 dark:text-gray-50 dark:hover:bg-slate-800 dark:focus:ring-slate-300'>
                      <span className='block truncate'>
                        {t(
                          operatorOptions.find(
                            (operator) => operator.value === row.operator,
                          )?.labelKey || '',
                        )}
                      </span>
                      <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
                        <CaretUpDownIcon className='h-4 w-4 text-gray-400' />
                      </span>
                    </ListboxButton>
                    <Transition
                      show={open}
                      as={Fragment}
                      enter='transition ease-in duration-100'
                      enterFrom='opacity-0'
                      enterTo='opacity-100'
                      leave='transition ease-in duration-100'
                      leaveFrom='opacity-100'
                      leaveTo='opacity-0'
                    >
                      <ListboxOptions
                        static
                        className='absolute z-50 mt-1 w-full overflow-auto rounded-md bg-white py-1 text-sm ring-1 ring-black/10 focus:outline-hidden dark:bg-slate-900'
                      >
                        {operatorOptions.map((operator) => (
                          <ListboxOption
                            key={operator.value}
                            value={operator.value}
                            className={({ focus }) =>
                              cx(
                                'relative cursor-pointer py-2 pr-4 pl-8 select-none',
                                {
                                  'bg-gray-100 dark:bg-slate-700': focus,
                                  'text-gray-700 dark:text-gray-50': !focus,
                                },
                              )
                            }
                          >
                            {({ selected }) => (
                              <>
                                <span
                                  className={cx('block truncate', {
                                    'font-medium': selected,
                                  })}
                                >
                                  {t(operator.labelKey)}
                                </span>
                                {selected ? (
                                  <span className='absolute inset-y-0 left-0 flex items-center pl-2 text-indigo-600 dark:text-indigo-400'>
                                    <CheckIcon className='h-4 w-4' />
                                  </span>
                                ) : null}
                              </>
                            )}
                          </ListboxOption>
                        ))}
                      </ListboxOptions>
                    </Transition>
                  </div>
                )}
              </Listbox>

              <FilterValueInput
                items={filterValuesCache[row.column] || []}
                value={row.value}
                onChange={(value) => updateFilterRow(row.id, 'value', value)}
                placeholder={t('project.filterSearchOrType')}
                column={row.column}
                language={language}
                disabled={!row.column}
                isLoading={loadingColumns.has(row.column)}
                theme={theme}
                className='min-w-0'
              />

              <button
                type='button'
                onClick={() => removeFilterRow(row.id)}
                className='rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300'
                title={t('project.removeFilter')}
              >
                <TrashIcon className='h-5 w-5' />
              </button>
            </div>
          )
        })}
      </div>

      <div className='flex items-center justify-between'>
        <InlineButton onClick={addFilterRow} text={t('project.addFilter')} />

        {filterRows.length > 1 || hasValidFilters ? (
          <InlineButton
            onClick={clearAllFilters}
            text={t('project.clearAllFilters')}
            className='text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400'
          />
        ) : null}
      </div>

      {showCurrentFilters && !_isEmpty(currentFilters) ? (
        <div className='border-t border-gray-200 pt-4 dark:border-gray-700'>
          <Text
            as='p'
            size='xs'
            weight='medium'
            colour='muted'
            className='mb-2 uppercase'
          >
            {t('project.currentFilters')}
          </Text>
          <div className='flex flex-wrap gap-2'>
            {currentFilters.map(
              ({ column, filter, isExclusive, isContains }) => {
                let displayFilter = filter
                if (column === 'cc') {
                  displayFilter = countries.getName(filter, language) || filter
                }
                const operatorLabel = isContains
                  ? isExclusive
                    ? t('project.contains.not')
                    : t('project.contains.is')
                  : isExclusive
                    ? t('common.isNot')
                    : t('common.is')

                return (
                  <span
                    key={`${column}-${filter}-${isExclusive}-${isContains}`}
                    className='inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-slate-700 dark:text-gray-300'
                  >
                    <span className='text-gray-500 dark:text-gray-400'>
                      {getColumnLabel(column)}
                    </span>
                    <span
                      className={cx({
                        'text-green-600 dark:text-green-400':
                          !isExclusive && !isContains,
                        'text-red-600 dark:text-red-400':
                          isExclusive && !isContains,
                        'text-yellow-600 dark:text-yellow-400':
                          !isExclusive && isContains,
                        'text-orange-600 dark:text-orange-400':
                          isExclusive && isContains,
                      })}
                    >
                      {operatorLabel}
                    </span>
                    <span className='font-semibold'>{displayFilter}</span>
                  </span>
                )
              },
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default FilterRowsEditor
