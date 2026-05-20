import { SlidersHorizontalIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'

import Modal from '~/ui/Modal'

import { Filter as FilterType } from '../interfaces/traffic'
import { isFilterValid } from '../utils/filters'

import FilterRowsEditor from './FilterRowsEditor'

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
    const finalUniqueFiltersMap = new Map<string, FilterType>()

    newFilters.forEach((filter) => {
      const mapKey = `${filter.isExclusive ? '!' : ''}${filter.isContains ? '~' : ''}${filter.column}=${filter.filter}`
      finalUniqueFiltersMap.set(mapKey, filter)
    })

    filters.forEach((filter) => {
      const mapKey = `${filter.isExclusive ? '!' : ''}${filter.isContains ? '~' : ''}${filter.column}=${filter.filter}`
      finalUniqueFiltersMap.set(mapKey, filter)
    })

    resultingFilters.push(...Array.from(finalUniqueFiltersMap.values()))
  }

  const newUrlParams = new URLSearchParams()

  for (const [key, value] of currentUrlParams.entries()) {
    let processedKey = key
    if (key.startsWith('!') || key.startsWith('~') || key.startsWith('^')) {
      processedKey = key.substring(1)
    }
    if (!isFilterValid(processedKey, true)) {
      newUrlParams.append(key, value)
    }
  }

  resultingFilters.forEach((filter) => {
    let filterKey = filter.isExclusive ? `!${filter.column}` : filter.column
    if (filter.isContains) {
      filterKey = filter.isExclusive ? `^${filter.column}` : `~${filter.column}`
    }
    newUrlParams.append(filterKey, filter.filter)
  })

  return newUrlParams
}

interface SearchFiltersProps {
  showModal: boolean
  setShowModal: (show: boolean) => void
  tnMapping: Record<string, string>
  filters: FilterType[]
  type: 'traffic' | 'errors'
  filterOptions?: string[]
}

const SearchFilters = ({
  showModal,
  setShowModal,
  tnMapping,
  filters,
  type,
  filterOptions,
}: SearchFiltersProps) => {
  const { t } = useTranslation('common')
  const [draftFilters, setDraftFilters] = useState<FilterType[]>([])
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const closeModal = () => {
    setShowModal(false)
    setTimeout(() => {
      setDraftFilters([])
    }, 300)
  }

  const onSubmit = () => {
    const newUrlParams = getFiltersUrlParams(
      filters,
      draftFilters,
      true,
      searchParams,
    )
    navigate({ search: newUrlParams.toString() })
    closeModal()
  }

  return (
    <Modal
      size='medium'
      onClose={closeModal}
      onSubmit={onSubmit}
      submitText={t('project.applyFilters')}
      submitDisabled={draftFilters.length === 0}
      title={
        <span className='flex items-center gap-2'>
          <SlidersHorizontalIcon className='h-5 w-5' />
          {t('project.filters')}
        </span>
      }
      message={
        <div className='min-h-[280px] space-y-4'>
          <FilterRowsEditor
            active={showModal}
            tnMapping={tnMapping}
            currentFilters={filters}
            type={type}
            filterOptions={filterOptions}
            onChange={setDraftFilters}
            prefetchOnOpen
            showCurrentFilters
          />
        </div>
      }
      isOpened={showModal}
      submitType='regular'
      overflowVisible
    />
  )
}

export default SearchFilters
