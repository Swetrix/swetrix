import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _sum from 'lodash/sum'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  createExperiment,
  updateExperiment,
  getExperiment,
  getProjectGoals,
  type Experiment,
  type ExperimentVariant,
  type Goal,
} from '~/api'
import Button from '~/ui/Button'
import Spin from '~/ui/icons/Spin'
import Input from '~/ui/Input'
import Modal from '~/ui/Modal'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'

interface ExperimentSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  projectId: string
  experimentId: string | null
}

const defaultVariants: ExperimentVariant[] = [
  { name: 'Control', key: 'control', rolloutPercentage: 50, isControl: true },
  { name: 'Variant A', key: 'variant_a', rolloutPercentage: 50, isControl: false },
]

const ExperimentSettingsModal = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  experimentId,
}: ExperimentSettingsModalProps) => {
  const { t } = useTranslation()

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalsLoading, setGoalsLoading] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [hypothesis, setHypothesis] = useState('')
  const [goalId, setGoalId] = useState<string>('')
  const [variants, setVariants] = useState<ExperimentVariant[]>(defaultVariants)

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load existing experiment if editing
  useEffect(() => {
    if (!isOpen) return

    // Reset form when opening for new experiment
    if (!experimentId) {
      setName('')
      setDescription('')
      setHypothesis('')
      setGoalId('')
      setVariants(defaultVariants)
      setErrors({})
      return
    }

    // Load existing experiment
    const loadExperiment = async () => {
      setIsLoading(true)
      try {
        const experiment = await getExperiment(experimentId)
        setName(experiment.name)
        setDescription(experiment.description || '')
        setHypothesis(experiment.hypothesis || '')
        setGoalId(experiment.goalId || '')
        setVariants(experiment.variants.length > 0 ? experiment.variants : defaultVariants)
      } catch (error) {
        console.error('Failed to load experiment:', error)
        toast.error(t('experiments.loadError'))
        onClose()
      } finally {
        setIsLoading(false)
      }
    }

    loadExperiment()
  }, [isOpen, experimentId, onClose, t])

  // Load goals for the project
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

    // Check for duplicate keys
    const keys = variants.map((v) => v.key)
    const uniqueKeys = new Set(keys)
    if (keys.length !== uniqueKeys.size) {
      newErrors.variants = t('experiments.duplicateKeys')
    }

    // Check for empty variant keys or names
    for (const variant of variants) {
      if (!variant.key.trim() || !variant.name.trim()) {
        newErrors.variants = t('experiments.variantFieldsRequired')
        break
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSaving(true)
    try {
      const data = {
        pid: projectId,
        name: name.trim(),
        description: description.trim() || undefined,
        hypothesis: hypothesis.trim() || undefined,
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

  const handleAddVariant = () => {
    const variantIndex = variants.length
    const newVariant: ExperimentVariant = {
      name: `Variant ${String.fromCharCode(65 + variantIndex - 1)}`,
      key: `variant_${String.fromCharCode(97 + variantIndex - 1)}`,
      rolloutPercentage: 0,
      isControl: false,
    }
    setVariants([...variants, newVariant])
  }

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 2) return
    const newVariants = variants.filter((_, i) => i !== index)
    setVariants(newVariants)
  }

  const handleVariantChange = (index: number, field: keyof ExperimentVariant, value: string | number | boolean) => {
    const newVariants = [...variants]
    if (field === 'isControl' && value === true) {
      // Only one control allowed
      newVariants.forEach((v, i) => {
        newVariants[i] = { ...v, isControl: i === index }
      })
    } else {
      newVariants[index] = { ...newVariants[index], [field]: value }
    }
    setVariants(newVariants)
  }

  const distributeEvenly = () => {
    const count = variants.length
    const basePercentage = Math.floor(100 / count)
    const remainder = 100 - basePercentage * count

    const newVariants = variants.map((v, i) => ({
      ...v,
      rolloutPercentage: basePercentage + (i < remainder ? 1 : 0),
    }))
    setVariants(newVariants)
  }

  const goalOptions = [
    { value: '', label: t('experiments.selectGoal') },
    ...goals.map((goal) => ({ value: goal.id, label: goal.name })),
  ]

  return (
    <Modal
      isOpened={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={experimentId ? t('experiments.edit') : t('experiments.create')}
      submitText={experimentId ? t('common.save') : t('experiments.create')}
      closeText={t('common.cancel')}
      size='large'
      isLoading={isSaving}
    >
      {isLoading ? (
        <div className='flex h-64 items-center justify-center'>
          <Spin className='size-8' />
        </div>
      ) : (
        <div className='space-y-6'>
          {/* Name */}
          <div>
            <Input
              label={t('experiments.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('experiments.namePlaceholder')}
              error={errors.name}
            />
          </div>

          {/* Description */}
          <div>
            <Input
              label={t('experiments.descriptionLabel')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('experiments.descriptionPlaceholder')}
            />
          </div>

          {/* Hypothesis */}
          <div>
            <Input
              label={t('experiments.hypothesisLabel')}
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder={t('experiments.hypothesisPlaceholder')}
            />
          </div>

          {/* Goal selector */}
          <div>
            <Select
              label={t('experiments.goal')}
              items={goalOptions}
              keyExtractor={(item) => item.value}
              labelExtractor={(item) => item.label}
              onSelect={(item) => setGoalId(item.value)}
              title={goalOptions.find((g) => g.value === goalId)?.label || t('experiments.selectGoal')}
              capitalise
            />
            {goalsLoading && (
              <Text size='xs' colour='muted' className='mt-1'>
                {t('experiments.loadingGoals')}
              </Text>
            )}
            {!goalsLoading && goals.length === 0 && (
              <Text size='xs' colour='muted' className='mt-1'>
                {t('experiments.noGoalsHint')}
              </Text>
            )}
          </div>

          {/* Variants */}
          <div>
            <div className='mb-2 flex items-center justify-between'>
              <Text as='label' size='sm' weight='medium'>
                {t('experiments.variants')}
              </Text>
              <button
                type='button'
                onClick={distributeEvenly}
                className='text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400'
              >
                {t('experiments.distributeEvenly')}
              </button>
            </div>

            {errors.variants && (
              <Text size='xs' className='mb-2 text-red-500'>
                {errors.variants}
              </Text>
            )}

            <div className='space-y-3'>
              {_map(variants, (variant, index) => (
                <div
                  key={index}
                  className={cx(
                    'flex items-center gap-2 rounded-lg border p-3',
                    variant.isControl
                      ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/20'
                      : 'border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800',
                  )}
                >
                  <div className='flex-1'>
                    <Input
                      placeholder={t('experiments.variantName')}
                      value={variant.name}
                      onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                      className='mb-1'
                    />
                    <Input
                      placeholder={t('experiments.variantKey')}
                      value={variant.key}
                      onChange={(e) =>
                        handleVariantChange(index, 'key', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))
                      }
                      className='font-mono text-xs'
                    />
                  </div>
                  <div className='w-20'>
                    <Input
                      type='number'
                      min={0}
                      max={100}
                      value={variant.rolloutPercentage}
                      onChange={(e) =>
                        handleVariantChange(index, 'rolloutPercentage', parseInt(e.target.value, 10) || 0)
                      }
                      className='text-center'
                    />
                    <Text size='xs' colour='muted' className='mt-1 text-center'>
                      %
                    </Text>
                  </div>
                  <div className='flex flex-col items-center gap-1'>
                    <label className='flex items-center gap-1'>
                      <input
                        type='radio'
                        name='controlVariant'
                        checked={variant.isControl}
                        onChange={() => handleVariantChange(index, 'isControl', true)}
                        className='size-4 text-indigo-600'
                      />
                      <Text size='xs' colour='muted'>
                        {t('experiments.control')}
                      </Text>
                    </label>
                    {variants.length > 2 && (
                      <button
                        type='button'
                        onClick={() => handleRemoveVariant(index)}
                        className='rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500 dark:hover:bg-slate-700'
                      >
                        <Trash2Icon className='size-4' />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={handleAddVariant} secondary small className='mt-3'>
              <PlusIcon className='mr-1 size-4' />
              {t('experiments.addVariant')}
            </Button>

            {/* Total percentage indicator */}
            <div className='mt-3 flex items-center justify-between'>
              <Text size='sm' colour='muted'>
                {t('experiments.totalPercentage')}
              </Text>
              <Text
                size='sm'
                weight='semibold'
                className={cx({
                  'text-green-600 dark:text-green-400': _sum(variants.map((v) => v.rolloutPercentage)) === 100,
                  'text-red-600 dark:text-red-400': _sum(variants.map((v) => v.rolloutPercentage)) !== 100,
                })}
              >
                {_sum(variants.map((v) => v.rolloutPercentage))}%
              </Text>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default ExperimentSettingsModal
