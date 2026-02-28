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
  TranslateIcon,
  LockIcon,
  CaretDownIcon,
  CreditCardIcon,
} from '@phosphor-icons/react'
import _round from 'lodash/round'
import React, { useState, useEffect, memo, useMemo, useRef } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import {
  useNavigate,
  useFetcher,
  useSearchParams,
  useLoaderData,
} from 'react-router'
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
  CONTACT_EMAIL,
  paddleLanguageMapping,
} from '~/lib/constants'
import BillingPricing from '~/components/pricing/BillingPricing'
import { usePaddle } from '~/hooks/usePaddle'
import { changeLanguage } from '~/i18n'
import { DEFAULT_METAINFO } from '~/lib/models/Metainfo'
import { UsageInfo } from '~/lib/models/Usageinfo'
import { User } from '~/lib/models/User'
import PaidFeature from '~/modals/PaidFeature'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import type {
  UserSettingsActionData,
  UserSettingsLoaderData,
} from '~/routes/user-settings'
import Alert from '~/ui/Alert'
import Button from '~/ui/Button'
import Checkbox from '~/ui/Checkbox'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import MultiProgress from '~/ui/MultiProgress'
import PasswordStrength from '~/ui/PasswordStrength'
import Select from '~/ui/Select'
import { TabHeader } from '~/ui/TabHeader'
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
  PASSWORD_AUTH: 'password-auth',
  BILLING: 'billing',
  INTERFACE: 'interface',
  COMMUNICATIONS: 'communications',
  LANGUAGE: 'language',
}

