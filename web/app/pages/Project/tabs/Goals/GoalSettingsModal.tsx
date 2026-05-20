import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react'
import _map from 'lodash/map'
import { TrashIcon, PlusIcon, XIcon } from '@phosphor-icons/react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import { useGoalProxy } from '~/hooks/useAnalyticsProxy'
import type {
  GoalCondition,
  GoalConditionRelation,
  GoalConditions,
} from '~/api/api.server'
import type { ProjectViewActionData } from '~/routes/projects.$id'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import type { Filter as FilterType } from '../../View/interfaces/traffic'
import FilterRowsEditor from '../../View/components/FilterRowsEditor'

const GOAL_TYPES = [
  { value: 'pageview', label: 'Pageview' },
  { value: 'custom_event', label: 'Custom Event' },
]

const GOAL_MATCH_TYPES = [
  { value: 'exact', label: 'Exact match' },
  { value: 'contains', label: 'Contains' },
]

const DEFINITION_MODES = [
  { value: 'simple', labelKey: 'goals.simpleGoal' },
  { value: 'conditions', labelKey: 'goals.multiConditionGoal' },
] as const

const CONDITION_RELATIONS: { value: GoalConditionRelation; label: string }[] = [
  { value: 'AND', label: 'AND' },
  { value: 'OR', label: 'OR' },
]

const GOAL_CONDITION_FILTER_OPTIONS = [
  'pg',
  'ev',
  'host',
  'cc',
  'dv',
  'br',
  'os',
  'ref',
  'so',
  'me',
  'ca',
  'te',
  'co',
  'tag:key',
  'ev:key',
]

const createConditionId = () =>
  globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)

const filterToConditionOperator = ({
  isExclusive,
  isContains,
}: FilterType): GoalCondition['operator'] => {
  if (isContains && isExclusive) return 'not_contains'
  if (isContains) return 'contains'
  if (isExclusive) return 'not_equals'
  return 'equals'
}

const conditionOperatorToFilterFlags = (
  operator: GoalCondition['operator'],
) => ({
  isExclusive: operator === 'not_equals' || operator === 'not_contains',
  isContains: operator === 'contains' || operator === 'not_contains',
})

const getMetadataConditionPrefix = (eventType: GoalCondition['eventType']) =>
  eventType === 'custom_event' ? 'ev:key' : 'tag:key'

const filterToCondition = (filter: FilterType): GoalCondition | null => {
  if (!filter.column || !filter.filter) return null

  if (filter.column === 'ev') {
    return {
      id: createConditionId(),
      eventType: 'custom_event',
      field: 'event_name',
      operator: filterToConditionOperator(filter),
      value: filter.filter,
    }
  }

  if (filter.column === 'ev:key' || filter.column === 'tag:key') {
    return {
      id: createConditionId(),
      eventType: filter.column === 'ev:key' ? 'custom_event' : 'pageview',
      field: 'metadata',
      operator: filter.isExclusive ? 'not_exists' : 'exists',
      metadataKey: filter.filter,
    }
  }

  if (
    filter.column.startsWith('ev:key:') ||
    filter.column.startsWith('tag:key:')
  ) {
    return {
      id: createConditionId(),
      eventType: filter.column.startsWith('ev:key:')
        ? 'custom_event'
        : 'pageview',
      field: 'metadata',
      operator: filterToConditionOperator(filter),
      metadataKey: filter.column
        .replace(/^ev:key:/, '')
        .replace(/^tag:key:/, ''),
      value: filter.filter,
    }
  }

  return {
    id: createConditionId(),
    eventType: filter.column === 'pg' ? 'pageview' : 'any',
    field: filter.column,
    operator: filterToConditionOperator(filter),
    value: filter.filter,
  }
}

const conditionToFilter = (condition: GoalCondition): FilterType | null => {
  if (condition.field === 'metadata') {
    if (!condition.metadataKey) return null

    const prefix = getMetadataConditionPrefix(condition.eventType)

    if (
      condition.operator === 'exists' ||
      condition.operator === 'not_exists'
    ) {
      return {
        column: prefix,
        filter: condition.metadataKey,
        isExclusive: condition.operator === 'not_exists',
        isContains: false,
      }
    }

    if (!condition.value) return null
    const flags = conditionOperatorToFilterFlags(condition.operator)

    return {
      column: `${prefix}:${condition.metadataKey}`,
      filter: condition.value,
      ...flags,
    }
  }

  if (!condition.value) return null
  const flags = conditionOperatorToFilterFlags(condition.operator)

  return {
    column:
      condition.field === 'event' || condition.field === 'event_name'
        ? 'ev'
        : condition.field,
    filter: condition.value,
    ...flags,
  }
}

