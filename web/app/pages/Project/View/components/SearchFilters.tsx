import _filter from 'lodash/filter'
import _find from 'lodash/find'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'

import { getFilters, getErrorsFilters } from '~/api'
import { FILTERS_PANELS_ORDER, ERRORS_FILTERS_PANELS_ORDER } from '~/lib/constants'
import { useCurrentProject, useProjectPassword } from '~/providers/CurrentProjectProvider'
import Checkbox from '~/ui/Checkbox'
import Combobox from '~/ui/Combobox'
import Modal from '~/ui/Modal'
import Select from '~/ui/Select'
import countries from '~/utils/isoCountries'

import { Filter as FilterType } from '../interfaces/traffic'
import { isFilterValid } from '../utils/filters'

import { Filter } from './Filters'

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
      const mapKey = `${f.isExclusive ? '!' : ''}${f.column}=${f.filter}`
      finalUniqueFiltersMap.set(mapKey, f)
    })

    filters.forEach((f) => {
      const mapKey = `${f.isExclusive ? '!' : ''}${f.column}=${f.filter}`
      finalUniqueFiltersMap.set(mapKey, f)
    })

    resultingFilters.push(...Array.from(finalUniqueFiltersMap.values()))
  }

  const newUrlParams = new URLSearchParams()

  // Preserve non-filter parameters from the current URL
  for (const [key, value] of currentUrlParams.entries()) {
    let processedKey = key
    if (key.startsWith('!')) {
      processedKey = key.substring(1)
    }
    if (!isFilterValid(processedKey, true)) {
      newUrlParams.append(key, value)
    }
  }

  resultingFilters.forEach((f) => {
    const filterKey = f.isExclusive ? `!${f.column}` : f.column
    newUrlParams.append(filterKey, f.filter)
  })

  return newUrlParams
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
  const projectPassword = useProjectPassword(id)
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const [filterType, setFilterType] = useState('')
  const [searchList, setSearchList] = useState<any[]>([])
  const [activeFilters, setActiveFilters] = useState<FilterType[]>([])
  const [override, setOverride] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const getFiltersList = useCallback(
    async (category: string) => {
      let result: any[]

      if (type === 'errors') {
        result = await getErrorsFilters(id, category, projectPassword)
      } else {
        result = await getFilters(id, category, projectPassword)
      }

      setSearchList(result)
    },
    [id, projectPassword, type],
  )

  useEffect(() => {
    if (!showModal || _isEmpty(filterType)) {
      return
    }

    getFiltersList(filterType)
  }, [filterType, showModal, getFiltersList])

  const onItemSelect = (item: string) => {
    let processedItem = item

    if (filterType === 'cc') {
      processedItem = countries.getAlpha2Code(item, language) as string
    }

    const itemExists = _find(activeFilters, ({ column, filter }) => filter === processedItem && column === filterType)

    if (itemExists) {
      return
    }

    setActiveFilters((prevFilters: FilterType[]) => [
      ...prevFilters,
      {
        column: filterType,
        filter: processedItem,
        isExclusive: false,
      },
    ])
  }

  const closeModal = () => {
    setShowModal(false)
    setTimeout(() => {
      setFilterType('')
      setActiveFilters([])
      setOverride(false)
    }, 300)
  }

  const onSubmit = () => {
    const newUrlParams = getFiltersUrlParams(filters, activeFilters, override, searchParams)

    navigate({ search: newUrlParams.toString() })
    closeModal()
  }

  return (
    <Modal
      onClose={closeModal}
      onSubmit={onSubmit}
      submitText={t('project.applyFilters')}
      title={t('project.advancedFilters')}
      message={
        <div className='min-h-[410px]'>
          <Select
            label={t('project.selectCategory')}
            items={type === 'traffic' ? FILTERS_PANELS_ORDER : ERRORS_FILTERS_PANELS_ORDER}
            labelExtractor={(item) => t(`project.mapping.${item}`)}
            onSelect={(item) => setFilterType(item)}
            title={
              _isEmpty(filterType) ? t('project.settings.reseted.selectFilters') : t(`project.mapping.${filterType}`)
            }
          />
          {!_isEmpty(filters) ? (
            <>
              <p className='mt-5 text-sm font-medium text-gray-700 dark:text-gray-200'>{t('project.currentFilters')}</p>
              {_map(filters, ({ column, filter, isExclusive }) => (
                <Filter
                  key={`${column}-${filter}`}
                  isExclusive={isExclusive}
                  column={column}
                  filter={filter}
                  tnMapping={tnMapping}
                  removable={false}
                  canChangeExclusive={false}
                />
              ))}
            </>
          ) : null}
          {filterType && !_isEmpty(searchList) ? (
            <>
              <p className='mt-5 text-sm font-medium text-gray-700 dark:text-gray-200'>{t('project.filters')}</p>
              <Combobox
                items={searchList}
                labelExtractor={(item) => {
                  if (filterType === 'cc') {
                    return countries.getName(item, language)
                  }

                  return item
                }}
                onSelect={onItemSelect}
                placeholder={t('project.settings.reseted.filtersPlaceholder')}
              />
            </>
          ) : null}
          <div className='mt-2'>
            {_map(activeFilters, ({ filter, column, isExclusive }) => (
              <Filter
                key={`${column}-${filter}`}
                onRemoveFilter={(e) => {
                  e.preventDefault()

                  setActiveFilters((prevFilters: any) => {
                    return _filter(
                      prevFilters,
                      ({ column: prevColumn, filter: prevFilter }) => prevFilter !== filter || prevColumn !== column,
                    )
                  })
                }}
                onChangeExclusive={(e) => {
                  e.preventDefault()

                  setActiveFilters((prevFilters: any) => {
                    return _map(prevFilters, (item) => {
                      if (item.column === column && item.filter === filter) {
                        return {
                          column,
                          filter,
                          isExclusive: !isExclusive,
                        }
                      }

                      return item
                    })
                  })
                }}
                isExclusive={isExclusive}
                column={column}
                filter={filter}
                tnMapping={tnMapping}
                canChangeExclusive
                removable
              />
            ))}
          </div>
          {!_isEmpty(activeFilters) ? (
            <Checkbox
              checked={Boolean(override)}
              onChange={setOverride}
              name='overrideCurrentlyFilters'
              classes={{
                label: 'mt-4',
              }}
              label={t('project.overrideCurrentlyFilters')}
            />
          ) : null}
        </div>
      }
      submitType='regular'
      isOpened={showModal}
    />
  )
}

export default SearchFilters
