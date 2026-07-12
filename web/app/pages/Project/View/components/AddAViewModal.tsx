import _filter from 'lodash/filter'
import _find from 'lodash/find'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _size from 'lodash/size'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import { V2Filter } from '~/api/v2/types'
import { ProjectViewActionData } from '~/routes/projects.$id'
import Input from '~/ui/Input'
import Modal from '~/ui/Modal'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import { legacyFilterToV2, v2FilterToLegacy } from '~/utils/analyticsUrl'

import {
  ProjectView,
  ProjectViewCustomEvent,
  ProjectViewCustomEventMetaValueType,
} from '../interfaces/traffic'

import FilterRowsEditor from './FilterRowsEditor'

// Saved project views keep the legacy filter shape server-side; convert to
// the v2 shape at this boundary (unmappable legacy filters are dropped).
const projectViewFiltersToV2 = (view?: ProjectView): V2Filter[] =>
  (view?.filters || []).flatMap((filter) => {
    const converted = legacyFilterToV2(filter)
    return converted ? [converted] : []
  })

interface AddAViewModalProps {
  onSubmit: () => void
  showModal: boolean
  setShowModal: (show: boolean) => void
  tnMapping: Record<string, string>
  defaultView?: ProjectView
  filterOptions: string[]
  filterDataType: 'traffic' | 'errors'
  supportsCustomMetrics: boolean
  viewType: 'traffic' | 'performance'
}

const InlineButton = ({
  text,
  onClick,
}: {
  text: string
  onClick: () => void
}) => (
  <button
    type='button'
    onClick={onClick}
    className='mt-2 text-sm font-medium text-indigo-600 underline decoration-dashed hover:decoration-solid dark:text-indigo-400'
  >
    {text}
  </button>
)

interface EditMetricProps {
  metric: Partial<ProjectViewCustomEvent>
  onChange: (key: keyof ProjectViewCustomEvent, value: any) => void
  errors: AddAViewModalErrors
  setErrors: React.Dispatch<React.SetStateAction<AddAViewModalErrors>>
  onDelete: () => void
}

const EditMetric = ({
  metric,
  onChange,
  onDelete,
  errors,
  setErrors,
}: EditMetricProps) => {
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
    () =>
      _find(customEventTypes, ({ key }) => key === metric.metaValueType)?.label,
    [customEventTypes, metric.metaValueType],
  )

  return (
    <div className='py-4'>
      <Input
        label={t('project.customEvent')}
        labelCorner={
          <button
            type='button'
            className='rounded-sm text-xs font-medium text-gray-500 underline decoration-dashed underline-offset-2 transition-colors hover:text-red-600 hover:decoration-solid focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden dark:text-gray-400 dark:hover:text-red-400 dark:focus-visible:ring-slate-300'
            onClick={onDelete}
            aria-label={`${t('common.remove')}: ${t('project.customEvent')}`}
          >
            {t('common.remove')}
          </button>
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
      <div className='mt-3 grid gap-3 sm:grid-cols-2'>
        <Input
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
      <div className='mt-3 grid gap-3 sm:grid-cols-2'>
        <Input
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
        <div>
          <Select
            items={customEventTypes}
            keyExtractor={(item) => item.key}
            labelExtractor={(item) => item.label}
            onSelect={(item) => {
              onChange('metaValueType', item.key)
            }}
            label={t('project.metrics.metricType.title')}
            hint={t('project.metrics.metricType.description')}
            title={activeCustomEventType}
            capitalise
            selectedItem={customEventTypes.find(
              (item) => item.key === metric.metaValueType,
            )}
          />
        </div>
      </div>
    </div>
  )
}

const EMPTY_CUSTOM_EVENT: Partial<ProjectViewCustomEvent> = {
  customEventName: '',
  metaKey: '',
  metaValue: '',
  metaValueType: ProjectViewCustomEventMetaValueType.FLOAT,
}

interface AddAViewModalErrors {
  name?: string
  [key: `${string}_${keyof ProjectViewCustomEvent}`]: string | undefined
}

const MAX_METRICS_IN_VIEW = 3