interface GoalSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  projectId: string
  goalId?: string | null
  tnMapping: Record<string, string>
}

const GoalSettingsModal = ({
  isOpen,
  onClose,
  onSuccess,
  projectId: _projectId,
  goalId,
  tnMapping,
}: GoalSettingsModalProps) => {
  const { t } = useTranslation()
  const fetcher = useFetcher<ProjectViewActionData>()
  const processedRef = useRef<string | null>(null)
  const goalProxy = useGoalProxy()
  const isNew = !goalId

  const [isLoading, setIsLoading] = useState(false)

  const [name, setName] = useState('')
  const [type, setType] = useState<'pageview' | 'custom_event'>('pageview')
  const [matchType, setMatchType] = useState<'exact' | 'contains'>('exact')
  const [value, setValue] = useState('')
  const [metadataFilters, setMetadataFilters] = useState<
    { key: string; value: string }[]
  >([])
  const [definitionMode, setDefinitionMode] =
    useState<(typeof DEFINITION_MODES)[number]['value']>('simple')
  const [conditionsRelation, setConditionsRelation] =
    useState<GoalConditionRelation>('AND')
  const [conditionInitialFilters, setConditionInitialFilters] = useState<
    FilterType[]
  >([])
  const [conditionFilters, setConditionFilters] = useState<FilterType[]>([])
  const [unmappedConditions, setUnmappedConditions] = useState<GoalCondition[]>(
    [],
  )
  const [conditionResetKey, setConditionResetKey] = useState('new')

  const isSaving = fetcher.state === 'submitting'

  const resetConditionFilters = useCallback((filters: FilterType[] = []) => {
    setConditionInitialFilters(filters)
    setConditionFilters(filters)
    setUnmappedConditions([])
    setConditionResetKey(createConditionId())
  }, [])

  const resetForm = useCallback(() => {
    setName('')
    setType('pageview')
    setMatchType('exact')
    setValue('')
    setMetadataFilters([])
    setDefinitionMode('simple')
    setConditionsRelation('AND')
    resetConditionFilters()
  }, [resetConditionFilters])

  const loadGoal = async () => {
    if (!goalId) return
    setIsLoading(true)
    try {
      const goal = await goalProxy.fetchGoal(goalId)
      if (!goal) {
        throw new Error('Failed to load goal')
      }
      setName(goal.name)
      setType(goal.type)
      setMatchType(goal.matchType)
      setValue(goal.value || '')
      setMetadataFilters(goal.metadataFilters || [])
      setDefinitionMode(
        goal.conditions?.conditions?.length ? 'conditions' : 'simple',
      )
      setConditionsRelation(goal.conditions?.relation || 'AND')
      const mappedFilters: FilterType[] = []
      const nextUnmappedConditions: GoalCondition[] = []
      const loadedConditions = goal.conditions?.conditions || []

      loadedConditions.forEach((condition) => {
        const filter = conditionToFilter(condition)
        if (filter) {
          mappedFilters.push(filter)
          return
        }

        nextUnmappedConditions.push({
          ...condition,
          id: condition.id || createConditionId(),
        })
      })

      setConditionInitialFilters(mappedFilters)
      setConditionFilters(mappedFilters)
      setUnmappedConditions(nextUnmappedConditions)
      setConditionResetKey(createConditionId())
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load goal')
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      if (goalId) {
        loadGoal()
      } else {
        resetForm()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, goalId])

  useEffect(() => {
    if (!fetcher.data || fetcher.state !== 'idle') return

    const responseKey = `${fetcher.data.intent}-${fetcher.data.success}`
    if (processedRef.current === responseKey) return
    processedRef.current = responseKey

    if (fetcher.data.success) {
      const { intent } = fetcher.data
      if (intent === 'create-goal') {
        toast.success(t('goals.created'))
      } else if (intent === 'update-goal') {
        toast.success(t('goals.updated'))
      }
      onSuccess()
      onClose()
    } else if (fetcher.data.error) {
      toast.error(fetcher.data.error)
    }
  }, [fetcher.data, fetcher.state, t, onSuccess, onClose])

  useEffect(() => {
    if (isOpen) {
      processedRef.current = null
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    processedRef.current = null

    const formData = new FormData()
    formData.set('intent', isNew ? 'create-goal' : 'update-goal')
    formData.set('name', name)
    formData.set('type', type)
    formData.set('matchType', matchType)
    formData.set('value', value)
    formData.set(
      'metadataFilters',
      JSON.stringify(
        metadataFilters.filter((filter) => filter.key && filter.value),
      ),
    )

    const mappedConditions = conditionFilters
      .map(filterToCondition)
      .filter((condition): condition is GoalCondition => Boolean(condition))
    const goalConditions: GoalConditions | null =
      definitionMode === 'conditions' &&
      (mappedConditions.length > 0 || unmappedConditions.length > 0)
        ? {
            relation: conditionsRelation,
            conditions: [...mappedConditions, ...unmappedConditions],
          }
        : null

    formData.set('conditions', JSON.stringify(goalConditions))

    if (!isNew && goalId) {
      formData.set('goalId', goalId)
    }

    fetcher.submit(formData, { method: 'post' })
  }

  const addMetadataFilter = () => {
    setMetadataFilters([...metadataFilters, { key: '', value: '' }])
  }

  const updateMetadataFilter = (
    index: number,
    field: 'key' | 'value',
    val: string,
  ) => {
    const updated = [...metadataFilters]
    updated[index][field] = val
    setMetadataFilters(updated)
  }

  const removeMetadataFilter = (index: number) => {
    setMetadataFilters(metadataFilters.filter((_, i) => i !== index))
  }

  return (
    <Dialog className='relative z-40' open={isOpen} onClose={onClose}>
      <DialogBackdrop
        transition
        className='fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:ease-out data-leave:duration-200 data-leave:ease-in'
      />

      <div className='fixed inset-0 z-10 w-screen overflow-y-auto'>
        <div className='flex min-h-full items-center justify-center p-4'>
          <DialogPanel
            transition
            className='w-full max-w-3xl transform rounded-xl bg-white transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:ease-out data-leave:duration-200 data-leave:ease-in dark:bg-slate-950'
          >
            {isLoading ? (
              <div className='flex min-h-[300px] items-center justify-center'>
                <Loader />
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className='px-6 pt-5 pb-4'>
                  <div className='flex items-center justify-between'>
                    <DialogTitle className='text-lg font-semibold text-gray-900 dark:text-gray-50'>
                      {isNew ? t('goals.createTitle') : t('goals.editTitle')}
                    </DialogTitle>
                    <button
                      type='button'
                      onClick={onClose}
                      className='rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-slate-900 dark:hover:text-gray-300'
                    >
                      <XIcon className='h-5 w-5' />
                    </button>
                  </div>

                  <div className='mt-4 space-y-4'>
                    <Input
                      label={t('goals.name')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('goals.namePlaceholder')}
                      required
                    />

                    <Select
                      items={DEFINITION_MODES}
                      onSelect={(item) => setDefinitionMode(item.value)}
                      title={t(
                        DEFINITION_MODES.find(
                          (item) => item.value === definitionMode,
                        )?.labelKey || 'goals.simpleGoal',
                      )}
                      label={t('goals.definitionMode')}
                      labelExtractor={(item) => t(item.labelKey)}
                      keyExtractor={(item) => item.value}
                      selectedItem={DEFINITION_MODES.find(
                        (item) => item.value === definitionMode,
                      )}
                    />

                    {definitionMode === 'simple' ? (
                      <>
                        <div>
                          <label className='mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                            {t('goals.type')}
                          </label>
                          <Select
                            items={GOAL_TYPES}
                            onSelect={(item) =>
                              setType(item.value as 'pageview' | 'custom_event')
                            }
                            title={
                              GOAL_TYPES.find((t) => t.value === type)?.label ||
                              ''
                            }
                            labelExtractor={(item) => item.label}
                            keyExtractor={(item) => item.value}
                            selectedItem={GOAL_TYPES.find(
                              (t) => t.value === type,
                            )}
                            capitalise
                          />
                          <Text
                            as='p'
                            size='xs'
                            colour='muted'
                            className='mt-1'
                          >
                            {type === 'pageview'
                              ? t('goals.typePageviewDesc')
                              : t('goals.typeCustomEventDesc')}
                          </Text>
                        </div>

                        <div>
                          <label className='mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                            {t('goals.matchType')}
                          </label>
                          <Select
                            items={GOAL_MATCH_TYPES}
                            onSelect={(item) =>
                              setMatchType(item.value as 'exact' | 'contains')
                            }
                            title={
                              GOAL_MATCH_TYPES.find(
                                (t) => t.value === matchType,
                              )?.label || ''
                            }
                            labelExtractor={(item) => item.label}
                            keyExtractor={(item) => item.value}
                            selectedItem={GOAL_MATCH_TYPES.find(
                              (t) => t.value === matchType,
                            )}
                            capitalise
                          />
                        </div>

                        <Input
                          label={
                            type === 'pageview'
                              ? t('goals.pagePath')
                              : t('goals.eventName')
                          }
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          placeholder={
                            type === 'pageview'
                              ? matchType === 'exact'
                                ? '/pricing'
                                : 'pricing'
                              : matchType === 'exact'
                                ? 'signup_completed'
                                : 'signup'
                          }
                        />

                        <div>
                          <div className='mb-2 flex items-center justify-between'>
                            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                              {t('goals.metadataFilters')}
                            </label>
                            <button
                              type='button'
                              onClick={addMetadataFilter}
                              className='flex items-center gap-1 text-sm text-gray-700 underline decoration-dashed hover:decoration-solid dark:text-gray-200'
                            >
                              <PlusIcon className='size-3' />
                              {t('goals.addFilter')}
                            </button>
                          </div>
                          {metadataFilters.length > 0 ? (
                            <div className='space-y-2'>
                              {_map(metadataFilters, (filter, index) => (
                                <div
                                  key={index}
                                  className='flex items-center gap-2'
                                >
                                  <Input
                                    value={filter.key}
                                    onChange={(e) =>
                                      updateMetadataFilter(
                                        index,
                                        'key',
                                        e.target.value,
                                      )
                                    }
                                    placeholder={t('goals.filterKey')}
                                    className='flex-1'
                                  />
                                  <span className='text-gray-500'>=</span>
                                  <Input
                                    value={filter.value}
                                    onChange={(e) =>
                                      updateMetadataFilter(
                                        index,
                                        'value',
                                        e.target.value,
                                      )
                                    }
                                    placeholder={t('goals.filterValue')}
                                    className='flex-1'
                                  />
                                  <Button
                                    variant='icon'
                                    type='button'
                                    onClick={() => removeMetadataFilter(index)}
                                    aria-label={t('common.delete')}
                                    className='p-1.5 text-gray-800 dark:text-slate-400 dark:hover:text-slate-300'
                                  >
                                    <TrashIcon className='h-4 w-4' />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Text as='p' size='sm' colour='muted'>
                              {t('goals.noMetadataFilters')}
                            </Text>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className='space-y-3'>
                        <div className='max-w-44'>
                          <Select
                            items={CONDITION_RELATIONS}
                            onSelect={(item) =>
                              setConditionsRelation(item.value)
                            }
                            title={conditionsRelation}
                            label={t('goals.matchConditionsWith')}
                            labelExtractor={(item) => item.label}
                            keyExtractor={(item) => item.value}
                            selectedItem={CONDITION_RELATIONS.find(
                              (item) => item.value === conditionsRelation,
                            )}
                          />
                        </div>

                        <div>
                          <Text
                            as='p'
                            size='sm'
                            weight='medium'
                            className='mb-3 text-gray-700 dark:text-gray-100'
                          >
                            {t('project.filters')}
                          </Text>
                          <FilterRowsEditor
                            active={isOpen && definitionMode === 'conditions'}
                            tnMapping={tnMapping}
                            initialFilters={conditionInitialFilters}
                            type='traffic'
                            filterOptions={GOAL_CONDITION_FILTER_OPTIONS}
                            onChange={setConditionFilters}
                            resetKey={conditionResetKey}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className='flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-slate-700'>
                  <Button variant='secondary' type='button' onClick={onClose}>
                    {t('common.cancel')}
                  </Button>
                  <Button type='submit' loading={isSaving}>
                    {isNew ? t('goals.create') : t('goals.save')}
                  </Button>
                </div>
              </form>
            )}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  )
}

export default GoalSettingsModal
