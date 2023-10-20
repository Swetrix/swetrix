import React, { useState, useEffect, useMemo } from 'react'
import _map from 'lodash/map'
import _every from 'lodash/every'
import cx from 'clsx'
import { TrashIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

import Modal from 'ui/Modal'
import Input from 'ui/Input'
import Select from 'ui/Select'
import { MIN_FUNNEL_STEPS, MAX_FUNNEL_STEPS } from 'redux/constants'
import { getFilters } from 'api'
import { IFunnel } from 'redux/models/IProject'

interface INewFunnel {
  onClose: () => void,
  onSubmit: (name: string, steps: string[]) => Promise<void>,
  isOpened: boolean,
  pid: string,
  loading: boolean,
  funnel?: IFunnel,
}

const INITIAL_FUNNEL_STEPS = [null, null]

const NewFunnel = ({
  onClose, onSubmit, isOpened, pid, funnel, loading,
}: INewFunnel): JSX.Element => {
  const { t } = useTranslation('common')
  const [name, setName] = useState<string>(funnel?.name || '')
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
    const getFiltersData = async () => {
      let pgFilters: string[] = []
      let ceFilters: string[] = []

      const promises = [
        (async () => {
          pgFilters = await getFilters(pid, 'pg')
        })(),
        (async () => {
          ceFilters = await getFilters(pid, 'ev')
        })(),
      ]

      try {
        await Promise.all(promises)
      } catch (reason) {
        console.error('[ERROR] (NewFunnel -> getFiltersData):', reason)
      }

      setFilters([...pgFilters, ...ceFilters])
    }

    getFiltersData()
  }, [pid])

  const _onClose = () => {
    setTimeout(() => {
      setName('')
      setSteps(INITIAL_FUNNEL_STEPS)
    }, 300)
    onClose()
  }

  const _onSubmit = async () => {
    if (!name || !allStepsFulfilled) {
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
      message={(
        <div>
          <Input
            name='funnel-name-input'
            type='text'
            label={t('modals.funnels.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className='mt-5 text-sm font-medium text-gray-700 dark:text-gray-200'>
            {t('modals.funnels.steps')}
          </p>
          {_map(steps, (step, index) => (
            <div key={index} className='flex items-center space-x-2 mt-1'>
              <Select
                className='w-full !ml-0'
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
              />
              {steps.length > MIN_FUNNEL_STEPS && (
                <TrashIcon
                  role='button'
                  aria-label='Remove step'
                  className='h-5 w-5 text-gray-400 dark:text-gray-200 hover:text-gray-500 dark:hover:text-gray-300 cursor-pointer'
                  onClick={() => {
                    const newSteps = [...steps]
                    newSteps.splice(index, 1)
                    setSteps(newSteps)
                  }}
                />
              )}
            </div>
          ))}
          {steps.length < MAX_FUNNEL_STEPS && (
            <p
              onClick={() => {
                setSteps([...steps, null])
              }}
              role='button'
              className='mt-2 cursor-pointer text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
            >
              + {t('modals.funnels.addStep')}
            </p>
          )}
        </div>
      )}
      title={funnel ? t('modals.funnels.editTitle') : t('modals.funnels.addTitle')}
      isOpened={isOpened}
      submitDisabled={!name || !allStepsFulfilled}
      overflowVisible
    />
  )
}

export default NewFunnel
