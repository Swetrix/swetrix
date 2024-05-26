/* eslint-disable no-param-reassign */
import React, { useState, useEffect, memo, useRef, useMemo } from 'react'
import type i18next from 'i18next'
import { useNavigate } from '@remix-run/react'
import { ClientOnly } from 'remix-utils/client-only'
import { useTranslation } from 'react-i18next'
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
  ArrowDownTrayIcon,
  CurrencyDollarIcon,
  ClipboardDocumentIcon,
  ChevronDownIcon,
  UserIcon,
  ChatBubbleLeftEllipsisIcon,
  ComputerDesktopIcon,
  CursorArrowRaysIcon,
} from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import cx from 'clsx'

import {
  reportFrequencies,
  DEFAULT_TIMEZONE,
  WEEKLY_REPORT_FREQUENCY,
  CONFIRMATION_TIMEOUT,
  GDPR_REQUEST,
  GDPR_EXPORT_TIMEFRAME,
  TimeFormat,
  isSelfhosted,
} from 'redux/constants'
import { IUser } from 'redux/models/IUser'
import { ISharedProject } from 'redux/models/ISharedProject'
import { withAuthentication, auth } from 'hoc/protected'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Modal from 'ui/Modal'
import Select from 'ui/Select'
import Checkbox from 'ui/Checkbox'
import PaidFeature from 'modals/PaidFeature'
import TimezonePicker from 'ui/TimezonePicker'
import Textarea from 'ui/Textarea'
import Loader from 'ui/Loader'
import { isValidEmail, isValidPassword, MIN_PASSWORD_CHARS } from 'utils/validator'
import routes from 'routesPath'
import { trackCustom } from 'utils/analytics'
import { getCookie, setCookie } from 'utils/cookie'
import {
  confirmEmail,
  exportUserData,
  generateApiKey,
  deleteApiKey, // setTheme,
  receiveLoginNotification,
} from 'api'
import ProjectList from './components/ProjectList'
import TwoFA from './components/TwoFA'
import Integrations from './components/Integrations'
import Socialisations from './components/Socialisations'
import Referral from './components/Referral'
import NoSharedProjects from './components/NoSharedProjects'

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
        icon: UserIcon,
      },
      {
        id: TAB_MAPPING.INTERFACE,
        label: 'Interface settings',
        icon: ComputerDesktopIcon,
      },
    ]
  }

  return [
    {
      id: TAB_MAPPING.ACCOUNT,
      label: t('profileSettings.account'),
      icon: UserIcon,
    },
    {
      id: TAB_MAPPING.COMMUNICATIONS,
      label: 'Communications',
      icon: ChatBubbleLeftEllipsisIcon,
    },
    {
      id: TAB_MAPPING.INTERFACE,
      label: 'Interface settings',
      icon: ComputerDesktopIcon,
    },
    {
      id: TAB_MAPPING.REFERRALS,
      label: t('profileSettings.referral.title'),
      icon: CursorArrowRaysIcon,
    },
  ]
}

interface IProps {
  onDelete: (t: typeof i18next.t, deletionFeedback: string, callback: () => void) => void
  onDeleteProjectCache: () => void
  removeProject: (id: string) => void
  removeShareProject: (id: string) => void
  setUserShareData: (data: Partial<ISharedProject>, id: string) => void
  setProjectsShareData: (data: Partial<ISharedProject>, id: string) => void
  userSharedUpdate: (message: string) => void
  sharedProjectError: (message: string) => void
  updateUserData: (data: Partial<IUser>) => void
  genericError: (message: string) => void
  onGDPRExportFailed: (message: string) => void
  updateProfileFailed: (message: string) => void
  updateUserProfileAsync: (data: IUser, successMessage: string, callback?: (isSuccess: boolean) => void) => void
  accountUpdated: (t: string) => void
  setAPIKey: (key: string | null) => void
  user: IUser
  dontRemember: boolean
  isPaidTierUsed: boolean
  linkSSO: (t: typeof i18next.t, callback: (e: any) => void, provider: string) => void
  unlinkSSO: (t: typeof i18next.t, callback: (e: any) => void, provider: string) => void
  theme: string
  updateShowLiveVisitorsInTitle: (show: boolean, callback: (isSuccess: boolean) => void) => void
  logoutLocal: () => void
  logoutAll: () => void
  loading: boolean
  setCache: (key: string, value: any) => void
  activeReferrals: any[]
  referralStatistics: any
}

