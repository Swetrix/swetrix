import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import _isEmpty from 'lodash/isEmpty'
import _reduce from 'lodash/reduce'
import _filter from 'lodash/filter'
import _map from 'lodash/map'
import _find from 'lodash/find'
import _size from 'lodash/size'
import { toast } from 'sonner'

import Modal from 'ui/Modal'
import Select from 'ui/Select'
import Combobox from 'ui/Combobox'
import { FILTERS_PANELS_ORDER } from 'redux/constants'
import countries from 'utils/isoCountries'
import { getFilters, createProjectView, updateProjectView } from 'api'
import { Filter } from './Filters'
import Input from 'ui/Input'
import {
  IFilter,
  IProjectView,
  IProjectViewCustomEvent,
  ProjectViewCustomEventMetaValueType,
} from '../interfaces/traffic'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface IAddAViewModal {
  projectPassword?: string
  onSubmit: () => void
  pid: string
  showModal: boolean
  setShowModal: (show: boolean) => void
  tnMapping: Record<string, string>
  defaultView?: IProjectView
}

const getLabelToTypeMap = (t: any): Record<string, string> =>
  _reduce(
    FILTERS_PANELS_ORDER,
    (acc, curr) => ({
      ...acc,
      [t(`project.mapping.${curr}`)]: curr,
    }),
    {},
  )

const InlineButton = ({ text, onClick }: { text: string; onClick: () => void }) => (
  <button
    type='button'
    onClick={onClick}
    className='mt-2 text-sm font-medium text-indigo-600 underline decoration-dashed hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
  >
    {text}
  </button>
)

interface IEditMetric {
  metric: Partial<IProjectViewCustomEvent>
  onChange: (key: keyof IProjectViewCustomEvent, value: any) => void
  errors: AddAViewModalErrors
  setErrors: React.Dispatch<React.SetStateAction<AddAViewModalErrors>>
  onDelete: () => void
}

const EditMetric = ({ metric, onChange, onDelete, errors, setErrors }: IEditMetric) => {
  const { t } = useTranslation('common')

  const customEventTypes = useMemo(
    () => [
      {
        key: ProjectViewCustomEventMetaValueType.FLOAT,
        label: t('project.metaValueType.decimal'),
      },
      {
        key: ProjectViewCustomEventMetaValueType.INTEGER,
        label: t('project.metaValueType.integer'),
      },
      {
        key: ProjectViewCustomEventMetaValueType.STRING,
        label: t('project.metaValueType.text'),
      },
    ],
    [t],
  )

  const activeCustomEventType = useMemo(
    () => _find(customEventTypes, ({ key }) => key === metric.metaValueType)?.label,
    [customEventTypes, metric.metaValueType],
  )

  return (
    <div className='py-4'>
      <Input
        label={
          <p className='flex w-full items-center justify-between'>
            <span>{t('project.customEvent')}</span>
            <XMarkIcon
              role='button'
              aria-label='Delete custom event'
              className='size-5 w-full max-w-max cursor-pointer hover:text-gray-900 dark:hover:text-gray-50'
              onClick={onDelete}
            />
          </p>
        }
        maxLength={100}
        value={metric.customEventName}
        onChange={({ target }) => {
          setErrors((prev) => ({
            ...prev,
            [`${metric.id}_customEventName`]: '',
          }))
          onChange('customEventName', target.value)
        }}
        error={errors[`${metric.id}_customEventName`]}
      />
      <div className='mt-3 flex items-start justify-between'>
        <Input
          className='w-[48%]'
          maxLength={100}
          label={t('project.metrics.optinalEventKey.title')}
          hint={t('project.metrics.optinalEventKey.description')}
          value={metric.metaKey}
          onChange={({ target }) => {
            setErrors((prev) => ({
              ...prev,
              [`${metric.id}_metaKey`]: '',
            }))
            onChange('metaKey', target.value)
          }}
          error={errors[`${metric.id}_metaKey`]}
        />
        <Input
          className='w-[48%]'
          maxLength={100}
          label={t('project.metrics.optinalEventValue.title')}
          hint={t('project.metrics.optinalEventValue.description')}
          value={metric.metaValue}
          onChange={({ target }) => {
            setErrors((prev) => ({
              ...prev,
              [`${metric.id}_metaValue`]: '',
            }))
            onChange('metaValue', target.value)
          }}
          error={errors[`${metric.id}_metaValue`]}
        />
      </div>
      <div className='mt-3 flex items-start justify-between'>
        <Input
          className='w-[48%]'
          maxLength={100}
          label={t('project.metrics.metricKey.title')}
          hint={t('project.metrics.metricKey.description')}
          value={metric.metricKey}
          onChange={({ target }) => {
            setErrors((prev) => ({
              ...prev,
              [`${metric.id}_metricKey`]: '',
            }))
            onChange('metricKey', target.value)
          }}
          error={errors[`${metric.id}_metricKey`]}
        />
        <div className='w-[48%]'>
          <Select
            items={customEventTypes}
            keyExtractor={(item) => item.key}
            labelExtractor={(item) => item.label}
            onSelect={(selectedLabel) => {
              const key = _find(customEventTypes, ({ label }) => label === selectedLabel)?.key

              onChange('metaValueType', key)
            }}
            label={t('project.metrics.metricType.title')}
            hint={t('project.metrics.metricType.description')}
            title={activeCustomEventType}
            capitalise
          />
        </div>
      </div>
    </div>
  )
}

const EMPTY_CUSTOM_EVENT: Partial<IProjectViewCustomEvent> = {
  customEventName: '',
  metaKey: '',
  metaValue: '',
  metaValueType: ProjectViewCustomEventMetaValueType.FLOAT,
}

