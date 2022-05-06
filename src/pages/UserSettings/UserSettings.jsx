import React, {
  useState, useEffect, memo,
} from 'react'
import { useSelector } from 'react-redux'
import _size from 'lodash/size'
import _isEmpty from 'lodash/isEmpty'
import _findIndex from 'lodash/findIndex'
import _map from 'lodash/map'
import { MailIcon } from '@heroicons/react/outline'

import { reportFrequencies, DEFAULT_TIMEZONE } from 'redux/constants'
import Title from 'components/Title'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Modal from 'ui/Modal'
import Beta from 'ui/Beta'
import Select from 'ui/Select'
import TimezonePicker from 'ui/TimezonePicker'
import {
  isValidEmail, isValidPassword, MIN_PASSWORD_CHARS,
} from 'utils/validator'

const UserSettings = ({
  onDelete, onExport, onSubmit, onEmailConfirm, onDeleteProjectCache, t,
}) => {
  const { user } = useSelector(state => state.auth)

  const [form, setForm] = useState({
    email: user.email || '',
    password: '',
    repeat: '',
  })
  const [timezone, setTimezone] = useState(user.timezone || DEFAULT_TIMEZONE)
  const [timezoneChanged, setTimezoneChanged] = useState(false)
  const [reportFrequency, setReportFrequency] = useState(user.reportFrequency)
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [error, setError] = useState(null)
  const translatedFrequencies = _map(reportFrequencies, (key) => t(`profileSettings.${key}`)) // useMemo(_map(reportFrequencies, (key) => t(`profileSettings.${key}`)), [t])

  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line

  const _setTimezone = (value) => {
    setTimezoneChanged(true)
    setTimezone(value)
  }

  const handleInput = event => {
    const t = event.target
    const value = t.type === 'checkbox' ? t.checked : t.value

    setForm(form => ({
      ...form,
      [t.name]: value,
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

  const handleTimezoneSave = () => {
    setBeenSubmitted(true)

    if (validated) {
      // if the timezone updates, we need to delete all project cache to refetch it with the new timezone setting afterwards
      if (timezoneChanged) {
        onDeleteProjectCache()
      }

      onSubmit({
        ...form,
        timezone,
      })
    }
  }

  const handleReportSave = () => {
    setBeenSubmitted(true)

    if (validated) {
      onSubmit({
        ...form,
        reportFrequency,
      })
    }
  }

  const validate = () => {
    const allErrors = {}

    if (!isValidEmail(form.email)) {
      allErrors.email = t('auth.common.badEmailError')
    }

    if (_size(form.password) > 0 && !isValidPassword(form.password)) {
      allErrors.password = t('auth.common.xCharsError', { amount: MIN_PASSWORD_CHARS })
    }

    if (form.password !== form.repeat) {
      allErrors.repeat = t('auth.common.noMatchError')
    }

    const valid = _isEmpty(Object.keys(allErrors))

    setErrors(allErrors)
    setValidated(valid)
  }

  return (
    <Title title={t('titles.profileSettings')}>
      <div className='min-h-min-footer bg-gray-50 dark:bg-gray-800 flex flex-col py-6 px-4 sm:px-6 lg:px-8'>
        <form className='max-w-7xl w-full mx-auto' onSubmit={handleSubmit}>
          <h2 className='mt-2 text-3xl font-extrabold text-gray-900 dark:text-gray-50'>
            {t('titles.profileSettings')}
          </h2>
          <h3 className='mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('profileSettings.general')}
          </h3>
          <Input
            name='email'
            id='email'
            type='email'
            label={t('auth.common.email')}
            value={form.email}
            placeholder='you@example.com'
            className='mt-4'
            onChange={handleInput}
            error={beenSubmitted ? errors.email : null}
          />
          <div className='grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6 mt-4'>
            <Input
              name='password'
              id='password'
              type='password'
              label={t('auth.common.password')}
              hint={t('auth.common.hint', { amount: MIN_PASSWORD_CHARS })}
              value={form.password}
              placeholder={t('auth.common.password')}
              className='sm:col-span-3'
              onChange={handleInput}
              error={beenSubmitted ? errors.password : null}
            />
            <Input
              name='repeat'
              id='repeat'
              type='password'
              label={t('auth.common.repeat')}
              value={form.repeat}
              placeholder={t('auth.common.repeat')}
              className='sm:col-span-3'
              onChange={handleInput}
              error={beenSubmitted ? errors.repeat : null}
            />
          </div>
          <Button className='mt-4' type='submit' primary large>
            {t('profileSettings.update')}
          </Button>
          <hr className='mt-5' />
          <h3 className='flex items-center mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('profileSettings.timezone')}
            <Beta className='ml-10' />
          </h3>
          <div className='grid grid-cols-1 gap-y-6 gap-x-4 lg:grid-cols-2 mt-4'>
            <div>
              <TimezonePicker
                value={timezone}
                onChange={_setTimezone}
              />
            </div>
          </div>
          <Button className='mt-4' onClick={handleTimezoneSave} primary large>
            {t('common.save')}
          </Button>
          <hr className='mt-5' />
          <h3 className='mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('profileSettings.email')}
          </h3>
          <div className='grid grid-cols-1 gap-y-6 gap-x-4 lg:grid-cols-2 mt-4'>
            <div>
              <Select
                title={t(`profileSettings.${reportFrequency}`)}
                label={t('profileSettings.frequency')}
                className='w-full'
                items={translatedFrequencies}
                onSelect={(f) => setReportFrequency(reportFrequencies[_findIndex(translatedFrequencies, t => t === f)])}
              />
            </div>
          </div>
          <Button className='mt-4' onClick={handleReportSave} primary large>
            {t('common.save')}
          </Button>
          <hr className='mt-5' />
          {!user.isActive && (
            <div href='#' className='flex cursor-pointer mt-4 pl-0 underline text-blue-600 hover:text-indigo-800' onClick={() => onEmailConfirm(setError)}>
              <MailIcon className='mt-0.5 mr-2 w-6 h-6 text-blue-500' />
              {t('profileSettings.noLink')}
            </div>
          )}
          <div className='flex justify-between mt-4'>
            <Button
              onClick={() => setShowExportModal(true)}
              regular
              primary
            >
              {t('profileSettings.requestExport')}
            </Button>
            <Button
              className='ml-3'
              onClick={() => setShowModal(true)}
              regular
              danger
            >
              {t('profileSettings.delete')}
            </Button>
          </div>
        </form>

        <Modal
          onClose={() => setShowExportModal(false)}
          onSubmit={() => { setShowExportModal(false); onExport(user.exportedAt) }}
          submitText={t('common.continue')}
          closeText={t('common.close')}
          title={t('profileSettings.dataExport')}
          type='info'
          message={t('profileSettings.exportConfirmation')}
          isOpened={showExportModal}
        />
        <Modal
          onClose={() => setShowModal(false)}
          onSubmit={() => { setShowModal(false); onDelete() }}
          submitText={t('profileSettings.aDelete')}
          closeText={t('common.close')}
          title={t('profileSettings.qDelete')}
          submitType='danger'
          type='error'
          message={t('profileSettings.deactivateConfirmation')}
          isOpened={showModal}
        />
        <Modal
          onClose={() => { setError('') }}
          closeText={t('common.gotIt')}
          type='error'
          title={t('common.error')}
          message={error}
          isOpened={Boolean(error)}
        />
      </div>
    </Title>
  )
}

export default memo(UserSettings)
