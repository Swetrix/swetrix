import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import cx from 'clsx'
import _map from 'lodash/map'
import _sum from 'lodash/sum'
import { PlusIcon, Trash2Icon, ChevronDownIcon, TrendingUpIcon, TrendingDownIcon } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  createExperiment,
  updateExperiment,
  getExperiment,
  getProjectGoals,
  getProjectFeatureFlags,
  type ExperimentVariant,
  type Goal,
  type ProjectFeatureFlag,
  type ExposureTrigger,
  type MultipleVariantHandling,
  type FeatureFlagMode,
} from '~/api'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'

interface ExperimentSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  projectId: string
  experimentId: string | null
}

const defaultVariants: ExperimentVariant[] = [
  { name: 'Control', key: 'control', rolloutPercentage: 50, isControl: true },
  { name: 'Variant', key: 'variant', rolloutPercentage: 50, isControl: false },
]

type GoalDirection = 'increase' | 'decrease'

const ExperimentSettingsModal = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  experimentId,
}: ExperimentSettingsModalProps) => {
  const { t } = useTranslation()
  const isEditing = !!experimentId

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalsLoading, setGoalsLoading] = useState(false)
  const [featureFlags, setFeatureFlags] = useState<ProjectFeatureFlag[]>([])
  const [featureFlagsLoading, setFeatureFlagsLoading] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [featureFlagKey, setFeatureFlagKey] = useState('')
  const [goalId, setGoalId] = useState<string>('')
  const [goalDirection, setGoalDirection] = useState<GoalDirection>('increase')
  const [variants, setVariants] = useState<ExperimentVariant[]>(defaultVariants)

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [exposureTrigger, setExposureTrigger] = useState<ExposureTrigger>('feature_flag')
  const [customEventName, setCustomEventName] = useState('')
  const [multipleVariantHandling, setMultipleVariantHandling] = useState<MultipleVariantHandling>('exclude')
  const [featureFlagMode, setFeatureFlagMode] = useState<FeatureFlagMode>('create')
  const [existingFeatureFlagId, setExistingFeatureFlagId] = useState('')

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Auto-generate feature flag key from name
  const suggestedFlagKey = useMemo(() => {
    if (!name.trim()) return ''
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50)
  }, [name])

  const resetForm = () => {
    setName('')
    setDescription('')
    setFeatureFlagKey('')
    setGoalId('')
    setGoalDirection('increase')
    setVariants(defaultVariants)
    setShowAdvanced(false)
    setExposureTrigger('feature_flag')
    setCustomEventName('')
    setMultipleVariantHandling('exclude')
    setFeatureFlagMode('create')
    setExistingFeatureFlagId('')
    setErrors({})
  }

  const loadExperiment = async () => {
    if (!experimentId) return
    setIsLoading(true)
    try {
      const experiment = await getExperiment(experimentId)
      setName(experiment.name)
      setDescription(experiment.description || '')
      setFeatureFlagKey(experiment.featureFlagKey || '')
      setGoalId(experiment.goalId || '')
      setVariants(experiment.variants.length > 0 ? experiment.variants : defaultVariants)
      setExposureTrigger(experiment.exposureTrigger || 'feature_flag')
      setCustomEventName(experiment.customEventName || '')
      setMultipleVariantHandling(experiment.multipleVariantHandling || 'exclude')
      setFeatureFlagMode(experiment.featureFlagMode || 'create')
      setExistingFeatureFlagId(experiment.featureFlagId || '')

      // Show advanced if non-default values are set
      if (
        experiment.exposureTrigger === 'custom_event' ||
        experiment.multipleVariantHandling === 'first_exposure' ||
        experiment.featureFlagMode === 'link'
      ) {
        setShowAdvanced(true)
      }
    } catch (error) {
      console.error('Failed to load experiment:', error)
      toast.error(t('experiments.loadError'))
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      if (experimentId) {
        loadExperiment()
      } else {
        resetForm()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, experimentId])

  useEffect(() => {
    if (!isOpen) return

    const loadGoals = async () => {
      setGoalsLoading(true)
      try {
        const result = await getProjectGoals(projectId, 100, 0)
        setGoals(result.results)
      } catch (error) {
        console.error('Failed to load goals:', error)
      } finally {
        setGoalsLoading(false)
      }
    }

    loadGoals()
  }, [isOpen, projectId])

  useEffect(() => {
    if (!isOpen || featureFlagMode !== 'link') return

    const loadFeatureFlags = async () => {
      setFeatureFlagsLoading(true)
      try {
        const result = await getProjectFeatureFlags(projectId, 100, 0)
        setFeatureFlags(result.results)
      } catch (error) {
        console.error('Failed to load feature flags:', error)
      } finally {
        setFeatureFlagsLoading(false)
      }
    }

    loadFeatureFlags()
  }, [isOpen, projectId, featureFlagMode])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = t('experiments.nameRequired')
    }

    if (variants.length < 2) {
      newErrors.variants = t('experiments.minTwoVariants')
    }

    const controlCount = variants.filter((v) => v.isControl).length
    if (controlCount !== 1) {
      newErrors.variants = t('experiments.oneControlRequired')
    }

    const totalPercentage = _sum(variants.map((v) => v.rolloutPercentage))
    if (totalPercentage !== 100) {
      newErrors.variants = t('experiments.percentageMustSum100')
    }

    const keys = variants.map((v) => v.key)
    const uniqueKeys = new Set(keys)
    if (keys.length !== uniqueKeys.size) {
      newErrors.variants = t('experiments.duplicateKeys')
    }

    for (const variant of variants) {
      if (!variant.key.trim() || !variant.name.trim()) {
        newErrors.variants = t('experiments.variantFieldsRequired')
        break
      }
    }

    if (featureFlagMode === 'link' && !existingFeatureFlagId) {
      newErrors.featureFlag = t('experiments.selectFeatureFlag')
    }

    if (exposureTrigger === 'custom_event' && !customEventName.trim()) {
      newErrors.customEvent = t('experiments.exposureTrigger.eventName')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSaving(true)
    try {
      const effectiveFlagKey = featureFlagKey.trim() || suggestedFlagKey

      const data = {
        pid: projectId,
        name: name.trim(),
        description: description.trim() || undefined,
        exposureTrigger,
        customEventName: exposureTrigger === 'custom_event' ? customEventName.trim() : undefined,
        multipleVariantHandling,
        featureFlagMode,
        featureFlagKey: featureFlagMode === 'create' ? effectiveFlagKey || undefined : undefined,
        existingFeatureFlagId: featureFlagMode === 'link' ? existingFeatureFlagId : undefined,
        goalId: goalId || undefined,
        variants,
      }

      if (experimentId) {
        await updateExperiment(experimentId, data)
        toast.success(t('experiments.updated'))
      } else {
        await createExperiment(data)
        toast.success(t('experiments.created'))
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || t('apiNotifications.somethingWentWrong'))
    } finally {
      setIsSaving(false)
    }
  }

  // Helper to distribute percentages evenly across variants
  const distributePercentages = (variantsList: ExperimentVariant[]): ExperimentVariant[] => {
    const count = variantsList.length
    const basePercentage = Math.floor(100 / count)
    const remainder = 100 - basePercentage * count

    return variantsList.map((v, i) => ({
      ...v,
      rolloutPercentage: basePercentage + (i < remainder ? 1 : 0),
    }))
  }

  const handleAddVariant = () => {
    const variantIndex = variants.length
    const newVariant: ExperimentVariant = {
      name: `Variant ${String.fromCharCode(64 + variantIndex)}`,
      key: `variant_${String.fromCharCode(96 + variantIndex)}`,
      rolloutPercentage: 0,
      isControl: false,
    }
    // Add the new variant and redistribute percentages evenly
    const newVariants = distributePercentages([...variants, newVariant])
    setVariants(newVariants)
    if (errors.variants) {
      setErrors((prev) => {
        const { variants: _, ...rest } = prev
        return rest
      })
    }
  }

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 2) return
    const filteredVariants = variants.filter((_, i) => i !== index)
    // Redistribute percentages evenly after removal
    const newVariants = distributePercentages(filteredVariants)
    setVariants(newVariants)
    if (errors.variants) {
      setErrors((prev) => {
        const { variants: _, ...rest } = prev
        return rest
      })
    }
  }

  const handleVariantChange = (index: number, field: keyof ExperimentVariant, value: string | number | boolean) => {
    const newVariants = [...variants]
    if (field === 'isControl' && value === true) {
      newVariants.forEach((v, i) => {
        newVariants[i] = { ...v, isControl: i === index }
      })
    } else {
      newVariants[index] = { ...newVariants[index], [field]: value }
    }
    setVariants(newVariants)
    if (errors.variants) {
      setErrors((prev) => {
        const { variants: _, ...rest } = prev
        return rest
      })
    }
  }

  const distributeEvenly = () => {
    setVariants(distributePercentages(variants))
    if (errors.variants) {
      setErrors((prev) => {
        const { variants: _, ...rest } = prev
        return rest
      })
    }
  }

  const goalOptions = [
    { value: '', label: t('experiments.noGoal') },
    ...goals.map((goal) => ({ value: goal.id, label: goal.name })),
  ]

  const featureFlagOptions = [
    { value: '', label: t('experiments.selectFeatureFlag') },
    ...featureFlags.map((flag) => ({ value: flag.id, label: flag.key })),
  ]

  const totalPercentage = _sum(variants.map((v) => v.rolloutPercentage))
  const isPercentageValid = totalPercentage === 100

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
                <div className='px-6 pt-5 pb-4'>
                  {/* Header */}
                  <div className='flex items-center justify-between'>
                    <DialogTitle className='text-lg font-semibold text-gray-900 dark:text-gray-50'>
                      {isEditing ? t('experiments.edit') : t('experiments.create')}
                    </DialogTitle>
                    <button
                      type='button'
                      onClick={onClose}
                      className='rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-slate-800 dark:hover:text-gray-300'
                    >
                      <XMarkIcon className='size-5' />
                    </button>
                  </div>

                  <div className='mt-5 space-y-5'>
                    {/* Basic Info */}
                    <div className='space-y-3'>
                      <Input
                        label={t('experiments.name')}
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value)
                          if (errors.name && e.target.value.trim()) {
                            setErrors((prev) => {
                              const { name: _, ...rest } = prev
                              return rest
                            })
                          }
                        }}
                        placeholder={t('experiments.namePlaceholder')}
                        error={errors.name}
                      />

                      <Input
                        label={
                          <span className='flex items-center gap-1.5'>
                            {t('experiments.descriptionLabel')}
                            <Text size='xs' colour='muted'>
                              ({t('common.optional')})
                            </Text>
                          </span>
                        }
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('experiments.descriptionPlaceholder')}
                      />
                    </div>

                    {/* Feature Flag Key */}
                    {featureFlagMode === 'create' ? (
                      <div>
                        <div className='flex items-center gap-1.5'>
                          <Text as='label' size='sm' weight='medium' className='text-gray-700 dark:text-gray-200'>
                            {t('experiments.featureFlagKey')}
                          </Text>
                          <Tooltip text={t('experiments.featureFlagKeyHint')} className='flex items-center' />
                        </div>
                        <input
                          type='text'
                          value={featureFlagKey}
                          onChange={(e) => setFeatureFlagKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'))}
                          placeholder={suggestedFlagKey || t('experiments.featureFlagKeyPlaceholder')}
                          className='mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100'
                        />
                        {!featureFlagKey && suggestedFlagKey ? (
                          <Text size='xs' colour='muted' className='mt-1'>
                            Will use:{' '}
                            <code className='rounded bg-gray-100 px-1 dark:bg-slate-700'>{suggestedFlagKey}</code>
                          </Text>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Variants */}
                    <div>
                      <div className='mb-2 flex items-center justify-between'>
                        <div className='flex items-center gap-1.5'>
                          <Text as='label' size='sm' weight='medium' className='text-gray-700 dark:text-gray-200'>
                            {t('experiments.variants')}
                          </Text>
                          <Tooltip
                            text='Define the variants users will see. The control is your baseline (usually the current version). Other variants are what you want to test.'
                            className='flex items-center'
                          />
                        </div>
                        <button
                          type='button'
                          onClick={distributeEvenly}
                          className='text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400'
                        >
                          {t('experiments.distributeEvenly')}
                        </button>
                      </div>

                      {errors.variants ? (
                        <Text size='xs' className='mb-2 text-red-500'>
                          {errors.variants}
                        </Text>
                      ) : null}

                      <div className='space-y-2'>
                        {_map(variants, (variant, index) => (
                          <div
                            key={index}
                            className={cx(
                              'flex items-center gap-3 rounded-lg border p-3',
                              variant.isControl
                                ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20'
                                : 'border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800',
                            )}
                          >
                            {/* Variant letter badge */}
                            <div
                              className={cx(
                                'flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold',
                                variant.isControl
                                  ? 'bg-indigo-200 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-200'
                                  : 'bg-gray-200 text-gray-600 dark:bg-slate-600 dark:text-gray-300',
                              )}
                            >
                              {String.fromCharCode(65 + index)}
                            </div>

                            {/* Name & Key */}
                            <div className='flex flex-1 gap-2'>
                              <input
                                type='text'
                                value={variant.name}
                                onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                                placeholder='Name'
                                className='w-32 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700'
                              />
                              <input
                                type='text'
                                value={variant.key}
                                onChange={(e) =>
                                  handleVariantChange(
                                    index,
                                    'key',
                                    e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                                  )
                                }
                                placeholder='key'
                                className='w-36 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 font-mono text-sm dark:border-slate-600 dark:bg-slate-700'
                              />
                            </div>

                            {/* Percentage */}
                            <div className='flex items-center gap-1'>
                              <input
                                type='text'
                                inputMode='numeric'
                                value={variant.rolloutPercentage}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, '')
                                  const num = parseInt(val, 10) || 0
                                  handleVariantChange(index, 'rolloutPercentage', Math.min(100, num))
                                }}
                                className='w-12 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-center text-sm dark:border-slate-600 dark:bg-slate-700'
                              />
                              <Text size='sm' colour='muted'>
                                %
                              </Text>
                            </div>

                            {/* Control toggle */}
                            <label className='flex shrink-0 cursor-pointer items-center gap-1.5'>
                              <input
                                type='radio'
                                name='controlVariant'
                                checked={variant.isControl}
                                onChange={() => handleVariantChange(index, 'isControl', true)}
                                className='size-3.5 text-indigo-600'
                              />
                              <Text size='xs' colour='muted'>
                                {t('experiments.control')}
                              </Text>
                            </label>

                            {/* Remove button */}
                            {variants.length > 2 ? (
                              <button
                                type='button'
                                onClick={() => handleRemoveVariant(index)}
                                className='rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500 dark:hover:bg-slate-600'
                              >
                                <Trash2Icon className='size-4' />
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      <div className='mt-2 flex items-center justify-between'>
                        <button
                          type='button'
                          onClick={handleAddVariant}
                          className='flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                        >
                          <PlusIcon className='size-4' />
                          {t('experiments.addVariant')}
                        </button>
                        <Text
                          size='sm'
                          weight='medium'
                          className={
                            isPercentageValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {totalPercentage}%
                        </Text>
                      </div>
                    </div>

                    {/* Success Metric */}
                    <div>
                      <div className='flex items-center gap-1.5'>
                        <Text as='label' size='sm' weight='medium' className='text-gray-700 dark:text-gray-200'>
                          {t('experiments.goal')}
                        </Text>
                        <Tooltip
                          text='Select a goal to measure which variant performs better. You can start the experiment without a goal and add one later.'
                          className='flex items-center'
                        />
                        <Text size='xs' colour='muted'>
                          ({t('common.optional')})
                        </Text>
                      </div>

                      <div className='mt-1.5 flex gap-2'>
                        <div className='flex-1'>
                          <Select
                            items={goalOptions}
                            keyExtractor={(item) => item.value}
                            labelExtractor={(item) => item.label}
                            onSelect={(item) => setGoalId(item.value)}
                            selectedItem={goalOptions.find((g) => g.value === goalId)}
                            title={goalOptions.find((g) => g.value === goalId)?.label || t('experiments.noGoal')}
                            capitalise
                          />
                        </div>

                        {goalId ? (
                          <div className='flex rounded-md border border-gray-300 dark:border-slate-600'>
                            <button
                              type='button'
                              onClick={() => setGoalDirection('increase')}
                              className={cx(
                                'flex items-center gap-1 rounded-l-md px-3 py-2 text-sm transition-colors',
                                goalDirection === 'increase'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700',
                              )}
                            >
                              <TrendingUpIcon className='size-4' />
                              <span className='hidden sm:inline'>Increase</span>
                            </button>
                            <button
                              type='button'
                              onClick={() => setGoalDirection('decrease')}
                              className={cx(
                                'flex items-center gap-1 rounded-r-md border-l border-gray-300 px-3 py-2 text-sm transition-colors dark:border-slate-600',
                                goalDirection === 'decrease'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700',
                              )}
                            >
                              <TrendingDownIcon className='size-4' />
                              <span className='hidden sm:inline'>Decrease</span>
                            </button>
                          </div>
                        ) : null}
                      </div>

                      {goalsLoading ? (
                        <Text size='xs' colour='muted' className='mt-1'>
                          {t('experiments.loadingGoals')}
                        </Text>
                      ) : null}
                      {!goalsLoading && goals.length === 0 ? (
                        <Text size='xs' colour='muted' className='mt-1'>
                          {t('experiments.noGoalsHint')}
                        </Text>
                      ) : null}
                    </div>

                    {/* Advanced Settings */}
                    <div className='border-t border-gray-200 pt-4 dark:border-slate-700'>
                      <button
                        type='button'
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className='flex w-full items-center justify-between text-left'
                      >
                        <Text size='sm' weight='medium' colour='muted'>
                          Advanced settings
                        </Text>
                        <ChevronDownIcon
                          className={cx('size-4 text-gray-400 transition-transform', showAdvanced && 'rotate-180')}
                        />
                      </button>

                      {showAdvanced ? (
                        <div className='mt-4 space-y-4'>
                          {/* Feature flag mode */}
                          <div>
                            <div className='flex items-center gap-1.5'>
                              <Text as='label' size='sm' weight='medium' className='text-gray-700 dark:text-gray-200'>
                                Feature flag source
                              </Text>
                              <Tooltip
                                text='Choose to create a new feature flag for this experiment or link an existing one.'
                                className='flex items-center'
                              />
                            </div>
                            <div className='mt-1.5 flex gap-2'>
                              <button
                                type='button'
                                onClick={() => setFeatureFlagMode('create')}
                                className={cx(
                                  'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                                  featureFlagMode === 'create'
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300'
                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300',
                                )}
                              >
                                Create new
                              </button>
                              <button
                                type='button'
                                onClick={() => setFeatureFlagMode('link')}
                                className={cx(
                                  'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                                  featureFlagMode === 'link'
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300'
                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300',
                                )}
                              >
                                Link existing
                              </button>
                            </div>
                          </div>

                          {featureFlagMode === 'link' ? (
                            <div>
                              <Select
                                label={t('experiments.selectFeatureFlag')}
                                items={featureFlagOptions}
                                keyExtractor={(item) => item.value}
                                labelExtractor={(item) => item.label}
                                onSelect={(item) => setExistingFeatureFlagId(item.value)}
                                selectedItem={featureFlagOptions.find((f) => f.value === existingFeatureFlagId)}
                                title={
                                  featureFlagOptions.find((f) => f.value === existingFeatureFlagId)?.label ||
                                  t('experiments.selectFeatureFlag')
                                }
                              />
                              {featureFlagsLoading ? (
                                <Text size='xs' colour='muted' className='mt-1'>
                                  {t('experiments.loadingFeatureFlags')}
                                </Text>
                              ) : null}
                              {errors.featureFlag ? (
                                <Text size='xs' className='mt-1 text-red-500'>
                                  {errors.featureFlag}
                                </Text>
                              ) : null}
                            </div>
                          ) : null}

                          {/* Exposure trigger */}
                          <div>
                            <div className='flex items-center gap-1.5'>
                              <Text as='label' size='sm' weight='medium' className='text-gray-700 dark:text-gray-200'>
                                Exposure tracking
                              </Text>
                              <Tooltip
                                text='How to detect when a user has been exposed to the experiment. Default uses the feature flag call. Custom lets you specify a different event.'
                                className='flex items-center'
                              />
                            </div>
                            <div className='mt-1.5 flex gap-2'>
                              <button
                                type='button'
                                onClick={() => setExposureTrigger('feature_flag')}
                                className={cx(
                                  'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                                  exposureTrigger === 'feature_flag'
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300'
                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300',
                                )}
                              >
                                Default
                              </button>
                              <button
                                type='button'
                                onClick={() => setExposureTrigger('custom_event')}
                                className={cx(
                                  'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                                  exposureTrigger === 'custom_event'
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300'
                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300',
                                )}
                              >
                                Custom event
                              </button>
                            </div>

                            {exposureTrigger === 'custom_event' ? (
                              <Input
                                className='mt-2'
                                value={customEventName}
                                onChange={(e) => setCustomEventName(e.target.value)}
                                placeholder={t('experiments.exposureTrigger.eventNamePlaceholder')}
                                error={errors.customEvent}
                              />
                            ) : null}
                          </div>

                          {/* Multiple variant handling */}
                          <div>
                            <div className='flex items-center gap-1.5'>
                              <Text as='label' size='sm' weight='medium' className='text-gray-700 dark:text-gray-200'>
                                Multi-exposure handling
                              </Text>
                              <Tooltip
                                text={
                                  <div>
                                    <p className='font-medium'>What happens if a user sees multiple variants?</p>
                                    <p className='mt-1'>
                                      <strong>Exclude:</strong> Remove them from analysis (recommended)
                                    </p>
                                    <p className='mt-0.5'>
                                      <strong>First exposure:</strong> Only count their first variant
                                    </p>
                                  </div>
                                }
                                className='flex items-center'
                              />
                            </div>
                            <div className='mt-1.5 flex gap-2'>
                              <button
                                type='button'
                                onClick={() => setMultipleVariantHandling('exclude')}
                                className={cx(
                                  'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                                  multipleVariantHandling === 'exclude'
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300'
                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300',
                                )}
                              >
                                Exclude
                              </button>
                              <button
                                type='button'
                                onClick={() => setMultipleVariantHandling('first_exposure')}
                                className={cx(
                                  'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                                  multipleVariantHandling === 'first_exposure'
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300'
                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300',
                                )}
                              >
                                First only
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className='flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-slate-700'>
                  <Button type='button' onClick={onClose} secondary regular>
                    {t('common.cancel')}
                  </Button>
                  <Button type='submit' primary regular loading={isSaving}>
                    {isEditing ? t('common.save') : t('experiments.create')}
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

export default ExperimentSettingsModal
