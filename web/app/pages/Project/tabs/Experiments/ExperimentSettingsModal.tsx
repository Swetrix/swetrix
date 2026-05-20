import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react'
import cx from 'clsx'
import _map from 'lodash/map'
import _sum from 'lodash/sum'
import {
  PlusIcon,
  TrashIcon,
  CaretDownIcon,
  TrendUpIcon,
  TrendDownIcon,
  XIcon,
  CalculatorIcon,
} from '@phosphor-icons/react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import type {
  ExperimentVariant,
  Goal,
  ProjectFeatureFlag,
  ExposureTrigger,
  MultipleVariantHandling,
  FeatureFlagMode,
} from '~/api/api.server'
import {
  useExperimentProxy,
  useProjectGoalsProxy,
  useProjectFeatureFlagsProxy,
} from '~/hooks/useAnalyticsProxy'
import type { ProjectViewActionData } from '~/routes/projects.$id'
import Button from '~/ui/Button'
import Checkbox from '~/ui/Checkbox'
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
  const experimentProxy = useExperimentProxy()
  const { fetchGoals } = useProjectGoalsProxy()
  const { fetchFeatureFlags } = useProjectFeatureFlagsProxy()
  const fetcher = useFetcher<ProjectViewActionData>()
  const processedRef = useRef<string | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalsLoading, setGoalsLoading] = useState(false)
  const [featureFlags, setFeatureFlags] = useState<ProjectFeatureFlag[]>([])
  const [featureFlagsLoading, setFeatureFlagsLoading] = useState(false)

  const isSaving = fetcher.state === 'submitting'

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [hypothesis, setHypothesis] = useState('')
  const [featureFlagKey, setFeatureFlagKey] = useState('')
  const [goalId, setGoalId] = useState<string>('')
  const [goalDirection, setGoalDirection] = useState<GoalDirection>('increase')
  const [variants, setVariants] = useState<ExperimentVariant[]>(defaultVariants)
  const [baselineConversionRate, setBaselineConversionRate] = useState(5)
  const [minimumDetectableEffect, setMinimumDetectableEffect] = useState(10)
  const [dailyExposures, setDailyExposures] = useState(500)

  const [showPlanning, setShowPlanning] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [exposureTrigger, setExposureTrigger] =
    useState<ExposureTrigger>('feature_flag')
  const [customEventName, setCustomEventName] = useState('')
  const [multipleVariantHandling, setMultipleVariantHandling] =
    useState<MultipleVariantHandling>('exclude')
  const [featureFlagMode, setFeatureFlagMode] =
    useState<FeatureFlagMode>('create')
  const [existingFeatureFlagId, setExistingFeatureFlagId] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})

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
    setHypothesis('')
    setFeatureFlagKey('')
    setGoalId('')
    setGoalDirection('increase')
    setVariants(defaultVariants)
    setBaselineConversionRate(5)
    setMinimumDetectableEffect(10)
    setDailyExposures(500)
    setShowPlanning(false)
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
    setShowPlanning(false)
    setBaselineConversionRate(5)
    setMinimumDetectableEffect(10)
    setDailyExposures(500)
    setIsLoading(true)
    try {
      const experiment = await experimentProxy.fetchExperiment(experimentId)
      if (!experiment) {
        throw new Error('Failed to load experiment')
      }
      setName(experiment.name)
      setDescription(experiment.description || '')
      setHypothesis(experiment.hypothesis || '')
      setFeatureFlagKey(experiment.featureFlagKey || '')
      setGoalId(experiment.goalId || '')
      setVariants(
        experiment.variants.length > 0 ? experiment.variants : defaultVariants,
      )
      setExposureTrigger(experiment.exposureTrigger || 'feature_flag')
      setCustomEventName(experiment.customEventName || '')
      setMultipleVariantHandling(
        experiment.multipleVariantHandling || 'exclude',
      )
      setFeatureFlagMode(experiment.featureFlagMode || 'create')
      setExistingFeatureFlagId(experiment.featureFlagId || '')

      if (
        experiment.exposureTrigger === 'custom_event' ||
        experiment.multipleVariantHandling === 'first_exposure' ||
        experiment.featureFlagMode === 'link'
      ) {
        setShowAdvanced(true)
      }
    } catch (error) {
      console.error('Failed to load experiment:', error)
      toast.error(
        typeof error === 'string' ? error : t('experiments.loadError'),
      )
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
        const result = await fetchGoals(projectId, {
          take: 100,
          skip: 0,
        })
        if (result) {
          setGoals(result.results)
        }
      } catch (error) {
        console.error('Failed to load goals:', error)
      } finally {
        setGoalsLoading(false)
      }
    }

    loadGoals()
  }, [isOpen, projectId, fetchGoals])

  useEffect(() => {
    if (!isOpen || featureFlagMode !== 'link') return

    const loadFeatureFlags = async () => {
      setFeatureFlagsLoading(true)
      try {
        const result = await fetchFeatureFlags(projectId, {
          take: 100,
          skip: 0,
        })
        if (result) {
          setFeatureFlags(result.results)
        }
      } catch (error) {
        console.error('Failed to load feature flags:', error)
      } finally {
        setFeatureFlagsLoading(false)
      }
    }

    loadFeatureFlags()
  }, [isOpen, projectId, featureFlagMode, fetchFeatureFlags])

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

    if (
      selectedFeatureFlag?.experimentId &&
      selectedFeatureFlag.experimentId !== experimentId
    ) {
      newErrors.featureFlag = t('experiments.settings.featureFlagAlreadyLinked')
    }

    if (exposureTrigger === 'custom_event' && !customEventName.trim()) {
      newErrors.customEvent = t('experiments.exposureTrigger.eventName')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle fetcher response
  useEffect(() => {
    if (!fetcher.data || fetcher.state !== 'idle') return

    const responseKey = `${fetcher.data.intent}-${fetcher.data.success}`
    if (processedRef.current === responseKey) return
    processedRef.current = responseKey

    if (fetcher.data.success) {
      const { intent } = fetcher.data
      if (intent === 'create-experiment') {
        toast.success(t('experiments.created'))
      } else if (intent === 'update-experiment') {
        toast.success(t('experiments.updated'))
      }
      onSuccess()
      onClose()
    } else if (fetcher.data.error) {
      toast.error(fetcher.data.error)
    }
  }, [fetcher.data, fetcher.state, t, onSuccess, onClose])

  // Reset processed ref when modal opens
  useEffect(() => {
    if (isOpen) {
      processedRef.current = null
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    processedRef.current = null
    const effectiveFlagKey = featureFlagKey.trim() || suggestedFlagKey

    const formData = new FormData()
    formData.set(
      'intent',
      isEditing ? 'update-experiment' : 'create-experiment',
    )
    formData.set('name', name.trim())
    formData.set('description', description.trim())
    formData.set('hypothesis', hypothesis.trim())
    formData.set('exposureTrigger', exposureTrigger)
    formData.set(
      'customEventName',
      exposureTrigger === 'custom_event' ? customEventName.trim() : '',
    )
    formData.set('multipleVariantHandling', multipleVariantHandling)
    formData.set('filterInternalUsers', 'true')
    formData.set('featureFlagMode', featureFlagMode)
    formData.set(
      'featureFlagKey',
      featureFlagMode === 'create' ? effectiveFlagKey : '',
    )
    formData.set(
      'existingFeatureFlagId',
      featureFlagMode === 'link' ? existingFeatureFlagId : '',
    )
    formData.set('goalId', goalId)
    formData.set('variants', JSON.stringify(variants))

    if (isEditing && experimentId) {
      formData.set('experimentId', experimentId)
    }

    fetcher.submit(formData, { method: 'post' })
  }

  const distributePercentages = (
    variantsList: ExperimentVariant[],
  ): ExperimentVariant[] => {
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
    const newVariants = distributePercentages(filteredVariants)
    setVariants(newVariants)
    if (errors.variants) {
      setErrors((prev) => {
        const { variants: _, ...rest } = prev
        return rest
      })
    }
  }

  const handleVariantChange = (
    index: number,
    field: keyof ExperimentVariant,
    value: string | number | boolean,
  ) => {
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

  const selectedFeatureFlag = useMemo(
    () => featureFlags.find((flag) => flag.id === existingFeatureFlagId),
    [featureFlags, existingFeatureFlagId],
  )

  const totalPercentage = _sum(variants.map((v) => v.rolloutPercentage))
  const isPercentageValid = totalPercentage === 100
  const minAllocation = Math.min(...variants.map((v) => v.rolloutPercentage))
  const maxAllocation = Math.max(...variants.map((v) => v.rolloutPercentage))

  const sampleEstimate = useMemo(() => {
    const baseline = Math.max(0.001, baselineConversionRate / 100)
    const relativeLift = Math.max(0.001, minimumDetectableEffect / 100)
    const target = Math.min(0.999, baseline * (1 + relativeLift))
    const pooled = (baseline + target) / 2
    const delta = Math.abs(target - baseline)
    const zAlpha = 1.96
    const zBeta = 0.84
    const numerator = Math.pow(
      zAlpha * Math.sqrt(2 * pooled * (1 - pooled)) +
        zBeta * Math.sqrt(baseline * (1 - baseline) + target * (1 - target)),
      2,
    )
    const perVariant = Math.ceil(numerator / Math.pow(delta, 2))
    const slowestDailyTraffic = Math.max(
      0,
      dailyExposures * (minAllocation / 100),
    )
    const estimatedDays =
      slowestDailyTraffic > 0
        ? Math.ceil(perVariant / slowestDailyTraffic)
        : null

    return {
      perVariant,
      total: perVariant * variants.length,
      estimatedDays,
      targetRate: target * 100,
    }
  }, [
    baselineConversionRate,
    minimumDetectableEffect,
    dailyExposures,
    minAllocation,
    variants.length,
  ])

  const launchGuardrails = useMemo(() => {
    const items: Array<{ severity: 'blocker' | 'warning'; message: string }> =
      []

    if (!goalId) {
      items.push({
        severity: 'blocker',
        message: t('experiments.settings.guardrails.addGoal'),
      })
    }

    if (
      exposureTrigger === 'custom_event' &&
      customEventName.trim().length === 0
    ) {
      items.push({
        severity: 'blocker',
        message: t('experiments.settings.guardrails.addCustomExposureEvent'),
      })
    }

    if (featureFlagMode === 'link' && !existingFeatureFlagId) {
      items.push({
        severity: 'blocker',
        message: t('experiments.settings.guardrails.selectFeatureFlag'),
      })
    }

    if (
      selectedFeatureFlag?.experimentId &&
      selectedFeatureFlag.experimentId !== experimentId
    ) {
      items.push({
        severity: 'blocker',
        message: t('experiments.settings.guardrails.featureFlagAlreadyLinked'),
      })
    }

    if (!isPercentageValid) {
      items.push({
        severity: 'blocker',
        message: t('experiments.settings.guardrails.percentagesTotal'),
      })
    }

    if (variants.some((variant) => variant.rolloutPercentage <= 0)) {
      items.push({
        severity: 'blocker',
        message: t('experiments.settings.guardrails.everyVariantTraffic'),
      })
    }

    if (maxAllocation - minAllocation > 10) {
      items.push({
        severity: 'warning',
        message: t('experiments.settings.guardrails.unevenAllocation'),
      })
    }

    if (minAllocation > 0 && minAllocation < 10) {
      items.push({
        severity: 'warning',
        message: t('experiments.settings.guardrails.lowTrafficVariant'),
      })
    }

    if (sampleEstimate.estimatedDays && sampleEstimate.estimatedDays > 56) {
      items.push({
        severity: 'warning',
        message: t('experiments.settings.guardrails.longEstimate'),
      })
    }

    if (sampleEstimate.perVariant < 100) {
      items.push({
        severity: 'warning',
        message: t('experiments.settings.guardrails.smallEstimate'),
      })
    }

    if (!hypothesis.trim()) {
      items.push({
        severity: 'warning',
        message: t('experiments.settings.guardrails.noHypothesis'),
      })
    }

    if (multipleVariantHandling === 'first_exposure') {
      items.push({
        severity: 'warning',
        message: t('experiments.settings.guardrails.firstExposureHandling'),
      })
    }

    return items
  }, [
    customEventName,
    experimentId,
    exposureTrigger,
    existingFeatureFlagId,
    featureFlagMode,
    goalId,
    hypothesis,
    isPercentageValid,
    maxAllocation,
    minAllocation,
    multipleVariantHandling,
    sampleEstimate.estimatedDays,
    sampleEstimate.perVariant,
    selectedFeatureFlag?.experimentId,
    t,
    variants,
  ])

  const launchBlockers = launchGuardrails.filter(
    (item) => item.severity === 'blocker',
  )
  const launchWarnings = launchGuardrails.filter(
    (item) => item.severity === 'warning',
  )
  const launchReadiness =
    launchBlockers.length > 0
      ? 'blocked'
      : launchWarnings.length > 0
        ? 'review'
        : 'ready'

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
                      {isEditing
                        ? t('experiments.edit')
                        : t('experiments.create')}
                    </DialogTitle>
                    <button
                      type='button'
                      onClick={onClose}
                      className='rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-slate-900 dark:hover:text-gray-300'
                    >
                      <XIcon className='size-5' />
                    </button>
                  </div>

                  <div className='mt-5 space-y-5'>
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
                            <Text as='span' size='sm' colour='inherit'>
                              {t('experiments.descriptionLabel')}
                            </Text>
                            <Text as='span' size='xs' colour='muted'>
                              ({t('common.optional')})
                            </Text>
                          </span>
                        }
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('experiments.descriptionPlaceholder')}
                      />

                      <Input
                        label={
                          <span className='flex items-center gap-1.5'>
                            <Text as='span' size='sm' colour='inherit'>
                              {t('experiments.hypothesisLabel')}
                            </Text>
                            <Text as='span' size='xs' colour='muted'>
                              ({t('common.optional')})
                            </Text>
                          </span>
                        }
                        value={hypothesis}
                        onChange={(e) => setHypothesis(e.target.value)}
                        placeholder={t('experiments.hypothesisPlaceholder')}
                      />
                    </div>

                    {featureFlagMode === 'create' ? (
                      <div>
                        <Input
                          label={
                            <span className='flex items-center gap-1.5'>
                              <Text as='span' size='sm' colour='inherit'>
                                {t('experiments.featureFlagKey')}
                              </Text>
                              <Tooltip
                                text={t('experiments.featureFlagKeyHint')}
                                className='flex items-center'
                              />
                            </span>
                          }
                          value={featureFlagKey}
                          onChange={(e) =>
                            setFeatureFlagKey(
                              e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9_-]/g, '_'),
                            )
                          }
                          placeholder={
                            suggestedFlagKey ||
                            t('experiments.featureFlagKeyPlaceholder')
                          }
                          classes={{ input: 'font-mono px-3 py-2' }}
                        />
                        {!featureFlagKey && suggestedFlagKey ? (
                          <Text size='xs' colour='muted' className='mt-1'>
                            {t('experiments.settings.willUse')}{' '}
                            <Text size='xs' colour='secondary' code>
                              {suggestedFlagKey}
                            </Text>
                          </Text>
                        ) : null}
                      </div>
                    ) : null}

                    <div>
                      <div className='mb-2 flex items-center justify-between'>
                        <div className='flex items-center gap-1.5'>
                          <Text
                            as='label'
                            size='sm'
                            weight='medium'
                            className='text-gray-700 dark:text-gray-200'
                          >
                            {t('experiments.variants')}
                          </Text>
                          <Tooltip
                            text={t('experiments.settings.variantsHint')}
                            className='flex items-center'
                          />
                        </div>
                        <Button
                          variant='secondary'
                          size='sm'
                          type='button'
                          onClick={distributeEvenly}
                        >
                          {t('experiments.distributeEvenly')}
                        </Button>
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
                                ? 'border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-900'
                                : 'border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-950',
                            )}
                          >
                            <div
                              className={cx(
                                'flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold',
                                variant.isControl
                                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                                  : 'bg-gray-200 text-gray-600 dark:bg-slate-900 dark:text-gray-300',
                              )}
                            >
                              {String.fromCharCode(65 + index)}
                            </div>

                            <div className='flex flex-1 gap-2'>
                              <Input
                                className='w-32'
                                value={variant.name}
                                onChange={(e) =>
                                  handleVariantChange(
                                    index,
                                    'name',
                                    e.target.value,
                                  )
                                }
                                placeholder={t(
                                  'experiments.settings.variantNamePlaceholder',
                                )}
                                classes={{ input: 'px-2.5 py-1.5' }}
                              />
                              <Input
                                className='w-36'
                                value={variant.key}
                                onChange={(e) =>
                                  handleVariantChange(
                                    index,
                                    'key',
                                    e.target.value
                                      .toLowerCase()
                                      .replace(/[^a-z0-9_]/g, '_'),
                                  )
                                }
                                placeholder={t(
                                  'experiments.settings.variantKeyPlaceholder',
                                )}
                                classes={{ input: 'px-2.5 py-1.5 font-mono' }}
                              />
                            </div>

                            <div className='flex items-center gap-1'>
                              <Input
                                className='w-14'
                                inputMode='numeric'
                                value={variant.rolloutPercentage}
                                onChange={(e) => {
                                  const val = e.target.value.replace(
                                    /[^0-9]/g,
                                    '',
                                  )
                                  const num = parseInt(val, 10) || 0
                                  handleVariantChange(
                                    index,
                                    'rolloutPercentage',
                                    Math.min(100, num),
                                  )
                                }}
                                classes={{ input: 'px-2 py-1.5 text-center' }}
                              />
                              <Text size='sm' colour='muted'>
                                %
                              </Text>
                            </div>

                            <Checkbox
                              label={t('experiments.control')}
                              checked={variant.isControl}
                              onChange={(checked) => {
                                if (checked) {
                                  handleVariantChange(index, 'isControl', true)
                                }
                              }}
                              classes={{
                                label:
                                  'shrink-0 gap-1.5 [&>label]:text-xs [&>label]:font-normal [&>label]:text-gray-500 dark:[&>label]:text-gray-400',
                              }}
                            />

                            {variants.length > 2 ? (
                              <Button
                                variant='secondary'
                                size='sm'
                                type='button'
                                className='p-1.5'
                                onClick={() => handleRemoveVariant(index)}
                              >
                                <TrashIcon className='size-4' />
                              </Button>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      <div className='mt-2 flex items-center justify-between'>
                        <Button
                          variant='secondary'
                          size='sm'
                          type='button'
                          onClick={handleAddVariant}
                          className='gap-1.5'
                        >
                          <PlusIcon className='size-4' />
                          {t('experiments.addVariant')}
                        </Button>
                        <Text
                          size='sm'
                          weight='medium'
                          className={
                            isPercentageValid
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {totalPercentage}%
                        </Text>
                      </div>
                    </div>

                    <div>
                      <div className='flex items-center gap-1.5'>
                        <Text
                          as='label'
                          size='sm'
                          weight='medium'
                          className='text-gray-700 dark:text-gray-200'
                        >
                          {t('experiments.goal')}
                        </Text>
                        <Tooltip
                          text={t('experiments.settings.goalHint')}
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
                            selectedItem={goalOptions.find(
                              (g) => g.value === goalId,
                            )}
                            title={
                              goalOptions.find((g) => g.value === goalId)
                                ?.label || t('experiments.noGoal')
                            }
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
                                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-slate-900 dark:text-gray-400 dark:hover:bg-slate-800',
                              )}
                            >
                              <TrendUpIcon className='size-4' />
                              <Text
                                as='span'
                                size='sm'
                                colour='inherit'
                                className='hidden sm:inline'
                              >
                                {t('experiments.settings.increase')}
                              </Text>
                            </button>
                            <button
                              type='button'
                              onClick={() => setGoalDirection('decrease')}
                              className={cx(
                                'flex items-center gap-1 rounded-r-md border-l border-gray-300 px-3 py-2 text-sm transition-colors dark:border-slate-600',
                                goalDirection === 'decrease'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-slate-900 dark:text-gray-400 dark:hover:bg-slate-800',
                              )}
                            >
                              <TrendDownIcon className='size-4' />
                              <Text
                                as='span'
                                size='sm'
                                colour='inherit'
                                className='hidden sm:inline'
                              >
                                {t('experiments.settings.decrease')}
                              </Text>
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

                    <div className='overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-800/70 dark:bg-slate-950'>
                      <div className='flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
                        <div>
                          <Text size='sm' weight='semibold'>
                            {t('experiments.settings.launchGuardrails')}
                          </Text>
                          <Text
                            as='p'
                            size='xs'
                            colour='muted'
                            className='mt-0.5'
                          >
                            {launchReadiness === 'blocked'
                              ? t(
                                  'experiments.settings.guardrailSummary.blocked',
                                )
                              : launchReadiness === 'review'
                                ? t(
                                    'experiments.settings.guardrailSummary.review',
                                  )
                                : t(
                                    'experiments.settings.guardrailSummary.ready',
                                  )}
                          </Text>
                        </div>
                        <span
                          className={cx(
                            'inline-flex w-fit items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                            launchReadiness === 'blocked' &&
                              'bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/20',
                            launchReadiness === 'review' &&
                              'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20',
                            launchReadiness === 'ready' &&
                              'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
                          )}
                        >
                          <Text as='span' size='xs' colour='inherit'>
                            {t(
                              `experiments.settings.guardrailStatus.${launchReadiness}`,
                            )}
                          </Text>
                        </span>
                      </div>
                      {launchGuardrails.length > 0 ? (
                        <ul className='divide-y divide-gray-200 border-t border-gray-200 dark:divide-slate-800 dark:border-slate-800'>
                          {launchGuardrails.map((item, index) => (
                            <li
                              key={`${item.severity}-${index}`}
                              className='flex items-start gap-2 px-4 py-2.5'
                            >
                              <span
                                className={cx(
                                  'mt-1 size-1.5 shrink-0 rounded-full',
                                  item.severity === 'blocker'
                                    ? 'bg-red-500'
                                    : 'bg-amber-500',
                                )}
                              />
                              <Text
                                as='p'
                                size='xs'
                                colour={
                                  item.severity === 'blocker'
                                    ? 'error'
                                    : 'warning'
                                }
                              >
                                {item.message}
                              </Text>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <div className='border-t border-gray-200 pt-4 dark:border-slate-700'>
                      <button
                        type='button'
                        onClick={() => setShowPlanning(!showPlanning)}
                        className='flex w-full items-center justify-between gap-3 text-left'
                      >
                        <span className='flex min-w-0 items-center gap-2'>
                          <CalculatorIcon className='size-4 shrink-0 text-gray-500 dark:text-gray-400' />
                          <span className='min-w-0'>
                            <Text as='p' size='sm' weight='medium'>
                              {t('experiments.settings.sampleEstimate.title')}
                            </Text>
                            <Text
                              as='p'
                              size='xs'
                              colour='muted'
                              className='mt-0.5'
                            >
                              {t(
                                'experiments.settings.sampleEstimate.collapsedSummary',
                                {
                                  exposures:
                                    sampleEstimate.perVariant.toLocaleString(),
                                  runtime: sampleEstimate.estimatedDays
                                    ? t(
                                        'experiments.settings.sampleEstimate.days',
                                        {
                                          count: sampleEstimate.estimatedDays,
                                        },
                                      )
                                    : t(
                                        'experiments.settings.sampleEstimate.addTraffic',
                                      ),
                                },
                              )}
                            </Text>
                          </span>
                        </span>
                        <CaretDownIcon
                          className={cx(
                            'size-4 shrink-0 text-gray-400 transition-transform',
                            showPlanning && 'rotate-180',
                          )}
                        />
                      </button>

                      {showPlanning ? (
                        <div className='mt-4 rounded-lg bg-gray-50 p-4 ring-1 ring-gray-200 dark:bg-slate-900/40 dark:ring-slate-800'>
                          <Text size='xs' colour='muted'>
                            {t('experiments.settings.sampleEstimate.hint')}
                          </Text>

                          <div className='mt-4 grid gap-3 sm:grid-cols-3'>
                            <Input
                              label={
                                <span className='flex items-center gap-1.5'>
                                  <Text as='span' size='sm' colour='inherit'>
                                    {t(
                                      'experiments.settings.sampleEstimate.baselineConversion',
                                    )}
                                  </Text>
                                  <Tooltip
                                    text={t(
                                      'experiments.settings.sampleEstimate.baselineConversionHint',
                                    )}
                                    className='flex items-center'
                                  />
                                </span>
                              }
                              inputMode='decimal'
                              value={baselineConversionRate}
                              onChange={(e) =>
                                setBaselineConversionRate(
                                  Math.min(
                                    99,
                                    Math.max(
                                      0.1,
                                      Number(e.target.value) || 0.1,
                                    ),
                                  ),
                                )
                              }
                              classes={{ input: 'px-2.5 py-1.5' }}
                            />
                            <Input
                              label={
                                <span className='flex items-center gap-1.5'>
                                  <Text as='span' size='sm' colour='inherit'>
                                    {t(
                                      'experiments.settings.sampleEstimate.mdeLift',
                                    )}
                                  </Text>
                                  <Tooltip
                                    text={t(
                                      'experiments.settings.sampleEstimate.mdeLiftHint',
                                    )}
                                    className='flex items-center'
                                  />
                                </span>
                              }
                              inputMode='decimal'
                              value={minimumDetectableEffect}
                              onChange={(e) =>
                                setMinimumDetectableEffect(
                                  Math.min(
                                    500,
                                    Math.max(1, Number(e.target.value) || 1),
                                  ),
                                )
                              }
                              classes={{ input: 'px-2.5 py-1.5' }}
                            />
                            <Input
                              label={t(
                                'experiments.settings.sampleEstimate.dailyExposures',
                              )}
                              inputMode='numeric'
                              value={dailyExposures}
                              onChange={(e) =>
                                setDailyExposures(
                                  Math.max(0, Number(e.target.value) || 0),
                                )
                              }
                              classes={{ input: 'px-2.5 py-1.5' }}
                            />
                          </div>

                          <div className='mt-3 grid gap-2 text-xs sm:grid-cols-3'>
                            <div className='rounded-md bg-white px-3 py-2 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
                              <Text as='p' size='xs' colour='muted'>
                                {t(
                                  'experiments.settings.sampleEstimate.targetRate',
                                )}
                              </Text>
                              <Text
                                as='p'
                                size='sm'
                                weight='semibold'
                                className='tabular-nums'
                              >
                                {sampleEstimate.targetRate.toFixed(2)}%
                              </Text>
                            </div>
                            <div className='rounded-md bg-white px-3 py-2 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
                              <Text as='p' size='xs' colour='muted'>
                                {t(
                                  'experiments.settings.sampleEstimate.totalSample',
                                )}
                              </Text>
                              <Text
                                as='p'
                                size='sm'
                                weight='semibold'
                                className='tabular-nums'
                              >
                                {sampleEstimate.total.toLocaleString()}
                              </Text>
                            </div>
                            <div className='rounded-md bg-white px-3 py-2 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
                              <Text as='p' size='xs' colour='muted'>
                                {t(
                                  'experiments.settings.sampleEstimate.runtimeEstimate',
                                )}
                              </Text>
                              <Text
                                as='p'
                                size='sm'
                                weight='semibold'
                                className='tabular-nums'
                              >
                                {sampleEstimate.estimatedDays
                                  ? t(
                                      'experiments.settings.sampleEstimate.days',
                                      {
                                        count: sampleEstimate.estimatedDays,
                                      },
                                    )
                                  : t(
                                      'experiments.settings.sampleEstimate.addTraffic',
                                    )}
                              </Text>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className='border-t border-gray-200 pt-4 dark:border-slate-700'>
                      <button
                        type='button'
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className='flex w-full items-center justify-between text-left'
                      >
                        <Text size='sm' weight='medium' colour='secondary'>
                          {t('experiments.settings.advancedSettings')}
                        </Text>
                        <CaretDownIcon
                          className={cx(
                            'size-4 text-gray-400 transition-transform',
                            showAdvanced && 'rotate-180',
                          )}
                        />
                      </button>

                      {showAdvanced ? (
                        <div className='mt-4 space-y-4'>
                          <div>
                            <div className='flex items-center gap-1.5'>
                              <Text
                                as='label'
                                size='sm'
                                weight='medium'
                                className='text-gray-700 dark:text-gray-200'
                              >
                                {t('experiments.settings.featureFlagSource')}
                              </Text>
                              <Tooltip
                                text={t(
                                  'experiments.settings.featureFlagSourceHint',
                                )}
                                className='flex items-center'
                              />
                            </div>
                            <div className='mt-1.5 flex gap-2'>
                              <Button
                                type='button'
                                onClick={() => setFeatureFlagMode('create')}
                                className='flex-1 justify-center'
                                variant={
                                  featureFlagMode === 'create'
                                    ? 'primary'
                                    : 'secondary'
                                }
                              >
                                {t('experiments.settings.createNewFeatureFlag')}
                              </Button>
                              <Button
                                type='button'
                                onClick={() => setFeatureFlagMode('link')}
                                className='flex-1 justify-center'
                                variant={
                                  featureFlagMode === 'link'
                                    ? 'primary'
                                    : 'secondary'
                                }
                              >
                                {t(
                                  'experiments.settings.linkExistingFeatureFlag',
                                )}
                              </Button>
                            </div>
                          </div>

                          {featureFlagMode === 'link' ? (
                            <div>
                              <Select
                                label={t('experiments.selectFeatureFlag')}
                                items={featureFlagOptions}
                                keyExtractor={(item) => item.value}
                                labelExtractor={(item) => item.label}
                                onSelect={(item) =>
                                  setExistingFeatureFlagId(item.value)
                                }
                                selectedItem={featureFlagOptions.find(
                                  (f) => f.value === existingFeatureFlagId,
                                )}
                                title={
                                  featureFlagOptions.find(
                                    (f) => f.value === existingFeatureFlagId,
                                  )?.label || t('experiments.selectFeatureFlag')
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
                              {selectedFeatureFlag ? (
                                <div className='mt-2 rounded-md bg-gray-50 px-3 py-2 ring-1 ring-gray-200 dark:bg-slate-900/40 dark:ring-slate-800'>
                                  <div className='flex flex-wrap items-center justify-between gap-2'>
                                    <Text size='xs' colour='secondary'>
                                      {t('experiments.settings.linkedFlag')}
                                    </Text>
                                    <Text size='xs' colour='secondary' code>
                                      {selectedFeatureFlag.key}
                                    </Text>
                                  </div>
                                  <Text
                                    size='xs'
                                    colour='muted'
                                    className='mt-1'
                                  >
                                    {t(
                                      'experiments.settings.linkedFlagDetails',
                                      {
                                        percentage:
                                          selectedFeatureFlag.rolloutPercentage,
                                        status: String(
                                          t(
                                            selectedFeatureFlag.enabled
                                              ? 'featureFlags.enabled'
                                              : 'featureFlags.disabled',
                                          ),
                                        ).toLocaleLowerCase(),
                                      },
                                    )}
                                  </Text>
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          <div>
                            <div className='flex items-center gap-1.5'>
                              <Text
                                as='label'
                                size='sm'
                                weight='medium'
                                className='text-gray-700 dark:text-gray-200'
                              >
                                {t('experiments.settings.exposureTracking')}
                              </Text>
                              <Tooltip
                                text={t(
                                  'experiments.settings.exposureTrackingHint',
                                )}
                                className='flex items-center'
                              />
                            </div>
                            <div className='mt-1.5 flex gap-2'>
                              <Button
                                type='button'
                                onClick={() =>
                                  setExposureTrigger('feature_flag')
                                }
                                className='flex-1 justify-center'
                                variant={
                                  exposureTrigger === 'feature_flag'
                                    ? 'primary'
                                    : 'secondary'
                                }
                              >
                                {t('experiments.exposureTrigger.default')}
                              </Button>
                              <Button
                                type='button'
                                onClick={() =>
                                  setExposureTrigger('custom_event')
                                }
                                className='flex-1 justify-center'
                                variant={
                                  exposureTrigger === 'custom_event'
                                    ? 'primary'
                                    : 'secondary'
                                }
                              >
                                {t('experiments.exposureTrigger.custom')}
                              </Button>
                            </div>

                            {exposureTrigger === 'custom_event' ? (
                              <Input
                                className='mt-2'
                                value={customEventName}
                                onChange={(e) =>
                                  setCustomEventName(e.target.value)
                                }
                                placeholder={t(
                                  'experiments.exposureTrigger.eventNamePlaceholder',
                                )}
                                error={errors.customEvent}
                              />
                            ) : null}
                          </div>

                          <div>
                            <div className='flex items-center gap-1.5'>
                              <Text
                                as='label'
                                size='sm'
                                weight='medium'
                                className='text-gray-700 dark:text-gray-200'
                              >
                                {t(
                                  'experiments.settings.multiExposureHandling',
                                )}
                              </Text>
                              <Tooltip
                                text={
                                  <div>
                                    <Text as='p' weight='medium'>
                                      {t(
                                        'experiments.settings.multiExposureHintTitle',
                                      )}
                                    </Text>
                                    <Text as='p' className='mt-1'>
                                      <strong>
                                        {t(
                                          'experiments.settings.multiExposureExcludeLabel',
                                        )}
                                      </strong>{' '}
                                      {t(
                                        'experiments.settings.multiExposureExcludeDescription',
                                      )}
                                    </Text>
                                    <Text as='p' className='mt-0.5'>
                                      <strong>
                                        {t(
                                          'experiments.settings.multiExposureFirstLabel',
                                        )}
                                      </strong>{' '}
                                      {t(
                                        'experiments.settings.multiExposureFirstDescription',
                                      )}
                                    </Text>
                                  </div>
                                }
                                className='flex items-center'
                              />
                            </div>
                            <div className='mt-1.5 flex gap-2'>
                              <Button
                                type='button'
                                onClick={() =>
                                  setMultipleVariantHandling('exclude')
                                }
                                className='flex-1 justify-center'
                                variant={
                                  multipleVariantHandling === 'exclude'
                                    ? 'primary'
                                    : 'secondary'
                                }
                              >
                                {t('experiments.settings.exclude')}
                              </Button>
                              <Button
                                type='button'
                                onClick={() =>
                                  setMultipleVariantHandling('first_exposure')
                                }
                                className='flex-1 justify-center'
                                variant={
                                  multipleVariantHandling === 'first_exposure'
                                    ? 'primary'
                                    : 'secondary'
                                }
                              >
                                {t('experiments.settings.firstOnly')}
                              </Button>
                            </div>
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
