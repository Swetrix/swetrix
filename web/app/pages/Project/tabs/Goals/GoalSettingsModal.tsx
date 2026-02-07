import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react'
import _map from 'lodash/map'
import { TrashIcon, PlusIcon, XIcon } from '@phosphor-icons/react'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import { useGoalProxy } from '~/hooks/useAnalyticsProxy'
import type { ProjectViewActionData } from '~/routes/projects.$id'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Select from '~/ui/Select'

const GOAL_TYPES = [
  { value: 'pageview', label: 'Pageview' },
  { value: 'custom_event', label: 'Custom Event' },
]

const GOAL_MATCH_TYPES = [
  { value: 'exact', label: 'Exact match' },
  { value: 'contains', label: 'Contains' },
]

interface GoalSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  projectId: string
  goalId?: string | null
}

const GoalSettingsModal = ({
  isOpen,
  onClose,
  onSuccess,
  projectId: _projectId,
  goalId,
}: GoalSettingsModalProps) => {
  const { t } = useTranslation()
  const fetcher = useFetcher<ProjectViewActionData>()
  const processedRef = useRef<string | null>(null)
  const goalProxy = useGoalProxy()
  const isNew = !goalId

  const [isLoading, setIsLoading] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [type, setType] = useState<'pageview' | 'custom_event'>('pageview')
  const [matchType, setMatchType] = useState<'exact' | 'contains'>('exact')
  const [value, setValue] = useState('')
  const [metadataFilters, setMetadataFilters] = useState<
    { key: string; value: string }[]
  >([])

  const isSaving = fetcher.state === 'submitting'

  const resetForm = () => {
    setName('')
    setType('pageview')
    setMatchType('exact')
    setValue('')
    setMetadataFilters([])
  }

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

  // Handle fetcher responses
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

  // Reset processed ref when modal opens
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
    formData.set('metadataFilters', JSON.stringify(metadataFilters))

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
            className='w-full max-w-lg transform rounded-xl bg-white transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:ease-out data-leave:duration-200 data-leave:ease-in dark:bg-slate-950'
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
                          GOAL_TYPES.find((t) => t.value === type)?.label || ''
                        }
                        labelExtractor={(item) => item.label}
                        keyExtractor={(item) => item.value}
                        selectedItem={GOAL_TYPES.find((t) => t.value === type)}
                        capitalise
                      />
                      <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                        {type === 'pageview'
                          ? t('goals.typePageviewDesc')
                          : t('goals.typeCustomEventDesc')}
                      </p>
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
                          GOAL_MATCH_TYPES.find((t) => t.value === matchType)
                            ?.label || ''
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

                    {/* Metadata filters */}
                    <div>
                      <div className='mb-2 flex items-center justify-between'>
                        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                          {t('goals.metadataFilters')}
                        </label>
                        <button
                          type='button'
                          onClick={addMetadataFilter}
                          className='flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400'
                        >
                          <PlusIcon className='h-4 w-4' />
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
                              <button
                                type='button'
                                onClick={() => removeMetadataFilter(index)}
                                className='rounded-md border border-transparent p-1.5 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 hover:dark:border-slate-700/80 dark:hover:bg-slate-900 dark:hover:text-slate-300'
                              >
                                <TrashIcon className='h-4 w-4' />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className='text-sm text-gray-500 dark:text-gray-400'>
                          {t('goals.noMetadataFilters')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className='flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-slate-700'>
                  <Button type='button' onClick={onClose} secondary regular>
                    {t('common.cancel')}
                  </Button>
                  <Button type='submit' primary regular loading={isSaving}>
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