interface IForm extends Partial<IUser> {
  repeat: string
  password: string
  email: string
}

const UserSettings = ({
  onDelete,
  onDeleteProjectCache,
  removeProject,
  removeShareProject,
  setUserShareData,
  setProjectsShareData,
  userSharedUpdate,
  sharedProjectError,
  updateUserData,
  genericError,
  onGDPRExportFailed,
  updateProfileFailed,
  updateUserProfileAsync,
  accountUpdated,
  setAPIKey,
  user,
  dontRemember,
  isPaidTierUsed, // setThemeType, themeType,
  linkSSO,
  unlinkSSO,
  theme,
  updateShowLiveVisitorsInTitle,
  logoutAll,
  loading,
  logoutLocal,
  referralStatistics,
  activeReferrals,
  setCache,
}: IProps): JSX.Element => {
  const navigate = useNavigate()
  const { t } = useTranslation('common')
  const [activeTab, setActiveTab] = useState<string>(TAB_MAPPING.ACCOUNT)
  const [form, setForm] = useState<IForm>({
    email: user.email || '',
    password: '',
    repeat: '',
    timeFormat: user.timeFormat || TimeFormat['12-hour'],
  })
  const [showPasswordFields, setShowPasswordFields] = useState<boolean>(false)
  const [timezone, setTimezone] = useState<string>(user.timezone || DEFAULT_TIMEZONE)
  const [isPaidFeatureOpened, setIsPaidFeatureOpened] = useState<boolean>(false)
  const [isPasswordChangeModalOpened, setIsPasswordChangeModalOpened] = useState<boolean>(false)
  const [timezoneChanged, setTimezoneChanged] = useState<boolean>(false)
  const [reportFrequency, setReportFrequency] = useState<string>(user.reportFrequency)
  const [formPresetted, setFormPresetted] = useState<boolean>(false)
  const [validated, setValidated] = useState<boolean>(false)
  const [errors, setErrors] = useState<{
    [key: string]: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState<boolean>(false)
  const [showModal, setShowModal] = useState<boolean>(false)
  const [showAPIDeleteModal, setShowAPIDeleteModal] = useState<boolean>(false)
  const [showExportModal, setShowExportModal] = useState<boolean>(false)
  const [error, setError] = useState<null | string>(null)
  const [copied, setCopied] = useState<boolean>(false)
  const translatedFrequencies: string[] = _map(reportFrequencies, (key) => t(`profileSettings.${key}`)) // useMemo(_map(reportFrequencies, (key) => t(`profileSettings.${key}`)), [t])
  const translatedTimeFormat: string[] = _map(TimeFormat, (key) => t(`profileSettings.${key}`)) // useMemo(_map(TimeFormat, (key) => t(`profileSettings.${key}`)), [t])
  const [settingUpdating, setSettingUpdating] = useState<boolean>(false)
  const [deletionFeedback, setDeletionFeedback] = useState<string>('')

  const copyTimerRef = useRef(null)

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

  const onSubmit = (data: any, callback: (isSuccess: boolean) => void = () => {}) => {
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
      // @ts-ignore
      clearTimeout(copyTimerRef.current)
    }
  }, [])

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

  const _setTimezone = (value: string) => {
    setTimezoneChanged(true)
    setTimezone(value)
  }

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

  const handleShowLiveVisitorsSave = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (settingUpdating) {
      return
    }

    const { checked } = e.target

    setSettingUpdating(true)
    updateShowLiveVisitorsInTitle(checked, (isSuccess: boolean) => {
      setSettingUpdating(false)

      if (isSuccess) {
        accountUpdated(t('profileSettings.updated'))
        return
      }

      genericError(t('apiNotifications.somethingWentWrong'))
    })
  }

  const handleReceiveLoginNotifications = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (settingUpdating) {
      return
    }

    const { checked } = e.target

    setSettingUpdating(true)

    try {
      await receiveLoginNotification(checked)
      updateUserData({
        receiveLoginNotifications: checked,
      })
      accountUpdated(t('profileSettings.updated'))
    } catch {
      genericError(t('apiNotifications.somethingWentWrong'))
    } finally {
      setSettingUpdating(false)
    }
  }

  const handleIntegrationSave = (data: any, callback = () => {}) => {
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

  const _setReportFrequency = (value: string) => {
    if (!isPaidTierUsed && value === WEEKLY_REPORT_FREQUENCY) {
      setIsPaidFeatureOpened(true)
      return
    }

    setReportFrequency(value)
  }

  const reportIconExtractor = (_: any, index: number) => {
    if (!isPaidTierUsed && reportFrequencies[index] === WEEKLY_REPORT_FREQUENCY) {
      return <CurrencyDollarIcon className='mr-1 h-5 w-5' />
    }

    return null
  }

  const setToClipboard = (value: string) => {
    if (!copied) {
      navigator.clipboard.writeText(value)
      setCopied(true)
      // @ts-ignore
      copyTimerRef.current = setTimeout(() => {
        setCopied(false)
      }, 2000)
    }
  }

  const _onDelete = () => {
    onDelete(t, deletionFeedback, () => {
      navigate(routes.main)
    })
  }

  const onExport = async (exportedAt: string) => {
    try {
      if (
        getCookie(GDPR_REQUEST) ||
        (!_isNull(exportedAt) && !dayjs().isAfter(dayjs.utc(exportedAt).add(GDPR_EXPORT_TIMEFRAME, 'day'), 'day'))
      ) {
        onGDPRExportFailed(
          t('profileSettings.tryAgainInXDays', {
            amount: GDPR_EXPORT_TIMEFRAME,
          }),
        )
        return
      }
      await exportUserData()

      trackCustom('GDPR_EXPORT')
      accountUpdated(t('profileSettings.reportSent'))
      setCookie(GDPR_REQUEST, true, 1209600) // setting cookie for 14 days
    } catch (e) {
      updateProfileFailed(e as string)
    }
  }

  const onEmailConfirm = async (errorCallback: any) => {
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
      updateProfileFailed(e as string)
    }
  }

  const onApiKeyGenerate = async () => {
    try {
      const res = await generateApiKey()
      setAPIKey(res.apiKey)
    } catch (e) {
      updateProfileFailed(e as string)
    }
  }

  const onApiKeyDelete = async () => {
    try {
      await deleteApiKey()
      setAPIKey(null)
    } catch (e) {
      updateProfileFailed(e as string)
    }
  }

  // const setAsyncThemeType = async (theme) => {
  //   try {
  //     await setTheme(theme)
  //     setThemeType(theme)
  //   } catch (e) {
  //     updateProfileFailed(e)
  //   }
  // }

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
    <div className='flex min-h-min-footer flex-col bg-gray-50 px-4 py-6 dark:bg-slate-900 sm:px-6 lg:px-8'>
      <form className='mx-auto w-full max-w-7xl' onSubmit={handleSubmit}>
        <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>{t('titles.profileSettings')}</h2>
        {/* Tabs selector */}
        <div className='mt-2'>
          <div className='sm:hidden'>
            <Select
              items={tabs}
              keyExtractor={(item) => item.id}
              labelExtractor={(item) => item.label}
              onSelect={(label) => {
                const selected = _find(tabs, (tab) => tab.label === label)
                if (selected) {
                  setActiveTab(selected?.id)
                }
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
                        'text-md group inline-flex cursor-pointer items-center whitespace-nowrap border-b-2 px-1 py-2 font-bold',
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
                          '-ml-0.5 mr-2 h-5 w-5',
                        )}
                        aria-hidden='true'
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
                    id='email'
                    type='email'
                    label={t('auth.common.email')}
                    value={form.email}
                    placeholder='you@example.com'
                    className='mt-4'
                    onChange={handleInput}
                    error={beenSubmitted ? errors.email : null}
                    disabled={isSelfhosted}
                  />
                  {!isSelfhosted && (
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
                      )}
                      <Button className='mt-4' type='submit' primary large>
                        {t('profileSettings.update')}
                      </Button>
                    </>
                  )}
                  {!isSelfhosted && (
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
                          <p className='mt-4 max-w-prose text-base text-gray-900 dark:text-gray-50'>
                            {t('profileSettings.apiKey')}
                          </p>
                          <div className='grid grid-cols-1 gap-x-4 gap-y-6 lg:grid-cols-2'>
                            <div className='group relative'>
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
                                    onClick={() => setToClipboard(user.apiKey || '')}
                                    className='opacity-70 hover:opacity-100'
                                    noBorder
                                  >
                                    <>
                                      <ClipboardDocumentIcon className='h-6 w-6' />
                                      {copied && (
                                        <div className='absolute right-8 top-0.5 animate-appear cursor-auto rounded bg-white p-1 text-xs text-green-600 dark:bg-slate-800 sm:top-0'>
                                          {t('common.copied')}
                                        </div>
                                      )}
                                    </>
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

                      {/* 2FA setting */}
                      <hr className='mt-5 border-gray-200 dark:border-gray-600' />
                      <h3 className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
                        {t('profileSettings.2fa')}
                      </h3>
                      <TwoFA
                        user={user}
                        dontRemember={dontRemember}
                        updateUserData={updateUserData}
                        genericError={genericError}
                      />

                      {/* Socialisations setup */}
                      <hr className='mt-5 border-gray-200 dark:border-gray-600' />
                      <h3
                        id='socialisations'
                        className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'
                      >
                        {t('profileSettings.socialisations')}
                      </h3>
                      <Socialisations
                        user={user}
                        genericError={genericError}
                        linkSSO={linkSSO}
                        unlinkSSO={unlinkSSO}
                        theme={theme}
                      />

                      {/* Shared projects setting */}
                      <hr className='mt-5 border-gray-200 dark:border-gray-600' />
                      <h3 className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
                        {t('profileSettings.shared')}
                      </h3>
                      <div>
                        {!_isEmpty(user.sharedProjects) ? (
                          <div className='mt-3 flex flex-col'>
                            <div className='-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8'>
                              <div className='inline-block min-w-full py-2 align-middle md:px-6 lg:px-8'>
                                <div className='overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg'>
                                  <table className='min-w-full divide-y divide-gray-300 dark:divide-gray-600'>
                                    <thead>
                                      <tr className='dark:bg-slate-800'>
                                        <th
                                          scope='col'
                                          className='py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6'
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
                          className='mt-4 flex max-w-max cursor-pointer pl-0 text-blue-600 underline hover:text-indigo-800 dark:hover:text-indigo-600'
                          onClick={() => onEmailConfirm(setError)}
                        >
                          <EnvelopeIcon className='mr-2 mt-0.5 h-6 w-6 text-blue-500' />
                          {t('profileSettings.noLink')}
                        </div>
                      )}
                      <div className='mt-4 flex flex-wrap justify-center gap-2 sm:justify-between'>
                        <Button onClick={() => setShowExportModal(true)} semiSmall primary>
                          <>
                            <ArrowDownTrayIcon className='mr-1 h-5 w-5' />
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
                      <TimezonePicker value={timezone} onChange={_setTimezone} />
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
                    id='active'
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
                            iconExtractor={reportIconExtractor}
                            onSelect={(f) =>
                              _setReportFrequency(
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
                      <Integrations
                        user={user}
                        updateUserData={updateUserData}
                        handleIntegrationSave={handleIntegrationSave}
                        genericError={genericError}
                      />
                      {user.isTelegramChatIdConfirmed && (
                        <Checkbox
                          checked={user.receiveLoginNotifications}
                          onChange={handleReceiveLoginNotifications}
                          disabled={settingUpdating}
                          name='receiveLoginNotifications'
                          id='receiveLoginNotifications'
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
                  <Referral
                    user={user}
                    genericError={genericError}
                    updateUserData={updateUserData}
                    referralStatistics={referralStatistics}
                    activeReferrals={activeReferrals}
                    setCache={setCache}
                    accountUpdated={accountUpdated}
                  />
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
          _onDelete()
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
              id='feedback'
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
