import { WarningOctagonIcon, XCircleIcon } from '@phosphor-icons/react'
import _findKey from 'lodash/findKey'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _reduce from 'lodash/reduce'
import _size from 'lodash/size'
import _split from 'lodash/split'
import _toNumber from 'lodash/toNumber'
import _values from 'lodash/values'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Link, useFetcher } from 'react-router'
import { toast } from 'sonner'

import { QUERY_CONDITION, QUERY_METRIC, QUERY_TIME } from '~/lib/constants'
import { Alerts } from '~/lib/models/Alerts'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import { useAuth } from '~/providers/AuthProvider'
import type { ProjectViewActionData } from '~/routes/projects.$id'
import Button from '~/ui/Button'
import Checkbox from '~/ui/Checkbox'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

const INTEGRATIONS_LINK = `${routes.user_settings}#integrations`

interface ProjectAlertsSettingsProps {
  alertId?: string | null
  projectId: string
  isSettings?: boolean
  onClose?: () => void
  onSave?: () => void
  backLink?: string
}

const ProjectAlertsSettings = ({
  alertId,
  projectId,
  isSettings,
  onClose,
  onSave,
  backLink,
}: ProjectAlertsSettingsProps) => {
  const { user, isLoading: authLoading } = useAuth()

  const { t } = useTranslation('common')
  const fetcher = useFetcher<ProjectViewActionData>()
  const lastHandledData = useRef<ProjectViewActionData | null>(null)

  const [form, setForm] = useState<Partial<Alerts>>({
    pid: projectId,
    name: '',
    queryTime: QUERY_TIME.LAST_1_HOUR,
    queryCondition: QUERY_CONDITION.GREATER_THAN,
    queryMetric: QUERY_METRIC.PAGE_VIEWS,
    queryValue: 10,
    active: true,
    queryCustomEvent: '',
    alertOnNewErrorsOnly: true,
    alertOnEveryCustomEvent: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
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
      (user.telegramChatId && user.isTelegramChatIdConfirmed) ||
      user.slackWebhookUrl ||
      user.discordWebhookUrl,
    )
  }, [user])

  // Handle fetcher responses
  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return
    if (lastHandledData.current === fetcher.data) return
    lastHandledData.current = fetcher.data

    const { intent, success, data, error: fetcherError } = fetcher.data

    if (success) {
      if (intent === 'get-alert' && data) {
        const alertData = data as Alerts
        setAlert(alertData)
        setForm(alertData)
        setIsLoading(false)
      } else if (intent === 'create-alert') {
        toast.success(t('alertsSettings.alertCreated'))
        onSave?.()
      } else if (intent === 'update-alert' && data) {
        setAlert(data as Alerts)
        toast.success(t('alertsSettings.alertUpdated'))
        onSave?.()
      } else if (intent === 'delete-alert') {
        toast.success(t('alertsSettings.alertDeleted'))
        onSave?.()
      }
    } else if (fetcherError) {
      if (intent === 'get-alert') {
        setError(fetcherError)
        setIsLoading(false)
      } else {
        toast.error(fetcherError)
      }
    }
  }, [fetcher.state, fetcher.data, t, onSave])

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (alertId && isSettings) {
      setIsLoading(true)
      fetcher.submit(
        { intent: 'get-alert', alertId },
        { method: 'POST', action: `/projects/${projectId}` },
      )
    } else {
      setIsLoading(false)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, alertId, isSettings, projectId])

  const queryTimeTMapping: Record<string, string> = useMemo(() => {
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

  const queryConditionTMapping: Record<string, string> = useMemo(() => {
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

  useEffect(() => {
    if (form.queryMetric === QUERY_METRIC.ERRORS) {
      setForm((prevForm) => ({
        ...prevForm,
        queryCondition: undefined,
        queryValue: undefined,
        queryTime: undefined,
      }))
    }
  }, [form.queryMetric])

  useEffect(() => {
    if (
      form.queryMetric === QUERY_METRIC.CUSTOM_EVENTS &&
      form.alertOnEveryCustomEvent
    ) {
      setForm((prevForm) => ({
        ...prevForm,
        queryCondition: undefined,
        queryValue: undefined,
        queryTime: undefined,
      }))
    }
  }, [form.queryMetric, form.alertOnEveryCustomEvent])

  const validate = () => {
    const allErrors: Record<string, string> = {}

    if (_isEmpty(form.name) || _size(form.name) < 3) {
      allErrors.name = t('alert.noNameError')
    }

    if (
      form.queryMetric === QUERY_METRIC.CUSTOM_EVENTS &&
      _isEmpty(form.queryCustomEvent)
    ) {
      allErrors.queryCustomEvent = t('alert.noCustomEventError')
    }

    if (
      form.queryMetric !== QUERY_METRIC.ERRORS &&
      !(
        form.queryMetric === QUERY_METRIC.CUSTOM_EVENTS &&
        form.alertOnEveryCustomEvent
      )
    ) {
      if (
        form.queryValue === undefined ||
        Number.isNaN(_toNumber(form.queryValue))
      ) {
        allErrors.queryValue = t('alert.queryValueError')
      }
    }

    const valid = _isEmpty(_keys(allErrors))

    setErrors(allErrors)

    return valid
  }

  const shouldIncludeQueryFields =
    form.queryMetric !== QUERY_METRIC.ERRORS &&
    !(
      form.queryMetric === QUERY_METRIC.CUSTOM_EVENTS &&
      form.alertOnEveryCustomEvent
    )

  const onDeleteAlert = () => {
    if (!alertId || fetcher.state !== 'idle') return

    fetcher.submit(
      { intent: 'delete-alert', alertId },
      { method: 'POST', action: `/projects/${projectId}` },
    )
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
    setBeenSubmitted(true)

    const isValid = validate()

    if (!isValid) {
      e.preventDefault()
    }
  }

  const title = isSettings
    ? t('alert.settingsOf', {
        name: form.name,
      })
    : t('alert.create')

  if (isLoading || isLoading === null) {
    return (
      <div className='mt-4'>
        <Loader />
      </div>
    )
  }

  if (error && !isLoading) {
    return (
      <div className='px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
        <div className='mx-auto max-w-max'>
          <main className='sm:flex'>
            <XCircleIcon
              className='h-12 w-12 text-red-400'
              aria-hidden='true'
            />
            <div className='sm:ml-6'>
              <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
                <h1 className='text-4xl font-extrabold text-gray-900 sm:text-5xl dark:text-gray-50'>
                  {t('apiNotifications.somethingWentWrong')}
                </h1>
                <p className='mt-4 text-2xl font-medium text-gray-700 dark:text-gray-200'>
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
    <div>
      <DashboardHeader
        backLink={backLink}
        showLiveVisitors={false}
        showSearchButton={false}
        showRefreshButton={false}
        showPeriodSelector={false}
        leftContent={
          <Text
            as='h2'
            size='xl'
            weight='bold'
            className='wrap-break-word break-all'
          >
            {title}
          </Text>
        }
      />
      <fetcher.Form
        method='POST'
        action={`/projects/${projectId}`}
        className='w-full pb-4'
        onSubmit={handleSubmit}
      >
        <input
          type='hidden'
          name='intent'
          value={isSettings && alertId ? 'update-alert' : 'create-alert'}
        />
        {isSettings && alertId ? (
          <input type='hidden' name='alertId' value={alertId} />
        ) : null}
        <input
          type='hidden'
          name='queryMetric'
          value={form.queryMetric || QUERY_METRIC.PAGE_VIEWS}
        />
        {shouldIncludeQueryFields && form.queryCondition ? (
          <input
            type='hidden'
            name='queryCondition'
            value={form.queryCondition}
          />
        ) : null}
        {shouldIncludeQueryFields && form.queryTime ? (
          <input type='hidden' name='queryTime' value={form.queryTime} />
        ) : null}

        {!authLoading && !isIntegrationLinked ? (
          <div className='mt-2 flex items-center rounded-sm bg-blue-50 px-5 py-3 text-base whitespace-pre-wrap dark:bg-slate-800 dark:text-gray-50'>
            <WarningOctagonIcon className='mr-1 h-5 w-5' />
            <Trans
              t={t}
              i18nKey='alert.noIntegration'
              components={{
                url: (
                  <Link
                    to={INTEGRATIONS_LINK}
                    className='text-blue-600 hover:underline dark:text-blue-500'
                  />
                ),
              }}
            />
          </div>
        ) : null}
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
          classes={{
            label: 'mt-4',
          }}
          label={t('alert.enabled')}
          hint={t('alert.enabledHint')}
        />
        <div className='mt-4'>
          <Select
            id='queryMetric'
            label={t('alert.metric')}
            items={_values(queryMetricTMapping)}
            title={
              form.queryMetric ? queryMetricTMapping[form.queryMetric] : ''
            }
            onSelect={(item) => {
              const key = _findKey(
                queryMetricTMapping,
                (predicate) => predicate === item,
              )

              // @ts-expect-error
              setForm((prevForm) => ({
                ...prevForm,
                queryMetric: key,
              }))
            }}
            capitalise
            selectedItem={
              form.queryMetric
                ? queryMetricTMapping[form.queryMetric]
                : undefined
            }
          />
        </div>
        {form.queryMetric === QUERY_METRIC.CUSTOM_EVENTS ? (
          <Input
            name='queryCustomEvent'
            label={t('alert.customEvent')}
            value={form.queryCustomEvent || ''}
            placeholder={t('alert.customEvent')}
            className='mt-4'
            onChange={handleInput}
            error={beenSubmitted ? errors.queryCustomEvent : null}
          />
        ) : null}
        {form.queryMetric === QUERY_METRIC.CUSTOM_EVENTS ? (
          <Checkbox
            checked={Boolean(form.alertOnEveryCustomEvent)}
            onChange={(checked) =>
              setForm((prev) => ({
                ...prev,
                alertOnEveryCustomEvent: checked,
              }))
            }
            name='alertOnEveryCustomEvent'
            classes={{
              label: 'mt-4',
            }}
            label={t('alert.alertOnEveryCustomEvent')}
            hint={t('alert.alertOnEveryCustomEventHint')}
          />
        ) : null}
        {form.queryMetric === QUERY_METRIC.ERRORS ? (
          <Checkbox
            checked={Boolean(form.alertOnNewErrorsOnly)}
            onChange={(checked) =>
              setForm((prev) => ({
                ...prev,
                alertOnNewErrorsOnly: checked,
              }))
            }
            name='alertOnNewErrorsOnly'
            classes={{
              label: 'mt-4',
            }}
            label={t('alert.newErrorsOnly')}
            hint={t('alert.newErrorsOnlyHint')}
          />
        ) : null}
        {form.queryMetric !== QUERY_METRIC.ERRORS &&
        !(
          form.queryMetric === QUERY_METRIC.CUSTOM_EVENTS &&
          form.alertOnEveryCustomEvent
        ) ? (
          <>
            <div className='mt-4'>
              <Select
                id='queryCondition'
                label={t('alert.condition')}
                items={_values(queryConditionTMapping)}
                title={
                  form.queryCondition
                    ? queryConditionTMapping[form.queryCondition]
                    : ''
                }
                onSelect={(item) => {
                  const key = _findKey(
                    queryConditionTMapping,
                    (predicate) => predicate === item,
                  )

                  // @ts-expect-error
                  setForm((prevForm) => ({
                    ...prevForm,
                    queryCondition: key,
                  }))
                }}
                capitalise
                selectedItem={
                  form.queryCondition
                    ? queryConditionTMapping[form.queryCondition]
                    : undefined
                }
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
                  const key = _findKey(
                    queryTimeTMapping,
                    (predicate) => predicate === item,
                  )

                  // @ts-expect-error
                  setForm((prevForm) => ({
                    ...prevForm,
                    queryTime: key,
                  }))
                }}
                capitalise
                selectedItem={
                  form.queryTime ? queryTimeTMapping[form.queryTime] : undefined
                }
              />
            </div>
          </>
        ) : null}
        {isSettings ? (
          <div className='mt-5 flex items-center justify-between'>
            <Button onClick={() => setShowModal(true)} danger semiSmall>
              <>
                <WarningOctagonIcon className='mr-1 h-5 w-5' />
                {t('alert.delete')}
              </>
            </Button>
            <div className='flex items-center justify-between'>
              <Button
                className='mr-2 border-indigo-100 dark:border-slate-700/50 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
                onClick={onClose}
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
              onClick={onClose}
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
      </fetcher.Form>
      <Modal
        onClose={() => setShowModal(false)}
        onSubmit={onDeleteAlert}
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

export default ProjectAlertsSettings
