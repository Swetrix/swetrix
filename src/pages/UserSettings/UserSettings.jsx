/* eslint-disable no-param-reassign, react/forbid-prop-types */
import React, {
  useState, useEffect, memo, useRef,
} from 'react'
import { useHistory } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import _size from 'lodash/size'
import _isEmpty from 'lodash/isEmpty'
import _isNull from 'lodash/isNull'
import _findIndex from 'lodash/findIndex'
import _map from 'lodash/map'
import _keys from 'lodash/keys'
import {
  EnvelopeIcon, ExclamationTriangleIcon, ArrowDownTrayIcon, CurrencyDollarIcon, ClipboardDocumentIcon,
} from '@heroicons/react/24/outline'
import PropTypes from 'prop-types'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import {
  reportFrequencies, DEFAULT_TIMEZONE, WEEKLY_REPORT_FREQUENCY, CONFIRMATION_TIMEOUT,
  GDPR_REQUEST, GDPR_EXPORT_TIMEFRAME, THEME_TYPE, TimeFormat,
} from 'redux/constants'
import Title from 'components/Title'
import { withAuthentication, auth } from 'hoc/protected'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Modal from 'ui/Modal'
import Beta from 'ui/Beta'
import Select from 'ui/Select'
import { ActivePin } from 'ui/Pin'
import PaidFeature from 'modals/PaidFeature'
import TimezonePicker from 'ui/TimezonePicker'
import { isValidEmail, isValidPassword, MIN_PASSWORD_CHARS } from 'utils/validator'
import routes from 'routes'
import { trackCustom } from 'utils/analytics'
import { getCookie, setCookie } from 'utils/cookie'
import {
  confirmEmail, exportUserData, generateApiKey, deleteApiKey, setTheme, setTimeFormat,
} from 'api'
import ProjectList from './components/ProjectList'
import TwoFA from './components/TwoFA'
import Integrations from './components/Integrations'
import NoSharedProjects from './components/NoSharedProjects'

dayjs.extend(utc)

