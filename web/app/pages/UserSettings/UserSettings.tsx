import { EnvelopeIcon, ExclamationTriangleIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import cx from 'clsx'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import type i18next from 'i18next'
import _find from 'lodash/find'
import _findIndex from 'lodash/findIndex'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _size from 'lodash/size'
import { MessageSquareTextIcon, MonitorIcon, UserRoundIcon } from 'lucide-react'
import React, { useState, useEffect, memo, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useFetcher } from 'react-router'
import { toast } from 'sonner'

import { reportFrequencies, DEFAULT_TIMEZONE, CONFIRMATION_TIMEOUT, TimeFormat, isSelfhosted } from '~/lib/constants'
import { User } from '~/lib/models/User'
import PaidFeature from '~/modals/PaidFeature'
import { useAuth } from '~/providers/AuthProvider'
import type { UserSettingsActionData } from '~/routes/user-settings'
import Button from '~/ui/Button'
import Checkbox from '~/ui/Checkbox'
import Input from '~/ui/Input'
import Modal from '~/ui/Modal'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import Textarea from '~/ui/Textarea'
import TimezonePicker from '~/ui/TimezonePicker'
import { getCookie, setCookie } from '~/utils/cookie'
import routes from '~/utils/routes'
import { isValidEmail, isValidPassword, MIN_PASSWORD_CHARS } from '~/utils/validator'

import Integrations from './components/Integrations'
import NoOrganisations from './components/NoOrganisations'
import NoSharedProjects from './components/NoSharedProjects'
import Organisations from './components/Organisations'
import ProjectList from './components/ProjectList'
import Socialisations from './components/Socialisations'
import TwoFA from './components/TwoFA'

dayjs.extend(utc)

const timeFormatArray = _map(TimeFormat, (key) => key)

const TAB_MAPPING = {
  ACCOUNT: 'account',
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
        label: t('profileSettings.interfaceSettings'),
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
      label: t('profileSettings.communications'),
      icon: MessageSquareTextIcon,
    },
    {
      id: TAB_MAPPING.INTERFACE,
      label: t('profileSettings.interfaceSettings'),
      icon: MonitorIcon,
    },
  ]
}

interface Form extends Partial<User> {
  repeat: string
  password: string
  email: string
}

