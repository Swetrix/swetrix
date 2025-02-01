/* eslint-disable no-param-reassign */
import React, { useState, useEffect, memo, useMemo } from 'react'
import type i18next from 'i18next'
import { useNavigate } from '@remix-run/react'
import { ClientOnly } from 'remix-utils/client-only'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import _size from 'lodash/size'
import _isEmpty from 'lodash/isEmpty'
import _isNull from 'lodash/isNull'
import _findIndex from 'lodash/findIndex'
import _map from 'lodash/map'
import _keys from 'lodash/keys'
import _find from 'lodash/find'
import {
  EnvelopeIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  CursorArrowRaysIcon,
} from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import cx from 'clsx'

import {
  reportFrequencies,
  DEFAULT_TIMEZONE,
  CONFIRMATION_TIMEOUT,
  GDPR_REQUEST,
  GDPR_EXPORT_TIMEFRAME,
  TimeFormat,
  isSelfhosted,
} from '~/lib/constants'
import { User } from '~/lib/models/User'
import { withAuthentication, auth } from '~/hoc/protected'
import Input from '~/ui/Input'
import Button from '~/ui/Button'
import Modal from '~/ui/Modal'
import Select from '~/ui/Select'
import Checkbox from '~/ui/Checkbox'
import PaidFeature from '~/modals/PaidFeature'
import TimezonePicker from '~/ui/TimezonePicker'
import Textarea from '~/ui/Textarea'
import Loader from '~/ui/Loader'
import { isValidEmail, isValidPassword, MIN_PASSWORD_CHARS } from '~/utils/validator'
import routes from '~/utils/routes'
import { trackCustom } from '~/utils/analytics'
import { getCookie, setCookie } from '~/utils/cookie'
import {
  confirmEmail,
  exportUserData,
  generateApiKey,
  deleteApiKey, // setTheme,
  receiveLoginNotification,
  setShowLiveVisitorsInTitle,
  changeUserDetails,
  deleteUser,
} from '~/api'
import ProjectList from './components/ProjectList'
import TwoFA from './components/TwoFA'
import Integrations from './components/Integrations'
import Socialisations from './components/Socialisations'
import Referral from './components/Referral'
import NoSharedProjects from './components/NoSharedProjects'
import Organisations from './components/Organisations'
import NoOrganisations from './components/NoOrganisations'
import { useSelector } from 'react-redux'
import { StateType, useAppDispatch } from '~/lib/store'
import { authActions } from '~/lib/reducers/auth'
import { removeRefreshToken } from '~/utils/refreshToken'
import { removeAccessToken } from '~/utils/accessToken'
import { logout } from '~/utils/auth'
import { DownloadIcon, MessageSquareTextIcon, MonitorIcon, UserRoundIcon } from 'lucide-react'

dayjs.extend(utc)

const timeFormatArray = _map(TimeFormat, (key) => key)

const TAB_MAPPING = {
  ACCOUNT: 'account',
  REFERRALS: 'referrals',
  INTERFACE: 'interface',
  COMMUNICATIONS: 'communications',
}

const getTabs = (t: typeof i18next.t) => {
  if (isSelfhosted) {
    return [
      {
        id: TAB_MAPPING.ACCOUNT,
        label: t('profileSettings.account'),
        icon: UserRoundIcon,
      },
      {
        id: TAB_MAPPING.INTERFACE,
        label: 'Interface settings',
        icon: MonitorIcon,
      },
    ]
  }

  return [
    {
      id: TAB_MAPPING.ACCOUNT,
      label: t('profileSettings.account'),
      icon: UserRoundIcon,
    },
    {
      id: TAB_MAPPING.COMMUNICATIONS,
      label: 'Communications',
      icon: MessageSquareTextIcon,
    },
    {
      id: TAB_MAPPING.INTERFACE,
      label: 'Interface settings',
      icon: MonitorIcon,
    },
    {
      id: TAB_MAPPING.REFERRALS,
      label: t('profileSettings.referral.title'),
      icon: CursorArrowRaysIcon,
    },
  ]
}

