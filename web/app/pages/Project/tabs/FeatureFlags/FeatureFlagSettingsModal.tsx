import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from '@headlessui/react'
import cx from 'clsx'
import dayjs from 'dayjs'
import _map from 'lodash/map'
import {
  TrashIcon,
  PlusIcon,
  CodeIcon,
  CaretDownIcon,
  CaretUpDownIcon,
  CheckIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useState, useEffect, useCallback, Fragment, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import type {
  FeatureFlagSchedule,
  ProjectFeatureFlag,
  TargetingRule,
} from '~/api/api.server'
import { useFiltersProxy } from '~/hooks/useAnalyticsProxy'
import { useTheme } from '~/providers/ThemeProvider'
import type { ProjectViewActionData } from '~/routes/projects.$id'
import Button from '~/ui/Button'
import Checkbox from '~/ui/Checkbox'
import CodeBlock from '~/ui/CodeBlock'
import FilterValueInput, { filterCategoryIcons } from '~/ui/FilterValueInput'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import Textarea from '~/ui/Textarea'

const FLAG_TYPES = [
  { value: 'boolean', label: 'Boolean (On/Off)' },
  { value: 'rollout', label: 'Rollout (Percentage)' },
]

const TARGETING_COLUMNS = [
  { value: 'cc', label: 'Country' },
  { value: 'rg', label: 'Region' },
  { value: 'ct', label: 'City' },
  { value: 'dv', label: 'Device' },
  { value: 'br', label: 'Browser' },
  { value: 'os', label: 'OS' },
]

const toDateTimeLocal = (value?: string | Date | null) => {
  if (!value) return ''

  const date = dayjs(value)
  return date.isValid() ? date.format('YYYY-MM-DDTHH:mm') : ''
}

interface FeatureFlagSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  projectId: string
  flagId?: string | null
}