const UserSettings = () => {
  const { user, logout, mergeUser } = useAuth()

  const navigate = useNavigate()
  const { t } = useTranslation('common')
  const fetcher = useFetcher<UserSettingsActionData>()

  const [activeTab, setActiveTab] = useState(TAB_MAPPING.ACCOUNT)
  const [form, setForm] = useState<Form>(() => ({
    email: user?.email || '',
    password: '',
    repeat: '',
    timeFormat: user?.timeFormat || TimeFormat['12-hour'],
  }))
  const [showPasswordFields, setShowPasswordFields] = useState(false)
  const [timezone, setTimezone] = useState(() => user?.timezone || DEFAULT_TIMEZONE)
  const [isPaidFeatureOpened, setIsPaidFeatureOpened] = useState(false)
  const [isPasswordChangeModalOpened, setIsPasswordChangeModalOpened] = useState(false)
  const [reportFrequency, setReportFrequency] = useState(() => user?.reportFrequency)
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showAPIDeleteModal, setShowAPIDeleteModal] = useState(false)
  const translatedFrequencies = useMemo(() => _map(reportFrequencies, (key) => t(`profileSettings.${key}`)), [t])
  const translatedTimeFormat = useMemo(() => _map(TimeFormat, (key) => t(`profileSettings.${key}`)), [t])
  const [deletionFeedback, setDeletionFeedback] = useState('')

  const lastHandledData = useRef<UserSettingsActionData | null>(null)
  const passwordChangedRef = useRef(false)
  const pendingToggles = useRef<Map<string, boolean>>(new Map())

  const isSubmitting = fetcher.state === 'submitting'

  const tabs = getTabs(t)
  const activeTabLabel = useMemo(() => _find(tabs, (tab) => tab.id === activeTab)?.label, [tabs, activeTab])

  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return
    if (lastHandledData.current === fetcher.data) return
    lastHandledData.current = fetcher.data

    if (fetcher.data.success) {
      const { intent, user: updatedUser, apiKey } = fetcher.data

      if (intent === 'update-profile' && updatedUser) {
        mergeUser(updatedUser)
        toast.success(t('profileSettings.updated'))

        // If password was changed, log out the user
        if (passwordChangedRef.current) {
          passwordChangedRef.current = false
          logout()
        }
      } else if (intent === 'generate-api-key' && apiKey) {
        mergeUser({ apiKey })
        toast.success(t('profileSettings.updated'))
      } else if (intent === 'delete-api-key') {
        mergeUser({ apiKey: null })
        toast.success(t('profileSettings.updated'))
      } else if (intent === 'toggle-live-visitors' && updatedUser) {
        pendingToggles.current.delete('live-visitors')
        mergeUser(updatedUser)
        toast.success(t('profileSettings.updated'))
      } else if (intent === 'toggle-login-notifications') {
        pendingToggles.current.delete('login-notifications')
        toast.success(t('profileSettings.updated'))
      } else if (intent === 'confirm-email') {
        setCookie(CONFIRMATION_TIMEOUT, true, 600)
        toast.success(t('profileSettings.confSent'))
      } else if (intent === 'delete-account') {
        logout()
        toast.success(t('apiNotifications.accountDeleted'))
        navigate(routes.main)
      }
    } else if (fetcher.data?.error) {
      if (pendingToggles.current.has('live-visitors')) {
        mergeUser({ showLiveVisitorsInTitle: pendingToggles.current.get('live-visitors') })
        pendingToggles.current.delete('live-visitors')
      }
      if (pendingToggles.current.has('login-notifications')) {
        mergeUser({ receiveLoginNotifications: pendingToggles.current.get('login-notifications') })
        pendingToggles.current.delete('login-notifications')
      }
      toast.error(fetcher.data.error)
    }
  }, [fetcher.data, fetcher.state, mergeUser, t, logout, navigate])

  const errors = useMemo(() => {
    const allErrors: Record<string, string> = {}

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

    return allErrors
  }, [form.email, form.password, form.repeat, t])

  const validated = _isEmpty(_keys(errors))

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event
    const value = target.type === 'checkbox' ? target.checked : target.value

    setForm((prevForm) => ({
      ...prevForm,
      [target.name]: value,
    }))
  }

  const submitProfileUpdate = (additionalData?: Record<string, unknown>) => {
    setBeenSubmitted(true)

    if (!validated) return

    const formData = new FormData()
    formData.set('intent', 'update-profile')
    if (form.email) formData.set('email', form.email)
    if (form.password) formData.set('password', form.password)
    if (form.repeat) formData.set('repeat', form.repeat)
    if (additionalData?.timezone) formData.set('timezone', additionalData.timezone as string)
    if (additionalData?.timeFormat || form.timeFormat) {
      formData.set('timeFormat', (additionalData?.timeFormat || form.timeFormat) as string)
    }
    if (additionalData?.reportFrequency) formData.set('reportFrequency', additionalData.reportFrequency as string)

    passwordChangedRef.current = !!form.password
    fetcher.submit(formData, { method: 'post' })
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement> | null, force?: boolean) => {
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

      submitProfileUpdate()
    }
  }

  const handleTimezoneSave = () => {
    submitProfileUpdate({ timezone })
  }

  const handleShowLiveVisitorsSave = (checked: boolean) => {
    if (pendingToggles.current.has('live-visitors')) return

    pendingToggles.current.set('live-visitors', user?.showLiveVisitorsInTitle ?? false)
    const formData = new FormData()
    formData.set('intent', 'toggle-live-visitors')
    formData.set('show', checked.toString())
    fetcher.submit(formData, { method: 'post' })
    // Optimistic update
    mergeUser({ showLiveVisitorsInTitle: checked })
  }

  const handleReceiveLoginNotifications = (checked: boolean) => {
    if (pendingToggles.current.has('login-notifications')) return

    pendingToggles.current.set('login-notifications', user?.receiveLoginNotifications ?? false)
    const formData = new FormData()
    formData.set('intent', 'toggle-login-notifications')
    formData.set('receiveLoginNotifications', checked.toString())
    fetcher.submit(formData, { method: 'post' })
    // Optimistic update
    mergeUser({ receiveLoginNotifications: checked })
  }

  const handleIntegrationSave = (data: Record<string, unknown>, callback: (isSuccess: boolean) => void = () => {}) => {
    setBeenSubmitted(true)

    if (validated) {
      submitProfileUpdate(data)
      callback(true)
    }
  }

  const handleReportSave = () => {
    submitProfileUpdate({ reportFrequency })
  }

  const onAccountDelete = () => {
    const formData = new FormData()
    formData.set('intent', 'delete-account')
    formData.set('feedback', deletionFeedback)
    fetcher.submit(formData, { method: 'post' })
  }

  const onEmailConfirm = () => {
    if (getCookie(CONFIRMATION_TIMEOUT)) {
      toast.error(t('profileSettings.confTimeout'))
      return
    }

    const formData = new FormData()
    formData.set('intent', 'confirm-email')
    fetcher.submit(formData, { method: 'post' })
  }

  const onApiKeyGenerate = () => {
    if (isSubmitting) {
      return
    }

    const formData = new FormData()
    formData.set('intent', 'generate-api-key')
    fetcher.submit(formData, { method: 'post' })
  }

  const onApiKeyDelete = () => {
    const formData = new FormData()
    formData.set('intent', 'delete-api-key')
    fetcher.submit(formData, { method: 'post' })
  }

  const setAsyncTimeFormat = () => {
    submitProfileUpdate({ timeFormat: form.timeFormat })
  }

  const toggleShowPasswordFields = () => {
    setForm((prev) => ({
      ...prev,
      password: '',
      repeat: '',
    }))
    setShowPasswordFields((prev) => !prev)
  }

  const sharedProjectsSection = (
    <>
      <hr className='mt-5 border-gray-200 dark:border-gray-600' />
      <Text as='h3' size='lg' weight='bold' className='mt-2 flex items-center'>
        {t('profileSettings.shared')}
      </Text>
      <div>
        {!_isEmpty(user?.sharedProjects) ? (
          <div className='mt-3 overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700'>
            <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-700'>
              <thead className='bg-gray-50 dark:bg-slate-800'>
                <tr>
                  <th
                    scope='col'
                    className='px-4 py-3 text-left text-xs font-bold tracking-wider text-gray-900 uppercase dark:text-white'
                  >
                    {t('profileSettings.sharedTable.project')}
                  </th>
                  <th
                    scope='col'
                    className='px-4 py-3 text-left text-xs font-bold tracking-wider text-gray-900 uppercase dark:text-white'
                  >
                    {t('profileSettings.sharedTable.role')}
                  </th>
                  <th
                    scope='col'
                    className='px-4 py-3 text-left text-xs font-bold tracking-wider text-gray-900 uppercase dark:text-white'
                  >
                    {t('profileSettings.sharedTable.joinedOn')}
                  </th>
                  <th scope='col' />
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 bg-white dark:divide-slate-700 dark:bg-slate-900'>
                {_map(user?.sharedProjects, (item) => (
                  <ProjectList key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoSharedProjects />
        )}
      </div>
    </>
  )

  return (
    <div className='flex min-h-min-footer flex-col bg-gray-50 dark:bg-slate-900'>
      <form className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8' onSubmit={handleSubmit}>
        <Text as='h2' size='3xl' weight='bold' className='mt-2'>
          {t('titles.profileSettings')}
        </Text>
        <hr className='mt-5 border-gray-200 dark:border-gray-600' />
        <div className='mt-6 flex flex-col gap-6 md:flex-row'>
          <div className='md:hidden'>
            <Select
              items={tabs}
              keyExtractor={(item) => item.id}
              labelExtractor={(item) => item.label}
              iconExtractor={(item) => {
                const Icon = item.icon
                return <Icon className='h-4 w-4' strokeWidth={1.5} />
              }}
              onSelect={(item) => {
                setActiveTab(item.id)
              }}
              title={activeTabLabel}
              capitalise
              selectedItem={tabs.find((tab) => tab.id === activeTab)}
            />
          </div>

          <aside className='hidden w-56 shrink-0 md:block'>
            <nav className='flex flex-col space-y-1' aria-label='Sidebar'>
              {_map(tabs, (tab) => {
                const isCurrent = tab.id === activeTab
                const Icon = tab.icon

                return (
                  <button
                    key={tab.id}
                    type='button'
                    onClick={() => setActiveTab(tab.id)}
                    className={cx(
                      'group flex items-center rounded-md px-3 py-2 text-left text-sm text-gray-900 transition-colors',
                      {
                        'bg-gray-200 font-semibold dark:bg-slate-800 dark:text-gray-50': isCurrent,
                        'hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-slate-800 dark:hover:text-gray-50':
                          !isCurrent,
                      },
                    )}
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    <Icon
                      className={cx('mr-2 h-5 w-5 shrink-0 transition-colors', {
                        'text-gray-900 dark:text-gray-50': isCurrent,
                        'text-gray-500 group-hover:text-gray-600 dark:text-gray-400 dark:group-hover:text-gray-300':
                          !isCurrent,
                      })}
                      strokeWidth={1.5}
                    />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </aside>

          <section className='flex-1'>
            {activeTab === TAB_MAPPING.ACCOUNT ? (
              <>
                <Input
                  name='email'
                  type='email'
                  label={t('auth.common.email')}
                  value={form.email}
                  placeholder='you@example.com'
                  onChange={handleInput}
                  error={beenSubmitted ? errors.email : null}
                />
                <span
                  onClick={toggleShowPasswordFields}
                  className='mt-2 flex max-w-max cursor-pointer items-center text-sm text-gray-900 hover:underline dark:text-gray-50'
                >
                  {t('auth.common.changePassword')}
                  <ChevronDownIcon
                    className={cx('ml-2 size-3', {
                      'rotate-180': showPasswordFields,
                    })}
                  />
                </span>
                {showPasswordFields ? (
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
                ) : null}
                <Button className='mt-4' type='submit' primary large>
                  {t('profileSettings.update')}
                </Button>

                <hr className='mt-5 border-gray-200 dark:border-gray-600' />

                <h3 className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
                  {t('profileSettings.apiKey')}
                </h3>
                {user?.apiKey ? (
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
                {user?.apiKey ? (
                  <Button className='mt-4' onClick={() => setShowAPIDeleteModal(true)} danger large>
                    {t('profileSettings.deleteApiKeyBtn')}
                  </Button>
                ) : (
                  <Button className='mt-4' onClick={onApiKeyGenerate} primary large>
                    {t('profileSettings.addApiKeyBtn')}
                  </Button>
                )}

                {isSelfhosted ? (
                  <>
                    {/* Shared projects setting */}
                    {sharedProjectsSection}
                  </>
                ) : (
                  <>
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
                    {sharedProjectsSection}

                    {/* Organisations setting */}
                    <hr className='mt-5 border-gray-200 dark:border-gray-600' />
                    <h3 className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
                      {t('profileSettings.organisations')}
                    </h3>
                    <div>
                      {!_isEmpty(user?.organisationMemberships) ? (
                        <div className='mt-3 overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700'>
                          <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-700'>
                            <thead className='bg-gray-50 dark:bg-slate-800'>
                              <tr>
                                <th
                                  scope='col'
                                  className='px-4 py-3 text-left text-xs font-bold tracking-wider text-gray-900 uppercase dark:text-white'
                                >
                                  {t('profileSettings.organisationsTable.organisation')}
                                </th>
                                <th
                                  scope='col'
                                  className='px-4 py-3 text-left text-xs font-bold tracking-wider text-gray-900 uppercase dark:text-white'
                                >
                                  {t('profileSettings.organisationsTable.role')}
                                </th>
                                <th
                                  scope='col'
                                  className='px-4 py-3 text-left text-xs font-bold tracking-wider text-gray-900 uppercase dark:text-white'
                                >
                                  {t('profileSettings.organisationsTable.joinedOn')}
                                </th>
                                <th scope='col' />
                              </tr>
                            </thead>
                            <tbody className='divide-y divide-gray-200 bg-white dark:divide-slate-700 dark:bg-slate-900'>
                              {_map(user?.organisationMemberships, (membership) => (
                                <Organisations key={membership.id} membership={membership} />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <NoOrganisations />
                      )}
                    </div>

                    <hr className='mt-5 border-gray-200 dark:border-gray-600' />
                    {!user?.isActive ? (
                      <div
                        className='mt-4 flex max-w-max cursor-pointer pl-0 text-blue-600 underline hover:text-indigo-800 dark:hover:text-indigo-600'
                        onClick={onEmailConfirm}
                      >
                        <EnvelopeIcon className='mt-0.5 mr-2 h-6 w-6 text-blue-500' />
                        {t('profileSettings.noLink')}
                      </div>
                    ) : null}
                  </>
                )}
                <div className='mt-4 flex flex-wrap justify-center gap-2 sm:justify-end'>
                  <Button
                    onClick={() => {
                      logout(true)
                    }}
                    semiSmall
                    semiDanger
                  >
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
              </>
            ) : null}

            {activeTab === TAB_MAPPING.INTERFACE ? (
              <>
                <h3 className='flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
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
                      selectedItem={
                        translatedTimeFormat[_findIndex(timeFormatArray, (freq) => freq === form.timeFormat)]
                      }
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
                  checked={user?.showLiveVisitorsInTitle}
                  onChange={handleShowLiveVisitorsSave}
                  disabled={fetcher.formData?.get('intent') === 'toggle-live-visitors'}
                  name='active'
                  classes={{
                    label: 'mt-4',
                  }}
                  label={t('profileSettings.showVisitorsInTitle')}
                />
              </>
            ) : null}

            {activeTab === TAB_MAPPING.COMMUNICATIONS && !isSelfhosted ? (
              <>
                {/* Email reports frequency selector (e.g. monthly, weekly, etc.) */}
                <h3 className='text-lg font-bold text-gray-900 dark:text-gray-50'>{t('profileSettings.email')}</h3>
                <div className='mt-4 grid grid-cols-1 gap-x-4 gap-y-6 lg:grid-cols-2'>
                  <div>
                    <Select
                      title={t(`profileSettings.${reportFrequency}`)}
                      label={t('profileSettings.frequency')}
                      className='w-full'
                      items={translatedFrequencies}
                      onSelect={(f) =>
                        setReportFrequency(reportFrequencies[_findIndex(translatedFrequencies, (freq) => freq === f)])
                      }
                      capitalise
                      selectedItem={
                        translatedFrequencies[_findIndex(reportFrequencies, (freq) => freq === reportFrequency)]
                      }
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
                {user?.isTelegramChatIdConfirmed ? (
                  <Checkbox
                    checked={user?.receiveLoginNotifications}
                    onChange={handleReceiveLoginNotifications}
                    disabled={fetcher.formData?.get('intent') === 'toggle-login-notifications'}
                    name='receiveLoginNotifications'
                    classes={{
                      label: 'mt-4',
                    }}
                    label={t('profileSettings.receiveLoginNotifications')}
                  />
                ) : null}
              </>
            ) : null}
          </section>
        </div>
      </form>

      <PaidFeature isOpened={isPaidFeatureOpened} onClose={() => setIsPaidFeatureOpened(false)} />
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
            {isSelfhosted ? null : (
              <Textarea
                classes={{
                  container: 'mt-4',
                }}
                placeholder={t('profileSettings.deletionFeedback')}
                onChange={(e) => setDeletionFeedback(e.target.value)}
                value={deletionFeedback}
                label={t('profileSettings.deletionFeedbackLabel')}
              />
            )}
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
          setIsPasswordChangeModalOpened(false)
        }}
        onSubmit={() => {
          setIsPasswordChangeModalOpened(false)
          handleSubmit(null, true)
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

export default memo(UserSettings)
