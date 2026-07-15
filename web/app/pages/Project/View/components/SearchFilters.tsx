import { SlidersHorizontalIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'

import { V2Filter } from '~/api/v2/types'
import Modal from '~/ui/Modal'
import {
  filterToUrlKey,
  filterToUrlValue,
  isFilterUrlKey,
} from '~/utils/analyticsUrl'

import FilterRowsEditor from './FilterRowsEditor'

export const getFiltersUrlParams = (
  filters: V2Filter[],
  newFilters: V2Filter[],
  override: boolean,
  searchParams: URLSearchParams,
) => {
  const currentUrlParams = new URLSearchParams(searchParams.toString())
  const resultingFilters: V2Filter[] = []

  if (override) {
    resultingFilters.push(...newFilters)
  } else {
    const finalUniqueFiltersMap = new Map<string, V2Filter>()

    newFilters.forEach((filter) => {
      finalUniqueFiltersMap.set(
        `${filterToUrlKey(filter)}=${filterToUrlValue(filter)}`,
        filter,
      )
    })

    filters.forEach((filter) => {
      finalUniqueFiltersMap.set(
        `${filterToUrlKey(filter)}=${filterToUrlValue(filter)}`,
        filter,
      )
    })

    resultingFilters.push(...Array.from(finalUniqueFiltersMap.values()))
  }

  const newUrlParams = new URLSearchParams()

  for (const [key, value] of currentUrlParams.entries()) {
    if (!isFilterUrlKey(key)) {
      newUrlParams.append(key, value)
    }
  }

  resultingFilters.forEach((filter) => {
    newUrlParams.append(filterToUrlKey(filter), filterToUrlValue(filter))
  })

  return newUrlParams
}

interface SearchFiltersProps {
  showModal: boolean
  setShowModal: (show: boolean) => void
  tnMapping: Record<string, string>
  filters: V2Filter[]
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
  const [draftFilters, setDraftFilters] = useState<V2Filter[]>([])
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
