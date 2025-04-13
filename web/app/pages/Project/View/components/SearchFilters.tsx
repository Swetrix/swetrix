import _filter from 'lodash/filter'
import _find from 'lodash/find'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { getFilters, getErrorsFilters } from '~/api'
import { FILTERS_PANELS_ORDER, ERRORS_FILTERS_PANELS_ORDER } from '~/lib/constants'
import { useCurrentProject, useProjectPassword } from '~/providers/CurrentProjectProvider'
import Checkbox from '~/ui/Checkbox'
import Combobox from '~/ui/Combobox'
import Modal from '~/ui/Modal'
import Select from '~/ui/Select'
import countries from '~/utils/isoCountries'

import { Filter as FilterType } from '../interfaces/traffic'

import { Filter } from './Filters'

interface SearchFiltersProps {
  setProjectFilter: (filters: FilterType[], override: boolean) => void
  showModal: boolean
  setShowModal: (show: boolean) => void
  tnMapping: Record<string, string>
  filters: FilterType[]
  type: 'traffic' | 'errors'
}

const SearchFilters = ({ setProjectFilter, showModal, setShowModal, tnMapping, filters, type }: SearchFiltersProps) => {
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

    setActiveFilters((prevFilters: any) => [
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

  return (
    <Modal
      onClose={closeModal}
      onSubmit={() => {
        setProjectFilter(activeFilters, override)
        closeModal()
      }}
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
                  onChangeExclusive={() => {}}
                  onRemoveFilter={() => {}}
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
                onRemoveFilter={(removeColumn, removeFilter) => {
                  setActiveFilters((prevFilters: any) => {
                    return _filter(
                      prevFilters,
                      ({ column, filter }) => filter !== removeFilter || column !== removeColumn,
                    )
                  })
                }}
                onChangeExclusive={(columnToChange: string, filterToChange: string, isExclusive: boolean) => {
                  setActiveFilters((prevFilters: any) => {
                    return _map(prevFilters, (item) => {
                      if (item.column === columnToChange && item.filter === filterToChange) {
                        return {
                          column: columnToChange,
                          filter: filterToChange,
                          isExclusive,
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
