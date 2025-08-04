import cx from 'clsx'
import _every from 'lodash/every'
import _isUndefined from 'lodash/isUndefined'
import _map from 'lodash/map'
import { Trash2Icon } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { getFilters } from '~/api'
import { MIN_FUNNEL_STEPS, MAX_FUNNEL_STEPS } from '~/lib/constants'
import { Funnel } from '~/lib/models/Project'
import { useCurrentProject, useProjectPassword } from '~/providers/CurrentProjectProvider'
import Combobox from '~/ui/Combobox'
import Input from '~/ui/Input'
import Modal from '~/ui/Modal'

interface NewFunnelProps {
  onClose: () => void
  onSubmit: (name: string, steps: string[]) => Promise<void>
  isOpened: boolean
  loading: boolean
  funnel?: Funnel
}

const INITIAL_FUNNEL_STEPS = [null, null]

const NewFunnel = ({ onClose, onSubmit, isOpened, funnel, loading }: NewFunnelProps) => {
  const { project, id, allowedToManage } = useCurrentProject()
  const projectPassword = useProjectPassword(id)
  const { t } = useTranslation('common')
  const [name, setName] = useState(funnel?.name || '')
  const [steps, setSteps] = useState<any[]>(funnel?.steps || INITIAL_FUNNEL_STEPS)
  const [filters, setFilters] = useState<string[]>([])
  const allStepsFulfilled = useMemo(() => _every(steps, (step) => step), [steps])

  useEffect(() => {
    if (!isOpened) {
      return
    }

    setName(funnel?.name || '')
    setSteps(funnel?.steps || INITIAL_FUNNEL_STEPS)
  }, [isOpened, funnel])

  useEffect(() => {
    // if project.name is underfined - that means that project is not loaded yet
    // (it may be password protected, hence making a filters list request will fail with 403)
    if (_isUndefined(project?.name) || !isOpened) {
      return
    }

    const getFiltersData = async () => {
      let pgFilters: string[] = []
      let ceFilters: string[] = []

      const promises = [
        (async () => {
          pgFilters = await getFilters(id, 'pg', projectPassword)
        })(),
        (async () => {
          ceFilters = await getFilters(id, 'ev', projectPassword)
        })(),
      ]

      try {
        await Promise.allSettled(promises)
      } catch (reason) {
        console.error('[ERROR] (NewFunnel -> getFiltersData):', reason)
      }

      setFilters([...pgFilters, ...ceFilters])
    }

    getFiltersData()
  }, [id, project, isOpened, projectPassword])

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

    await onSubmit(name, steps)
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
              <Combobox
                className='!ml-0 w-full'
                buttonClassName={cx({
                  'h-9': !step,
                })}
                items={filters}
                keyExtractor={(item) => item}
                labelExtractor={(item) => item}
                onSelect={(item) => {
                  const newSteps = [...steps]
                  newSteps[index] = item
                  setSteps(newSteps)
                }}
                title={step || ''}
                disabled={!allowedToManage}
              />
              {steps.length > MIN_FUNNEL_STEPS && allowedToManage ? (
                <Trash2Icon
                  role='button'
                  aria-label='Remove step'
                  className='h-5 w-5 cursor-pointer text-gray-400 hover:text-gray-500 dark:text-gray-200 dark:hover:text-gray-300'
                  onClick={() => {
                    const newSteps = [...steps]
                    newSteps.splice(index, 1)
                    setSteps(newSteps)
                  }}
                  strokeWidth={1.5}
                />
              ) : null}
            </div>
          ))}
          {steps.length < MAX_FUNNEL_STEPS && allowedToManage ? (
            <button
              type='button'
              onClick={() => {
                setSteps([...steps, null])
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