interface Form extends Partial<User> {
  repeat: string
  password: string
  email: string
}

const UserSettings = () => {
  const { user, loading } = useSelector((state: StateType) => state.auth)
  const dispatch = useAppDispatch()

  const navigate = useNavigate()
  const { t } = useTranslation('common')
  const [activeTab, setActiveTab] = useState(TAB_MAPPING.ACCOUNT)
  const [form, setForm] = useState<Form>({
    email: user.email || '',
    password: '',
    repeat: '',
    timeFormat: user.timeFormat || TimeFormat['12-hour'],
  })
  const [showPasswordFields, setShowPasswordFields] = useState(false)
  const [timezone, setTimezone] = useState(user.timezone || DEFAULT_TIMEZONE)
  const [isPaidFeatureOpened, setIsPaidFeatureOpened] = useState(false)
  const [isPasswordChangeModalOpened, setIsPasswordChangeModalOpened] = useState(false)
  const [reportFrequency, setReportFrequency] = useState(user.reportFrequency)
  const [formPresetted, setFormPresetted] = useState(false)
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState<{
    [key: string]: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showAPIDeleteModal, setShowAPIDeleteModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [error, setError] = useState<null | string>(null)
  const translatedFrequencies = _map(reportFrequencies, (key) => t(`profileSettings.${key}`))
  const translatedTimeFormat = _map(TimeFormat, (key) => t(`profileSettings.${key}`))
  const [settingUpdating, setSettingUpdating] = useState(false)
  const [deletionFeedback, setDeletionFeedback] = useState('')

  const tabs = getTabs(t)
  const activeTabLabel = useMemo(() => _find(tabs, (tab) => tab.id === activeTab)?.label, [tabs, activeTab])

  const validate = () => {
    const allErrors = {} as {
      [key: string]: string
    }

    if (!isValidEmail(form.email)) {
      allErrors.email = t('auth.common.badEmailError')
    }

    if (_size(form.password) > 0 && !isValidPassword(form.password)) {
      allErrors.password = t('auth.common.xCharsError', {
        amount: MIN_PASSWORD_CHARS,
      })
    }

    if (form.password !== form.repeat) {
      allErrors.repeat = t('auth.common.noMatchError')
    }

    const valid = _isEmpty(_keys(allErrors))

    setErrors(allErrors)
    setValidated(valid)
  }

  const onSubmit = async (data: any, callback: (isSuccess: boolean) => void = () => {}) => {
    delete data.repeat

    // eslint-disable-next-line no-restricted-syntax
    for (const key in data) {
      if (data[key] === '') {
        delete data[key]
      }
    }

    try {
      const result = await changeUserDetails(data)
      dispatch(authActions.setUser(result))
      toast.success(t('profileSettings.updated'))
    } catch (reason: any) {
      toast.error(typeof reason === 'string' ? reason : t('apiNotifications.somethingWentWrong'))
    } finally {
      callback(true)
      dispatch(authActions.finishLoading())
    }
  }

  const logoutLocal = () => {
    dispatch(authActions.logout())
    removeRefreshToken()
    removeAccessToken()
  }

  const logoutAll = () => {
    dispatch(authActions.logout())
    logout(true)
  }

  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line

  useEffect(() => {
    if (!loading && !formPresetted) {
      setForm((prev) => ({
        ...prev,
        email: user.email || '',
        timeFormat: user.timeFormat || TimeFormat['12-hour'],
      }))
      setTimezone(user.timezone || DEFAULT_TIMEZONE)
      setReportFrequency(user.reportFrequency)
      setFormPresetted(true)
    }
  }, [loading, user, formPresetted])

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event
    const value = target.type === 'checkbox' ? target.checked : target.value

    setForm((prevForm) => ({
      ...prevForm,
      [target.name]: value,
    }))
  }

  const handleSubmit = (
    e: React.FormEvent<HTMLFormElement> | null,
    force?: boolean,
    callback: (isSuccess: boolean) => void = () => {},
  ) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setBeenSubmitted(true)

    if (validated) {
      // User is about to change their password, let's warn him if
      if (form.password && !force) {
        setIsPasswordChangeModalOpened(true)
        return
      }

      onSubmit(form, callback)
    }
  }

  const handleTimezoneSave = () => {
    setBeenSubmitted(true)

    if (validated) {
      onSubmit({
        ...form,
        timezone,
      })
    }
  }

  const handleShowLiveVisitorsSave = async (checked: boolean) => {
    if (settingUpdating) {
      return
    }

    setSettingUpdating(true)

    try {
      await setShowLiveVisitorsInTitle(checked)
      dispatch(authActions.mergeUser({ showLiveVisitorsInTitle: checked }))
      toast.success(t('profileSettings.updated'))
    } catch (reason: any) {
      toast.error(typeof reason === 'string' ? reason : t('apiNotifications.somethingWentWrong'))
    } finally {
      setSettingUpdating(false)
    }
  }

  const handleReceiveLoginNotifications = async (checked: boolean) => {
    if (settingUpdating) {
      return
    }

    setSettingUpdating(true)

    try {
      await receiveLoginNotification(checked)
      dispatch(authActions.mergeUser({ receiveLoginNotifications: checked }))
      toast.success(t('profileSettings.updated'))
    } catch {
      toast.error(t('apiNotifications.somethingWentWrong'))
    } finally {
      setSettingUpdating(false)
    }
  }

  const handleIntegrationSave = (data: any, callback: (isSuccess: boolean) => void = () => {}) => {
    setBeenSubmitted(true)

    if (validated) {
      onSubmit(
        {
          ...form,
          ...data,
        },
        callback,
      )
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

  const onAccountDelete = async () => {
    try {
      await deleteUser(deletionFeedback)
      dispatch(authActions.logout())
      toast.success(t('apiNotifications.accountDeleted'))
      trackCustom('ACCOUNT_DELETED', {
        reason_stated: deletionFeedback ? 'true' : 'false',
      })
      navigate(routes.main)
    } catch (reason: any) {
      toast.error(t(`apiNotifications.${reason}`, 'apiNotifications.somethingWentWrong'))
    } finally {
      dispatch(authActions.finishLoading())
    }
  }

  const onExport = async (exportedAt: string) => {
    try {
      if (
        getCookie(GDPR_REQUEST) ||
        (!_isNull(exportedAt) && !dayjs().isAfter(dayjs.utc(exportedAt).add(GDPR_EXPORT_TIMEFRAME, 'day'), 'day'))
      ) {
        toast.error(
          t('profileSettings.tryAgainInXDays', {
            amount: GDPR_EXPORT_TIMEFRAME,
          }),
        )
        return
      }
      await exportUserData()

      trackCustom('GDPR_EXPORT')
      toast.success(t('profileSettings.reportSent'))
      setCookie(GDPR_REQUEST, true, 1209600) // setting cookie for 14 days
    } catch (reason: any) {
      toast.error(reason)
    }
  }

  const onEmailConfirm = async (errorCallback: any) => {
    if (getCookie(CONFIRMATION_TIMEOUT)) {
      toast.error(t('profileSettings.confTimeout'))
      return
    }

    try {
      const res = await confirmEmail()

      if (res) {
        setCookie(CONFIRMATION_TIMEOUT, true, 600)
        toast.success(t('profileSettings.confSent'))
      } else {
        errorCallback(t('profileSettings.noConfLeft'))
      }
    } catch (reason: any) {
      toast.error(reason)
    }
  }

  const onApiKeyGenerate = async () => {
    try {
      const { apiKey } = await generateApiKey()
      dispatch(authActions.mergeUser({ apiKey }))
    } catch (reason: any) {
      toast.error(reason)
    }
  }

  const onApiKeyDelete = async () => {
    try {
      await deleteApiKey()
      dispatch(authActions.mergeUser({ apiKey: null }))
    } catch (reason: any) {
      toast.error(reason)
    }
  }

  const setAsyncTimeFormat = async () => {
    setBeenSubmitted(true)

    if (validated) {
      onSubmit({
        ...form,
      })
    }
  }

  const toggleShowPasswordFields = () => {
    setForm((prev) => ({
      ...prev,
      password: '',
      repeat: '',
    }))
    setShowPasswordFields((prev) => !prev)
  }

  return (
    <div className='min-h-min-footer flex flex-col bg-gray-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-900'>
      <form className='mx-auto w-full max-w-7xl' onSubmit={handleSubmit}>
        <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>{t('titles.profileSettings')}</h2>
        {/* Tabs selector */}
        <div className='mt-2'>
          <div className='sm:hidden'>
            <Select
              items={tabs}
              keyExtractor={(item) => item.id}
              labelExtractor={(item) => item.label}
              onSelect={(item) => {
                setActiveTab(item.id)
              }}
              title={activeTabLabel}
              capitalise
            />
          </div>
          <div className='hidden sm:block'>
            <div>
              <nav className='-mb-px flex space-x-4' aria-label='Tabs'>
                {_map(tabs, (tab) => {
                  const isCurrent = tab.id === activeTab

                  const onClick = () => {
                    setActiveTab(tab.id)
                  }

                  return (
                    <div
                      key={tab.id}
                      onClick={onClick}
                      className={cx(
                        'text-md group inline-flex cursor-pointer items-center border-b-2 px-1 py-2 font-mono font-bold whitespace-nowrap',
                        {
                          'border-slate-900 text-slate-900 dark:border-gray-50 dark:text-gray-50': isCurrent,
                          'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-300 dark:hover:text-gray-300':
                            !isCurrent,
                        },
                      )}
                      aria-current={isCurrent ? 'page' : undefined}
                    >
                      <tab.icon
                        className={cx(
                          isCurrent
                            ? 'text-slate-900 dark:text-gray-50'
                            : 'text-gray-500 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300',
                          'mr-2 -ml-0.5 h-5 w-5',
                        )}
                        aria-hidden='true'
                        strokeWidth={1.5}
                      />
                      <span>{tab.label}</span>
                    </div>
                  )
                })}
              </nav>
            </div>
          </div>
        </div>
        <ClientOnly fallback={<Loader />}>
          {() => {
            if (loading) {
              return <Loader />
            }

            if (activeTab === TAB_MAPPING.ACCOUNT) {
              return (
                <>
                  <h3 className='mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
                    {t('profileSettings.general')}
                  </h3>
                  <Input
                    name='email'
                    type='email'
                    label={t('auth.common.email')}
                    value={form.email}
                    placeholder='you@example.com'
                    className='mt-4'
                    onChange={handleInput}
                    error={beenSubmitted ? errors.email : null}
                    disabled={isSelfhosted}
                  />
                  {isSelfhosted ? (
                    <>
                      <hr className='mt-5 border-gray-200 dark:border-gray-600' />

                      {/* API access setup */}
                      <h3 className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
                        {t('profileSettings.apiKey')}
                      </h3>
                      {user.apiKey ? (
                        <>
                          <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
                            {t('profileSettings.apiKeyWarning')}
                          </p>
                          <div className='grid grid-cols-1 gap-x-4 gap-y-6 lg:grid-cols-2'>
                            <Input
                              label={t('profileSettings.apiKey')}
                              name='apiKey'
                              className='mt-4'
                              value={user.apiKey}
                              disabled
                            />
                          </div>
                        </>
                      ) : (
                        <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
                          {t('profileSettings.selfhostedNoApiKey')}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <span
                        onClick={toggleShowPasswordFields}
                        className='mt-2 flex max-w-max cursor-pointer items-center text-gray-900 hover:underline dark:text-gray-50'
                      >
                        {t('auth.common.changePassword')}
                        <ChevronDownIcon
                          className={cx('ml-2 h-4 w-4', {
                            'rotate-180': showPasswordFields,
                          })}
                        />
                      </span>
                      {showPasswordFields && (
                        <div className='mt-4 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-6'>
                          <Input
                            name='password'
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
                            type='password'
                            label={t('auth.common.repeat')}
                            value={form.repeat}
                            placeholder={t('auth.common.repeat')}
                            className='sm:col-span-3'
                            onChange={handleInput}
                            error={beenSubmitted ? errors.repeat : null}
                          />
                        </div>
                      )}
                      <Button className='mt-4' type='submit' primary large>
                        {t('profileSettings.update')}
                      </Button>

                      <hr className='mt-5 border-gray-200 dark:border-gray-600' />

                      {/* API access setup */}
                      <h3 className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
                        {t('profileSettings.apiKey')}
                      </h3>
                      {user.apiKey ? (
                        <>
                          <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
                            {t('profileSettings.apiKeyWarning')}
                          </p>
                          <div className='grid grid-cols-1 gap-x-4 gap-y-6 lg:grid-cols-2'>
                            <Input
                              label={t('profileSettings.apiKey')}
                              name='apiKey'
                              className='mt-4'
                              value={user.apiKey}
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

                      {/* 2FA setting */}
                      <hr className='mt-5 border-gray-200 dark:border-gray-600' />
                      <h3 className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
                        {t('profileSettings.2fa')}
                      </h3>
                      <TwoFA />

                      {/* Socialisations setup */}
                      <hr className='mt-5 border-gray-200 dark:border-gray-600' />
                      <h3
                        id='socialisations'
                        className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'
                      >
                        {t('profileSettings.socialisations')}
                      </h3>
                      <Socialisations />

                      {/* Shared projects setting */}
                      <hr className='mt-5 border-gray-200 dark:border-gray-600' />
                      <h3 className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
                        {t('profileSettings.shared')}
                      </h3>
                      <div>
                        {!_isEmpty(user.sharedProjects) ? (
                          <div className='mt-3 flex flex-col font-mono'>
                            <div className='-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8'>
                              <div className='inline-block min-w-full py-2 align-middle md:px-6 lg:px-8'>
                                <div className='overflow-hidden ring-1 shadow-sm ring-black/50 md:rounded-lg'>
                                  <table className='min-w-full divide-y divide-gray-300 dark:divide-gray-600'>
                                    <thead>
                                      <tr className='dark:bg-slate-800'>
                                        <th
                                          scope='col'
                                          className='py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6 dark:text-white'
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
                                        <th scope='col' className='relative py-3.5 pr-4 pl-3 sm:pr-6' />
                                      </tr>
                                    </thead>
                                    <tbody className='divide-y divide-gray-300 dark:divide-gray-600'>
                                      {_map(user.sharedProjects, (item) => (
                                        <ProjectList key={item.id} item={item} />
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <NoSharedProjects />
                        )}
                      </div>

                      {/* Organisations setting */}
                      <hr className='mt-5 border-gray-200 dark:border-gray-600' />
                      <h3 className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
                        {t('profileSettings.organisations')}
                      </h3>
                      <div>
                        {!_isEmpty(user.organisationMemberships) ? (
                          <div className='mt-3 flex flex-col font-mono'>
                            <div className='-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8'>
                              <div className='inline-block min-w-full py-2 align-middle md:px-6 lg:px-8'>
                                <div className='overflow-hidden ring-1 shadow-sm ring-black/50 md:rounded-lg'>
                                  <table className='min-w-full divide-y divide-gray-300 dark:divide-gray-600'>
                                    <thead>
                                      <tr className='dark:bg-slate-800'>
                                        <th
                                          scope='col'
                                          className='py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6 dark:text-white'
                                        >
                                          {t('profileSettings.organisationsTable.organisation')}
                                        </th>
                                        <th
                                          scope='col'
                                          className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white'
                                        >
                                          {t('profileSettings.organisationsTable.role')}
                                        </th>
                                        <th
                                          scope='col'
                                          className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white'
                                        >
                                          {t('profileSettings.organisationsTable.joinedOn')}
                                        </th>
                                        <th scope='col' className='relative py-3.5 pr-4 pl-3 sm:pr-6' />
                                      </tr>
                                    </thead>
                                    <tbody className='divide-y divide-gray-300 dark:divide-gray-600'>
                                      {_map(user.organisationMemberships, (membership) => (
                                        <Organisations key={membership.id} membership={membership} />
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <NoOrganisations />
                        )}
                      </div>

                      <hr className='mt-5 border-gray-200 dark:border-gray-600' />
                      {!user.isActive && (
                        <div
                          className='mt-4 flex max-w-max cursor-pointer pl-0 text-blue-600 underline hover:text-indigo-800 dark:hover:text-indigo-600'
                          onClick={() => onEmailConfirm(setError)}
                        >
                          <EnvelopeIcon className='mt-0.5 mr-2 h-6 w-6 text-blue-500' />
                          {t('profileSettings.noLink')}
                        </div>
                      )}
                      <div className='mt-4 flex flex-wrap justify-center gap-2 sm:justify-between'>
                        <Button onClick={() => setShowExportModal(true)} semiSmall primary>
                          <>
                            <DownloadIcon className='mr-1 h-5 w-5' strokeWidth={1.5} />
                            {t('profileSettings.requestExport')}
                          </>
                        </Button>
                        <div className='flex flex-wrap justify-center gap-2'>
                          <Button onClick={logoutAll} semiSmall semiDanger>
                            <>
                              {/* We need this div for the button to match the height of the button after it */}
                              <div className='h-5' />
                              {t('profileSettings.logoutAll')}
                            </>
                          </Button>
                          <Button onClick={() => setShowModal(true)} semiSmall semiDanger>
                            <>
                              <ExclamationTriangleIcon className='mr-1 h-5 w-5' />
                              {t('profileSettings.delete')}
                            </>
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )
            }

            if (activeTab === TAB_MAPPING.INTERFACE) {
              return (
                <>
                  {/* Timezone selector */}
                  <h3 className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
                    {t('profileSettings.timezone')}
                  </h3>
                  <div className='mt-4 grid grid-cols-1 gap-x-4 gap-y-6 lg:grid-cols-2'>
                    <div>
                      <TimezonePicker value={timezone} onChange={setTimezone} />
                    </div>
                  </div>
                  <Button className='mt-4' onClick={handleTimezoneSave} primary large>
                    {t('common.save')}
                  </Button>
                  {/* Timeformat selector (12 / 24 hour format) */}
                  <hr className='mt-5 border-gray-200 dark:border-gray-600' />
                  <h3 className='mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
                    {t('profileSettings.timeFormat')}
                  </h3>
                  <div className='mt-4 grid grid-cols-1 gap-x-4 gap-y-6 lg:grid-cols-2'>
                    <div>
                      <Select
                        title={t(`profileSettings.${form.timeFormat}`)}
                        label={t('profileSettings.selectTimeFormat')}
                        className='w-full'
                        items={translatedTimeFormat}
                        onSelect={(f) =>
                          setForm((prev) => ({
                            ...prev,
                            timeFormat: timeFormatArray[_findIndex(translatedTimeFormat, (freq) => freq === f)],
                          }))
                        }
                        capitalise
                      />
                    </div>
                  </div>
                  <Button className='mt-4' onClick={setAsyncTimeFormat} primary large>
                    {t('common.save')}
                  </Button>

                  {/* UI Settings */}
                  <hr className='mt-5 border-gray-200 dark:border-gray-600' />
                  <h3 className='mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
                    {t('profileSettings.uiSettings')}
                  </h3>
                  <Checkbox
                    checked={user.showLiveVisitorsInTitle}
                    onChange={handleShowLiveVisitorsSave}
                    disabled={settingUpdating}
                    name='active'
                    className='mt-4'
                    label={t('profileSettings.showVisitorsInTitle')}
                  />
                </>
              )
            }

            if (activeTab === TAB_MAPPING.COMMUNICATIONS) {
              return (
                <>
                  {!isSelfhosted && (
                    <>
                      {/* Email reports frequency selector (e.g. monthly, weekly, etc.) */}
                      <h3 className='mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
                        {t('profileSettings.email')}
                      </h3>
                      <div className='mt-4 grid grid-cols-1 gap-x-4 gap-y-6 lg:grid-cols-2'>
                        <div>
                          <Select
                            title={t(`profileSettings.${reportFrequency}`)}
                            label={t('profileSettings.frequency')}
                            className='w-full'
                            items={translatedFrequencies}
                            onSelect={(f) =>
                              setReportFrequency(
                                reportFrequencies[_findIndex(translatedFrequencies, (freq) => freq === f)],
                              )
                            }
                            capitalise
                          />
                        </div>
                      </div>
                      <Button className='mt-4' onClick={handleReportSave} primary large>
                        {t('common.save')}
                      </Button>

                      <hr className='mt-5 border-gray-200 dark:border-gray-600' />
                      {/* Integrations setup */}
                      <h3
                        id='integrations'
                        className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'
                      >
                        {t('profileSettings.integrations')}
                      </h3>
                      <Integrations handleIntegrationSave={handleIntegrationSave} />
                      {user.isTelegramChatIdConfirmed && (
                        <Checkbox
                          checked={user.receiveLoginNotifications}
                          onChange={handleReceiveLoginNotifications}
                          disabled={settingUpdating}
                          name='receiveLoginNotifications'
                          className='mt-4'
                          label={t('profileSettings.receiveLoginNotifications')}
                        />
                      )}
                    </>
                  )}
                </>
              )
            }

            if (activeTab === TAB_MAPPING.REFERRALS) {
              return (
                <>
                  <h3
                    id='socialisations'
                    className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'
                  >
                    {t('profileSettings.referral.title')}
                  </h3>
                  <Referral />
                </>
              )
            }

            return null
          }}
        </ClientOnly>
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
        onClose={() => {
          setDeletionFeedback('')
          setShowModal(false)
        }}
        onSubmit={() => {
          setShowModal(false)
          onAccountDelete()
        }}
        submitText={t('profileSettings.aDelete')}
        closeText={t('common.close')}
        title={t('profileSettings.qDelete')}
        submitType='danger'
        type='error'
        message={
          <>
            {t('profileSettings.deactivateConfirmation')}
            <Textarea
              className='mt-4'
              placeholder={t('profileSettings.deletionFeedback')}
              onChange={(e) => setDeletionFeedback(e.target.value)}
              value={deletionFeedback}
              label={t('profileSettings.deletionFeedbackLabel')}
            />
          </>
        }
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
          setError(null)
        }}
        closeText={t('common.gotIt')}
        type='error'
        title={t('common.error')}
        message={error}
        isOpened={Boolean(error)}
      />
      <Modal
        onClose={() => {
          setIsPasswordChangeModalOpened(false)
        }}
        onSubmit={() => {
          setIsPasswordChangeModalOpened(false)
          handleSubmit(null, true, (isSuccess: boolean) => {
            // password has been changed, let's log out the user as all the sessions are now invalid
            if (isSuccess) {
              logoutLocal()
            }
          })
        }}
        closeText={t('common.cancel')}
        submitText={t('common.continue')}
        type='warning'
        title={t('profileSettings.passwordChangeWarningModal.title')}
        message={t('profileSettings.passwordChangeWarningModal.body')}
        isOpened={isPasswordChangeModalOpened}
      />
    </div>
  )
}

export default memo(withAuthentication(UserSettings, auth.authenticated))
