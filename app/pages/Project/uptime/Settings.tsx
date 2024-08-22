import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _replace from 'lodash/replace'
import _join from 'lodash/join'
import _split from 'lodash/split'
import _find from 'lodash/find'
import _map from 'lodash/map'
import _keys from 'lodash/keys'
import _filter from 'lodash/filter'
import { clsx as cx } from 'clsx'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Modal from 'ui/Modal'
import { PROJECT_TABS } from 'redux/constants'
import { createMonitor, updateMonitor, deleteMonitor, ICreateMonitor } from 'api'
import { withAuthentication, auth } from 'hoc/protected'
import routes from 'utils/routes'
import { Monitor } from 'redux/models/Uptime'
import { useDispatch, useSelector } from 'react-redux'
import { StateType } from 'redux/store'
import { errorsActions } from 'redux/reducers/errors'
import { alertsActions } from 'redux/reducers/alerts'
import UIActions from 'redux/reducers/ui'
import { useRequiredParams } from 'hooks/useRequiredParams'
import Select from 'ui/Select'

const MONITOR_TYPES = ['HTTP']

const UptimeSettings = (): JSX.Element => {
  const { monitors, total } = useSelector((state: StateType) => state.ui.monitors)

  const dispatch = useDispatch()

  const navigate = useNavigate()
  const { id, pid } = useRequiredParams<{ id: string; pid: string }>()
  const { pathname } = useLocation()
  const { t } = useTranslation('common')
  const isSettings =
    !_isEmpty(id) && _replace(_replace(routes.uptime_settings, ':id', id as string), ':pid', pid as string) === pathname
  const monitor = useMemo(() => _find(monitors, { id }), [monitors, id])
  const [form, setForm] = useState<
    Partial<Omit<Monitor, 'acceptedStatusCodes'>> & {
      acceptedStatusCodes: string
    }
  >({
    type: 'HTTP',
    projectId: pid,
    name: '',
    url: '',
    interval: 60,
    retries: 3,
    retryInterval: 60,
    timeout: 30,
    acceptedStatusCodes: '200',
    description: '',
  })
  const [validated, setValidated] = useState<boolean>(false)
  const [errors, setErrors] = useState<{
    [key: string]: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState<boolean>(false)
  const [showModal, setShowModal] = useState<boolean>(false)

  const showError = (message: string) => dispatch(errorsActions.genericError({ message }))
  const generateAlerts = (message: string) => dispatch(alertsActions.generateAlerts({ message, type: 'success' }))
  const setMonitors = (monitors: Monitor[]) => dispatch(UIActions.setMonitors(monitors))
  const setMonitorsTotal = (total: number) => dispatch(UIActions.setMonitorsTotal({ total }))

  useEffect(() => {
    if (!_isEmpty(monitor)) {
      setForm({
        ...monitor,
        acceptedStatusCodes: _join(monitor.acceptedStatusCodes, ','),
      })
    }
  }, [monitor])

  const validate = () => {
    const allErrors: {
      [key: string]: string
    } = {}

    if (_isEmpty(form.name) || _size(form.name) < 3) {
      allErrors.name = t('alert.noNameError')
    }

    const valid = _isEmpty(_keys(allErrors))

    setErrors(allErrors)
    setValidated(valid)
  }

  const onSubmit = (data: Partial<Monitor>) => {
    if (isSettings) {
      updateMonitor(pid, id, data)
        .then((res) => {
          navigate(`/projects/${pid}?tab=${PROJECT_TABS.uptime}`)
          setMonitors([..._filter(monitors, (a) => a.id !== id), res])
          generateAlerts(t('monitor.monitorUpdated'))
        })
        .catch((err) => {
          showError(err.message || err || 'Something went wrong')
        })
    } else {
      createMonitor(pid, data as ICreateMonitor)
        .then((res) => {
          navigate(`/projects/${pid}?tab=${PROJECT_TABS.uptime}`)
          setMonitors([...monitors, res])
          setMonitorsTotal(total + 1)
          generateAlerts(t('monitor.monitorCreated'))
        })
        .catch((err) => {
          showError(err.message || err || 'Something went wrong')
        })
    }
  }

  const onDelete = () => {
    if (!id) {
      showError('Something went wrong')
      return
    }

    deleteMonitor(pid, id)
      .then(() => {
        setMonitors(_filter(monitors, (a) => a.id !== id))
        setMonitorsTotal(total - 1)
        navigate(`/projects/${pid}?tab=${PROJECT_TABS.uptime}`)
        generateAlerts(t('monitor.monitorDeleted'))
      })
      .catch((err) => {
        showError(err.message || err || 'Something went wrong')
      })
  }

  const onCancel = () => {
    navigate(`/projects/${pid}?tab=${PROJECT_TABS.uptime}`)
  }

  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event

    setForm((prevForm) => ({
      ...prevForm,
      [target.name]: target.value,
    }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setBeenSubmitted(true)

    if (validated) {
      onSubmit({
        ...form,
        acceptedStatusCodes: _map(_split(form.acceptedStatusCodes, ','), (code) => parseInt(code, 10)),
      })
    }
  }

  const title = isSettings
    ? t('monitor.settingsOf', {
        name: form.name,
      })
    : t('monitor.create')

  return (
    <div
      className={cx('flex min-h-min-footer flex-col bg-gray-50 px-4 py-6 dark:bg-slate-900 sm:px-6 lg:px-8', {
        'pb-40': isSettings,
      })}
    >
      <form className='mx-auto w-full max-w-7xl' onSubmit={handleSubmit}>
        <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>{title}</h2>
        <Input
          name='name'
          label={t('monitor.form.name')}
          value={form.name || ''}
          className='mt-4'
          onChange={handleInput}
          error={beenSubmitted ? errors.name : null}
        />
        <div className='mt-4'>
          <Select
            id='type'
            label={t('monitor.form.type')}
            items={MONITOR_TYPES}
            title={form.type}
            onSelect={(item) => {
              setForm((prev) => ({
                ...prev,
                type: item,
              }))
            }}
            capitalise
          />
        </div>
        <Input
          name='url'
          label={t('monitor.form.url')}
          value={form.url || ''}
          className='mt-4'
          onChange={handleInput}
          error={beenSubmitted ? errors.url : null}
        />
        <Input
          name='interval'
          label={t('monitor.form.interval')}
          value={form.interval || ''}
          className='mt-4'
          onChange={handleInput}
          error={beenSubmitted ? errors.interval : null}
        />
        <Input
          name='retries'
          label={t('monitor.form.retries')}
          value={form.retries || ''}
          className='mt-4'
          onChange={handleInput}
          error={beenSubmitted ? errors.retries : null}
        />
        <Input
          name='retryInterval'
          label={t('monitor.form.retryInterval')}
          value={form.retryInterval || ''}
          className='mt-4'
          onChange={handleInput}
          error={beenSubmitted ? errors.retryInterval : null}
        />
        <Input
          name='timeout'
          label={t('monitor.form.timeout')}
          value={form.timeout || ''}
          className='mt-4'
          onChange={handleInput}
          error={beenSubmitted ? errors.timeout : null}
        />
        <Input
          name='acceptedStatusCodes'
          label={t('monitor.form.acceptedStatusCodes')}
          value={form.acceptedStatusCodes || ''}
          className='mt-4'
          onChange={handleInput}
          error={beenSubmitted ? errors.acceptedStatusCodes : null}
        />
        <Input
          name='description'
          label={t('monitor.form.description')}
          value={form.description || ''}
          className='mt-4'
          onChange={handleInput}
          error={beenSubmitted ? errors.description : null}
        />

        {isSettings ? (
          <div className='mt-5 flex items-center justify-between'>
            <Button onClick={() => setShowModal(true)} danger semiSmall>
              <>
                <ExclamationTriangleIcon className='mr-1 h-5 w-5' />
                {t('monitor.delete')}
              </>
            </Button>
            <div className='flex items-center justify-between'>
              <Button
                className='mr-2 border-indigo-100 dark:border-slate-700/50 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
                onClick={onCancel}
                secondary
                regular
              >
                {t('common.cancel')}
              </Button>
              <Button type='submit' primary regular>
                {t('common.save')}
              </Button>
            </div>
          </div>
        ) : (
          <div className='mt-5 flex items-center justify-between'>
            <Button
              className='mr-2 border-indigo-100 dark:border-slate-700/50 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
              onClick={onCancel}
              secondary
              regular
            >
              {t('common.cancel')}
            </Button>
            <Button type='submit' primary regular>
              {t('common.save')}
            </Button>
          </div>
        )}
      </form>
      <Modal
        onClose={() => setShowModal(false)}
        onSubmit={onDelete}
        submitText={t('monitor.delete')}
        closeText={t('common.close')}
        title={t('monitor.qDelete')}
        message={t('monitor.deleteHint')}
        submitType='danger'
        type='error'
        isOpened={showModal}
      />
    </div>
  )
}

export default withAuthentication(UptimeSettings, auth.authenticated)
