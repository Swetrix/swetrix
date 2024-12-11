import React, { ChangeEvent, ChangeEventHandler, useEffect, useId, useState } from 'react'
import { Link, useNavigate } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import { ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline'

import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _join from 'lodash/join'
import _split from 'lodash/split'
import _includes from 'lodash/includes'
import _isNaN from 'lodash/isNaN'
import _map from 'lodash/map'
import _keys from 'lodash/keys'
import { clsx as cx } from 'clsx'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Modal from 'ui/Modal'
import { PROJECT_TABS } from 'lib/constants'
import { createMonitor, updateMonitor, deleteMonitor, CreateMonitor, getProjectMonitor } from 'api'
import { withAuthentication, auth } from 'hoc/protected'
import routes from 'utils/routes'
import { Monitor } from 'lib/models/Uptime'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { StateType } from 'lib/store'
import { useRequiredParams } from 'hooks/useRequiredParams'
import Select from 'ui/Select'
import { formatTime } from 'utils/date'
import { isValidUrl } from 'utils/validator'
import Loader from 'ui/Loader'

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
              className='mt-4 text-sm text-gray-700 dark:text-gray-200 lg:mt-0 lg:-rotate-90 lg:text-center'
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

interface UptimeSettingsProps {
  isSettings?: boolean
}

const UptimeSettings = ({ isSettings }: UptimeSettingsProps) => {
  const { loading: authLoading } = useSelector((state: StateType) => state.auth)

  const navigate = useNavigate()
  const { id, pid } = useRequiredParams<{ id: string; pid: string }>()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
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
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState<{
    [key: string]: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadMonitor = async (projectId: string, monitorId: string) => {
    if (!isSettings) {
      setIsLoading(false)
      return
    }

    if (isLoading) {
      return
    }

    setIsLoading(true)

    try {
      const result = await getProjectMonitor(projectId, monitorId)
      setForm({
        ...result,
        acceptedStatusCodes: _join(result.acceptedStatusCodes, ','),
      })
    } catch (reason: any) {
      setError(reason)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) {
      return
    }

    loadMonitor(pid, id)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, pid, id])

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
          toast.success(t('monitor.monitorUpdated'))
        })
        .catch((err) => {
          toast.error(err.message || err || 'Something went wrong')
        })
    } else {
      createMonitor(pid, data as CreateMonitor)
        .then((res) => {
          navigate(`/projects/${pid}?tab=${PROJECT_TABS.uptime}`)
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
        navigate(`/projects/${pid}?tab=${PROJECT_TABS.uptime}`)
        toast.success(t('monitor.monitorDeleted'))
      })
      .catch((err) => {
        toast.error(err.message || err || 'Something went wrong')
      })
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

  if (isLoading || isLoading === null) {
    return (
      <div className='flex min-h-min-footer flex-col bg-gray-50 px-4 py-6 dark:bg-slate-900 sm:px-6 lg:px-8'>
        <Loader />
      </div>
    )
  }

  if (error && !isLoading) {
    return (
      <div className='min-h-page bg-gray-50 px-4 py-16 dark:bg-slate-900 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
        <div className='mx-auto max-w-max'>
          <main className='sm:flex'>
            <XCircleIcon className='h-12 w-12 text-red-400' aria-hidden='true' />
            <div className='sm:ml-6'>
              <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
                <h1 className='text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl'>
                  {t('apiNotifications.somethingWentWrong')}
                </h1>
                <p className='mt-4 text-2xl font-medium tracking-tight text-gray-700 dark:text-gray-200'>
                  {t('apiNotifications.errorCode', { error })}
                </p>
              </div>
              <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
                <button
                  type='button'
                  onClick={() => window.location.reload()}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                >
                  {t('dashboard.reloadPage')}
                </button>
                <Link
                  to={routes.contact}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700 dark:focus:ring-gray-50'
                >
                  {t('notFoundPage.support')}
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

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
                as={Link}
                // @ts-expect-error
                to={`/projects/${pid}?tab=${PROJECT_TABS.uptime}`}
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
              as={Link}
              // @ts-expect-error
              to={`/projects/${pid}?tab=${PROJECT_TABS.uptime}`}
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