const AddAViewModal = ({
  onSubmit,
  showModal,
  setShowModal,
  tnMapping,
  defaultView,
  filterOptions,
  filterDataType,
  supportsCustomMetrics,
  viewType,
}: AddAViewModalProps) => {
  const { t } = useTranslation('common')
  const fetcher = useFetcher<ProjectViewActionData>()
  const [name, setName] = useState(defaultView?.name || '')
  const [activeFilters, setActiveFilters] = useState<V2Filter[]>(() =>
    projectViewFiltersToV2(defaultView),
  )
  const [customEvents, setCustomEvents] = useState<
    Partial<ProjectViewCustomEvent>[]
  >(defaultView?.customEvents || [])
  const [errors, setErrors] = useState<AddAViewModalErrors>({})
  const initialFilters = useMemo(
    () => projectViewFiltersToV2(defaultView),
    [defaultView],
  )

  useEffect(() => {
    if (!defaultView) {
      return
    }

    if (defaultView.filters) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing form state with defaultView prop
      setActiveFilters(projectViewFiltersToV2(defaultView))
    }

    if (defaultView.customEvents) {
      setCustomEvents(defaultView.customEvents)
    }

    setName(defaultView.name)
  }, [defaultView])

  const closeModal = useCallback(() => {
    setShowModal(false)
    setTimeout(() => {
      setName('')
      setActiveFilters([])
      setCustomEvents([])
      setErrors({})
    }, 300)
  }, [setShowModal])

  const validateCustomMetricsAndName = () => {
    let valid = true
    const metricErrors: AddAViewModalErrors = {}

    if (!name) {
      setErrors((prev) => ({
        ...prev,
        name: t('apiNotifications.enterSegmentName'),
      }))
      valid = false
    }

    if (supportsCustomMetrics) {
      for (let i = 0; i < _size(customEvents); ++i) {
        const { id, customEventName, metricKey } = customEvents[i]

        if (!customEventName) {
          metricErrors[`${id}_customEventName`] = t(
            'apiNotifications.inputCannotBeEmpty',
          )
          valid = false
        }

        if (!metricKey) {
          metricErrors[`${id}_metricKey`] = t(
            'apiNotifications.inputCannotBeEmpty',
          )
          valid = false
        }
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

  const isViewSubmitting = fetcher.state !== 'idle'
  const hasHandledResponse = useRef(false)

  useEffect(() => {
    if (fetcher.state === 'submitting') {
      hasHandledResponse.current = false
    }
  }, [fetcher.state])

  useEffect(() => {
    if (
      fetcher.state === 'idle' &&
      fetcher.data &&
      !hasHandledResponse.current
    ) {
      hasHandledResponse.current = true
      if (fetcher.data.success) {
        if (fetcher.data.intent === 'create-project-view') {
          toast.success(t('apiNotifications.segmentCreated'))
        } else if (fetcher.data.intent === 'update-project-view') {
          toast.success(t('apiNotifications.segmentUpdated'))
        }
        onSubmit()
        closeModal()
      } else if (fetcher.data.error) {
        toast.error(fetcher.data.error)
      }
    }
  }, [fetcher.state, fetcher.data, onSubmit, closeModal, t])

  const onViewCreate = () => {
    if (isViewSubmitting) {
      return
    }

    if (!validateCustomMetricsAndName()) {
      return
    }

    const formData = new FormData()
    const metricsToSubmit = supportsCustomMetrics
      ? customEvents
      : defaultView?.customEvents || []
    formData.append(
      'filters',
      JSON.stringify(activeFilters.map(v2FilterToLegacy)),
    )
    formData.append('customEvents', JSON.stringify(metricsToSubmit))
    formData.append('name', name)

    if (defaultView?.id) {
      formData.append('intent', 'update-project-view')
      formData.append('viewId', defaultView.id)
    } else {
      formData.append('intent', 'create-project-view')
      formData.append('type', viewType)
    }

    fetcher.submit(formData, { method: 'POST' })
  }

  return (
    <Modal
      size='medium'
      onClose={() => {
        if (isViewSubmitting) {
          return
        }

        closeModal()
      }}
      onSubmit={onViewCreate}
      submitText={t('common.confirm')}
      title={t('project.addASegment')}
      isLoading={isViewSubmitting}
      message={
        <div className='min-h-[410px]'>
          <Input
            label={t('project.segmentName')}
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
          <Text
            as='p'
            size='sm'
            weight='medium'
            className='mb-3 text-gray-700 dark:text-gray-100'
          >
            {t('project.filters')}
          </Text>
          <div className='mt-2'>
            <FilterRowsEditor
              active={showModal}
              tnMapping={tnMapping}
              initialFilters={initialFilters}
              type={filterDataType}
              filterOptions={filterOptions}
              onChange={setActiveFilters}
              resetKey={defaultView?.id || 'new'}
            />
          </div>
          {supportsCustomMetrics ? (
            <>
              <hr className='my-4' />
              <Text
                as='p'
                size='sm'
                weight='medium'
                className='text-gray-700 dark:text-gray-100'
              >
                {t('project.customEventsAndMetrics')}
              </Text>
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
                      setCustomEvents((prev) =>
                        _filter(prev, ({ id }) => id !== ev.id),
                      )
                    }}
                  />
                ))}
              </div>
              {customEvents.length < MAX_METRICS_IN_VIEW ? (
                <InlineButton
                  text={t('project.addAMetric')}
                  onClick={() => {
                    setCustomEvents((prev) => [
                      ...prev,
                      { ...EMPTY_CUSTOM_EVENT, id: Math.random().toString() },
                    ])
                  }}
                />
              ) : null}
            </>
          ) : customEvents.length > 0 ? (
            <Text as='p' size='xs' colour='secondary' className='mt-4'>
              {t('project.segmentTrafficMetricsOnly')}
            </Text>
          ) : null}
        </div>
      }
      submitType='regular'
      isOpened={showModal}
      overflowVisible
    />
  )
}

export default AddAViewModal