const UserSettings = ({
  onDelete, onDeleteProjectCache, removeProject, removeShareProject, setUserShareData,
  setProjectsShareData, userSharedUpdate, sharedProjectError, updateUserData, login,
  genericError, onGDPRExportFailed, updateProfileFailed, updateUserProfileAsync,
  accountUpdated, setAPIKey, user, dontRemember, isPaidTierUsed, setThemeType, themeType,
}) => {
  const history = useHistory()
  const { t, i18n: { language } } = useTranslation('common')

  const [form, setForm] = useState({
    email: user.email || '',
    password: '',
    repeat: '',
  })
  const [timezone, setTimezone] = useState(user.timezone || DEFAULT_TIMEZONE)
  const [isPaidFeatureOpened, setIsPaidFeatureOpened] = useState(false)
  const [timezoneChanged, setTimezoneChanged] = useState(false)
  const [reportFrequency, setReportFrequency] = useState(user.reportFrequency)
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showAPIDeleteModal, setShowAPIDeleteModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const translatedFrequencies = _map(reportFrequencies, (key) => t(`profileSettings.${key}`)) // useMemo(_map(reportFrequencies, (key) => t(`profileSettings.${key}`)), [t])
  const [timeFormat, setTimeFormatState] = useState(user.timeFormat || TimeFormat['12-hour'])

  const copyTimerRef = useRef(null)

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

    const valid = _isEmpty(_keys(allErrors))

    setErrors(allErrors)
    setValidated(valid)
  }

  const onSubmit = (data, callback = () => { }) => {
    delete data.repeat
    // eslint-disable-next-line no-restricted-syntax
    for (const key in data) {
      if (data[key] === '') {
        delete data[key]
      }
    }

    updateUserProfileAsync(data, t('profileSettings.updated'), callback)
  }

  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line

  useEffect(() => {
    return () => {
      clearTimeout(copyTimerRef.current)
    }
  }, [])

  const _setTimezone = (value) => {
    setTimezoneChanged(true)
    setTimezone(value)
  }

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

  const handleIntegrationSave = (data, callback = () => {}) => {
    setBeenSubmitted(true)

    if (validated) {
      onSubmit({
        ...form,
        ...data,
      }, callback)
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

  const _setReportFrequency = (value) => {
    if (!isPaidTierUsed && value === WEEKLY_REPORT_FREQUENCY) {
      setIsPaidFeatureOpened(true)
      return
    }

    setReportFrequency(value)
  }

  const reportIconExtractor = (_, index) => {
    if (!isPaidTierUsed && reportFrequencies[index] === WEEKLY_REPORT_FREQUENCY) {
      return (
        <CurrencyDollarIcon className='w-5 h-5 mr-1' />
      )
    }

    return null
  }

  const setToClipboard = (value) => {
    if (!copied) {
      navigator.clipboard.writeText(value)
      setCopied(true)
      copyTimerRef.current = setTimeout(() => {
        setCopied(false)
      }, 2000)
    }
  }

  const _onDelete = () => {
    onDelete(t, () => {
      history.push(routes.main)
    })
  }

  const onExport = async (exportedAt) => {
    try {
      if (getCookie(GDPR_REQUEST) || (!_isNull(exportedAt) && !dayjs().isAfter(dayjs.utc(exportedAt).add(GDPR_EXPORT_TIMEFRAME, 'day'), 'day'))) {
        onGDPRExportFailed(t('profileSettings.tryAgainInXDays', { amount: GDPR_EXPORT_TIMEFRAME }))
        return
      }
      await exportUserData()

      trackCustom('GDPR_EXPORT')
      accountUpdated(t('profileSettings.reportSent'))
      setCookie(GDPR_REQUEST, true, 1209600) // setting cookie for 14 days
    } catch (e) {
      updateProfileFailed(e)
    }
  }

  const onEmailConfirm = async (errorCallback) => {
    if (getCookie(CONFIRMATION_TIMEOUT)) {
      updateProfileFailed(t('profileSettings.confTimeout'))
      return
    }

    try {
      const res = await confirmEmail()

      if (res) {
        setCookie(CONFIRMATION_TIMEOUT, true, 600)
        accountUpdated(t('profileSettings.confSent'))
      } else {
        errorCallback(t('profileSettings.noConfLeft'))
      }
    } catch (e) {
      updateProfileFailed(e)
    }
  }

  const onApiKeyGenerate = async () => {
    try {
      const res = await generateApiKey()
      setAPIKey(res.apiKey)
    } catch (e) {
      updateProfileFailed(e)
    }
  }

  const onApiKeyDelete = async () => {
    try {
      await deleteApiKey()
      setAPIKey(null)
    } catch (e) {
      updateProfileFailed(e)
    }
  }

  const setAsyncThemeType = async (theme) => {
    try {
      await setTheme(theme)
      setThemeType(theme)
    } catch (e) {
      updateProfileFailed(e)
    }
  }

  const setAsyncTimeFormat = async () => {
    await setTimeFormat(timeFormat)
      .then((response) => {
        const { data } = response
        updateUserData(data)
      })
      .catch((e) => {
        updateProfileFailed(e)
      })
  }

  return (
    <Title title={t('titles.profileSettings')}>
      <div className='min-h-min-footer bg-gray-50 dark:bg-gray-800 flex flex-col py-6 px-4 sm:px-6 lg:px-8'>
        <form className='max-w-7xl w-full mx-auto' onSubmit={handleSubmit}>
          <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>
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
          <hr className='mt-5 border-gray-200 dark:border-gray-600' />
          <h3 className='flex items-center mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('profileSettings.theme')}
            <div className='ml-3'>
              <ActivePin label={t('common.new')} />
            </div>
          </h3>
          <div className='grid grid-cols-1 gap-y-6 gap-x-4 lg:grid-cols-2 mt-2 mb-4'>
            <div>
              <Select
                title={themeType}
                label={t('profileSettings.selectTheme')}
                className='w-full'
                items={[THEME_TYPE.classic, THEME_TYPE.christmas]}
                onSelect={(f) => setAsyncThemeType(f)}
              />
            </div>
          </div>
          <hr className='mt-5 border-gray-200 dark:border-gray-600' />
          <h3 className='mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('profileSettings.timezone')}
          </h3>
          <div className='grid grid-cols-1 gap-y-6 gap-x-4 lg:grid-cols-2 mt-4'>
            <div>
              <TimezonePicker value={timezone} onChange={_setTimezone} />
            </div>
          </div>
          <Button className='mt-4' onClick={handleTimezoneSave} primary large>
            {t('common.save')}
          </Button>
          <h3 className='mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('profileSettings.timeFormat')}
          </h3>
          <div className='grid grid-cols-1 gap-y-6 gap-x-4 lg:grid-cols-2 mt-4'>
            <div>
              <Select
                title={timeFormat}
                label={t('profileSettings.selectTimeFormat')}
                className='w-full'
                items={[TimeFormat['12-hour'], TimeFormat['24-hour']]}
                onSelect={(f) => setTimeFormatState(f)}
              />
            </div>
          </div>
          <Button className='mt-4' onClick={setAsyncTimeFormat} primary large>
            {t('common.save')}
          </Button>
          <hr className='mt-5 border-gray-200 dark:border-gray-600' />
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
                iconExtractor={reportIconExtractor}
                onSelect={(f) => _setReportFrequency(
                  reportFrequencies[_findIndex(translatedFrequencies, (freq) => freq === f)],
                )}
              />
            </div>
          </div>
          <Button className='mt-4' onClick={handleReportSave} primary large>
            {t('common.save')}
          </Button>
          <hr className='mt-5 border-gray-200 dark:border-gray-600' />

          <h3 id='integrations' className='flex items-center mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('profileSettings.integrations')}
            <div className='ml-5'>
              <Beta />
            </div>
          </h3>
          <Integrations
            user={user}
            updateUserData={updateUserData}
            handleIntegrationSave={handleIntegrationSave}
            genericError={genericError}
          />

          <hr className='mt-5 border-gray-200 dark:border-gray-600' />

          <h3 className='flex items-center mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('profileSettings.apiKey')}
            <div className='ml-5'>
              <Beta />
            </div>
          </h3>
          {user.apiKey ? (
            <>
              <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
                {t('profileSettings.apiKeyWarning')}
              </p>
              <p className='mt-4 max-w-prose text-base text-gray-900 dark:text-gray-50'>
                {t('profileSettings.apiKey')}
              </p>
              <div className='grid grid-cols-1 gap-y-6 gap-x-4 lg:grid-cols-2'>
                <div className='relative group'>
                  <Input
                    name='apiKey'
                    id='apiKey'
                    type='text'
                    className='pr-9'
                    value={user.apiKey}
                    onChange={handleInput}
                    disabled
                  />
                  <div className='absolute right-2 top-3'>
                    <div className='group relative'>
                      <Button
                        type='button'
                        onClick={() => setToClipboard(user.apiKey)}
                        className='opacity-70 hover:opacity-100'
                        noBorder
                      >
                        <ClipboardDocumentIcon className='w-6 h-6' />
                        {copied && (
                          <div className='animate-appear bg-white dark:bg-gray-700 cursor-auto rounded p-1 absolute sm:top-0 top-0.5 right-8 text-xs text-green-600'>
                            {t('common.copied')}
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
              {t('profileSettings.noApiKey')}
            </p>
          )}
          {user.apiKey ? (
            <Button className='mt-4' onClick={() => setShowAPIDeleteModal(true)} danger large>
              {t('profileSettings.deleteApiKeyBtn')}
            </Button>
          ) : (
            <Button className='mt-4' onClick={onApiKeyGenerate} primary large>
              {t('profileSettings.addApiKeyBtn')}
            </Button>
          )}
          <hr className='mt-5 border-gray-200 dark:border-gray-600' />
          <h3 className='flex items-center mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('profileSettings.2fa')}
          </h3>
          <TwoFA
            user={user}
            dontRemember={dontRemember}
            updateUserData={updateUserData}
            login={login}
            genericError={genericError}
          />

          <hr className='mt-5 border-gray-200 dark:border-gray-600' />
          <h3 className='flex items-center mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('profileSettings.shared')}
          </h3>
          <div>
            {!_isEmpty(user.sharedProjects) ? (
              <div className='mt-3 flex flex-col'>
                <div className='-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8'>
                  <div className='inline-block min-w-full py-2 align-middle md:px-6 lg:px-8'>
                    <div className='overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg'>
                      <table className='min-w-full divide-y divide-gray-300 dark:divide-gray-600'>
                        <thead>
                          <tr className='dark:bg-gray-700'>
                            <th
                              scope='col'
                              className='py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 dark:text-white'
                            >
                              {t('profileSettings.sharedTable.project')}
                            </th>
                            <th
                              scope='col'
                              className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white'
                            >
                              {t('profileSettings.sharedTable.role')}
                            </th>
                            <th
                              scope='col'
                              className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white'
                            >
                              {t('profileSettings.sharedTable.joinedOn')}
                            </th>
                            <th scope='col' className='relative py-3.5 pl-3 pr-4 sm:pr-6' />
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-300 dark:divide-gray-600'>
                          {_map(user.sharedProjects, (item) => (
                            <ProjectList
                              key={item.id}
                              item={item}
                              language={language}
                              t={t}
                              removeProject={removeProject}
                              removeShareProject={removeShareProject}
                              setUserShareData={setUserShareData}
                              setProjectsShareData={setProjectsShareData}
                              userSharedUpdate={userSharedUpdate}
                              sharedProjectError={sharedProjectError}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <NoSharedProjects t={t} />
            )}
          </div>
          <hr className='mt-5 border-gray-200 dark:border-gray-600' />
          {!user.isActive && (
            <div
              href='#'
              className='flex cursor-pointer mt-4 pl-0 underline text-blue-600 hover:text-indigo-800'
              onClick={() => onEmailConfirm(setError)}
            >
              <EnvelopeIcon className='mt-0.5 mr-2 w-6 h-6 text-blue-500' />
              {t('profileSettings.noLink')}
            </div>
          )}
          <div className='flex justify-between mt-4'>
            <Button onClick={() => setShowExportModal(true)} semiSmall primary>
              <ArrowDownTrayIcon className='w-5 h-5 mr-1' />
              {t('profileSettings.requestExport')}
            </Button>
            <Button className='ml-3' onClick={() => setShowModal(true)} semiSmall danger>
              <ExclamationTriangleIcon className='w-5 h-5 mr-1' />
              {t('profileSettings.delete')}
            </Button>
          </div>
        </form>

        <PaidFeature isOpened={isPaidFeatureOpened} onClose={() => setIsPaidFeatureOpened(false)} />
        <Modal
          onClose={() => setShowExportModal(false)}
          onSubmit={() => {
            setShowExportModal(false)
            onExport(user.exportedAt)
          }}
          submitText={t('common.continue')}
          closeText={t('common.close')}
          title={t('profileSettings.dataExport')}
          type='info'
          message={t('profileSettings.exportConfirmation')}
          isOpened={showExportModal}
        />
        <Modal
          onClose={() => setShowModal(false)}
          onSubmit={() => {
            setShowModal(false)
            _onDelete()
          }}
          submitText={t('profileSettings.aDelete')}
          closeText={t('common.close')}
          title={t('profileSettings.qDelete')}
          submitType='danger'
          type='error'
          message={t('profileSettings.deactivateConfirmation')}
          isOpened={showModal}
        />
        <Modal
          onClose={() => setShowAPIDeleteModal(false)}
          onSubmit={() => {
            setShowAPIDeleteModal(false)
            onApiKeyDelete()
          }}
          submitText={t('profileSettings.deleteApiKeyBtn')}
          closeText={t('common.close')}
          title={t('profileSettings.apiKeyDelete')}
          submitType='danger'
          type='error'
          message={t('profileSettings.apiKeyDeleteConf')}
          isOpened={showAPIDeleteModal}
        />
        <Modal
          onClose={() => {
            setError('')
          }}
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

UserSettings.propTypes = {
  onDelete: PropTypes.func.isRequired,
  onGDPRExportFailed: PropTypes.func.isRequired,
  onDeleteProjectCache: PropTypes.func.isRequired,
  removeProject: PropTypes.func.isRequired,
  removeShareProject: PropTypes.func.isRequired,
  setUserShareData: PropTypes.func.isRequired,
  setProjectsShareData: PropTypes.func.isRequired,
  userSharedUpdate: PropTypes.func.isRequired,
  sharedProjectError: PropTypes.func.isRequired,
  updateUserData: PropTypes.func.isRequired,
  login: PropTypes.func.isRequired,
  genericError: PropTypes.func.isRequired,
  updateProfileFailed: PropTypes.func.isRequired,
  updateUserProfileAsync: PropTypes.func.isRequired,
  accountUpdated: PropTypes.func.isRequired,
  setAPIKey: PropTypes.func.isRequired,
  user: PropTypes.object.isRequired,
  dontRemember: PropTypes.bool.isRequired,
  isPaidTierUsed: PropTypes.bool.isRequired,
}

export default memo(withAuthentication(UserSettings, auth.authenticated))
