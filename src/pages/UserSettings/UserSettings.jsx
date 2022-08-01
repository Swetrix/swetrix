import React, {
  useState, useEffect, memo,
} from 'react'
import { useSelector } from 'react-redux'
import cx from 'clsx'
import _size from 'lodash/size'
import _isEmpty from 'lodash/isEmpty'
import _isNull from 'lodash/isNull'
import _findIndex from 'lodash/findIndex'
import _map from 'lodash/map'
import _keys from 'lodash/keys'
import _isString from 'lodash/isString'
import { MailIcon } from '@heroicons/react/outline'
import QRCode from 'react-qr-code'
import PropTypes from 'prop-types'
import dayjs from 'dayjs'

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
import { setAccessToken } from 'utils/accessToken'

import {
  deleteShareProject, acceptShareProject, generate2FA, enable2FA, disable2FA,
} from 'api'

const ProjectList = ({
  item, t, removeShareProject, removeProject, setProjectsShareData, setUserShareData,
  language, userSharedUpdate, sharedProjectError,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const {
    created, confirmed, id, role, project,
  } = item

  const deleteProject = async (pid) => {
    try {
      await deleteShareProject(pid)
      removeShareProject(pid)
      removeProject(project.id)
      userSharedUpdate(t('apiNotifications.quitProject'))
    } catch (e) {
      console.error(`[ERROR] Error while quitting project: ${e}`)
      sharedProjectError(t('apiNotifications.quitProjectError'))
    }
  }

  const onAccept = async () => {
    try {
      await acceptShareProject(id)
      setProjectsShareData({ confirmed: true }, project.id)
      setUserShareData({ confirmed: true }, id)
      userSharedUpdate(t('apiNotifications.acceptInvitation'))
    } catch (e) {
      console.error(`[ERROR] Error while accepting project invitation: ${e}`)
      sharedProjectError(t('apiNotifications.acceptInvitationError'))
    }
  }

  return (
    <tr className='dark:bg-gray-700'>
      <td className='whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6'>
        {project.name}
      </td>
      <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-white'>
        {t(`project.settings.roles.${role}.name`)}
      </td>
      <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-white'>
        {language === 'en'
          ? dayjs(created).locale(language).format('MMMM D, YYYY')
          : dayjs(created).locale(language).format('D MMMM, YYYY')}
      </td>
      <td className='relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6'>
        {confirmed ? (
          <Button onClick={() => setShowDeleteModal(true)} danger small>
            {t('common.quit')}
          </Button>
        ) : (
          <>
            <Button className='mr-2' onClick={() => setShowDeleteModal(true)} primary small>
              {t('common.reject')}
            </Button>
            <Button onClick={() => onAccept()} primary small>
              {t('common.accept')}
            </Button>
          </>
        )}
        <Modal
          onClose={() => {
            setShowDeleteModal(false)
          }}
          onSubmit={() => {
            setShowDeleteModal(false)
            deleteProject(id)
          }}
          submitText={t('common.yes')}
          type='confirmed'
          closeText={t('common.no')}
          title={t('profileSettings.quitProjectTitle', { project: project.name })}
          message={t('profileSettings.quitProject')}
          isOpened={showDeleteModal}
        />
      </td>
    </tr>
  )
}

ProjectList.propTypes = {
  item: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  t: PropTypes.func.isRequired,
  sharedProjectError: PropTypes.func.isRequired,
  removeProject: PropTypes.func.isRequired,
  removeShareProject: PropTypes.func.isRequired,
  userSharedUpdate: PropTypes.func.isRequired,
}

const NoSharedProjects = ({ t }) => (
  <div className='flex flex-col py-6 sm:px-6 lg:px-8'>
    <div className='max-w-7xl w-full mx-auto text-gray-900 dark:text-gray-50'>
      <h2 className='text-2xl mb-4 text-center leading-snug'>
        {t('profileSettings.noSharedProjects')}
      </h2>
    </div>
  </div>
)

const TwoFA = ({
  t, user, dontRemember, updateUserData, login, genericError,
}) => {
  const [twoFAConfigurating, setTwoFAConfigurating] = useState(false)
  const [twoFADisabling, setTwoFADisabling] = useState(false)
  const [twoFAConfigData, setTwoFAConfigData] = useState({}) // { secret, otpauthUrl }
  const [isTwoFaLoading, setIsTwoFaLoading] = useState(false)
  const [twoFACode, setTwoFACode] = useState('')
  const [twoFACodeError, setTwoFACodeError] = useState(null)
  const [twoFARecovery, setTwoFARecovery] = useState(null)
  const { isTwoFactorAuthenticationEnabled } = user

  const handle2FAInput = event => {
    const { target: { value } } = event
    setTwoFACode(value)
    setTwoFACodeError(null)
  }

  const _generate2FA = async () => {
    if (!isTwoFaLoading) {
      setIsTwoFaLoading(true)

      try {
        const result = await generate2FA()
        setTwoFAConfigurating(true)
        setTwoFAConfigData(result)
      } catch (e) {
        if (_isString(e)) {
          genericError(e)
        } else {
          genericError(t('apiNotifications.generate2FAError'))
        }
        console.error(`[ERROR] Failed to generate 2FA: ${e}`)
        setTwoFAConfigurating(false)
        setTwoFAConfigData({})
      }

      setIsTwoFaLoading(false)
    }
  }

  const _enable2FA = async () => {
    if (!isTwoFaLoading) {
      setIsTwoFaLoading(true)

      try {
        const { twoFactorRecoveryCode, access_token: accessToken, user: updatedUser } = await enable2FA(twoFACode)
        login(updatedUser)
        setAccessToken(accessToken, dontRemember)
        setTwoFARecovery(twoFactorRecoveryCode)
      } catch (e) {
        if (_isString(e)) {
          genericError(e)
        }
        setTwoFACodeError(t('profileSettings.invalid2fa'))
      }

      setTwoFACode('')
      setIsTwoFaLoading(false)
    }
  }

  const _disable2FA = async () => {
    if (!isTwoFaLoading) {
      setIsTwoFaLoading(true)

      try {
        await disable2FA(twoFACode)
        updateUserData({ isTwoFactorAuthenticationEnabled: false })
      } catch (e) {
        if (_isString(e)) {
          genericError(e)
        }
        setTwoFACodeError(t('profileSettings.invalid2fa'))
      }

      setTwoFACode('')
      setIsTwoFaLoading(false)
    }
  }

  const callFnOnKeyPress = (fn, key = 'Enter') => (e) => {
    e.stopPropagation()
    if (e.key === key) {
      fn(e)
    }
  }

  const recoverySaved = () => {
    setTwoFARecovery(null)
    setTwoFAConfigurating(false)
  }

  if (twoFARecovery) {
    return (
      <div className='max-w-prose'>
        <p className='text-base text-gray-900 dark:text-gray-50'>
          {t('profileSettings.2faRecoveryNote')}
        </p>
        <Input
          type='text'
          className='mt-4'
          value={twoFARecovery}
        />
        <Button
          onClick={recoverySaved}
          primary
          large
        >
          {t('profileSettings.2faRecoverySaved')}
        </Button>
      </div>
    )
  }

  if (isTwoFactorAuthenticationEnabled) {
    if (twoFADisabling) {
      return (
        <>
          <p className='text-base max-w-prose text-gray-900 dark:text-gray-50'>
            {t('profileSettings.2faDisableHint')}
          </p>
          <div className='flex items-center mt-4'>
            <Input
              type='text'
              label={t('profileSettings.enter2faToDisable')}
              value={twoFACode}
              placeholder={t('profileSettings.yourOneTimeCode')}
              className='sm:col-span-3'
              onChange={handle2FAInput}
              onKeyDown={callFnOnKeyPress(_disable2FA)}
              error={twoFACodeError}
              disabled={isTwoFaLoading}
            />
            <Button
              className={cx('ml-2', {
                'mt-4': _isNull(twoFACodeError),
                'mb-1': !_isNull(twoFACodeError),
              })}
              onClick={_disable2FA}
              loading={isTwoFaLoading}
              danger
              large
            >
              {t('common.disable')}
            </Button>
          </div>
        </>
      )
    }

    return (
      <>
        <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
          {t('profileSettings.2faEnabled')}
        </p>
        <Button
          className='mt-4'
          onClick={() => setTwoFADisabling(true)}
          danger
          large
        >
          {t('profileSettings.2faDisableBtn')}
        </Button>
      </>
    )
  }

  if (twoFAConfigurating) {
    return (
      <>
        <p className='text-base max-w-prose text-gray-900 dark:text-gray-50'>
          {t('profileSettings.2faDesc')}
        </p>
        <div className='mt-4 p-4 bg-white w-max'>
          <QRCode value={twoFAConfigData.otpauthUrl} />
        </div>
        <p className='text-base whitespace-pre-line mt-2 text-gray-900 dark:text-gray-50'>
          {t('profileSettings.2faQRAlt', { key: twoFAConfigData.secret })}
        </p>
        <div className='flex items-center mt-4'>
          <Input
            type='text'
            label={t('profileSettings.enter2faToEnable')}
            value={twoFACode}
            placeholder={t('profileSettings.yourOneTimeCode')}
            className='sm:col-span-3'
            onChange={handle2FAInput}
            onKeyDown={callFnOnKeyPress(_enable2FA)}
            error={twoFACodeError}
            disabled={isTwoFaLoading}
          />
          <Button
            className={cx('ml-2', {
              'mt-4': _isNull(twoFACodeError),
              'mb-1': !_isNull(twoFACodeError),
            })}
            onClick={_enable2FA}
            loading={isTwoFaLoading}
            primary
            large
          >
            {t('common.enable')}
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
        {t('profileSettings.2faEnable')}
      </p>
      <Button className='mt-4' onClick={_generate2FA} loading={isTwoFaLoading} primary large>
        {t('profileSettings.2faEnableBtn')}
      </Button>
    </>
  )
}

const UserSettings = ({
  onDelete, onExport, onSubmit, onEmailConfirm, onDeleteProjectCache, t,
  removeProject, removeShareProject, setUserShareData, setProjectsShareData, language,
  userSharedUpdate, sharedProjectError, updateUserData, login, genericError, onApiKeyGenerate, onApiKeyDelete,
}) => {
  const { user, dontRemember } = useSelector(state => state.auth)

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
  const [showAPIDeleteModal, setShowAPIDeleteModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [error, setError] = useState(null)
  const translatedFrequencies = _map(reportFrequencies, (key) => t(`profileSettings.${key}`)) // useMemo(_map(reportFrequencies, (key) => t(`profileSettings.${key}`)), [t])

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

  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line

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

  const handleReportSave = () => {
    setBeenSubmitted(true)

    if (validated) {
      onSubmit({
        ...form,
        reportFrequency,
      })
    }
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
          <hr className='mt-5' />
          <h3 className='mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('profileSettings.timezone')}
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
                onSelect={(f) => setReportFrequency(reportFrequencies[_findIndex(translatedFrequencies, freq => freq === f)])}
              />
            </div>
          </div>
          <Button className='mt-4' onClick={handleReportSave} primary large>
            {t('common.save')}
          </Button>
          <hr className='mt-5' />
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
              <div className='grid grid-cols-1 gap-y-6 gap-x-4 lg:grid-cols-2'>
                <Input
                  name='apiKey'
                  id='apiKey'
                  type='text'
                  label={t('profileSettings.apiKey')}
                  value={user.apiKey}
                  className='mt-4'
                  onChange={handleInput}
                  disabled
                />
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
          <hr className='mt-5' />
          <h3 className='flex items-center mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('profileSettings.2fa')}
          </h3>
          <TwoFA t={t} user={user} dontRemember={dontRemember} updateUserData={updateUserData} login={login} genericError={genericError} />

          <hr className='mt-5' />
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
                            <th scope='col' className='py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 dark:text-white'>
                              {t('profileSettings.sharedTable.project')}
                            </th>
                            <th scope='col' className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white'>
                              {t('profileSettings.sharedTable.role')}
                            </th>
                            <th scope='col' className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white'>
                              {t('profileSettings.sharedTable.joinedOn')}
                            </th>
                            <th scope='col' className='relative py-3.5 pl-3 pr-4 sm:pr-6' />
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-300 dark:divide-gray-600'>
                          {
                            _map(user.sharedProjects, (item) => (
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
                            ))
                          }
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
          onClose={() => setShowAPIDeleteModal(false)}
          onSubmit={() => { setShowAPIDeleteModal(false); onApiKeyDelete() }}
          submitText={t('profileSettings.deleteApiKeyBtn')}
          closeText={t('common.close')}
          title={t('profileSettings.apiKeyDelete')}
          submitType='danger'
          type='error'
          message={t('profileSettings.apiKeyDeleteConf')}
          isOpened={showAPIDeleteModal}
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

UserSettings.propTypes = {
  onEmailConfirm: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  onDeleteProjectCache: PropTypes.func.isRequired,
  removeProject: PropTypes.func.isRequired,
  removeShareProject: PropTypes.func.isRequired,
  setUserShareData: PropTypes.func.isRequired,
  setProjectsShareData: PropTypes.func.isRequired,
  language: PropTypes.string.isRequired,
  userSharedUpdate: PropTypes.func.isRequired,
  sharedProjectError: PropTypes.func.isRequired,
  updateUserData: PropTypes.func.isRequired,
  login: PropTypes.func.isRequired,
  genericError: PropTypes.func.isRequired,
  onApiKeyDelete: PropTypes.func.isRequired,
  onApiKeyGenerate: PropTypes.func.isRequired,
}

export default memo(UserSettings)