const FeatureFlagSettingsModal = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  flagId,
}: FeatureFlagSettingsModalProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation()
  const { theme } = useTheme()
  const isNew = !flagId
  const fetcher = useFetcher<ProjectViewActionData>()
  const lastHandledData = useRef<ProjectViewActionData | null>(null)
  const { fetchFilters } = useFiltersProxy()

  const [isLoading, setIsLoading] = useState(false)
  const [showImplementation, setShowImplementation] = useState(false)

  // Filter values cache for targeting rules
  const [filterValuesCache, setFilterValuesCache] = useState<
    Record<string, string[]>
  >({})
  const [loadingColumns, setLoadingColumns] = useState<Set<string>>(new Set())

  // Form state
  const [key, setKey] = useState('')
  const [description, setDescription] = useState('')
  const [flagType, setFlagType] = useState<'boolean' | 'rollout'>('boolean')
  const [rolloutPercentage, setRolloutPercentage] = useState(100)
  const [targetingRules, setTargetingRules] = useState<TargetingRule[]>([])
  const [enabled, setEnabled] = useState(true)
  const [scheduleChangeEnabled, setScheduleChangeEnabled] = useState(false)
  const [scheduledApplyAt, setScheduledApplyAt] = useState('')
  const [scheduledEnabled, setScheduledEnabled] = useState(true)
  const [scheduledRolloutPercentage, setScheduledRolloutPercentage] =
    useState(100)

  const isSaving = fetcher.state === 'submitting' || fetcher.state === 'loading'

  const resetForm = () => {
    setKey('')
    setDescription('')
    setFlagType('boolean')
    setRolloutPercentage(100)
    setTargetingRules([])
    setEnabled(true)
    setScheduleChangeEnabled(false)
    setScheduledApplyAt('')
    setScheduledEnabled(true)
    setScheduledRolloutPercentage(100)
    setShowImplementation(false)
  }

  const fetchFilterValues = useCallback(
    async (column: string) => {
      const cacheKey = `${projectId}-${column}`
      if (filterValuesCache[cacheKey] || loadingColumns.has(column)) return

      setLoadingColumns((prev) => new Set(prev).add(column))
      try {
        const result = await fetchFilters(projectId, column)
        setFilterValuesCache((prev) => ({ ...prev, [cacheKey]: result || [] }))
      } catch (error) {
        console.error('Failed to fetch filter values:', error)
        setFilterValuesCache((prev) => ({ ...prev, [cacheKey]: [] }))
      } finally {
        setLoadingColumns((prev) => {
          const newSet = new Set(prev)
          newSet.delete(column)
          return newSet
        })
      }
    },
    [projectId, filterValuesCache, loadingColumns, fetchFilters],
  )

  // Pre-fetch filter values when modal opens
  useEffect(() => {
    if (isOpen) {
      TARGETING_COLUMNS.forEach(({ value: column }) => {
        const cacheKey = `${projectId}-${column}`
        if (!filterValuesCache[cacheKey] && !loadingColumns.has(column)) {
          fetchFilterValues(column)
        }
      })
    }
  }, [isOpen, fetchFilterValues, filterValuesCache, loadingColumns, projectId])

  // Load flag via fetcher
  useEffect(() => {
    if (isOpen && flagId) {
      setIsLoading(true)
      fetcher.submit({ intent: 'get-feature-flag', flagId }, { method: 'POST' })
    } else if (isOpen && !flagId) {
      resetForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, flagId])

  useEffect(() => {
    if (fetcher.state !== 'idle') return

    if (isLoading) {
      setIsLoading(false)
    }

    if (!fetcher.data) return
    if (lastHandledData.current === fetcher.data) return
    lastHandledData.current = fetcher.data

    if (fetcher.data.intent === 'get-feature-flag') {
      if (fetcher.data.success && fetcher.data.data) {
        const flag = fetcher.data.data as ProjectFeatureFlag
        setKey(flag.key)
        setDescription(flag.description || '')
        setFlagType(flag.flagType)
        setRolloutPercentage(flag.rolloutPercentage)
        setTargetingRules(flag.targetingRules || [])
        setEnabled(flag.enabled)
        setScheduleChangeEnabled(Boolean(flag.scheduledChange))
        setScheduledApplyAt(toDateTimeLocal(flag.scheduledChange?.applyAt))
        setScheduledEnabled(flag.scheduledChange?.enabled ?? flag.enabled)
        setScheduledRolloutPercentage(
          flag.scheduledChange?.rolloutPercentage ?? flag.rolloutPercentage,
        )
      } else if (fetcher.data.error) {
        toast.error(fetcher.data.error)
        onClose()
      }
    } else if (fetcher.data.intent === 'create-feature-flag') {
      if (fetcher.data.success) {
        toast.success(t('featureFlags.created'))
        onSuccess()
        onClose()
      } else if (fetcher.data.error) {
        toast.error(fetcher.data.error)
      }
    } else if (fetcher.data.intent === 'update-feature-flag') {
      if (fetcher.data.success) {
        toast.success(t('featureFlags.updated'))
        onSuccess()
        onClose()
      } else if (fetcher.data.error) {
        toast.error(fetcher.data.error)
      }
    }
  }, [fetcher.data, fetcher.state, t, onSuccess, onClose, isLoading])

  // Reset ref when modal opens to allow fresh data handling
  useEffect(() => {
    if (isOpen) {
      lastHandledData.current = null
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    lastHandledData.current = null

    if (scheduleChangeEnabled) {
      if (!scheduledApplyAt) {
        toast.error(t('featureFlags.scheduleDateRequired'))
        return
      }

      const applyAt = new Date(scheduledApplyAt)

      if (Number.isNaN(applyAt.getTime()) || applyAt.getTime() <= Date.now()) {
        toast.error(t('featureFlags.scheduleDateInPast'))
        return
      }
    }

    const scheduledChange: FeatureFlagSchedule | null = scheduleChangeEnabled
      ? {
          applyAt: new Date(scheduledApplyAt).toISOString(),
          enabled: scheduledEnabled,
          ...(flagType === 'rollout'
            ? { rolloutPercentage: scheduledRolloutPercentage }
            : {}),
        }
      : null

    if (isNew) {
      fetcher.submit(
        {
          intent: 'create-feature-flag',
          key,
          description: description || '',
          flagType,
          rolloutPercentage: String(
            flagType === 'rollout' ? rolloutPercentage : 100,
          ),
          targetingRules: JSON.stringify(
            targetingRules.length > 0 ? targetingRules : [],
          ),
          enabled: String(enabled),
          scheduledChange: JSON.stringify(scheduledChange),
        },
        { method: 'POST' },
      )
    } else if (flagId) {
      fetcher.submit(
        {
          intent: 'update-feature-flag',
          flagId,
          key,
          description: description || '',
          flagType,
          rolloutPercentage: String(
            flagType === 'rollout' ? rolloutPercentage : 100,
          ),
          targetingRules: JSON.stringify(
            targetingRules.length > 0 ? targetingRules : [],
          ),
          enabled: String(enabled),
          scheduledChange: JSON.stringify(scheduledChange),
        },
        { method: 'POST' },
      )
    }
  }

  const addTargetingRule = () => {
    setTargetingRules([
      ...targetingRules,
      { column: 'cc', filter: '', isExclusive: false },
    ])
  }

  const updateTargetingRule = (
    index: number,
    field: keyof TargetingRule,
    value: string | boolean,
  ) => {
    const updated = [...targetingRules]
    if (field === 'column') {
      // Reset filter value when column changes
      updated[index] = {
        ...updated[index],
        column: value as string,
        filter: '',
      }
      // Fetch filter values for the new column if not already cached
      const cacheKey = `${projectId}-${value as string}`
      if (
        value &&
        !filterValuesCache[cacheKey] &&
        !loadingColumns.has(value as string)
      ) {
        fetchFilterValues(value as string)
      }
    } else {
      // @ts-ignore - TypeScript doesn't like dynamic field assignment
      updated[index][field] = value
    }
    setTargetingRules(updated)
  }

  const removeTargetingRule = (index: number) => {
    setTargetingRules(targetingRules.filter((_, i) => i !== index))
  }

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert to kebab-case
    const value = e.target.value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9_-]/g, '')
    setKey(value)
  }

  const jsAllFlagsCode = `// Fetch all feature flags
const flags = await swetrix.getFeatureFlags({
  profileId: 'user-123',
})
// flags = { '${key || 'my-feature'}': true/false, ... }`

  const jsSingleFlagCode = `// Fetch a single feature flag
const isEnabled = await swetrix.getFeatureFlag('${key || 'my-feature'}', {
  profileId: 'user-123',
})

if (isEnabled) {
  // Show new feature
}`

  const jsCacheCode = `// Clear feature flags cache
swetrix.clearFeatureFlagsCache()

// Force refresh on next call
const flags = await swetrix.getFeatureFlags(undefined, true)`

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
            className='w-full max-w-2xl transform rounded-xl bg-white transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:ease-out data-leave:duration-200 data-leave:ease-in dark:bg-slate-950'
          >
            {isLoading ? (
              <div className='flex min-h-[300px] items-center justify-center'>
                <Loader />
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className='max-h-[70vh] overflow-y-auto px-6 pt-5 pb-4'>
                  <div className='flex items-center justify-between'>
                    <DialogTitle className='text-lg font-semibold text-gray-900 dark:text-gray-50'>
                      {isNew
                        ? t('featureFlags.createTitle')
                        : t('featureFlags.editTitle')}
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
                      label={t('featureFlags.key')}
                      value={key}
                      onChange={handleKeyChange}
                      placeholder='my-feature-flag'
                      hint={t('featureFlags.keyHint')}
                      required
                    />

                    <Textarea
                      label={t('featureFlags.descriptionLabel')}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('featureFlags.descriptionPlaceholder')}
                      rows={2}
                    />

                    <div>
                      <label className='mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                        {t('featureFlags.flagType')}
                      </label>
                      <Select
                        items={FLAG_TYPES}
                        onSelect={(item) =>
                          setFlagType(item.value as 'boolean' | 'rollout')
                        }
                        title={
                          FLAG_TYPES.find((t) => t.value === flagType)?.label ||
                          ''
                        }
                        labelExtractor={(item) => item.label}
                        keyExtractor={(item) => item.value}
                        selectedItem={FLAG_TYPES.find(
                          (t) => t.value === flagType,
                        )}
                        capitalise
                      />
                    </div>

                    {flagType === 'rollout' ? (
                      <div>
                        <label className='mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                          {t('featureFlags.rolloutPercentage')} (
                          {rolloutPercentage}%)
                        </label>
                        <input
                          type='range'
                          min='0'
                          max='100'
                          value={rolloutPercentage}
                          onChange={(e) =>
                            setRolloutPercentage(Number(e.target.value))
                          }
                          className='w-full'
                        />
                        <div className='mt-1 flex justify-between text-xs text-gray-500'>
                          <span>0%</span>
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    ) : null}

                    {/* Targeting Rules */}
                    <div>
                      <div className='mb-2 flex items-center justify-between'>
                        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                          {t('featureFlags.targetingRules')}
                        </label>
                        <button
                          type='button'
                          onClick={addTargetingRule}
                          className='flex items-center gap-1 text-sm text-gray-700 underline decoration-dashed hover:decoration-solid dark:text-gray-200'
                        >
                          <PlusIcon className='size-3' />
                          {t('featureFlags.addRule')}
                        </button>
                      </div>
                      {targetingRules.length > 0 ? (
                        <div className='space-y-3'>
                          {_map(targetingRules, (rule, index) => (
                            <div
                              key={index}
                              className='flex items-center gap-2'
                            >
                              {/* Column Select */}
                              <Listbox
                                value={rule.column}
                                onChange={(value) =>
                                  updateTargetingRule(index, 'column', value)
                                }
                              >
                                {({ open }) => (
                                  <div className='relative w-36'>
                                    <ListboxButton className='relative w-full rounded-md border border-gray-300 bg-white py-2 pr-8 pl-3 text-left text-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 focus:outline-hidden dark:border-gray-700 dark:bg-slate-900 dark:text-gray-50 dark:hover:bg-slate-800 dark:focus:ring-slate-300'>
                                      <span className='flex items-center gap-2 truncate'>
                                        {rule.column
                                          ? filterCategoryIcons[rule.column]
                                          : null}
                                        {TARGETING_COLUMNS.find(
                                          (c) => c.value === rule.column,
                                        )?.label || t('common.select')}
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
                                        className='absolute z-50 mt-1 max-h-60 w-full min-w-[160px] overflow-auto rounded-md bg-white py-1 text-sm ring-1 ring-black/10 focus:outline-hidden dark:bg-slate-900'
                                      >
                                        {TARGETING_COLUMNS.map((col) => (
                                          <ListboxOption
                                            key={col.value}
                                            value={col.value}
                                            className={({ focus }) =>
                                              cx(
                                                'relative cursor-pointer py-2 pr-4 pl-3 select-none',
                                                {
                                                  'bg-gray-100 dark:bg-slate-700':
                                                    focus,
                                                  'text-gray-700 dark:text-gray-50':
                                                    !focus,
                                                },
                                              )
                                            }
                                          >
                                            {({ selected }) => (
                                              <span
                                                className={cx(
                                                  'flex items-center gap-2',
                                                  {
                                                    'font-medium': selected,
                                                  },
                                                )}
                                              >
                                                <span className='shrink-0 text-gray-500 dark:text-gray-400'>
                                                  {
                                                    filterCategoryIcons[
                                                      col.value
                                                    ]
                                                  }
                                                </span>
                                                <span className='truncate'>
                                                  {col.label}
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
                              <Listbox
                                value={rule.isExclusive ? 'exclude' : 'include'}
                                onChange={(value) =>
                                  updateTargetingRule(
                                    index,
                                    'isExclusive',
                                    value === 'exclude',
                                  )
                                }
                              >
                                {({ open }) => (
                                  <div className='relative w-24'>
                                    <ListboxButton className='relative w-full rounded-md border border-gray-300 bg-white py-2 pr-8 pl-3 text-left text-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 focus:outline-hidden dark:border-gray-700 dark:bg-slate-900 dark:text-gray-50 dark:hover:bg-slate-800 dark:focus:ring-slate-300'>
                                      <span className='block truncate'>
                                        {rule.isExclusive
                                          ? t('featureFlags.isNot')
                                          : t('featureFlags.is')}
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
                                        <ListboxOption
                                          value='include'
                                          className={({ focus }) =>
                                            cx(
                                              'relative cursor-pointer py-2 pr-4 pl-8 select-none',
                                              {
                                                'bg-gray-100 dark:bg-slate-700':
                                                  focus,
                                                'text-gray-700 dark:text-gray-50':
                                                  !focus,
                                              },
                                            )
                                          }
                                        >
                                          {({ selected }) => (
                                            <>
                                              <span
                                                className={cx(
                                                  'block truncate',
                                                  {
                                                    'font-medium': selected,
                                                  },
                                                )}
                                              >
                                                {t('featureFlags.is')}
                                              </span>
                                              {selected ? (
                                                <span className='absolute inset-y-0 left-0 flex items-center pl-2 text-indigo-600 dark:text-indigo-400'>
                                                  <CheckIcon className='h-4 w-4' />
                                                </span>
                                              ) : null}
                                            </>
                                          )}
                                        </ListboxOption>
                                        <ListboxOption
                                          value='exclude'
                                          className={({ focus }) =>
                                            cx(
                                              'relative cursor-pointer py-2 pr-4 pl-8 select-none',
                                              {
                                                'bg-gray-100 dark:bg-slate-700':
                                                  focus,
                                                'text-gray-700 dark:text-gray-50':
                                                  !focus,
                                              },
                                            )
                                          }
                                        >
                                          {({ selected }) => (
                                            <>
                                              <span
                                                className={cx(
                                                  'block truncate',
                                                  {
                                                    'font-medium': selected,
                                                  },
                                                )}
                                              >
                                                {t('featureFlags.isNot')}
                                              </span>
                                              {selected ? (
                                                <span className='absolute inset-y-0 left-0 flex items-center pl-2 text-indigo-600 dark:text-indigo-400'>
                                                  <CheckIcon className='h-4 w-4' />
                                                </span>
                                              ) : null}
                                            </>
                                          )}
                                        </ListboxOption>
                                      </ListboxOptions>
                                    </Transition>
                                  </div>
                                )}
                              </Listbox>

                              {/* Value Input with Autocomplete */}
                              <FilterValueInput
                                items={
                                  filterValuesCache[
                                    `${projectId}-${rule.column}`
                                  ] || []
                                }
                                value={rule.filter}
                                onChange={(value) =>
                                  updateTargetingRule(index, 'filter', value)
                                }
                                placeholder={t('featureFlags.valuePlaceholder')}
                                column={rule.column}
                                language={language}
                                isLoading={loadingColumns.has(rule.column)}
                                theme={theme}
                              />

                              {/* Delete Button */}
                              <button
                                type='button'
                                onClick={() => removeTargetingRule(index)}
                                className='rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300'
                              >
                                <TrashIcon className='h-4 w-4' />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Text as='p' size='sm' colour='muted'>
                          {t('featureFlags.noTargetingRules')}
                        </Text>
                      )}
                    </div>

                    {/* Enable checkbox */}
                    <Checkbox
                      checked={enabled}
                      onChange={setEnabled}
                      label={t('featureFlags.enableFlag')}
                      hint={t('featureFlags.enableFlagHint')}
                    />

                    <div className='rounded-lg bg-gray-50 p-3 ring-1 ring-gray-200/80 dark:bg-slate-900/50 dark:ring-slate-700/60'>
                      <Checkbox
                        checked={scheduleChangeEnabled}
                        onChange={setScheduleChangeEnabled}
                        label={t('featureFlags.scheduleChange')}
                        hint={t('featureFlags.scheduleChangeHint')}
                      />

                      {scheduleChangeEnabled ? (
                        <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                          <Input
                            type='datetime-local'
                            label={t('featureFlags.scheduleAt')}
                            value={scheduledApplyAt}
                            min={dayjs().format('YYYY-MM-DDTHH:mm')}
                            onChange={(e) =>
                              setScheduledApplyAt(e.target.value)
                            }
                            required
                          />
                          <div className='flex items-end pb-2'>
                            <Checkbox
                              checked={scheduledEnabled}
                              onChange={setScheduledEnabled}
                              label={t('featureFlags.scheduleTargetEnabled')}
                              hint={t('featureFlags.scheduleTargetEnabledHint')}
                            />
                          </div>

                          {flagType === 'rollout' ? (
                            <div className='sm:col-span-2'>
                              <label className='mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                                {t('featureFlags.scheduleRolloutPercentage')} (
                                {scheduledRolloutPercentage}%)
                              </label>
                              <input
                                type='range'
                                min='0'
                                max='100'
                                value={scheduledRolloutPercentage}
                                onChange={(e) =>
                                  setScheduledRolloutPercentage(
                                    Number(e.target.value),
                                  )
                                }
                                className='w-full'
                              />
                              <div className='mt-1 flex justify-between text-xs text-gray-500'>
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {/* How to implement section */}
                    <div className='border-t border-gray-200 pt-4 dark:border-slate-700'>
                      <button
                        type='button'
                        onClick={() =>
                          setShowImplementation(!showImplementation)
                        }
                        className='flex w-full items-center justify-between text-left'
                      >
                        <div className='flex items-center gap-2'>
                          <CodeIcon className='size-5 text-gray-500' />
                          <Text as='span' weight='medium'>
                            {t('featureFlags.howToImplement')}
                          </Text>
                        </div>
                        <CaretDownIcon
                          className={cx(
                            'size-5 text-gray-500 transition-transform',
                            {
                              'rotate-180': showImplementation,
                            },
                          )}
                        />
                      </button>

                      {showImplementation ? (
                        <div className='mt-4 space-y-4'>
                          <Text as='p' size='sm' colour='secondary'>
                            {t('featureFlags.implementationDescription')}
                          </Text>

                          <div>
                            <Text
                              as='p'
                              size='sm'
                              weight='medium'
                              className='mb-2'
                            >
                              {t('featureFlags.fetchAllFlags')}
                            </Text>
                            <CodeBlock code={jsAllFlagsCode} />
                          </div>

                          <div>
                            <Text
                              as='p'
                              size='sm'
                              weight='medium'
                              className='mb-2'
                            >
                              {t('featureFlags.singleFlag')}
                            </Text>
                            <CodeBlock code={jsSingleFlagCode} />
                          </div>

                          <div>
                            <Text
                              as='p'
                              size='sm'
                              weight='medium'
                              className='mb-2'
                            >
                              {t('featureFlags.cacheControl')}
                            </Text>
                            <CodeBlock code={jsCacheCode} />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className='flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-slate-700'>
                  <Button variant='secondary' type='button' onClick={onClose}>
                    {t('common.cancel')}
                  </Button>
                  <Button type='submit' loading={isSaving}>
                    {isNew ? t('featureFlags.create') : t('featureFlags.save')}
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

export default FeatureFlagSettingsModal