interface AddAViewModalErrors {
  name?: string
  [key: `${string}_${keyof IProjectViewCustomEvent}`]: string | undefined
}

const MAX_METRICS_IN_VIEW = 3

const AddAViewModal = ({
  onSubmit,
  pid,
  showModal,
  setShowModal,
  tnMapping,
  projectPassword,
  defaultView,
}: IAddAViewModal) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const [name, setName] = useState(defaultView?.name || '')
  const [filterType, setFilterType] = useState('')
  const [searchList, setSearchList] = useState<any[]>([])
  const [activeFilters, setActiveFilters] = useState<IFilter[]>(defaultView?.filters || [])
  const [customEvents, setCustomEvents] = useState<Partial<IProjectViewCustomEvent>[]>(defaultView?.customEvents || [])
  const [isViewSubmitting, setIsViewSubmitting] = useState(false)
  const [errors, setErrors] = useState<AddAViewModalErrors>({})

  const labelToTypeMap = useMemo(() => getLabelToTypeMap(t), [t])

  const getFiltersList = useCallback(
    async (category: string) => {
      let result = await getFilters(pid, category, projectPassword)

      setSearchList(result)
    },
    [pid, projectPassword],
  )

  useEffect(() => {
    if (!defaultView) {
      return
    }

    if (defaultView.filters) {
      setActiveFilters(defaultView.filters)
    }

    if (defaultView.customEvents) {
      setCustomEvents(defaultView.customEvents)
    }

    setName(defaultView.name)
  }, [defaultView])

  useEffect(() => {
    if (!showModal || _isEmpty(filterType)) {
      return
    }

    getFiltersList(filterType)
  }, [filterType, showModal, getFiltersList])

  const closeModal = () => {
    setShowModal(false)
    setTimeout(() => {
      setName('')
      setFilterType('')
      setActiveFilters([])
      setCustomEvents([])
      setErrors({})
    }, 300)
  }

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

  const validateCustomMetricsAndName = () => {
    let valid = true
    const metricErrors: AddAViewModalErrors = {}

    if (!name) {
      setErrors((prev) => ({
        ...prev,
        name: t('apiNotifications.enterViewName'),
      }))
      valid = false
    }

    for (let i = 0; i < _size(customEvents); ++i) {
      const { id, customEventName, metricKey } = customEvents[i]

      if (!customEventName) {
        metricErrors[`${id}_customEventName`] = t('apiNotifications.inputCannotBeEmpty')
        valid = false
      }

      if (!metricKey) {
        metricErrors[`${id}_metricKey`] = t('apiNotifications.inputCannotBeEmpty')
        valid = false
      }
    }

    if (!_isEmpty(metricErrors)) {
      setErrors((prev) => ({
        ...prev,
        ...metricErrors,
      }))
    }

    return valid
  }

  const onViewCreate = async () => {
    if (isViewSubmitting) {
      return
    }

    if (!validateCustomMetricsAndName()) {
      return
    }

    setIsViewSubmitting(true)

    try {
      // updating an existing view
      if (defaultView?.id) {
        await updateProjectView(pid, defaultView?.id, name, activeFilters, customEvents)
      } else {
        // crating a new one
        await createProjectView(pid, name, 'traffic', activeFilters, customEvents)
      }
    } catch (reason) {
      console.error('[ERROR] onViewCreate:', reason)
      toast.error(t('apiNotifications.somethingWentWrong'))
    }

    setIsViewSubmitting(false)
    onSubmit()
    closeModal()
  }

  return (
    <Modal
      onClose={() => {
        if (isViewSubmitting) {
          return
        }

        closeModal()
      }}
      onSubmit={onViewCreate}
      submitText={t('common.confirm')}
      title={t('project.addAView')}
      isLoading={isViewSubmitting}
      message={
        <div className='min-h-[410px]'>
          <Input
            label={t('project.viewName')}
            value={name}
            onChange={({ target }) => {
              setName(target.value)
              setErrors((prev) => ({
                ...prev,
                name: '',
              }))
            }}
            error={errors.name}
            maxLength={20}
          />
          <hr className='my-4' />
          <Select
            label={t('project.selectCategoryOptional')}
            items={FILTERS_PANELS_ORDER}
            labelExtractor={(item) => t(`project.mapping.${item}`)}
            onSelect={(item: string) => setFilterType(labelToTypeMap[item])}
            title={
              _isEmpty(filterType) ? t('project.settings.reseted.selectFilters') : t(`project.mapping.${filterType}`)
            }
          />
          {filterType && !_isEmpty(searchList) && (
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
          )}
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
          <hr className='my-4' />
          <p className='text-sm font-medium text-gray-700 dark:text-gray-100'>{t('project.customEventsAndMetrics')}</p>
          <div className='divide-y divide-gray-300/80 dark:divide-slate-900/60'>
            {_map(customEvents, (ev) => (
              <EditMetric
                key={ev.id}
                metric={ev}
                setErrors={setErrors}
                errors={errors}
                onChange={(key, value) => {
                  setCustomEvents((prev) =>
                    _map(prev, (item) => {
                      if (item.id !== ev.id) {
                        return item
                      }

                      return {
                        ...item,
                        [key]: value,
                      }
                    }),
                  )
                }}
                onDelete={() => {
                  setCustomEvents((prev) => _filter(prev, ({ id }) => id !== ev.id))
                }}
              />
            ))}
          </div>
          {customEvents.length < MAX_METRICS_IN_VIEW && (
            <InlineButton
              text={t('project.addAMetric')}
              onClick={() => {
                setCustomEvents((prev) => [...prev, { ...EMPTY_CUSTOM_EVENT, id: Math.random().toString() }])
              }}
            />
          )}
        </div>
      }
      submitType='regular'
      isOpened={showModal}
    />
  )
}

export default AddAViewModal
