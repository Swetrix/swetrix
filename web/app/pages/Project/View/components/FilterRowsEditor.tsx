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

import { getDimensionValues } from '~/api/v2/endpoints'
import { V2Filter, V2FilterOperator } from '~/api/v2/types'
import { KEYED_DIMENSIONS, VALID_DIMENSIONS_BY_TYPE } from '~/lib/v2Dimensions'
import { useOptionalCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import FilterValueInput, {
  filterCategoryIcons,
  createVersionValue,
  parseVersionValue,
} from '~/ui/FilterValueInput'
import { Text } from '~/ui/Text'
import { filterToUrlValue } from '~/utils/analyticsUrl'
import countries from '~/utils/isoCountries'

import { cn } from '~/utils/generic'

interface FilterRow {
  id: string
  column: string
  operator: V2FilterOperator
  value: string
}

interface FilterRowsEditorProps {
  active: boolean
  tnMapping: Record<string, string>
  initialFilters?: V2Filter[]
  currentFilters?: V2Filter[]
  type: 'traffic' | 'errors'
  filterOptions?: string[]
  onChange: (filters: V2Filter[]) => void
  resetKey?: string
  prefetchOnOpen?: boolean
  showCurrentFilters?: boolean
  // Explicit project id for use outside CurrentProjectProvider (e.g. Settings).
  // Falls back to the surrounding provider's project when omitted.
  projectId?: string
}

const EMPTY_FILTERS: V2Filter[] = []

const OPERATORS: { value: V2FilterOperator; labelKey: string }[] = [
  { value: 'is', labelKey: 'common.is' },
  { value: 'is_not', labelKey: 'common.isNot' },
  { value: 'contains', labelKey: 'project.contains.is' },
  { value: 'contains_not', labelKey: 'project.contains.not' },
]

const parseRowColumn = (
  column: string,
): { dimension: string; key?: string } => {
  for (const dimension of KEYED_DIMENSIONS) {
    if (column.startsWith(`${dimension}:`)) {
      return { dimension, key: column.substring(dimension.length + 1) }
    }
  }

  return { dimension: column }
}

const getMetadataColumnBase = (column: string) =>
  parseRowColumn(column).dimension

const isKeyedColumn = (column: string) =>
  (KEYED_DIMENSIONS as readonly string[]).includes(
    getMetadataColumnBase(column),
  )

const getOperatorsForColumn = (column: string) => {
  if (isKeyedColumn(column)) {
    return OPERATORS.filter(
      (operator) => operator.value === 'is' || operator.value === 'is_not',
    )
  }

  return OPERATORS
}

const normalizeFilterOperator = (
  column: string,
  operator: V2FilterOperator,
): V2FilterOperator => {
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

const filterToRowColumn = (filter: V2Filter): string =>
  filter.key ? `${filter.dimension}:${filter.key}` : filter.dimension

const filtersToRows = (filters: V2Filter[] = []): FilterRow[] => {
  const usedIndexes = new Set<number>()

  return filters.flatMap((filter, index) => {
    if (usedIndexes.has(index)) {
      return []
    }

    if (filter.dimension === 'browser' || filter.dimension === 'os') {
      const versionDimension =
        filter.dimension === 'browser' ? 'browser_version' : 'os_version'
      const versionIndex = filters.findIndex(
        (candidate, candidateIndex) =>
          candidateIndex !== index &&
          !usedIndexes.has(candidateIndex) &&
          candidate.dimension === versionDimension &&
          candidate.operator === filter.operator,
      )

      if (versionIndex !== -1) {
        usedIndexes.add(index)
        usedIndexes.add(versionIndex)

        return [
          createFilterRow({
            column: versionDimension,
            operator: filter.operator,
            value: createVersionValue(
              filterToUrlValue(filter),
              filterToUrlValue(filters[versionIndex]),
            ),
          }),
        ]
      }
    }

    usedIndexes.add(index)

    return [
      createFilterRow({
        column: filterToRowColumn(filter),
        operator: filter.operator,
        value: filterToUrlValue(filter),
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

const filterRowsToFilters = (
  filterRows: FilterRow[],
  language: string,
): V2Filter[] => {
  const validFilters: V2Filter[] = []

  filterRows
    .filter((row) => row.column && row.value)
    .forEach((row) => {
      if (row.column === 'browser_version' || row.column === 'os_version') {
        const parentDimension =
          row.column === 'browser_version' ? 'browser' : 'os'
        const parsed = parseVersionValue(row.value)
        if (parsed) {
          validFilters.push({
            dimension: parentDimension,
            operator: row.operator,
            value: parsed.parent,
          })
          validFilters.push({
            dimension: row.column,
            operator: row.operator,
            value: parsed.version,
          })
        } else {
          validFilters.push({
            dimension: row.column,
            operator: row.operator,
            value: row.value,
          })
        }
        return
      }

      let processedValue = row.value
      if (row.column === 'country') {
        const alpha2 = countries.getAlpha2Code(row.value, language)
        if (alpha2) {
          processedValue = alpha2
        }
      }

      const { dimension, key } = parseRowColumn(row.column)

      validFilters.push({
        dimension,
        operator: row.operator,
        value: processedValue === 'null' ? null : processedValue,
        ...(key ? { key } : {}),
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
  projectId,
}: FilterRowsEditorProps) => {
  const currentProject = useOptionalCurrentProject()
  const id = projectId ?? currentProject?.id ?? ''
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

  const panelOptions = useMemo(
    () =>
      filterOptions?.length
        ? filterOptions
        : VALID_DIMENSIONS_BY_TYPE[type].filter(
            (dimension) =>
              !(KEYED_DIMENSIONS as readonly string[]).includes(dimension),
          ),
    [filterOptions, type],
  )

  const filters = useMemo(
    () => filterRowsToFilters(filterRows, language),
    [filterRows, language],
  )

  const getColumnLabel = useCallback(
    (column: string) => {
      const { dimension, key } = parseRowColumn(column)

      if (key) {
        return t(
          `project.metamapping.${dimension === 'page_property' ? 'tag' : 'ev'}.dynamicKey`,
          {
            key,
          },
        )
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
      const { dimension, key } = parseRowColumn(column)

      if (key || !VALID_DIMENSIONS_BY_TYPE[type].includes(dimension)) {
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
        const { data } = await getDimensionValues(id, dimension, { type })
        const result = (data || []).map((item) =>
          typeof item === 'string'
            ? item
            : createVersionValue(item.name, item.version),
        )
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
    [id, type, filterValuesCache, loadingColumns],
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
            {currentFilters.map((filter) => {
              const { dimension, operator } = filter
              const value = filterToUrlValue(filter)

              let displayFilter = value
              if (dimension === 'country') {
                displayFilter = countries.getName(value, language) || value
              }
              const operatorLabel =
                operator === 'contains'
                  ? t('project.contains.is')
                  : operator === 'contains_not'
                    ? t('project.contains.not')
                    : operator === 'is_not'
                      ? t('common.isNot')
                      : t('common.is')

              return (
                <span
                  key={`${filterToRowColumn(filter)}-${value}-${operator}`}
                  className='inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-slate-700 dark:text-gray-300'
                >
                  <span className='text-gray-500 dark:text-gray-400'>
                    {getColumnLabel(filterToRowColumn(filter))}
                  </span>
                  <span
                    className={cx({
                      'text-green-600 dark:text-green-400': operator === 'is',
                      'text-red-600 dark:text-red-400': operator === 'is_not',
                      'text-yellow-600 dark:text-yellow-400':
                        operator === 'contains',
                      'text-orange-600 dark:text-orange-400':
                        operator === 'contains_not',
                    })}
                  >
                    {operatorLabel}
                  </span>
                  <span className='font-semibold'>{displayFilter}</span>
                </span>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default FilterRowsEditor