type SettingsTab = (typeof TAB_MAPPING)[keyof typeof TAB_MAPPING]

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
        id: TAB_MAPPING.PASSWORD_AUTH,
        label: t('profileSettings.passwordAuth'),
        icon: LockIcon,
        description: t('profileSettings.passwordAuthDesc'),
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
      id: TAB_MAPPING.PASSWORD_AUTH,
      label: t('profileSettings.passwordAuth'),
      icon: LockIcon,
      description: t('profileSettings.passwordAuthDesc'),
    },
    {
      id: TAB_MAPPING.BILLING,
      label: t('profileSettings.billingTab'),
      icon: CreditCardIcon,
      description: t('profileSettings.billingTabDesc'),
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

const getTabIconColor = (tabId: string): string => {
  switch (tabId) {
    case TAB_MAPPING.ACCOUNT:
      return 'text-blue-500'
    case TAB_MAPPING.PASSWORD_AUTH:
      return 'text-indigo-500'
    case TAB_MAPPING.BILLING:
      return 'text-emerald-500'
    case TAB_MAPPING.COMMUNICATIONS:
      return 'text-teal-500'
    case TAB_MAPPING.INTERFACE:
      return 'text-purple-500'
    default:
      return 'text-amber-500'
  }
}

const DEFAULT_USAGE_INFO: UsageInfo = {
  total: 0,
  traffic: 0,
  errors: 0,
  customEvents: 0,
  captcha: 0,
  trafficPerc: 0,
  errorsPerc: 0,
  customEventsPerc: 0,
  captchaPerc: 0,
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
  const {
    user,
    logout,
    mergeUser,
    loadUser,
    isLoading: authLoading,
  } = useAuth()
  const loaderData = useLoaderData<UserSettingsLoaderData>()
  const { theme } = useTheme()

  const navigate = useNavigate()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const fetcher = useFetcher<UserSettingsActionData>()
  const metainfoFetcher = useFetcher<UserSettingsActionData>()

  const [searchParams, setSearchParams] = useSearchParams()

  const [isCancelSubModalOpened, setIsCancelSubModalOpened] = useState(false)
  const [cancellationFeedback, setCancellationFeedback] = useState('')
  const [isCancellingSubscription, setIsCancellingSubscription] =
    useState(false)
  const [lastEvent, setLastEvent] = useState<{ event: string } | null>(null)

  const { openCheckout } = usePaddle({ onEvent: setLastEvent })

  const metainfo = useMemo(() => {
    if (metainfoFetcher.data?.success && metainfoFetcher.data.data) {
      return metainfoFetcher.data.data as typeof DEFAULT_METAINFO
    }
    return loaderData?.metainfo ?? DEFAULT_METAINFO
  }, [loaderData?.metainfo, metainfoFetcher.data])

  const usageInfo = useMemo(
    () => loaderData?.usageInfo ?? DEFAULT_USAGE_INFO,
    [loaderData?.usageInfo],
  )

  const isBillingLoading = !loaderData

  const {
    nextBillDate,
    planCode,
    subUpdateURL,
    trialEndDate,
    timeFormat: userTimeFormat,
    cancellationEffectiveDate,
    subCancelURL,
    maxEventsCount = 0,
  } = user || {}

  const isSubscriber = !['none', 'trial', 'free'].includes(planCode || '')
  const isLegacyTrial = planCode === 'trial'
  const isTrialingPaidPlan = (() => {
    if (!trialEndDate || !isSubscriber) return false
    return dayjs.utc(trialEndDate).isAfter(dayjs.utc())
  })()
  const isTrial = isLegacyTrial || isTrialingPaidPlan
  const isNoSub = planCode === 'none'

  const totalUsage = (() => {
    if (maxEventsCount === 0) {
      return usageInfo.total > 0 ? 100 : 0
    }
    const raw = _round((usageInfo.total / maxEventsCount) * 100, 2)
    return Math.min(100, Math.max(0, raw))
  })()
  const remainingUsage = _round(Math.max(0, 100 - totalUsage), 2)

  const isTrialEnded = (() => {
    if (!trialEndDate) {
      return false
    }

    const now = dayjs.utc()
    const future = dayjs.utc(trialEndDate)
    const diff = future.diff(now)

    return diff < 0
  })()

  const trialEndsOnMessage = (() => {
    if (!trialEndDate || !isTrial) {
      return null
    }

    if (isTrialEnded) {
      return t('pricing.trialEnded')
    }

    const date = dayjs(trialEndDate).locale(language).format('D MMMM, YYYY')

    return t('billing.trialEnds', {
      date,
    })
  })()

  const onSubscriptionCancel = () => {
    setIsCancellingSubscription(true)

    const formData = new FormData()
    formData.set('intent', 'cancel-subscription')
    if (cancellationFeedback.trim()) {
      formData.set('feedback', cancellationFeedback.trim())
    }

    fetcher.submit(formData, { method: 'POST', action: '/user-settings' })
  }

  const onUpdatePaymentDetails = () => {
    if (!subUpdateURL) {
      toast.error(t('apiNotifications.somethingWentWrong'))
      return
    }

    const opened = openCheckout({
      override: subUpdateURL,
      locale: paddleLanguageMapping[language] || language,
      displayModeTheme: theme,
      country: metainfo.country,
    })

    if (!opened) {
      window.location.replace(subUpdateURL)
    }
  }

  const tabs = getTabs(t)

  const activeTab = useMemo<SettingsTab>(() => {
    const tab = searchParams.get('tab') as SettingsTab
    const allowed = new Set(tabs.map((t) => t.id as SettingsTab))
    return allowed.has(tab) ? tab : TAB_MAPPING.ACCOUNT
  }, [searchParams, tabs])

  const setActiveTab = (tab: SettingsTab) => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.set('tab', tab)
    setSearchParams(newSearchParams)
  }
  const [form, setForm] = useState<Form>(() => ({
    email: '',
    password: '',
    repeat: '',
    timeFormat: user?.timeFormat || TimeFormat['12-hour'],
  }))
  const [showEmailFields, setShowEmailFields] = useState(false)
  const [emailBeenSubmitted, setEmailBeenSubmitted] = useState(false)
  const [passwordBeenSubmitted, setPasswordBeenSubmitted] = useState(false)
  const [timezone, setTimezone] = useState(
    () => user?.timezone || DEFAULT_TIMEZONE,
  )
  const [isPaidFeatureOpened, setIsPaidFeatureOpened] = useState(false)
  const [isPasswordChangeModalOpened, setIsPasswordChangeModalOpened] =
    useState(false)
  const [reportFrequency, setReportFrequency] = useState(
    () => user?.reportFrequency,
  )
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
      } else if (intent === 'cancel-subscription') {
        setIsCancellingSubscription(false)
        setCancellationFeedback('')
        setIsCancelSubModalOpened(false)
        toast.success(t('billing.subscriptionCancelledSuccess'))
        loadUser()
      }
    } else if (fetcher.data?.error) {
      setIsCancellingSubscription(false)
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
  }, [fetcher.data, fetcher.state, mergeUser, t, logout, navigate, loadUser])

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

    if (target.name === 'email') {
      setEmailBeenSubmitted(false)
    }

    if (target.name === 'password' || target.name === 'repeat') {
      setPasswordBeenSubmitted(false)
    }

    setForm((prevForm) => ({
      ...prevForm,
      [target.name]: value,
    }))
  }

  const submitProfileUpdate = (
    additionalData?: Record<string, unknown>,
    skipValidation = false,
  ) => {
    if (!skipValidation && !validated) return

    const formData = new FormData()
    formData.set('intent', 'update-profile')
    formData.set('email', form.email || user?.email || '')
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

    if (form.email) setEmailBeenSubmitted(true)
    if (form.password || form.repeat) setPasswordBeenSubmitted(true)

    if (validated) {
      // User is about to change their password, let's warn him if
      if (form.password && !force) {
        setIsPasswordChangeModalOpened(true)
        return
      }

      submitProfileUpdate()
    }
  }

  const handleEmailSubmit = () => {
    setEmailBeenSubmitted(true)

    if (!form.email || errors.email) return

    submitProfileUpdate(undefined, true)
  }

  const handlePasswordSubmit = () => {
    setPasswordBeenSubmitted(true)

    if (errors.password || errors.repeat) return

    setIsPasswordChangeModalOpened(true)
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

  const toggleShowEmailFields = () => {
    setForm((prev) => ({
      ...prev,
      email: '',
    }))
    setEmailBeenSubmitted(false)
    setShowEmailFields((prev) => !prev)
  }

  return (
    <div className='flex min-h-min-footer flex-col bg-gray-50 dark:bg-slate-950'>
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
            <nav className='flex flex-col space-y-0.5' aria-label='Sidebar'>
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
                        'bg-gray-200 font-semibold dark:bg-slate-900 dark:text-gray-50':
                          isCurrent,
                        'hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-slate-900 dark:hover:text-gray-50':
                          !isCurrent,
                      },
                    )}
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    <Icon
                      className={cx('mr-2 size-4 shrink-0 transition-colors', {
                        'text-gray-900 dark:text-gray-50': isCurrent,
                        'text-gray-600 dark:text-gray-300': !isCurrent,
                      })}
                    />
                    <span className='truncate'>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </aside>

          <section className='flex-1'>
            {activeTab === TAB_MAPPING.ACCOUNT && activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={getTabIconColor(activeTabConfig.id)}
                />

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
                    <Text
                      size='sm'
                      weight='medium'
                      colour='primary'
                      className='mb-2 flex cursor-pointer items-center'
                      onClick={toggleShowEmailFields}
                    >
                      {showEmailFields
                        ? t('common.cancel')
                        : t('profileSettings.changeEmailBtn')}
                      <CaretDownIcon
                        className={cx('ml-2 size-3 transition-transform', {
                          'rotate-180': showEmailFields,
                        })}
                      />
                    </Text>
                    {showEmailFields ? (
                      <div className='mt-4 space-y-4'>
                        <Input
                          name='email'
                          type='email'
                          label={t('profileSettings.newEmail')}
                          value={form.email}
                          placeholder={t('auth.common.email')}
                          onChange={handleInput}
                          error={emailBeenSubmitted ? errors.email : null}
                        />
                        <Button onClick={handleEmailSubmit} primary large>
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
                      <Text
                        as='p'
                        size='sm'
                        colour='secondary'
                        className='mb-3'
                      >
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
                        <div className='overflow-hidden rounded-lg border border-gray-200 dark:border-slate-800'>
                          <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-800'>
                            <thead className='bg-gray-50 dark:bg-slate-900'>
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
                            <tbody className='divide-y divide-gray-200 bg-white dark:divide-slate-800 dark:bg-slate-950'>
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
                        <div className='overflow-hidden rounded-lg border border-gray-200 dark:border-slate-800'>
                          <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-800'>
                            <thead className='bg-gray-50 dark:bg-slate-900'>
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
                            <tbody className='divide-y divide-gray-200 bg-white dark:divide-slate-800 dark:bg-slate-950'>
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
                        <div className='overflow-hidden rounded-lg border border-gray-200 dark:border-slate-800'>
                          <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-800'>
                            <thead className='bg-gray-50 dark:bg-slate-900'>
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
                            <tbody className='divide-y divide-gray-200 bg-white dark:divide-slate-800 dark:bg-slate-950'>
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
                        <Text as='p' size='sm' className='mb-3'>
                          <button
                            type='button'
                            className='inline-flex items-center underline decoration-dashed hover:decoration-solid'
                            onClick={onEmailConfirm}
                          >
                            <EnvelopeIcon className='mr-2 size-4' />
                            {t('profileSettings.noLink')}
                          </button>
                        </Text>
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
                </SettingsSection>
              </>
            ) : null}

            {activeTab === TAB_MAPPING.PASSWORD_AUTH && activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={getTabIconColor(activeTabConfig.id)}
                />

                {/* Change password */}
                <SettingsSection
                  title={t('profileSettings.changePassword')}
                  description={t('profileSettings.changePasswordDesc')}
                >
                  <div className='max-w-md space-y-4'>
                    <Input
                      name='password'
                      type='password'
                      label={t('profileSettings.newPassword')}
                      value={form.password}
                      placeholder={t('auth.common.password')}
                      onChange={handleInput}
                      error={passwordBeenSubmitted ? errors.password : null}
                    />
                    <PasswordStrength password={form.password} />
                    <Input
                      name='repeat'
                      type='password'
                      label={t('profileSettings.repeatPassword')}
                      value={form.repeat}
                      placeholder={t('auth.common.repeat')}
                      onChange={handleInput}
                      error={passwordBeenSubmitted ? errors.repeat : null}
                    />
                    <Button
                      onClick={handlePasswordSubmit}
                      disabled={!form.password || !form.repeat}
                      primary
                      large
                    >
                      {t('profileSettings.updatePassword')}
                    </Button>
                  </div>
                </SettingsSection>

                {/* 2FA setting */}
                {!isSelfhosted ? (
                  <SettingsSection
                    title={t('profileSettings.2fa')}
                    description={t('profileSettings.2faSectionDesc')}
                  >
                    <TwoFA />
                  </SettingsSection>
                ) : null}

                {/* Logout from all devices */}
                <SettingsSection
                  title={t('profileSettings.logoutAllTitle')}
                  description={t('profileSettings.logoutAllDesc')}
                  isLast
                >
                  <Alert variant='warning' className='mb-4'>
                    {t('profileSettings.logoutAllWarning')}
                  </Alert>
                  <Button
                    onClick={() => {
                      logout(true)
                    }}
                    semiDanger
                    large
                  >
                    {t('profileSettings.logoutAll')}
                  </Button>
                </SettingsSection>
              </>
            ) : null}

            {activeTab === TAB_MAPPING.INTERFACE && activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={getTabIconColor(activeTabConfig.id)}
                />

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

            {activeTab === TAB_MAPPING.BILLING &&
            !isSelfhosted &&
            activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={getTabIconColor(activeTabConfig.id)}
                />

                {isBillingLoading || authLoading ? (
                  <div className='flex justify-center py-12'>
                    <Loader />
                  </div>
                ) : (
                  <>
                    {/* Trial info alert */}
                    {isTrial && trialEndsOnMessage ? (
                      <Alert
                        variant='info'
                        title={t('profileSettings.trialActive')}
                        className='mb-6'
                      >
                        {trialEndsOnMessage} {t('billing.trialChargeWarning')}
                      </Alert>
                    ) : null}

                    {/* Subscription cancelled alert */}
                    {cancellationEffectiveDate ? (
                      <Alert
                        variant='warning'
                        title={t('billing.subscriptionCancelled')}
                        className='mb-6'
                      >
                        {t('billing.subscriptionCancelledDescription', {
                          date:
                            language === 'en'
                              ? dayjs(cancellationEffectiveDate)
                                  .locale(language)
                                  .format('MMMM D, YYYY')
                              : dayjs(cancellationEffectiveDate)
                                  .locale(language)
                                  .format('D MMMM, YYYY'),
                        })}
                      </Alert>
                    ) : null}

                    {/* No active subscription alert */}
                    {isNoSub ? (
                      <Alert
                        variant='error'
                        title={t('billing.noActiveSubscription')}
                        className='mb-6'
                      >
                        {t('billing.noActiveSubscriptionDescription')}
                      </Alert>
                    ) : null}

                    {/* Next bill date info */}
                    {!isTrial && isSubscriber && nextBillDate ? (
                      <Alert
                        variant='info'
                        title={t('profileSettings.nextBilling')}
                        className='mb-6'
                      >
                        {t('billing.nextBillDateIs', {
                          date:
                            language === 'en'
                              ? dayjs(nextBillDate)
                                  .locale(language)
                                  .format('MMMM D, YYYY')
                              : dayjs(nextBillDate)
                                  .locale(language)
                                  .format('D MMMM, YYYY'),
                        })}
                      </Alert>
                    ) : null}

                    {/* Plan Usage Section */}
                    <SettingsSection
                      title={t('billing.planUsage')}
                      description={t('billing.planUsageDesc')}
                    >
                      {totalUsage >= 80 ? (
                        <Alert variant='warning' className='mb-4'>
                          {totalUsage >= 90
                            ? t('billing.usageWarningCritical', {
                                percentage: totalUsage,
                              })
                            : t('billing.usageWarningHigh', {
                                percentage: totalUsage,
                              })}
                        </Alert>
                      ) : null}

                      <div className='rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950'>
                        <Text
                          as='p'
                          size='sm'
                          colour='secondary'
                          className='mb-4'
                        >
                          {t('billing.usageOverview', {
                            tracked: (usageInfo.total || 0).toLocaleString(),
                            trackedPerc: totalUsage || 0,
                            maxEvents: (maxEventsCount || 0).toLocaleString(),
                          })}
                        </Text>

                        <div className='mb-4 grid grid-cols-2 gap-3'>
                          <div className='flex items-center'>
                            <div className='size-2 rounded-full bg-blue-600 dark:bg-blue-500' />
                            <Text
                              as='span'
                              size='sm'
                              colour='secondary'
                              className='ml-2'
                            >
                              {t('billing.pageviews', {
                                quantity: usageInfo.traffic || 0,
                                percentage: usageInfo.trafficPerc || 0,
                              })}
                            </Text>
                          </div>
                          <div className='flex items-center'>
                            <div className='size-2 rounded-full bg-fuchsia-600 dark:bg-fuchsia-500' />
                            <Text
                              as='span'
                              size='sm'
                              colour='secondary'
                              className='ml-2'
                            >
                              {t('billing.customEvents', {
                                quantity: usageInfo.customEvents || 0,
                                percentage: usageInfo.customEventsPerc || 0,
                              })}
                            </Text>
                          </div>
                          <div className='flex items-center'>
                            <div className='size-2 rounded-full bg-lime-600 dark:bg-lime-500' />
                            <Text
                              as='span'
                              size='sm'
                              colour='secondary'
                              className='ml-2'
                            >
                              {t('billing.captcha', {
                                quantity: usageInfo.captcha || 0,
                                percentage: usageInfo.captchaPerc || 0,
                              })}
                            </Text>
                          </div>
                          <div className='flex items-center'>
                            <div className='size-2 rounded-full bg-red-600 dark:bg-red-500' />
                            <Text
                              as='span'
                              size='sm'
                              colour='secondary'
                              className='ml-2'
                            >
                              {t('billing.errors', {
                                quantity: usageInfo.errors || 0,
                                percentage: usageInfo.errorsPerc || 0,
                              })}
                            </Text>
                          </div>
                        </div>

                        <Text
                          as='p'
                          size='base'
                          weight='semibold'
                          className='mb-2'
                        >
                          {t('billing.xofy', {
                            x: (usageInfo.total || 0).toLocaleString(),
                            y: (maxEventsCount || 0).toLocaleString(),
                          })}
                        </Text>

                        <MultiProgress
                          className='w-full'
                          progress={[
                            {
                              value: Math.min(
                                100,
                                Math.max(
                                  0,
                                  usageInfo.traffic === 0 ||
                                    maxEventsCount === 0
                                    ? 0
                                    : (usageInfo.traffic / maxEventsCount) *
                                        100,
                                ),
                              ),
                              lightColour: '#2563eb',
                              darkColour: '#1d4ed8',
                            },
                            {
                              value: Math.min(
                                100,
                                Math.max(
                                  0,
                                  usageInfo.customEvents === 0 ||
                                    maxEventsCount === 0
                                    ? 0
                                    : (usageInfo.customEvents /
                                        maxEventsCount) *
                                        100,
                                ),
                              ),
                              lightColour: '#c026d3',
                              darkColour: '#a21caf',
                            },
                            {
                              value: Math.min(
                                100,
                                Math.max(
                                  0,
                                  usageInfo.captcha === 0 ||
                                    maxEventsCount === 0
                                    ? 0
                                    : (usageInfo.captcha / maxEventsCount) *
                                        100,
                                ),
                              ),
                              lightColour: '#65a30d',
                              darkColour: '#4d7c0f',
                            },
                            {
                              value: Math.min(
                                100,
                                Math.max(
                                  0,
                                  usageInfo.errors === 0 || maxEventsCount === 0
                                    ? 0
                                    : (usageInfo.errors / maxEventsCount) * 100,
                                ),
                              ),
                              lightColour: '#dc2626',
                              darkColour: '#b91c1c',
                            },
                          ]}
                        />

                        <div className='mt-2 flex items-center justify-between'>
                          <Text as='p' size='sm' colour='secondary'>
                            {t('billing.xPercentUsed', {
                              percentage: totalUsage,
                            })}
                          </Text>
                          <Text as='p' size='sm' colour='secondary'>
                            {t('billing.xPercentRemaining', {
                              percentage: remainingUsage,
                            })}
                          </Text>
                        </div>

                        <Text
                          as='p'
                          size='sm'
                          colour='secondary'
                          className='mt-3'
                        >
                          {t('billing.resetDate', {
                            days: Math.ceil(
                              (new Date(
                                new Date().getFullYear(),
                                new Date().getMonth() + 1,
                                1,
                              ).getTime() -
                                new Date().getTime()) /
                                (1000 * 60 * 60 * 24),
                            ),
                          })}
                        </Text>
                      </div>
                    </SettingsSection>

                    {/* Subscription Plans Section */}
                    <SettingsSection
                      title={t('billing.subscription')}
                      description={
                        isSubscriber
                          ? t('billing.changePlan')
                          : t('billing.selectPlan')
                      }
                    >
                      <Text as='p' size='sm' colour='muted' className='mb-4'>
                        {t('billing.membersNotification')}
                      </Text>

                      <BillingPricing
                        lastEvent={lastEvent}
                        metainfo={metainfo}
                        openCheckout={openCheckout}
                      />

                      <div className='mt-4 flex flex-wrap gap-3'>
                        {subUpdateURL && !cancellationEffectiveDate ? (
                          <Button
                            onClick={onUpdatePaymentDetails}
                            type='button'
                            primary
                            large
                          >
                            {t('billing.update')}
                          </Button>
                        ) : null}
                        {subCancelURL && !cancellationEffectiveDate ? (
                          <Button
                            onClick={() => setIsCancelSubModalOpened(true)}
                            type='button'
                            semiDanger
                            large
                          >
                            {t('billing.cancelSub')}
                          </Button>
                        ) : null}
                      </div>
                    </SettingsSection>
                  </>
                )}
              </>
            ) : null}

            {activeTab === TAB_MAPPING.COMMUNICATIONS &&
            !isSelfhosted &&
            activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={getTabIconColor(activeTabConfig.id)}
                />

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
                    <Integrations
                      handleIntegrationSave={handleIntegrationSave}
                    />
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
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={getTabIconColor(activeTabConfig.id)}
                />

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
                            'flex flex-col items-center justify-center rounded-lg px-4 py-6 ring-1 transition-all ring-inset',
                            isSelected
                              ? 'bg-gray-100 ring-gray-300 dark:bg-slate-900 dark:ring-slate-700'
                              : 'ring-gray-200 hover:bg-gray-50 hover:ring-gray-300 dark:ring-slate-800 dark:hover:bg-slate-900/50 dark:hover:ring-slate-700',
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
                            weight={isSelected ? 'semibold' : 'medium'}
                            colour='inherit'
                            className='text-gray-900 dark:text-gray-100'
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
          passwordChangedRef.current = true
          submitProfileUpdate(undefined, true)
        }}
        closeText={t('common.cancel')}
        submitText={t('common.continue')}
        type='warning'
        title={t('profileSettings.passwordChangeWarningModal.title')}
        message={t('profileSettings.passwordChangeWarningModal.body')}
        isOpened={isPasswordChangeModalOpened}
      />
      <Modal
        onClose={() => {
          if (!isCancellingSubscription) {
            setIsCancelSubModalOpened(false)
            setCancellationFeedback('')
          }
        }}
        onSubmit={onSubscriptionCancel}
        submitText={t('billing.confirmCancellation')}
        closeText={t('common.cancel')}
        title={t('pricing.cancelTitle')}
        submitType='danger'
        type='error'
        isLoading={isCancellingSubscription}
        submitDisabled={isCancellingSubscription}
        message={
          <div className='space-y-4'>
            <p>
              <Trans
                t={t}
                i18nKey='pricing.cancelDesc'
                values={{
                  email: CONTACT_EMAIL,
                }}
              />
            </p>
            <div>
              <label
                htmlFor='cancellation-feedback'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300'
              >
                {t('billing.cancellationFeedbackLabel')}
              </label>
              <textarea
                id='cancellation-feedback'
                className='mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white'
                rows={3}
                placeholder={t('billing.cancellationFeedbackPlaceholder')}
                value={cancellationFeedback}
                onChange={(e) => setCancellationFeedback(e.target.value)}
                disabled={isCancellingSubscription}
              />
            </div>
          </div>
        }
        isOpened={isCancelSubModalOpened}
      />
    </div>
  )
}

export default memo(UserSettings)
