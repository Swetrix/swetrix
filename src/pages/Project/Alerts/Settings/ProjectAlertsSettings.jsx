import React, { useEffect, useMemo, useState } from 'react'
import { useHistory, useParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _replace from 'lodash/replace'
import _find from 'lodash/find'
import _join from 'lodash/join'
import _isString from 'lodash/isString'
import _split from 'lodash/split'
import _keys from 'lodash/keys'
import _filter from 'lodash/filter'
import _map from 'lodash/map'
import _includes from 'lodash/includes'
import _toNumber from 'lodash/toNumber'
import { clsx as cx } from 'clsx'
import Title from 'components/Title'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Checkbox from 'ui/Checkbox'
import Modal from 'ui/Modal'
import {
  PROJECT_TABS, QueryCondition, QueryMetric, QueryTime,
} from 'redux/constants'
import { createAlert, updateAlert, deleteAlert } from 'api'
import { withAuthentication, auth } from 'hoc/protected'
import routes from 'routes'
import Select from 'ui/Select'

const ProjectAlertsSettings = ({ alerts, setProjectAlerts, showError }) => {
  const history = useHistory()
  const { id, pid } = useParams()
  const { pathname } = useLocation()
  const { t } = useTranslation('common')
  const isSettings = !_isEmpty(id) && (_replace(_replace(routes.alert_settings, ':id', id), ':pid', pid) === pathname)
  const alert = useMemo(() => _find(alerts, { id }), [alerts, id])
  const [form, setForm] = useState({
    pid,
    name: '',
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showModal, setShowModal] = useState(false)

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
          console.log(res)
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

  const title = isSettings ? `${'Update'} ${form.name}` : t('Create alert')

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
          <h3 className='mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('profileSettings.general')}
          </h3>
          <Input
            name='name'
            id='name'
            type='text'
            label={t('project.settings.name')}
            value={form.name}
            placeholder='My awesome project'
            className='mt-4'
            onChange={handleInput}
            error={beenSubmitted ? errors.name : null}
          />
          <div className='mt-4'>
            <Select
              name='queryMetric'
              id='queryMetric'
              label={t('alert.settings.queryMetric')}
              items={_keys(QueryMetric)}
              keyExtractor={item => item}
              labelExtractor={item => {
                return QueryMetric[item]
              }}
              title={form.queryMetric || 'Select query metric'}
              onSelect={(item) => setForm(prevForm => ({
                ...prevForm,
                queryMetric: item,
              }))}
            />
          </div>
          <div className='mt-4'>
            <Select
              name='queryCondition'
              id='queryCondition'
              label={t('alert.settings.queryCondition')}
              items={_keys(QueryCondition)}
              keyExtractor={item => item}
              labelExtractor={item => {
                return QueryCondition[item]
              }}
              title={form.queryCondition || 'Select query condition'}
              onSelect={(item) => setForm(prevForm => ({
                ...prevForm,
                queryCondition: item,
              }))}
            />
          </div>
          <Input
            name='queryValue'
            id='queryValue'
            type='text'
            label={t('project.alerts.queryValue')}
            value={form.queryValue}
            placeholder='1-999'
            className='mt-4'
            onChange={handleInput}
            error={beenSubmitted ? errors.queryValue : null}
          />
          <div className='mt-4'>
            <Select
              name='queryTime'
              id='queryTime'
              label={t('alert.settings.queryTime')}
              items={_keys(QueryTime)}
              keyExtractor={item => item}
              labelExtractor={item => {
                return QueryTime[item]
              }}
              title={form.queryTime || 'Select query time'}
              onSelect={(item) => setForm(prevForm => ({
                ...prevForm,
                queryTime: item,
              }))}
            />
          </div>
          {!isSettings ? (
            <div className='mt-5 flex justify-between items-center'>
              <Button className='mr-2 border-indigo-100 dark:text-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600' onClick={onCancel} secondary regular>
                {t('common.cancel')}
              </Button>
              <Button type='submit' primary regular>
                {t('common.save')}
              </Button>
            </div>
          ) : (
            <div className='flex justify-between items-center mt-5'>
              <Button className='ml-2' onClick={() => setShowModal(true)} danger semiSmall>
                <ExclamationTriangleIcon className='w-5 h-5 mr-1' />
                {t('project.settings.delete')}
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
          )}
        </form>
        <Modal
          onClose={() => setShowModal(false)}
          onSubmit={onDelete}
          submitText={t('project.alerts.delete')}
          closeText={t('common.close')}
          title={t('project.alerts.qDelete')}
          message={t('project.alerts.deleteHint')}
          submitType='danger'
          type='error'
          isOpened={showModal}
        />
      </div>
    </Title>
  )
}

export default withAuthentication(ProjectAlertsSettings, auth.authenticated)
