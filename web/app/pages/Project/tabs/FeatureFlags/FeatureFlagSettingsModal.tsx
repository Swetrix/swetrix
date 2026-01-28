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
import {
  XMarkIcon,
  ClipboardIcon,
  CheckIcon as HeroCheckIcon,
} from '@heroicons/react/24/outline'
import cx from 'clsx'
import _map from 'lodash/map'
import {
  Trash2Icon,
  PlusIcon,
  CodeIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  CheckIcon,
} from 'lucide-react'
import { useState, useEffect, useCallback, Fragment, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import type { ProjectFeatureFlag, TargetingRule } from '~/api/api.server'
import { useFiltersProxy } from '~/hooks/useAnalyticsProxy'
import { useTheme } from '~/providers/ThemeProvider'
import type { ProjectViewActionData } from '~/routes/projects.$id'
import Button from '~/ui/Button'
import Checkbox from '~/ui/Checkbox'
import FilterValueInput, { filterCategoryIcons } from '~/ui/FilterValueInput'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'

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
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

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

  const isSaving = fetcher.state === 'submitting' || fetcher.state === 'loading'

  const resetForm = () => {
    setKey('')
    setDescription('')
    setFlagType('boolean')
    setRolloutPercentage(100)
    setTargetingRules([])
    setEnabled(true)
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

  const copyToClipboard = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(id)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
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
            className='w-full max-w-2xl transform rounded-xl bg-white transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:ease-out data-leave:duration-200 data-leave:ease-in dark:bg-slate-900'
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
                      className='rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-slate-800 dark:hover:text-gray-300'
                    >
                      <XMarkIcon className='h-5 w-5' />
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

                    <div>
                      <label className='mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                        {t('featureFlags.descriptionLabel')}
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('featureFlags.descriptionPlaceholder')}
                        rows={2}
                        className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 dark:placeholder-gray-400'
                      />
                    </div>

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
                          className='flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400'
                        >
                          <PlusIcon className='h-4 w-4' />
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
                                    <ListboxButton className='relative w-full rounded-md border border-gray-300 bg-white py-2 pr-8 pl-3 text-left text-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:outline-hidden dark:border-gray-700 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'>
                                      <span className='flex items-center gap-2 truncate'>
                                        {rule.column
                                          ? filterCategoryIcons[rule.column]
                                          : null}
                                        {TARGETING_COLUMNS.find(
                                          (c) => c.value === rule.column,
                                        )?.label || t('common.select')}
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
                                        className='absolute z-50 mt-1 max-h-60 w-full min-w-[160px] overflow-auto rounded-md bg-white py-1 text-sm ring-1 ring-black/10 focus:outline-hidden dark:bg-slate-800'
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
                                                  { 'font-medium': selected },
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
                                    <ListboxButton className='relative w-full rounded-md border border-gray-300 bg-white py-2 pr-8 pl-3 text-left text-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:outline-hidden dark:border-gray-700 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'>
                                      <span className='block truncate'>
                                        {rule.isExclusive
                                          ? t('featureFlags.isNot')
                                          : t('featureFlags.is')}
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
                                                  { 'font-medium': selected },
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
                                                  { 'font-medium': selected },
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
                                className='rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-gray-300'
                              >
                                <Trash2Icon className='h-4 w-4' />
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
                        <ChevronDownIcon
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

                          {/* JavaScript SDK */}
                          <div>
                            <div className='mb-2 flex items-center justify-between'>
                              <Text as='span' size='sm' weight='medium'>
                                Fetch all flags
                              </Text>
                              <button
                                type='button'
                                onClick={() =>
                                  copyToClipboard(jsAllFlagsCode, 'js-all')
                                }
                                className='flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700'
                              >
                                {copiedCode === 'js-all' ? (
                                  <HeroCheckIcon className='size-4 text-green-500' />
                                ) : (
                                  <ClipboardIcon className='size-4' />
                                )}
                                {copiedCode === 'js-all' ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                            <pre className='overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100'>
                              <code>{jsAllFlagsCode}</code>
                            </pre>
                          </div>

                          {/* Single flag */}
                          <div>
                            <div className='mb-2 flex items-center justify-between'>
                              <Text as='span' size='sm' weight='medium'>
                                Single flag
                              </Text>
                              <button
                                type='button'
                                onClick={() =>
                                  copyToClipboard(
                                    jsSingleFlagCode,
                                    'js-single',
                                  )
                                }
                                className='flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700'
                              >
                                {copiedCode === 'js-single' ? (
                                  <HeroCheckIcon className='size-4 text-green-500' />
                                ) : (
                                  <ClipboardIcon className='size-4' />
                                )}
                                {copiedCode === 'js-single' ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                            <pre className='overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100'>
                              <code>{jsSingleFlagCode}</code>
                            </pre>
                          </div>

                          {/* Cache control */}
                          <div>
                            <div className='mb-2 flex items-center justify-between'>
                              <Text as='span' size='sm' weight='medium'>
                                Cache control
                              </Text>
                              <button
                                type='button'
                                onClick={() => copyToClipboard(jsCacheCode, 'js-cache')}
                                className='flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700'
                              >
                                {copiedCode === 'js-cache' ? (
                                  <HeroCheckIcon className='size-4 text-green-500' />
                                ) : (
                                  <ClipboardIcon className='size-4' />
                                )}
                                {copiedCode === 'js-cache' ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                            <pre className='overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100'>
                              <code>{jsCacheCode}</code>
                            </pre>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className='flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-slate-700'>
                  <Button type='button' onClick={onClose} secondary regular>
                    {t('common.cancel')}
                  </Button>
                  <Button type='submit' primary regular loading={isSaving}>
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
