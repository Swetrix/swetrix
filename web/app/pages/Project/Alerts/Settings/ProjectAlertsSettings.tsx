import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useTranslation, Trans } from 'react-i18next'
import { toast } from 'sonner'
import { ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline'

import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _split from 'lodash/split'
import _keys from 'lodash/keys'
import _reduce from 'lodash/reduce'
import _values from 'lodash/values'
import _findKey from 'lodash/findKey'
import _toNumber from 'lodash/toNumber'
import { clsx as cx } from 'clsx'
import Input from '~/ui/Input'
import Button from '~/ui/Button'
import Checkbox from '~/ui/Checkbox'
import Modal from '~/ui/Modal'
import { PROJECT_TABS, QUERY_CONDITION, QUERY_METRIC, QUERY_TIME } from '~/lib/constants'
import { createAlert, updateAlert, deleteAlert, CreateAlert, getAlert } from '~/api'
import { withAuthentication, auth } from '~/hoc/protected'
import routes from '~/utils/routes'
import Select from '~/ui/Select'
import { Alerts } from '~/lib/models/Alerts'
import { StateType } from '~/lib/store'
import { useSelector } from 'react-redux'
import { useRequiredParams } from '~/hooks/useRequiredParams'
import Loader from '~/ui/Loader'

const INTEGRATIONS_LINK = `${routes.user_settings}#integrations`

interface ProjectAlertsSettingsProps {
  isSettings?: boolean
}

const ProjectAlertsSettings = ({ isSettings }: ProjectAlertsSettingsProps) => {
  const { user, loading: authLoading } = useSelector((state: StateType) => state.auth)

  const navigate = useNavigate()
  const { id, pid } = useRequiredParams<{ id: string; pid: string }>()
  const { t } = useTranslation('common')
  const [form, setForm] = useState<Partial<Alerts>>({
    pid,
    name: '',
    queryTime: QUERY_TIME.LAST_1_HOUR,
    queryCondition: QUERY_CONDITION.GREATER_THAN,
    queryMetric: QUERY_METRIC.PAGE_VIEWS,
    active: true,
    queryCustomEvent: '',
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState<{
    [key: string]: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const [alert, setAlert] = useState<Alerts | null>(null)
  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isIntegrationLinked = useMemo(() => {
    if (_isEmpty(user)) {
      return false
    }

    return Boolean(
      (user.telegramChatId && user.isTelegramChatIdConfirmed) || user.slackWebhookUrl || user.discordWebhookUrl,
    )
  }, [user])

  const loadAlert = async (alertId: string) => {
    if (!isSettings) {
      setIsLoading(false)
      return
    }

    if (isLoading) {
      return
    }

    setIsLoading(true)

    try {
      const result = await getAlert(alertId)
      setAlert(result)
      setForm(result)
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

    loadAlert(id)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, id, isSettings])

  const queryTimeTMapping: {
    [key: string]: string
  } = useMemo(() => {
    const values = _values(QUERY_TIME)

    return _reduce(
      values,
      (prev, curr) => {
        const [, amount, metric] = _split(curr, '_')
        let translated

        if (metric === 'minutes') {
          translated = t('alert.xMinutes', { amount })
        }

        if (metric === 'hour') {
          translated = t('alert.xHour', { amount })
        }

        if (metric === 'hours') {
          translated = t('alert.xHours', { amount })
        }

        return {
          ...prev,
          [curr]: translated,
        }
      },
      {},
    )
  }, [t])

  const queryConditionTMapping: {
    [key: string]: string
  } = useMemo(() => {
    const values = _values(QUERY_CONDITION)

    return _reduce(
      values,
      (prev, curr) => ({
        ...prev,
        [curr]: t(`alert.conditions.${curr}`),
      }),
      {},
    )
  }, [t])

  const queryMetricTMapping = useMemo<any>(() => {
    const values = _values(QUERY_METRIC)

    return _reduce(
      values,
      (prev, curr) => ({
        ...prev,
        [curr]: t(`alert.metrics.${curr}`),
      }),
      {},
    )
  }, [t])

  useEffect(() => {
    if (!_isEmpty(alert)) {
      setForm(alert)
    }
  }, [alert])

  const validate = () => {
    const allErrors: {
      [key: string]: string
    } = {}

    if (_isEmpty(form.name) || _size(form.name) < 3) {
      allErrors.name = t('alert.noNameError')
    }

    if (form.queryMetric === QUERY_METRIC.CUSTOM_EVENTS && _isEmpty(form.queryCustomEvent)) {
      allErrors.queryCustomEvent = t('alert.noCustomEventError')
    }

    if (Number.isNaN(_toNumber(form.queryValue))) {
      allErrors.queryValue = t('alert.queryValueError')
    }

    const valid = _isEmpty(_keys(allErrors))

    setErrors(allErrors)
    setValidated(valid)
  }

  const onSubmit = (data: Partial<Alerts>) => {
    if (isSettings) {
      updateAlert(id as string, data)
        .then((res) => {
          navigate(`/projects/${pid}?tab=${PROJECT_TABS.alerts}`)
          setAlert(res)
          toast.success(t('alertsSettings.alertUpdated'))
        })
        .catch((reason) => {
          toast.error(reason.message || reason || 'Something went wrong')
        })
    } else {
      createAlert(data as CreateAlert)
        .then((res) => {
          navigate(`/projects/${pid}?tab=${PROJECT_TABS.alerts}`)
          toast.success(t('alertsSettings.alertCreated'))
        })
        .catch((reason) => {
          toast.error(reason.message || reason || 'Something went wrong')
        })
    }
  }

  const onDelete = () => {
    if (!id) {
      toast.error('Something went wrong')
      return
    }

    deleteAlert(id)
      .then(() => {
        navigate(`/projects/${pid}?tab=${PROJECT_TABS.alerts}`)
        toast.success(t('alertsSettings.alertDeleted'))
      })
      .catch((reason) => {
        toast.error(reason.message || reason || 'Something went wrong')
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
      onSubmit(form)
    }
  }

  const title = isSettings
    ? t('alert.settingsOf', {
        name: form.name,
      })
    : t('alert.create')

  if (isLoading || isLoading === null) {
    return (
      <div className='min-h-min-footer flex flex-col bg-gray-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-900'>
        <Loader />
      </div>
    )
  }

  if (error && !isLoading) {
    return (
      <div className='min-h-page bg-gray-50 px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8 dark:bg-slate-900'>
        <div className='mx-auto max-w-max'>
          <main className='sm:flex'>
            <XCircleIcon className='h-12 w-12 text-red-400' aria-hidden='true' />
            <div className='sm:ml-6'>
              <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
                <h1 className='text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl dark:text-gray-50'>
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
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden'
                >
                  {t('dashboard.reloadPage')}
                </button>
                <Link
                  to={routes.contact}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700 dark:focus:ring-gray-50'
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
      className={cx('min-h-min-footer flex flex-col bg-gray-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-900', {
        'pb-40': isSettings,
      })}
    >
      <form className='mx-auto w-full max-w-7xl' onSubmit={handleSubmit}>
        <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>{title}</h2>
        {!authLoading && !isIntegrationLinked && (
          <div className='mt-2 flex items-center rounded-sm bg-blue-50 px-5 py-3 text-base whitespace-pre-wrap dark:bg-slate-800 dark:text-gray-50'>
            <ExclamationTriangleIcon className='mr-1 h-5 w-5' />
            <Trans
              t={t}
              i18nKey='alert.noIntegration'
              components={{
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                url: <Link to={INTEGRATIONS_LINK} className='text-blue-600 hover:underline dark:text-blue-500' />,
              }}
            />
          </div>
        )}
        <Input
          name='name'
          label={t('alert.name')}
          value={form.name || ''}
          placeholder={t('alert.name')}
          className='mt-4'
          onChange={handleInput}
          error={beenSubmitted ? errors.name : null}
        />
        <Checkbox
          checked={Boolean(form.active)}
          onChange={(checked) =>
            setForm((prev) => ({
              ...prev,
              active: checked,
            }))
          }
          name='active'
          className='mt-4'
          label={t('alert.enabled')}
          hint={t('alert.enabledHint')}
        />
        <div className='mt-4'>
          <Select
            id='queryMetric'
            label={t('alert.metric')}
            items={_values(queryMetricTMapping)}
            title={form.queryMetric ? queryMetricTMapping[form.queryMetric] : ''}
            onSelect={(item) => {
              const key = _findKey(queryMetricTMapping, (predicate) => predicate === item)

              // @ts-expect-error
              setForm((prevForm) => ({
                ...prevForm,
                queryMetric: key,
              }))
            }}
            capitalise
          />
        </div>
        {form.queryMetric === QUERY_METRIC.CUSTOM_EVENTS && (
          <Input
            name='queryCustomEvent'
            label={t('alert.customEvent')}
            value={form.queryCustomEvent || ''}
            placeholder={t('alert.customEvent')}
            className='mt-4'
            onChange={handleInput}
            error={beenSubmitted ? errors.queryCustomEvent : null}
          />
        )}
        <div className='mt-4'>
          <Select
            id='queryCondition'
            label={t('alert.condition')}
            items={_values(queryConditionTMapping)}
            title={form.queryCondition ? queryConditionTMapping[form.queryCondition] : ''}
            onSelect={(item) => {
              const key = _findKey(queryConditionTMapping, (predicate) => predicate === item)

              // @ts-expect-error
              setForm((prevForm) => ({
                ...prevForm,
                queryCondition: key,
              }))
            }}
            capitalise
          />
        </div>
        <Input
          name='queryValue'
          label={t('alert.threshold')}
          value={form.queryValue || ''}
          placeholder='10'
          className='mt-4'
          onChange={handleInput}
          error={beenSubmitted ? errors.queryValue : null}
        />
        <div className='mt-4'>
          <Select
            id='queryTime'
            label={t('alert.time')}
            items={_values(queryTimeTMapping)}
            title={form.queryTime ? queryTimeTMapping[form.queryTime] : ''}
            onSelect={(item) => {
              const key = _findKey(queryTimeTMapping, (predicate) => predicate === item)

              // @ts-expect-error
              setForm((prevForm) => ({
                ...prevForm,
                queryTime: key,
              }))
            }}
            capitalise
          />
        </div>
        {isSettings ? (
          <div className='mt-5 flex items-center justify-between'>
            <Button onClick={() => setShowModal(true)} danger semiSmall>
              <>
                <ExclamationTriangleIcon className='mr-1 h-5 w-5' />
                {t('alert.delete')}
              </>
            </Button>
            <div className='flex items-center justify-between'>
              <Button
                className='mr-2 border-indigo-100 dark:border-slate-700/50 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
                as={Link}
                // @ts-ignore
                to={`/projects/${pid}?tab=${PROJECT_TABS.alerts}`}
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
              // @ts-ignore
              to={`/projects/${pid}?tab=${PROJECT_TABS.alerts}`}
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
        submitText={t('alert.delete')}
        closeText={t('common.close')}
        title={t('alert.qDelete')}
        message={t('alert.deleteHint')}
        submitType='danger'
        type='error'
        isOpened={showModal}
      />
    </div>
  )
}

export default withAuthentication(ProjectAlertsSettings, auth.authenticated)
