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
import {
  ChatTextIcon,
  MonitorIcon,
  UserIcon,
  EnvelopeIcon,
  WarningOctagonIcon,
  CaretDownIcon,
  TranslateIcon,
} from '@phosphor-icons/react'
import React, { useState, useEffect, memo, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useFetcher } from 'react-router'
import { toast } from 'sonner'

import {
  reportFrequencies,
  DEFAULT_TIMEZONE,
  CONFIRMATION_TIMEOUT,
  TimeFormat,
  isSelfhosted,
  whitelist,
  languages,
  languageFlag,
} from '~/lib/constants'
import { changeLanguage } from '~/i18n'
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
import Flag from '~/ui/Flag'
import TimezonePicker from '~/ui/TimezonePicker'
import { getCookie, setCookie } from '~/utils/cookie'
import routes from '~/utils/routes'
import {
  isValidEmail,
  isValidPassword,
  MIN_PASSWORD_CHARS,
} from '~/utils/validator'

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
  LANGUAGE: 'language',
}

interface TabConfig {
  id: string
  label: string
  icon: React.ElementType
  description: string
}

const getTabs = (t: typeof i18next.t): TabConfig[] => {
  if (isSelfhosted) {
    return [
      {
        id: TAB_MAPPING.ACCOUNT,
        label: t('profileSettings.account'),
        icon: UserIcon,
        description: t('profileSettings.accountDesc'),
      },
      {
        id: TAB_MAPPING.INTERFACE,
        label: t('profileSettings.interfaceSettings'),
        icon: MonitorIcon,
        description: t('profileSettings.interfaceDesc'),
      },
      {
        id: TAB_MAPPING.LANGUAGE,
        label: t('profileSettings.language'),
        icon: TranslateIcon,
        description: t('profileSettings.languageDesc'),
      },
    ]
  }

  return [
    {
      id: TAB_MAPPING.ACCOUNT,
      label: t('profileSettings.account'),
      icon: UserIcon,
      description: t('profileSettings.accountDesc'),
    },
    {
      id: TAB_MAPPING.COMMUNICATIONS,
      label: t('profileSettings.communications'),
      icon: ChatTextIcon,
      description: t('profileSettings.communicationsDesc'),
    },
    {
      id: TAB_MAPPING.INTERFACE,
      label: t('profileSettings.interfaceSettings'),
      icon: MonitorIcon,
      description: t('profileSettings.interfaceDesc'),
    },
    {
      id: TAB_MAPPING.LANGUAGE,
      label: t('profileSettings.language'),
      icon: TranslateIcon,
      description: t('profileSettings.languageDesc'),
    },
  ]
}

const TabHeader = ({ tab }: { tab: TabConfig }) => {
  const Icon = tab.icon
  const iconColorClass =
    tab.id === TAB_MAPPING.ACCOUNT
      ? 'text-blue-500'
      : tab.id === TAB_MAPPING.COMMUNICATIONS
        ? 'text-emerald-500'
        : tab.id === TAB_MAPPING.INTERFACE
          ? 'text-purple-500'
          : 'text-amber-500'

  return (
    <div className='mb-6'>
      <div className='flex items-start gap-4'>
        <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 ring-1 ring-black/5 dark:bg-slate-800/50 dark:ring-white/10'>
          <Icon className={cx('h-6 w-6', iconColorClass)} weight='duotone' />
        </div>
        <div>
          <Text as='h2' size='lg' weight='semibold'>
            {tab.label}
          </Text>
          <Text as='p' size='sm' colour='muted'>
            {tab.description}
          </Text>
        </div>
      </div>
      <hr className='mt-6 border-gray-200 dark:border-slate-700/80' />
    </div>
  )
}

interface SettingsSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  isLast?: boolean
}

const SettingsSection = ({
  title,
  description,
  children,
  isLast,
}: SettingsSectionProps) => (
  <div className={cx({ 'pb-6': !isLast })}>
    <Text as='h3' size='base' weight='semibold'>
      {title}
    </Text>
    {description && (
      <Text as='p' size='sm' colour='muted' className='mt-1'>
        {description}
      </Text>
    )}
    <div className='mt-4'>{children}</div>
    {!isLast && (
      <hr className='mt-6 border-gray-200 dark:border-slate-700/80' />
    )}
  </div>
)

interface Form extends Partial<User> {
  repeat: string
  password: string
  email: string
}

