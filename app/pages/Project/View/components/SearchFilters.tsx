import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import _isEmpty from 'lodash/isEmpty'
import _reduce from 'lodash/reduce'
import _filter from 'lodash/filter'
import _map from 'lodash/map'

import Modal from 'ui/Modal'
import Checkbox from 'ui/Checkbox'
import Select from 'ui/Select'
import Combobox from 'ui/Combobox'
import { FILTERS_PANELS_ORDER } from 'redux/constants'
import countries from 'utils/isoCountries'
import { getFilters } from 'api'
import { Filter } from './Filters'

interface ISearchFilters {
  setProjectFilter: (filter: {
    column: string
    filter: string[]
  }[], override: boolean) => void
  pid: string
  showModal: boolean
  setShowModal: (show: boolean) => void
  tnMapping: Record<string, string>
  filters: {
    column: string
    filter: string
    isExclusive: boolean
  }[]
}

const getLabelToTypeMap = (t: any) => _reduce(FILTERS_PANELS_ORDER, (acc, curr) => ({
  ...acc,
  [t(`project.mapping.${curr}`)]: curr,
}), {})

interface IActiveFilter {
  column: string
  filter: string[]
}

const formatFilters = (filters: any): IActiveFilter[] => {
  const formatted: IActiveFilter[] = []

  _map(filters, (filter, column) => {
    formatted.push({ column, filter })
  })

  return formatted
}

const SearchFilters = ({
  setProjectFilter, pid, showModal, setShowModal, tnMapping, filters,
}: ISearchFilters) => {
  const { t, i18n: { language } } = useTranslation('common')
  const [filterType, setFilterType] = useState<string>('')
  const [searchList, setSearchList] = useState<any[]>([])
  const [activeFilters, setActiveFilters] = useState<any>({})
  const [override, setOverride] = useState<boolean>(false)

  const labelToTypeMap = useMemo(() => getLabelToTypeMap(t), [t])

  const getFiltersList = useCallback(async (type: string) => {
    const res = await getFilters(pid, type)
    setSearchList(res)
  }, [pid])

  useEffect(() => {
    if (!showModal || _isEmpty(filterType)) {
      return
    }

    getFiltersList(filterType)
  }, [filterType, showModal, getFiltersList])

  const closeModal = () => {
    setShowModal(false)
    setTimeout(() => {
      setFilterType('')
      setActiveFilters({})
      setOverride(false)
    }, 300)
  }

  return (
    <Modal
      onClose={closeModal}
      onSubmit={() => {
        setProjectFilter(formatFilters(activeFilters), override)
        closeModal()
      }}
      submitText={t('project.applyFilters')}
      title={t('project.advancedFilters')}
      message={
        (
          <div className='min-h-[410px]'>
            <Select
              label={t('project.selectCategory')}
              items={FILTERS_PANELS_ORDER}
              labelExtractor={(item) => t(`project.mapping.${item}`)}
              // @ts-ignore
              onSelect={(item: string) => setFilterType(labelToTypeMap[item])}
              title={_isEmpty(filterType) ? t('project.settings.reseted.selectFilters') : t(`project.mapping.${filterType}`)}
            />
            {!_isEmpty(filters) && (
              <>
                <p className='mt-5 text-sm font-medium text-gray-700 dark:text-gray-200'>
                  {t('project.currentFilters')}
                </p>
                {_map(filters, ({ column, filter, isExclusive }) => (
                  <Filter
                    key={`${column}-${filter}`}
                    t={t}
                    language={language}
                    onChangeExclusive={() => { }}
                    onRemoveFilter={() => { }}
                    isExclusive={isExclusive}
                    column={column}
                    filter={filter}
                    tnMapping={tnMapping}
                    removable={false}
                    canChangeExclusive={false}
                  />
                ))}
              </>
            )}
            {(filterType && !_isEmpty(searchList)) && (
              <>
                <p className='mt-5 text-sm font-medium text-gray-700 dark:text-gray-200'>
                  {t('project.newFilters')}
                </p>
                <Combobox
                  items={searchList}
                  labelExtractor={(item) => {
                    if (filterType === 'cc') {
                      return countries.getName(item, language)
                    }

                    return item
                  }}
                  onSelect={(item: any) => {
                    const processedItem = filterType === 'cc'
                      ? countries.getAlpha2Code(item, language) as string
                      : item

                    setActiveFilters((prevFilters: any) => ({
                      ...prevFilters,
                      [filterType]: [...(prevFilters[filterType] || []), processedItem],
                    }))
                  }}
                  placeholder={t('project.settings.reseted.filtersPlaceholder')}
                />
                {_map(activeFilters, (filter, column) => {
                  return _map(filter, (item) => (
                    <Filter
                      key={`${column}-${item}`}
                      t={t}
                      onRemoveFilter={(removeColumn, removeFilter) => {
                        setActiveFilters((prevFilters: any) => {
                          const filteredColumn = _filter(prevFilters[removeColumn], (item: string) => item !== removeFilter)

                          if (_isEmpty(filteredColumn)) {
                            return _filter(prevFilters, (_, key) => key !== removeColumn)
                          }

                          return {
                            ...prevFilters,
                            [removeColumn]: filteredColumn,
                          }
                        })
                      }}
                      language={language}
                      onChangeExclusive={() => { }}
                      isExclusive={false}
                      canChangeExclusive={false}
                      column={column}
                      filter={item}
                      tnMapping={tnMapping}
                      removable
                    />
                  ))
                })}
                <Checkbox
                  checked={Boolean(override)}
                  onChange={(e) => setOverride(e.target.checked)}
                  name='overrideCurrentlyFilters'
                  id='overrideCurrentlyFilters'
                  className='mt-4'
                  label={t('project.overrideCurrentlyFilters')}
                />
              </>
            )}
          </div>
        )
      }
      submitType='regular'
      isOpened={showModal}
    />
  )
}

export default SearchFilters
