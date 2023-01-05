/* eslint-disable react/forbid-prop-types */
import React, { useEffect, useMemo, useState } from 'react'
import { useHistory, useParams, useLocation } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { HashLink } from 'react-router-hash-link'
import PropTypes from 'prop-types'

import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _replace from 'lodash/replace'
import _find from 'lodash/find'
import _split from 'lodash/split'
import _keys from 'lodash/keys'
import _filter from 'lodash/filter'
import _reduce from 'lodash/reduce'
import _values from 'lodash/values'
import _findKey from 'lodash/findKey'
import _toNumber from 'lodash/toNumber'
import { clsx as cx } from 'clsx'
import Title from 'components/Title'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Checkbox from 'ui/Checkbox'
import Modal from 'ui/Modal'
import {
  PROJECT_TABS, QUERY_CONDITION, QUERY_METRIC, QUERY_TIME,
} from 'redux/constants'
import { createAlert, updateAlert, deleteAlert } from 'api'
import { withAuthentication, auth } from 'hoc/protected'
import routes from 'routes'
import Select from 'ui/Select'

const INTEGRATIONS_LINK = `${routes.user_settings}#integrations`

const ProjectAlertsSettings = ({
  alerts, setProjectAlerts, showError, user, setProjectAlertsTotal, pageTotal, total,
}) => {
  const history = useHistory()
  const { id, pid } = useParams()
  const { pathname } = useLocation()
  const { t } = useTranslation('common')
  const isSettings = !_isEmpty(id) && (_replace(_replace(routes.alert_settings, ':id', id), ':pid', pid) === pathname)
  const alert = useMemo(() => _find(alerts, { id }), [alerts, id])
  const [form, setForm] = useState({
    pid,
    name: '',
    queryTime: QUERY_TIME.LAST_1_HOUR,
    queryCondition: QUERY_CONDITION.GREATER_THAN,
    queryMetric: QUERY_METRIC.PAGE_VIEWS,
    active: true,
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const isIntegrationLinked = useMemo(() => {
    return !_isEmpty(user) && user.telegramChatId && user.isTelegramChatIdConfirmed
  }, [user])

  const queryTimeTMapping = useMemo(() => {
    const values = _values(QUERY_TIME)

    return _reduce(values, (prev, curr) => {
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
    }, {})
  }, [t])

  const queryConditionTMapping = useMemo(() => {
    const values = _values(QUERY_CONDITION)

    return _reduce(values, (prev, curr) => ({
      ...prev,
      [curr]: t(`alert.conditions.${curr}`),
    }), {})
  }, [t])

  const queryMetricTMapping = useMemo(() => {
    const values = _values(QUERY_METRIC)

    return _reduce(values, (prev, curr) => ({
      ...prev,
      [curr]: t(`alert.metrics.${curr}`),
    }), {})
  }, [t])

  useEffect(() => {
    if (!_isEmpty(alert)) {
      setForm(alert)
    }
  }, [alert])

  const validate = () => {
    const allErrors = {}

    if (_isEmpty(form.name) || _size(form.name) < 3) {
      allErrors.name = t('profileSettings.nameError')
    }

    if (Number.isNaN(_toNumber(form.queryValue))) {
      allErrors.queryValue = t('alertsSettings.queryValueError')
    }

    const valid = _isEmpty(_keys(allErrors))

    setErrors(allErrors)
    setValidated(valid)
  }

  const onSubmit = (data) => {
    if (isSettings) {
      updateAlert(id, data)
        .then((res) => {
          history.push(`/projects/${pid}?tab=${PROJECT_TABS.alerts}`)
          setProjectAlerts([..._filter(alerts, (a) => a.id !== id), res])
        })
        .catch((err) => {
          showError(err.message || err || 'Something went wrong')
        })
    } else {
      createAlert(data)
        .then((res) => {
          history.push(`/projects/${pid}?tab=${PROJECT_TABS.alerts}`)
          setProjectAlerts([...alerts, res])
          setProjectAlertsTotal(total + 1)
        })
        .catch((err) => {
          showError(err.message || err || 'Something went wrong')
        })
    }
  }

  const onDelete = () => {
    deleteAlert(id)
      .then(() => {
        setProjectAlerts(_filter(alerts, (a) => a.id !== id))
        setProjectAlertsTotal(total - 1)
        history.push(`/projects/${pid}?tab=${PROJECT_TABS.alerts}`)
      })
      .catch((err) => {
        showError(err.message || err || 'Something went wrong')
      })
  }

  const onCancel = () => {
    history.push(`/projects/${pid}?tab=${PROJECT_TABS.alerts}`)
  }

  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line

  const handleInput = event => {
    const { target } = event
    const value = target.type === 'checkbox' ? target.checked : target.value

    setForm(prevForm => ({
      ...prevForm,
      [target.name]: value,
    }))
  }

  const handleSubmit = e => {
    e.preventDefault()
    e.stopPropagation()
    setBeenSubmitted(true)

    if (validated) {
      onSubmit(form)
    }
  }

  const title = isSettings ? t('alert.settingsOf', {
    name: form.name,
  }) : t('alert.create')

  return (
    <Title title={title}>
      <div
        className={cx('min-h-min-footer bg-gray-50 dark:bg-gray-800 flex flex-col py-6 px-4 sm:px-6 lg:px-8', {
          'pb-40': isSettings,
        })}
      >
        <form className='max-w-7xl w-full mx-auto' onSubmit={handleSubmit}>
          <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>
            {title}
          </h2>
          {!isIntegrationLinked && (
            <div className='flex items-center bg-blue-50 dark:text-gray-50 dark:bg-gray-700 rounded px-5 py-3 mt-2 whitespace-pre-wrap text-base'>
              <ExclamationTriangleIcon className='w-5 h-5 mr-1' />
              <Trans
                t={t}
                i18nKey='alert.noIntegration'
                components={{
                  url: <HashLink to={INTEGRATIONS_LINK} className='hover:underline text-blue-600 dark:text-blue-500' />,
                }}
              />
            </div>
          )}
          <Input
            name='name'
            id='name'
            type='text'
            label={t('alert.name')}
            value={form.name}
            placeholder='Your alert label'
            className='mt-4'
            onChange={handleInput}
            error={beenSubmitted ? errors.name : null}
          />
          <Checkbox
            checked={Boolean(form.active)}
            onChange={handleInput}
            name='active'
            id='active'
            className='mt-4'
            label={t('alert.enabled')}
            hint={t('alert.enabledHint')}
          />
          <div className='mt-4'>
            <Select
              name='queryMetric'
              id='queryMetric'
              label={t('alert.metric')}
              items={_values(queryMetricTMapping)}
              title={queryMetricTMapping[form.queryMetric]}
              onSelect={(item) => {
                const key = _findKey(queryMetricTMapping, predicate => predicate === item)

                setForm(prevForm => ({
                  ...prevForm,
                  queryMetric: key,
                }))
              }}
            />
          </div>
          <div className='mt-4'>
            <Select
              name='queryCondition'
              id='queryCondition'
              label={t('alert.condition')}
              items={_values(queryConditionTMapping)}
              title={queryConditionTMapping[form.queryCondition]}
              onSelect={(item) => {
                const key = _findKey(queryConditionTMapping, predicate => predicate === item)

                setForm(prevForm => ({
                  ...prevForm,
                  queryCondition: key,
                }))
              }}
            />
          </div>
          <Input
            name='queryValue'
            id='queryValue'
            type='text'
            label={t('alert.threshold')}
            value={form.queryValue}
            placeholder='10'
            className='mt-4'
            onChange={handleInput}
            error={beenSubmitted ? errors.queryValue : null}
          />
          <div className='mt-4'>
            <Select
              name='queryTime'
              id='queryTime'
              label={t('alert.time')}
              items={_values(queryTimeTMapping)}
              title={queryTimeTMapping[form.queryTime]}
              onSelect={(item) => {
                const key = _findKey(queryTimeTMapping, predicate => predicate === item)

                setForm(prevForm => ({
                  ...prevForm,
                  queryTime: key,
                }))
              }}
            />
          </div>
          {isSettings ? (
            <div className='flex justify-between items-center mt-5'>
              <Button onClick={() => setShowModal(true)} danger semiSmall>
                <ExclamationTriangleIcon className='w-5 h-5 mr-1' />
                {t('alert.delete')}
              </Button>
              <div className='flex justify-between items-center'>
                <Button className='mr-2 border-indigo-100 dark:text-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600' onClick={onCancel} secondary regular>
                  {t('common.cancel')}
                </Button>
                <Button type='submit' primary regular>
                  {t('common.save')}
                </Button>
              </div>
            </div>
          ) : (
            <div className='mt-5 flex justify-between items-center'>
              <Button className='mr-2 border-indigo-100 dark:text-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600' onClick={onCancel} secondary regular>
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
    </Title>
  )
}

ProjectAlertsSettings.propTypes = {
  alerts: PropTypes.array.isRequired,
  setProjectAlerts: PropTypes.func.isRequired,
  showError: PropTypes.func.isRequired,
  user: PropTypes.object.isRequired,
}

export default withAuthentication(ProjectAlertsSettings, auth.authenticated)
