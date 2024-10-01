import React, { ChangeEvent, ChangeEventHandler, useEffect, useId, useMemo, useState } from 'react'
import { useNavigate, useLocation } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _replace from 'lodash/replace'
import _join from 'lodash/join'
import _split from 'lodash/split'
import _find from 'lodash/find'
import _includes from 'lodash/includes'
import _isNaN from 'lodash/isNaN'
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
import { toast } from 'sonner'
import { StateType } from 'redux/store'
import UIActions from 'redux/reducers/ui'
import { useRequiredParams } from 'hooks/useRequiredParams'
import Select from 'ui/Select'
import { formatTime } from 'utils/date'
import { isValidUrl } from 'utils/validator'

const MONITOR_TYPES = ['HTTP']

const INTERVALS_IN_SECONDS = [
  30, // 30 seconds
  60, // 1 minute
  120, // 2 minutes
  180, // 3 minutes
  300, // 5 minutes
  600, // 10 minutes
  900, // 15 minutes
  1200, // 20 minutes
  1800, // 30 minutes
  2700, // 45 minutes
  3600, // 1 hour
  7200, // 2 hours
  10800, // 3 hours
  21600, // 6 hours
  43200, // 12 hours
  57600, // 16 hours
  72000, // 20 hours
  86400, // 24 hours
]

const INTERVALS_ALLOWED_DATALIST = [30, 60, 300, 1800, 3600, 21600, 86400]

const getIntervalDisplayName = (interval: number, language: string, style: Intl.RelativeTimeFormatStyle = 'short') => {
  let displayName

  if (interval < 60) {
    displayName = formatTime(interval, 'second', language, style)
  } else if (interval < 3600) {
    displayName = formatTime(interval / 60, 'minute', language, style)
  } else {
    displayName = formatTime(interval / 3600, 'hour', language, style)
  }

  return displayName
}

interface IntervalSelectorProps {
  value?: number
  onChange: ChangeEventHandler<HTMLInputElement>
  label: string
  hint: string
  name: string
}

const IntervalSelector = ({ value, onChange, label, hint, name }: IntervalSelectorProps) => {
  const id = useId()
  const {
    i18n: { language },
  } = useTranslation('common')

  const handleChange = (ev: ChangeEvent<HTMLInputElement>) => {
    const { value, name } = ev.target

    onChange({
      target: {
        name,
        // @ts-expect-error
        value: INTERVALS_IN_SECONDS[Number(value)],
      },
    })
  }

  return (
    <div className='mt-4'>
      <Input
        list={id}
        name={name}
        label={label}
        hint={hint}
        hintPosition='top'
        type='range'
        min='0'
        max={INTERVALS_IN_SECONDS.length - 1}
        value={value ? INTERVALS_IN_SECONDS.indexOf(Number(value)) : 4}
        classes={{
          input: 'arrows-handle mt-4 h-2 w-full rounded-full bg-gray-200 dark:bg-slate-600',
        }}
        onChange={handleChange}
      />
      <datalist
        style={{
          writingMode: 'vertical-lr',
        }}
        className='flex w-full flex-col justify-between'
        id={id}
      >
        {_map(INTERVALS_IN_SECONDS, (interval, index) => {
          if (!_includes(INTERVALS_ALLOWED_DATALIST, interval)) {
            return <option key={interval} value={index} />
          }

          const displayName = getIntervalDisplayName(interval, language)

          return (
            <option
              className='mt-4 text-sm lg:mt-0 lg:-rotate-90 lg:text-center'
              key={interval}
              value={index}
              label={displayName}
            />
          )
        })}
      </datalist>
    </div>
  )
}

const MAX_RETRIES = 100

const UptimeSettings = (): JSX.Element => {
  const { monitors, total } = useSelector((state: StateType) => state.ui.monitors)

  const dispatch = useDispatch()

  const navigate = useNavigate()
  const { id, pid } = useRequiredParams<{ id: string; pid: string }>()
  const { pathname } = useLocation()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
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

    if (_isEmpty(form.url)) {
      allErrors.url = t('apiNotifications.inputCannotBeEmpty')
    }

    if (!isValidUrl(form.url!)) {
      allErrors.url = t('monitor.error.urlInvalid')
    }

    const retries = Number(form.retries)

    if (_isNaN(retries)) {
      allErrors.retries = t('apiNotifications.enterACorrectNumber')
    }

    if (retries <= 0) {
      allErrors.retries = t('apiNotifications.numberCantBeNegative')
    }

    if (retries > MAX_RETRIES) {
      allErrors.retries = t('apiNotifications.numberCantBeBigger', {
        max: MAX_RETRIES,
      })
    }

    const acceptedStatusCodes = _split(form.acceptedStatusCodes, ',')

    if (_isEmpty(acceptedStatusCodes)) {
      allErrors.acceptedStatusCodes = t('apiNotifications.inputCannotBeEmpty')
    }

    if (
      acceptedStatusCodes.some((statusCode) => {
        const trimmedStatusCode = Number(statusCode.trim())
        return _isNaN(trimmedStatusCode) || trimmedStatusCode < 100 || trimmedStatusCode > 599
      })
    ) {
      allErrors.acceptedStatusCodes = t('monitor.error.acceptedStatusCodesNotValid')
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
          toast.success(t('monitor.monitorUpdated'))
        })
        .catch((err) => {
          toast.error(err.message || err || 'Something went wrong')
        })
    } else {
      createMonitor(pid, data as ICreateMonitor)
        .then((res) => {
          navigate(`/projects/${pid}?tab=${PROJECT_TABS.uptime}`)
          setMonitors([...monitors, res])
          setMonitorsTotal(total + 1)
          toast.success(t('monitor.monitorCreated'))
        })
        .catch((err) => {
          toast.error(err.message || err || 'Something went wrong')
        })
    }
  }

  const onDelete = () => {
    if (!id) {
      toast.error('Something went wrong')
      return
    }

    deleteMonitor(pid, id)
      .then(() => {
        setMonitors(_filter(monitors, (a) => a.id !== id))
        setMonitorsTotal(total - 1)
        navigate(`/projects/${pid}?tab=${PROJECT_TABS.uptime}`)
        toast.success(t('monitor.monitorDeleted'))
      })
      .catch((err) => {
        toast.error(err.message || err || 'Something went wrong')
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
        <IntervalSelector
          name='interval'
          label={t('monitor.form.interval')}
          hint={t('monitor.form.intervalHint', {
            intervalTranslated: getIntervalDisplayName(Number(form.interval), language, 'long'),
          })}
          value={form.interval}
          onChange={handleInput}
        />
        <Input
          name='retries'
          label={t('monitor.form.retries')}
          hint={t('monitor.form.retriesHint', { retries: form.retries || 'N/A' })}
          value={form.retries}
          className='mt-4'
          onChange={handleInput}
          error={beenSubmitted ? errors.retries : null}
        />
        <IntervalSelector
          name='retryInterval'
          label={t('monitor.form.retryInterval')}
          hint={t('monitor.form.retryIntervalHint', {
            retryIntervalTranslated: getIntervalDisplayName(Number(form.retryInterval), language, 'long'),
          })}
          value={form.retryInterval}
          onChange={handleInput}
        />
        <Input
          name='timeout'
          label={t('monitor.form.timeout')}
          hint={t('monitor.form.timeoutHint', { x: form.timeout || 'N/A' })}
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