const UserSettings = () => {
  const { user, logout, mergeUser } = useAuth()

  const navigate = useNavigate()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const fetcher = useFetcher<UserSettingsActionData>()

  const [activeTab, setActiveTab] = useState(TAB_MAPPING.ACCOUNT)
  const [form, setForm] = useState<Form>(() => ({
    email: '',
    password: '',
    repeat: '',
    timeFormat: user?.timeFormat || TimeFormat['12-hour'],
  }))
  const [showPasswordFields, setShowPasswordFields] = useState(false)
  const [timezone, setTimezone] = useState(
    () => user?.timezone || DEFAULT_TIMEZONE,
  )
  const [isPaidFeatureOpened, setIsPaidFeatureOpened] = useState(false)
  const [isPasswordChangeModalOpened, setIsPasswordChangeModalOpened] =
    useState(false)
  const [reportFrequency, setReportFrequency] = useState(
    () => user?.reportFrequency,
  )
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showAPIDeleteModal, setShowAPIDeleteModal] = useState(false)
  const translatedFrequencies = useMemo(
    () => _map(reportFrequencies, (key) => t(`profileSettings.${key}`)),
    [t],
  )
  const translatedTimeFormat = useMemo(
    () => _map(TimeFormat, (key) => t(`profileSettings.${key}`)),
    [t],
  )
  const [deletionFeedback, setDeletionFeedback] = useState('')

  const lastHandledData = useRef<UserSettingsActionData | null>(null)
  const passwordChangedRef = useRef(false)
  const pendingToggles = useRef<Map<string, boolean>>(new Map())

  const isSubmitting = fetcher.state === 'submitting'

  const tabs = getTabs(t)
  const activeTabConfig = useMemo(
    () => _find(tabs, (tab) => tab.id === activeTab),
    [tabs, activeTab],
  )
  const activeTabLabel = activeTabConfig?.label

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
        mergeUser({
          showLiveVisitorsInTitle: pendingToggles.current.get('live-visitors'),
        })
        pendingToggles.current.delete('live-visitors')
      }
      if (pendingToggles.current.has('login-notifications')) {
        mergeUser({
          receiveLoginNotifications: pendingToggles.current.get(
            'login-notifications',
          ),
        })
        pendingToggles.current.delete('login-notifications')
      }
      toast.error(fetcher.data.error)
    }
  }, [fetcher.data, fetcher.state, mergeUser, t, logout, navigate])

  const errors = useMemo(() => {
    const allErrors: Record<string, string> = {}

    if (form.email && !isValidEmail(form.email)) {
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
    if (additionalData?.timezone)
      formData.set('timezone', additionalData.timezone as string)
    if (additionalData?.timeFormat || form.timeFormat) {
      formData.set(
        'timeFormat',
        (additionalData?.timeFormat || form.timeFormat) as string,
      )
    }
    if (additionalData?.reportFrequency)
      formData.set('reportFrequency', additionalData.reportFrequency as string)

    passwordChangedRef.current = !!form.password
    fetcher.submit(formData, { method: 'post' })
  }

  const handleSubmit = (
    e: React.FormEvent<HTMLFormElement> | null,
    force?: boolean,
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

      submitProfileUpdate()
    }
  }

  const handleTimezoneSave = () => {
    submitProfileUpdate({ timezone })
  }

  const handleShowLiveVisitorsSave = (checked: boolean) => {
    if (pendingToggles.current.has('live-visitors')) return

    pendingToggles.current.set(
      'live-visitors',
      user?.showLiveVisitorsInTitle ?? false,
    )
    const formData = new FormData()
    formData.set('intent', 'toggle-live-visitors')
    formData.set('show', checked.toString())
    fetcher.submit(formData, { method: 'post' })
    // Optimistic update
    mergeUser({ showLiveVisitorsInTitle: checked })
  }

  const handleReceiveLoginNotifications = (checked: boolean) => {
    if (pendingToggles.current.has('login-notifications')) return

    pendingToggles.current.set(
      'login-notifications',
      user?.receiveLoginNotifications ?? false,
    )
    const formData = new FormData()
    formData.set('intent', 'toggle-login-notifications')
    formData.set('receiveLoginNotifications', checked.toString())
    fetcher.submit(formData, { method: 'post' })
    // Optimistic update
    mergeUser({ receiveLoginNotifications: checked })
  }

  const handleIntegrationSave = (
    data: Record<string, unknown>,
    callback: (isSuccess: boolean) => void = () => {},
  ) => {
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


  return (
    <div className='flex min-h-min-footer flex-col bg-gray-50 dark:bg-slate-900'>
      <form
        className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'
        onSubmit={handleSubmit}
      >
        <Text as='h2' size='3xl' weight='bold' className='mt-2'>
          {t('titles.profileSettings')}
        </Text>
        <div className='mt-6 flex flex-col gap-6 md:flex-row'>
          <div className='md:hidden'>
            <Select
              items={tabs}
              keyExtractor={(item) => item.id}
              labelExtractor={(item) => item.label}
              iconExtractor={(item) => {
                const Icon = item.icon
                return <Icon className='h-4 w-4' />
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
                        'bg-gray-200 font-semibold dark:bg-slate-800 dark:text-gray-50':
                          isCurrent,
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
                    />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </aside>

          <section className='flex-1'>
            {activeTab === TAB_MAPPING.ACCOUNT && activeTabConfig ? (
              <>
                <TabHeader tab={activeTabConfig} />

                {/* Change email address */}
                <SettingsSection
                  title={t('profileSettings.changeEmail')}
                  description={t('profileSettings.changeEmailDesc')}
                >
                  <div className='max-w-md'>
                    <div className='mb-4'>
                      <Text as='p' size='sm' weight='medium' colour='secondary'>
                        {t('profileSettings.currentEmail')}
                      </Text>
                      <Text as='p' size='sm' weight='semibold' className='mt-1'>
                        {user?.email}
                      </Text>
                    </div>
                    <Input
                      name='email'
                      type='email'
                      label={t('profileSettings.newEmail')}
                      value={form.email}
                      placeholder={t('auth.common.email')}
                      onChange={handleInput}
                      error={beenSubmitted && form.email ? errors.email : null}
                    />
                    <Button className='mt-4' type='submit' primary large>
                      {t('profileSettings.changeEmailBtn')}
                    </Button>
                  </div>
                </SettingsSection>

                {/* Change password */}
                <SettingsSection
                  title={t('profileSettings.changePassword')}
                  description={t('profileSettings.changePasswordDesc')}
                >
                  <div className='max-w-md'>
                    <span
                      onClick={toggleShowPasswordFields}
                      className='flex max-w-max cursor-pointer items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300'
                    >
                      {showPasswordFields
                        ? t('common.cancel')
                        : t('auth.common.changePassword')}
                      <CaretDownIcon
                        className={cx('ml-2 size-3 transition-transform', {
                          'rotate-180': showPasswordFields,
                        })}
                      />
                    </span>
                    {showPasswordFields ? (
                      <div className='mt-4 space-y-4'>
                        <Input
                          name='password'
                          type='password'
                          label={t('auth.common.password')}
                          hint={t('auth.common.hint', {
                            amount: MIN_PASSWORD_CHARS,
                          })}
                          value={form.password}
                          placeholder={t('auth.common.password')}
                          onChange={handleInput}
                          error={beenSubmitted ? errors.password : null}
                        />
                        <Input
                          name='repeat'
                          type='password'
                          label={t('auth.common.repeat')}
                          value={form.repeat}
                          placeholder={t('auth.common.repeat')}
                          onChange={handleInput}
                          error={beenSubmitted ? errors.repeat : null}
                        />
                        <Button type='submit' primary large>
                          {t('profileSettings.update')}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </SettingsSection>

                {/* API Key */}
                <SettingsSection
                  title={t('profileSettings.apiKey')}
                  description={t('profileSettings.apiKeyDesc')}
                >
                  {user?.apiKey ? (
                    <>
                      <Text as='p' size='sm' colour='warning' className='mb-3'>
                        {t('profileSettings.apiKeyWarning')}
                      </Text>
                      <div className='max-w-md'>
                        <Input
                          label={t('profileSettings.apiKey')}
                          name='apiKey'
                          value={user.apiKey}
                          disabled
                        />
                      </div>
                      <Button
                        className='mt-4'
                        onClick={() => setShowAPIDeleteModal(true)}
                        danger
                        large
                      >
                        {t('profileSettings.deleteApiKeyBtn')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Text as='p' size='sm' colour='muted' className='mb-3'>
                        {t('profileSettings.noApiKey')}
                      </Text>
                      <Button onClick={onApiKeyGenerate} primary large>
                        {t('profileSettings.addApiKeyBtn')}
                      </Button>
                    </>
                  )}
                </SettingsSection>

                {isSelfhosted ? (
                  <>
                    {/* Shared projects setting */}
                    <SettingsSection
                      title={t('profileSettings.shared')}
                      description={t('profileSettings.sharedDesc')}
                    >
                      {!_isEmpty(user?.sharedProjects) ? (
                        <div className='overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700'>
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
                    </SettingsSection>
                  </>
                ) : (
                  <>
                    {/* 2FA setting */}
                    <SettingsSection
                      title={t('profileSettings.2fa')}
                      description={t('profileSettings.2faSectionDesc')}
                    >
                      <TwoFA />
                    </SettingsSection>

                    {/* Socialisations setup */}
                    <SettingsSection
                      title={t('profileSettings.socialisations')}
                      description={t('profileSettings.socialisationsDesc')}
                    >
                      <div id='socialisations'>
                        <Socialisations />
                      </div>
                    </SettingsSection>

                    {/* Shared projects setting */}
                    <SettingsSection
                      title={t('profileSettings.shared')}
                      description={t('profileSettings.sharedDesc')}
                    >
                      {!_isEmpty(user?.sharedProjects) ? (
                        <div className='overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700'>
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
                    </SettingsSection>

                    {/* Organisations setting */}
                    <SettingsSection
                      title={t('profileSettings.organisations')}
                      description={t('profileSettings.organisationsDesc')}
                    >
                      {!_isEmpty(user?.organisationMemberships) ? (
                        <div className='overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700'>
                          <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-700'>
                            <thead className='bg-gray-50 dark:bg-slate-800'>
                              <tr>
                                <th
                                  scope='col'
                                  className='px-4 py-3 text-left text-xs font-bold tracking-wider text-gray-900 uppercase dark:text-white'
                                >
                                  {t(
                                    'profileSettings.organisationsTable.organisation',
                                  )}
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
                                  {t(
                                    'profileSettings.organisationsTable.joinedOn',
                                  )}
                                </th>
                                <th scope='col' />
                              </tr>
                            </thead>
                            <tbody className='divide-y divide-gray-200 bg-white dark:divide-slate-700 dark:bg-slate-900'>
                              {_map(
                                user?.organisationMemberships,
                                (membership) => (
                                  <Organisations
                                    key={membership.id}
                                    membership={membership}
                                  />
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <NoOrganisations />
                      )}
                    </SettingsSection>

                    {!user?.isActive ? (
                      <SettingsSection
                        title={t('profileSettings.confirmEmail')}
                        description={t('profileSettings.confirmEmailDesc')}
                      >
                        <button
                          type='button'
                          className='flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300'
                          onClick={onEmailConfirm}
                        >
                          <EnvelopeIcon className='mr-2 h-5 w-5' />
                          {t('profileSettings.noLink')}
                        </button>
                      </SettingsSection>
                    ) : null}
                  </>
                )}

                {/* Danger zone */}
                <SettingsSection
                  title={t('profileSettings.dangerZone')}
                  description={t('profileSettings.dangerZoneDesc')}
                  isLast
                >
                  <div className='flex flex-wrap gap-2'>
                    <Button
                      onClick={() => {
                        logout(true)
                      }}
                      semiSmall
                      semiDanger
                    >
                      <>
                        <div className='h-5' />
                        {t('profileSettings.logoutAll')}
                      </>
                    </Button>
                    <Button
                      onClick={() => setShowModal(true)}
                      semiSmall
                      semiDanger
                    >
                      <>
                        <WarningOctagonIcon className='mr-1 h-5 w-5' />
                        {t('profileSettings.delete')}
                      </>
                    </Button>
                  </div>
                </SettingsSection>
              </>
            ) : null}

            {activeTab === TAB_MAPPING.INTERFACE && activeTabConfig ? (
              <>
                <TabHeader tab={activeTabConfig} />

                {/* Timezone preference */}
                <SettingsSection
                  title={t('profileSettings.timezone')}
                  description={t('profileSettings.timezoneDesc')}
                >
                  <div className='max-w-md'>
                    <TimezonePicker value={timezone} onChange={setTimezone} />
                    <Button
                      className='mt-4'
                      onClick={handleTimezoneSave}
                      primary
                      large
                    >
                      {t('common.save')}
                    </Button>
                  </div>
                </SettingsSection>

                {/* Time format selector */}
                <SettingsSection
                  title={t('profileSettings.timeFormat')}
                  description={t('profileSettings.selectTimeFormat')}
                >
                  <div className='max-w-md'>
                    <Select
                      title={t(`profileSettings.${form.timeFormat}`)}
                      className='w-full'
                      items={translatedTimeFormat}
                      onSelect={(f) =>
                        setForm((prev) => ({
                          ...prev,
                          timeFormat:
                            timeFormatArray[
                              _findIndex(
                                translatedTimeFormat,
                                (freq) => freq === f,
                              )
                            ],
                        }))
                      }
                      capitalise
                      selectedItem={
                        translatedTimeFormat[
                          _findIndex(
                            timeFormatArray,
                            (freq) => freq === form.timeFormat,
                          )
                        ]
                      }
                    />
                    <Button
                      className='mt-4'
                      onClick={setAsyncTimeFormat}
                      primary
                      large
                    >
                      {t('common.save')}
                    </Button>
                  </div>
                </SettingsSection>

                {/* UI Settings */}
                <SettingsSection
                  title={t('profileSettings.uiSettings')}
                  description={t('profileSettings.uiSettingsDesc')}
                  isLast
                >
                  <Checkbox
                    checked={user?.showLiveVisitorsInTitle}
                    onChange={handleShowLiveVisitorsSave}
                    disabled={
                      fetcher.formData?.get('intent') === 'toggle-live-visitors'
                    }
                    name='active'
                    label={t('profileSettings.showVisitorsInTitle')}
                  />
                </SettingsSection>
              </>
            ) : null}

            {activeTab === TAB_MAPPING.COMMUNICATIONS &&
            !isSelfhosted &&
            activeTabConfig ? (
              <>
                <TabHeader tab={activeTabConfig} />

                {/* Email reports frequency */}
                <SettingsSection
                  title={t('profileSettings.email')}
                  description={t('profileSettings.frequency')}
                >
                  <div className='max-w-md'>
                    <Select
                      title={t(`profileSettings.${reportFrequency}`)}
                      label={t('profileSettings.email')}
                      className='w-full'
                      items={translatedFrequencies}
                      onSelect={(f) =>
                        setReportFrequency(
                          reportFrequencies[
                            _findIndex(
                              translatedFrequencies,
                              (freq) => freq === f,
                            )
                          ],
                        )
                      }
                      capitalise
                      selectedItem={
                        translatedFrequencies[
                          _findIndex(
                            reportFrequencies,
                            (freq) => freq === reportFrequency,
                          )
                        ]
                      }
                    />
                    <Button
                      className='mt-4'
                      onClick={handleReportSave}
                      primary
                      large
                    >
                      {t('common.save')}
                    </Button>
                  </div>
                </SettingsSection>

                {/* Integrations setup */}
                <SettingsSection
                  title={t('profileSettings.integrations')}
                  description={t('profileSettings.integrationsDesc')}
                  isLast={!user?.isTelegramChatIdConfirmed}
                >
                  <div id='integrations'>
                    <Integrations handleIntegrationSave={handleIntegrationSave} />
                  </div>
                </SettingsSection>

                {user?.isTelegramChatIdConfirmed ? (
                  <SettingsSection
                    title={t('profileSettings.notifications')}
                    description={t('profileSettings.notificationsDesc')}
                    isLast
                  >
                    <Checkbox
                      checked={user?.receiveLoginNotifications}
                      onChange={handleReceiveLoginNotifications}
                      disabled={
                        fetcher.formData?.get('intent') ===
                        'toggle-login-notifications'
                      }
                      name='receiveLoginNotifications'
                      label={t('profileSettings.receiveLoginNotifications')}
                    />
                  </SettingsSection>
                ) : null}
              </>
            ) : null}

            {activeTab === TAB_MAPPING.LANGUAGE && activeTabConfig ? (
              <>
                <TabHeader tab={activeTabConfig} />

                <SettingsSection
                  title={t('profileSettings.changeLanguage')}
                  isLast
                >
                  <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
                    {_map(whitelist, (lng) => {
                      const isSelected = language === lng

                      return (
                        <button
                          key={lng}
                          type='button'
                          onClick={() => changeLanguage(lng)}
                          className={cx(
                            'flex flex-col items-center justify-center rounded-lg border px-4 py-6 transition-all',
                            isSelected
                              ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-700',
                          )}
                        >
                          <Flag
                            country={languageFlag[lng]}
                            size={32}
                            alt={languages[lng]}
                            className='mb-3'
                          />
                          <Text
                            as='span'
                            size='sm'
                            weight='medium'
                            colour='inherit'
                            className={cx(
                              isSelected
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-gray-900 dark:text-gray-100',
                            )}
                          >
                            {languages[lng]}
                          </Text>
                        </button>
                      )
                    })}
                  </div>
                </SettingsSection>
              </>
            ) : null}
          </section>
        </div>
      </form>

      <PaidFeature
        isOpened={isPaidFeatureOpened}
        onClose={() => setIsPaidFeatureOpened(false)}
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
