import { Listbox, Transition, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import { CheckIcon, ChevronsUpDownIcon, PlusIcon, SlidersHorizontalIcon, Trash2Icon } from 'lucide-react'
import { useState, useEffect, useCallback, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'

import { useFiltersProxy } from '~/hooks/useAnalyticsProxy'
import { FILTERS_PANELS_ORDER, ERRORS_FILTERS_PANELS_ORDER } from '~/lib/constants'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import FilterValueInput, { filterCategoryIcons, createVersionValue, parseVersionValue } from '~/ui/FilterValueInput'
import Modal from '~/ui/Modal'
import countries from '~/utils/isoCountries'

import { Filter as FilterType } from '../interfaces/traffic'
import { isFilterValid } from '../utils/filters'

export const getFiltersUrlParams = (
  filters: FilterType[],
  newFilters: FilterType[],
  override: boolean,
  searchParams: URLSearchParams,
) => {
  const currentUrlParams = new URLSearchParams(searchParams.toString())
  const resultingFilters: FilterType[] = []

  if (override) {
    resultingFilters.push(...newFilters)
  } else {
    // Combining existing (from URL) and new (from modal) filters, removing duplicates
    const finalUniqueFiltersMap = new Map<string, FilterType>()

    newFilters.forEach((f) => {
      const mapKey = `${f.isExclusive ? '!' : ''}${f.isContains ? '~' : ''}${f.column}=${f.filter}`
      finalUniqueFiltersMap.set(mapKey, f)
    })

    filters.forEach((f) => {
      const mapKey = `${f.isExclusive ? '!' : ''}${f.isContains ? '~' : ''}${f.column}=${f.filter}`
      finalUniqueFiltersMap.set(mapKey, f)
    })

    resultingFilters.push(...Array.from(finalUniqueFiltersMap.values()))
  }

  const newUrlParams = new URLSearchParams()

  // Preserve non-filter parameters from the current URL
  for (const [key, value] of currentUrlParams.entries()) {
    let processedKey = key
    if (key.startsWith('!') || key.startsWith('~') || key.startsWith('^')) {
      processedKey = key.substring(1)
    }
    if (!isFilterValid(processedKey, true)) {
      newUrlParams.append(key, value)
    }
  }

  resultingFilters.forEach((f) => {
    let filterKey = f.isExclusive ? `!${f.column}` : f.column
    if (f.isContains) {
      filterKey = f.isExclusive ? `^${f.column}` : `~${f.column}`
    }
    newUrlParams.append(filterKey, f.filter)
  })

  return newUrlParams
}

type FilterOperator = 'is' | 'isNot' | 'contains' | 'notContains'

interface FilterRow {
  id: string
  column: string
  operator: FilterOperator
  value: string
}

const OPERATORS: { value: FilterOperator; labelKey: string }[] = [
  { value: 'is', labelKey: 'common.is' },
  { value: 'isNot', labelKey: 'common.isNot' },
  { value: 'contains', labelKey: 'project.contains.is' },
  { value: 'notContains', labelKey: 'project.contains.not' },
]

const operatorToFilter = (operator: FilterOperator): { isExclusive: boolean; isContains: boolean } => {
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

interface SearchFiltersProps {
  showModal: boolean
  setShowModal: (show: boolean) => void
  tnMapping: Record<string, string>
  filters: FilterType[]
  type: 'traffic' | 'errors'
}

const SearchFilters = ({ showModal, setShowModal, tnMapping, filters, type }: SearchFiltersProps) => {
  const { id } = useCurrentProject()
  const { theme } = useTheme()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const [filterRows, setFilterRows] = useState<FilterRow[]>([])
  const [filterValuesCache, setFilterValuesCache] = useState<Record<string, string[]>>({})
  const [loadingColumns, setLoadingColumns] = useState<Set<string>>(new Set())
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { fetchFilters, fetchErrorsFilters, fetchVersionFilters } = useFiltersProxy()

  const panelOptions = type === 'traffic' ? FILTERS_PANELS_ORDER : ERRORS_FILTERS_PANELS_ORDER

  const fetchFilterValues = useCallback(
    async (column: string) => {
      if (filterValuesCache[column] || loadingColumns.has(column)) return

      setLoadingColumns((prev) => new Set(prev).add(column))
      try {
        let result: string[] = []

        // For browser/OS versions, fetch valid combinations from the backend
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
        } else {
          if (type === 'errors') {
            result = (await fetchErrorsFilters(id, column)) || []
          } else {
            result = (await fetchFilters(id, column)) || []
          }
        }
        setFilterValuesCache((prev) => ({ ...prev, [column]: result }))
      } catch (error) {
        console.error('Failed to fetch filter values:', error)
        setFilterValuesCache((prev) => ({ ...prev, [column]: [] }))
      } finally {
        setLoadingColumns((prev) => {
          const newSet = new Set(prev)
          newSet.delete(column)
          return newSet
        })
      }
    },
    [id, type, filterValuesCache, loadingColumns, fetchFilters, fetchErrorsFilters, fetchVersionFilters],
  )

  // Pre-fetch all filter values when modal opens
  useEffect(() => {
    if (showModal) {
      // Pre-fetch values for all panel options
      panelOptions.forEach((column) => {
        if (!filterValuesCache[column] && !loadingColumns.has(column)) {
          fetchFilterValues(column)
        }
      })
    }
  }, [showModal, panelOptions, fetchFilterValues, filterValuesCache, loadingColumns])

  // Initialize filter rows when modal opens
  useEffect(() => {
    if (showModal) {
      if (_isEmpty(filterRows)) {
        // Start with one empty filter row
        setFilterRows([{ id: crypto.randomUUID(), column: '', operator: 'is', value: '' }])
      }
    }
  }, [showModal, filterRows])

  const addFilterRow = () => {
    setFilterRows((prev) => [...prev, { id: crypto.randomUUID(), column: '', operator: 'is', value: '' }])
  }

  const removeFilterRow = (rowId: string) => {
    setFilterRows((prev) => {
      const newRows = prev.filter((r) => r.id !== rowId)
      // Keep at least one row
      if (newRows.length === 0) {
        return [{ id: crypto.randomUUID(), column: '', operator: 'is', value: '' }]
      }
      return newRows
    })
  }

  const updateFilterRow = (rowId: string, field: keyof FilterRow, fieldValue: string) => {
    setFilterRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row

        if (field === 'column') {
          // Reset value when column changes, but fetch values immediately
          if (fieldValue && !filterValuesCache[fieldValue] && !loadingColumns.has(fieldValue)) {
            fetchFilterValues(fieldValue)
          }
          return { ...row, column: fieldValue, value: '' }
        }
        return { ...row, [field]: fieldValue }
      }),
    )
  }

  const closeModal = () => {
    setShowModal(false)
    setTimeout(() => {
      setFilterRows([])
    }, 300)
  }

  const clearAllFilters = () => {
    setFilterRows([{ id: crypto.randomUUID(), column: '', operator: 'is', value: '' }])
  }

  const onSubmit = () => {
    // Convert filter rows to FilterType format
    const validFilters: FilterType[] = []

    filterRows
      .filter((row) => row.column && row.value)
      .forEach((row) => {
        const { isExclusive, isContains } = operatorToFilter(row.operator)

        // Handle browser version - creates two filters (br + brv)
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
            // Fallback: just use the value as-is for the version
            validFilters.push({
              column: 'brv',
              filter: row.value,
              isExclusive,
              isContains,
            })
          }
          return
        }

        // Handle OS version - creates two filters (os + osv)
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
            // Fallback: just use the value as-is for the version
            validFilters.push({
              column: 'osv',
              filter: row.value,
              isExclusive,
              isContains,
            })
          }
          return
        }

        // Handle country codes
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

    const newUrlParams = getFiltersUrlParams(filters, validFilters, true, searchParams)
    navigate({ search: newUrlParams.toString() })
    closeModal()
  }

  const hasValidFilters = filterRows.some((row) => row.column && row.value)

  return (
    <Modal
      size='medium'
      onClose={closeModal}
      onSubmit={onSubmit}
      submitText={t('project.applyFilters')}
      submitDisabled={!hasValidFilters}
      title={
        <span className='flex items-center gap-2'>
          <SlidersHorizontalIcon className='h-5 w-5' />
          {t('project.filters')}
        </span>
      }
      message={
        <div className='min-h-[280px] space-y-4'>
          {/* Filter Rows */}
          <div className='space-y-3'>
            {filterRows.map((row) => (
              <div key={row.id} className='flex items-center gap-2'>
                {/* Column Select */}
                <Listbox value={row.column} onChange={(value) => updateFilterRow(row.id, 'column', value)}>
                  {({ open }) => (
                    <div className='relative w-44'>
                      <ListboxButton className='relative w-full rounded-md border border-gray-300 bg-white py-2 pr-8 pl-3 text-left text-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:outline-hidden dark:border-gray-700 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'>
                        <span className={cx('flex items-center gap-2 truncate', { 'text-gray-400': !row.column })}>
                          {row.column ? filterCategoryIcons[row.column] : null}
                          {row.column
                            ? tnMapping[row.column] || t(`project.mapping.${row.column}`)
                            : t('project.selectColumn')}
                        </span>
                        <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
                          <ChevronsUpDownIcon className='h-4 w-4 text-gray-400' />
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
                          className='absolute z-50 mt-1 max-h-60 w-full min-w-[180px] overflow-auto rounded-md bg-white py-1 text-sm ring-1 ring-black/10 focus:outline-hidden dark:bg-slate-800'
                        >
                          {panelOptions.map((option) => (
                            <ListboxOption
                              key={option}
                              value={option}
                              className={({ focus }) =>
                                cx('relative cursor-pointer py-2 pr-4 pl-3 select-none', {
                                  'bg-gray-100 dark:bg-slate-700': focus,
                                  'text-gray-700 dark:text-gray-50': !focus,
                                })
                              }
                            >
                              {({ selected }) => (
                                <span className={cx('flex items-center gap-2', { 'font-medium': selected })}>
                                  <span className='shrink-0 text-gray-500 dark:text-gray-400'>
                                    {filterCategoryIcons[option]}
                                  </span>
                                  <span className='truncate'>
                                    {tnMapping[option] || t(`project.mapping.${option}`)}
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

                {/* Operator Select */}
                <Listbox value={row.operator} onChange={(value) => updateFilterRow(row.id, 'operator', value)}>
                  {({ open }) => (
                    <div className='relative w-32'>
                      <ListboxButton className='relative w-full rounded-md border border-gray-300 bg-white py-2 pr-8 pl-3 text-left text-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:outline-hidden dark:border-gray-700 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'>
                        <span className='block truncate'>
                          {t(OPERATORS.find((o) => o.value === row.operator)?.labelKey || '')}
                        </span>
                        <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
                          <ChevronsUpDownIcon className='h-4 w-4 text-gray-400' />
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
                          className='absolute z-50 mt-1 w-full overflow-auto rounded-md bg-white py-1 text-sm ring-1 ring-black/10 focus:outline-hidden dark:bg-slate-800'
                        >
                          {OPERATORS.map((op) => (
                            <ListboxOption
                              key={op.value}
                              value={op.value}
                              className={({ focus }) =>
                                cx('relative cursor-pointer py-2 pr-4 pl-8 select-none', {
                                  'bg-gray-100 dark:bg-slate-700': focus,
                                  'text-gray-700 dark:text-gray-50': !focus,
                                })
                              }
                            >
                              {({ selected }) => (
                                <>
                                  <span className={cx('block truncate', { 'font-medium': selected })}>
                                    {t(op.labelKey)}
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

                {/* Freeform Value Input with Suggestions */}
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
                />

                {/* Delete Button */}
                <button
                  type='button'
                  onClick={() => removeFilterRow(row.id)}
                  className='rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-gray-300'
                  title={t('project.removeFilter')}
                >
                  <Trash2Icon className='h-5 w-5' />
                </button>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className='flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700'>
            <button
              type='button'
              onClick={addFilterRow}
              className='flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20'
            >
              <PlusIcon className='h-4 w-4' />
              {t('project.addFilter')}
            </button>

            {filterRows.length > 1 || hasValidFilters ? (
              <button
                type='button'
                onClick={clearAllFilters}
                className='rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'
              >
                {t('project.clearAllFilters')}
              </button>
            ) : null}
          </div>

          {/* Currently Applied Filters */}
          {!_isEmpty(filters) ? (
            <div className='border-t border-gray-200 pt-4 dark:border-gray-700'>
              <p className='mb-2 text-xs font-medium text-gray-500 uppercase dark:text-gray-400'>
                {t('project.currentFilters')}
              </p>
              <div className='flex flex-wrap gap-2'>
                {filters.map(({ column, filter, isExclusive, isContains }) => {
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
                        {tnMapping[column] || t(`project.mapping.${column}`)}
                      </span>
                      <span
                        className={cx({
                          'text-green-600 dark:text-green-400': !isExclusive && !isContains,
                          'text-red-600 dark:text-red-400': isExclusive && !isContains,
                          'text-yellow-600 dark:text-yellow-400': !isExclusive && isContains,
                          'text-orange-600 dark:text-orange-400': isExclusive && isContains,
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
      }
      submitType='regular'
      isOpened={showModal}
      overflowVisible
    />
  )
}

export default SearchFilters
