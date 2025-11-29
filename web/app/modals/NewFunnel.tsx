import _every from 'lodash/every'
import _map from 'lodash/map'
import { Trash2Icon } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { MIN_FUNNEL_STEPS, MAX_FUNNEL_STEPS } from '~/lib/constants'
import { Funnel } from '~/lib/models/Project'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import Input from '~/ui/Input'
import Modal from '~/ui/Modal'
import Select from '~/ui/Select'

interface NewFunnelProps {
  onClose: () => void
  onSubmit: (name: string, steps: string[]) => Promise<void>
  isOpened: boolean
  loading: boolean
  funnel?: Funnel
}

type FunnelStepType = 'page' | 'event'

interface FunnelStep {
  type: FunnelStepType
  value: string
}

const createEmptyStep = (type: FunnelStepType = 'page'): FunnelStep => ({ type, value: '' })
const INITIAL_FUNNEL_STEPS: FunnelStep[] = [createEmptyStep(), createEmptyStep()]

const NewFunnel = ({ onClose, onSubmit, isOpened, funnel, loading }: NewFunnelProps) => {
  const { allowedToManage } = useCurrentProject()
  const { t } = useTranslation('common')
  const [name, setName] = useState(funnel?.name || '')
  const [steps, setSteps] = useState<FunnelStep[]>(
    funnel?.steps
      ? funnel.steps.map((s) => ({ type: s?.startsWith('/') ? 'page' : 'event', value: s }))
      : INITIAL_FUNNEL_STEPS,
  )
  const allStepsFulfilled = useMemo(() => _every(steps, (step) => step.value && step.value.trim()), [steps])

  useEffect(() => {
    if (!isOpened) {
      return
    }

    setName(funnel?.name || '') // eslint-disable-line react-hooks/set-state-in-effect -- Resetting form state when modal opens
    setSteps(
      funnel?.steps
        ? funnel.steps.map((s) => ({ type: s?.startsWith('/') ? 'page' : 'event', value: s }))
        : INITIAL_FUNNEL_STEPS,
    )
  }, [isOpened, funnel])

  const _onClose = () => {
    setTimeout(() => {
      setName('')
      setSteps(INITIAL_FUNNEL_STEPS)
    }, 300)
    onClose()
  }

  const _onSubmit = async () => {
    if (!name || !allStepsFulfilled || !allowedToManage) {
      return
    }

    await onSubmit(
      name,
      steps.map((s) => s.value.trim()),
    )
    _onClose()
  }

  return (
    <Modal
      isLoading={loading}
      onClose={_onClose}
      onSubmit={_onSubmit}
      submitText={t('common.continue')}
      message={
        <div>
          <Input
            name='funnel-name-input'
            label={t('modals.funnels.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!allowedToManage}
          />
          <p className='mt-5 text-sm font-medium text-gray-700 dark:text-gray-200'>{t('modals.funnels.steps')}</p>
          {_map(steps, (step, index) => (
            <div key={index} className='mt-1 flex items-center space-x-2'>
              <Select
                className={`!ml-0 w-36${!allowedToManage ? 'pointer-events-none opacity-60' : ''}`}
                items={[
                  { key: 'page', label: t('dashboard.page') },
                  { key: 'event', label: t('dashboard.event') },
                ]}
                keyExtractor={(item) => item.key}
                labelExtractor={(item) => item.label}
                onSelect={(item) => {
                  const newSteps = [...steps]
                  newSteps[index] = { ...newSteps[index], type: item.key as FunnelStepType }
                  setSteps(newSteps)
                }}
                title={step.type === 'page' ? t('dashboard.page') : t('dashboard.event')}
                selectedItem={
                  step.type === 'page'
                    ? { key: 'page', label: t('dashboard.page') }
                    : { key: 'event', label: t('dashboard.event') }
                }
              />
              <Input
                className='!ml-0 w-full'
                value={step.value}
                placeholder={step.type === 'page' ? '/pricing' : 'Registration'}
                onChange={(e) => {
                  const newSteps = [...steps]
                  newSteps[index] = { ...newSteps[index], value: e.target.value }
                  setSteps(newSteps)
                }}
                disabled={!allowedToManage}
              />
              {steps.length > MIN_FUNNEL_STEPS && allowedToManage ? (
                <button
                  type='button'
                  className='rounded-md p-2 text-gray-800 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300'
                  onClick={() => {
                    const newSteps = [...steps]
                    newSteps.splice(index, 1)
                    setSteps(newSteps)
                  }}
                  aria-label='Remove step'
                >
                  <Trash2Icon className='size-5' strokeWidth={1.5} />
                </button>
              ) : null}
            </div>
          ))}
          {steps.length < MAX_FUNNEL_STEPS && allowedToManage ? (
            <button
              type='button'
              onClick={() => {
                setSteps([...steps, createEmptyStep()])
              }}
              className='mt-2 cursor-pointer text-indigo-600 hover:underline dark:text-indigo-400'
            >
              + {t('modals.funnels.addStep')}
            </button>
          ) : null}
        </div>
      }
      title={funnel ? t('modals.funnels.editTitle') : t('modals.funnels.addTitle')}
      isOpened={isOpened}
      submitDisabled={!name || !allStepsFulfilled || !allowedToManage}
      overflowVisible
    />
  )
}

export default NewFunnel
