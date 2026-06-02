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
  ArrowRightIcon,
  MinusIcon,
  PlusIcon,
} from '@phosphor-icons/react'
import _round from 'lodash/round'
import React, {
  useState,
  useEffect,
  memo,
  useMemo,
  useRef,
  useCallback,
} from 'react'
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
  CURRENCIES,
} from '~/lib/constants'
import { useDeduplicateFetcherResponse } from '~/hooks/useDeduplicateFetcherResponse'
import { usePaddle } from '~/hooks/usePaddle'
import { changeLanguage } from '~/i18n'
import { DEFAULT_METAINFO } from '~/lib/models/Metainfo'
import { UsageInfo } from '~/lib/models/Usageinfo'
import { User } from '~/lib/models/User'
import {
  ADDONS,
  getEffectivePlanType,
  type BillingInterval,
  type CurrencyCode,
} from '~/lib/pricing/catalog'
import PaidFeature from '~/modals/PaidFeature'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import type {
  UserSettingsActionData,
  UserSettingsLoaderData,
  WebsiteAddonPreview,
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
import Tooltip from '~/ui/Tooltip'
import { getCookie, setCookie } from '~/utils/cookie'
import routes from '~/utils/routes'
import {
  isValidEmail,
  isValidPassword,
  MIN_PASSWORD_CHARS,
} from '~/utils/validator'

import NotificationChannels from '~/components/NotificationChannels/NotificationChannels'
import NoOrganisations from './components/NoOrganisations'
import NoSharedProjects from './components/NoSharedProjects'
import Organisations from './components/Organisations'
import ProjectList from './components/ProjectList'
import Socialisations from './components/Socialisations'
import TwoFA from './components/TwoFA'
import SettingsSidebar, {
  type SettingsTabConfig,
  type SettingsTabGroup,
} from '../Project/Settings/SettingsSidebar'

dayjs.extend(utc)

const timeFormatArray = _map(TimeFormat, (key) => key)

const TAB_MAPPING = {
  ACCOUNT: 'account',
  PASSWORD_AUTH: 'password-auth',
  BILLING: 'billing',
  INTERFACE: 'interface',
  COMMUNICATIONS: 'communications',
  LANGUAGE: 'language',
  DANGER: 'danger',
} as const

type SettingsTab = (typeof TAB_MAPPING)[keyof typeof TAB_MAPPING]

const getTabs = (t: typeof i18next.t): SettingsTabConfig<SettingsTab>[] =>
  (
    [
      {
        id: TAB_MAPPING.ACCOUNT,
        label: t('profileSettings.account'),
        icon: UserIcon,
        iconColor: 'text-indigo-500',
        description: t('profileSettings.accountDesc'),
        visible: true,
      },
      {
        id: TAB_MAPPING.PASSWORD_AUTH,
        label: t('profileSettings.passwordAuth'),
        icon: LockIcon,
        iconColor: 'text-amber-500',
        description: t('profileSettings.passwordAuthDesc'),
        visible: true,
      },
      {
        id: TAB_MAPPING.BILLING,
        label: t('profileSettings.billingTab'),
        icon: CreditCardIcon,
        iconColor: 'text-green-500',
        description: t('profileSettings.billingTabDesc'),
        visible: !isSelfhosted,
      },
      {
        id: TAB_MAPPING.COMMUNICATIONS,
        label: t('profileSettings.communications'),
        icon: ChatTextIcon,
        iconColor: 'text-sky-500',
        description: t('profileSettings.communicationsDesc'),
        visible: !isSelfhosted,
      },
      {
        id: TAB_MAPPING.INTERFACE,
        label: t('profileSettings.interfaceSettings'),
        icon: MonitorIcon,
        iconColor: 'text-blue-500',
        description: t('profileSettings.interfaceDesc'),
        visible: true,
      },
      {
        id: TAB_MAPPING.LANGUAGE,
        label: t('profileSettings.language'),
        icon: TranslateIcon,
        iconColor: 'text-purple-500',
        description: t('profileSettings.languageDesc'),
        visible: true,
      },
      {
        id: TAB_MAPPING.DANGER,
        label: t('profileSettings.dangerZone'),
        icon: WarningOctagonIcon,
        iconColor: 'text-red-500',
        description: t('profileSettings.dangerZoneDesc'),
        visible: true,
      },
    ] as const satisfies readonly SettingsTabConfig<SettingsTab>[]
  ).filter((tab) => tab.visible) as SettingsTabConfig<SettingsTab>[]

const DEFAULT_USAGE_INFO: UsageInfo = {
  total: 0,
  traffic: 0,
  errors: 0,
  customEvents: 0,
  captcha: 0,
  projects: 0,
  trafficPerc: 0,
  errorsPerc: 0,
  customEventsPerc: 0,
  captchaPerc: 0,
}

const WEBSITE_ADDON_QUANTITY_OPTIONS = Array.from(
  { length: 21 },
  (_, index) => index * 50,
)

const formatBillingPrice = (amount: number) =>
  Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2)

interface SettingsSectionProps {
  title?: string
  description?: string
  children: React.ReactNode
}

const SettingsSection = ({
  title,
  description,
  children,
}: SettingsSectionProps) => (
  <section className='[&+&]:mt-8'>
    {title && (
      <Text as='h3' size='lg' weight='bold'>
        {title}
      </Text>
    )}
    {description && (
      <Text as='p' size='sm' colour='secondary' className='mt-1'>
        {description}
      </Text>
    )}
    <div className='mt-2'>{children}</div>
  </section>
)

interface Form extends Partial<User> {
  currentPassword: string
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
  const profileAutosaveFetcher = useFetcher<UserSettingsActionData>()
  const metainfoFetcher = useFetcher<UserSettingsActionData>()
  const websiteAddonFetcher = useFetcher<UserSettingsActionData>()
  const websiteAddonPreviewFetcher = useFetcher<UserSettingsActionData>()

  const [searchParams, setSearchParams] = useSearchParams()

  const [isCancelSubModalOpened, setIsCancelSubModalOpened] = useState(false)
  const [cancellationFeedback, setCancellationFeedback] = useState('')
  const [isCancellingSubscription, setIsCancellingSubscription] =
    useState(false)

  const { openCheckout } = usePaddle()

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
    cancellationEffectiveDate,
    subCancelURL,
    maxEventsCount = 0,
    maxProjects = 0,
    maxApiKeyRequestsPerHour = 0,
    sessionReplaysIncluded = 0,
    purchasedWebsiteAddons = 0,
    websiteAddon,
    isAccountBillingSuspended,
  } = user || ({} as Partial<User>)

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
  const projectsUsage =
    maxProjects > 0
      ? Math.min(100, _round((usageInfo.projects / maxProjects) * 100, 2))
      : 0
  const replayLimitLabel =
    typeof sessionReplaysIncluded === 'number'
      ? sessionReplaysIncluded.toLocaleString()
      : sessionReplaysIncluded === 'custom'
        ? t('pricing.custom')
        : sessionReplaysIncluded || '0'
  const currentPlanType = getEffectivePlanType(user?.planType, planCode)
  const currentPlanName = t(`pricing.planTypes.${currentPlanType}.name`)
  const currencyCode = (
    (user?.tierCurrency || metainfo.code) in CURRENCIES
      ? user?.tierCurrency || metainfo.code
      : 'USD'
  ) as CurrencyCode
  const currency = CURRENCIES[currencyCode]
  const websiteAddonBundle = ADDONS.websiteBundles[0]
  const sessionReplayAddon = ADDONS.sessionReplayBundles[0]
  const websiteAddonPrice = websiteAddonBundle.monthly[currencyCode]
  const sessionReplayAddonPrice = sessionReplayAddon.monthly[currencyCode]
  const activeWebsiteAddonQuantity =
    websiteAddon?.quantity ?? purchasedWebsiteAddons
  const currentWebsiteAddonBillingInterval = (websiteAddon?.billingInterval ||
    'monthly') as BillingInterval
  const isWebsiteAddonLegacy = !!websiteAddon?.isLegacy

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

  const onWebsiteAddonQuantityStep = (direction: 1 | -1) => {
    setSelectedWebsiteAddonQuantity((value) =>
      Math.min(1000, Math.max(0, value + direction * 50)),
    )
  }

  const onWebsiteAddonUpdate = () => {
    const formData = new FormData()
    formData.set('intent', 'update-website-addon')
    formData.set('quantity', String(selectedWebsiteAddonQuantity))
    formData.set('billingInterval', selectedWebsiteAddonBillingInterval)

    websiteAddonFetcher.submit(formData, {
      method: 'POST',
      action: '/user-settings',
    })
  }

  const tabs = getTabs(t)
  const sidebarGroups = useMemo<SettingsTabGroup<SettingsTab>[]>(
    () => [
      {
        id: 'account',
        label: t('profileSettings.account'),
        tabIds: [
          TAB_MAPPING.ACCOUNT,
          TAB_MAPPING.BILLING,
          TAB_MAPPING.PASSWORD_AUTH,
        ],
      },
      {
        id: 'interface',
        label: t('profileSettings.interfaceSettings'),
        tabIds: [TAB_MAPPING.INTERFACE, TAB_MAPPING.LANGUAGE],
      },
      {
        id: 'notifications',
        label: t('profileSettings.notifications'),
        tabIds: [TAB_MAPPING.COMMUNICATIONS],
      },
    ],
    [t],
  )

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
    currentPassword: '',
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
  const [selectedWebsiteAddonQuantity, setSelectedWebsiteAddonQuantity] =
    useState(activeWebsiteAddonQuantity)
  const [
    selectedWebsiteAddonBillingInterval,
    setSelectedWebsiteAddonBillingInterval,
  ] = useState<BillingInterval>(currentWebsiteAddonBillingInterval)
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
  const [deletionPassword, setDeletionPassword] = useState('')

  const lastHandledProfileAutosaveData = useRef<UserSettingsActionData | null>(
    null,
  )
  const lastHandledWebsiteAddonData = useRef<UserSettingsActionData | null>(
    null,
  )
  const shouldHandleFetcherData =
    useDeduplicateFetcherResponse<UserSettingsActionData>()
  const profileUpdateToast = useRef('profileSettings.updated')
  const activeProfileAutosave = useRef<{
    additionalData: Record<string, unknown>
    toastKey: string
  } | null>(null)
  const pendingProfileAutosave = useRef<{
    additionalData: Record<string, unknown>
    toastKey: string
  } | null>(null)
  const passwordChangedRef = useRef(false)
  const pendingPasswordChangeRef = useRef(false)
  const pendingToggles = useRef<Map<string, boolean>>(new Map())

  const isSubmitting = fetcher.state === 'submitting'
  const isWebsiteAddonSubmitting = websiteAddonFetcher.state !== 'idle'
  const websiteAddonPreview = useMemo(() => {
    if (
      websiteAddonPreviewFetcher.data?.success &&
      websiteAddonPreviewFetcher.data.intent === 'preview-website-addon'
    ) {
      return websiteAddonPreviewFetcher.data.data as WebsiteAddonPreview
    }

    return null
  }, [websiteAddonPreviewFetcher.data])
  const isWebsiteAddonPreviewLoading =
    websiteAddonPreviewFetcher.state !== 'idle'
  const currentWebsiteAddonPreview = useMemo(() => {
    if (
      websiteAddonPreview?.quantity === selectedWebsiteAddonQuantity &&
      websiteAddonPreview.billingInterval === selectedWebsiteAddonBillingInterval
    ) {
      return websiteAddonPreview
    }

    return null
  }, [
    websiteAddonPreview,
    selectedWebsiteAddonQuantity,
    selectedWebsiteAddonBillingInterval,
  ])
  const hasPendingWebsiteAddonChange =
    (websiteAddon?.pendingQuantity ?? null) !== null ||
    (websiteAddon?.pendingBillingInterval ?? null) !== null
  const websiteAddonDisabledReason = useMemo(() => {
    if (!isSubscriber) {
      return t('billing.websiteAddonRequiresSubscription')
    }

    if (isTrial) {
      return t('billing.websiteAddonUnavailableDuringTrial')
    }

    if (cancellationEffectiveDate) {
      return t('billing.websiteAddonUnavailableCancelled')
    }

    if (isAccountBillingSuspended) {
      return t('billing.websiteAddonUnavailableSuspended')
    }

    if (isWebsiteAddonLegacy) {
      return t('billing.websiteAddonLegacyManaged')
    }

    return null
  }, [
    isSubscriber,
    isTrial,
    cancellationEffectiveDate,
    isAccountBillingSuspended,
    isWebsiteAddonLegacy,
    t,
  ])
  const isWebsiteAddonDisabled = !!websiteAddonDisabledReason
  const hasWebsiteAddonChanges =
    selectedWebsiteAddonQuantity !== activeWebsiteAddonQuantity ||
    selectedWebsiteAddonBillingInterval !== currentWebsiteAddonBillingInterval ||
    hasPendingWebsiteAddonChange
  const websiteAddonPreviewError =
    websiteAddonPreviewFetcher.data?.intent === 'preview-website-addon' &&
    websiteAddonPreviewFetcher.data.error
      ? websiteAddonPreviewFetcher.data.error
      : null
  const websiteAddonPreviewErrorMessage = websiteAddonPreviewError
    ? (() => {
        const billingTranslated = t(`billing.${websiteAddonPreviewError}`)
        const apiTranslated = t(`apiNotifications.${websiteAddonPreviewError}`)

        return billingTranslated !== `billing.${websiteAddonPreviewError}`
          ? billingTranslated
          : apiTranslated !== `apiNotifications.${websiteAddonPreviewError}`
            ? apiTranslated
            : websiteAddonPreviewError
      })()
    : null
  const includedWebsiteLimit =
    currentWebsiteAddonPreview?.includedWebsites ??
    Math.max(0, (maxProjects || 0) - activeWebsiteAddonQuantity)
  const displayedWebsiteLimit = maxProjects
  const displayedProjectsUsage =
    displayedWebsiteLimit > 0
      ? Math.min(
          100,
          _round((usageInfo.projects / displayedWebsiteLimit) * 100, 2),
        )
      : 0
  const displayedPurchasedWebsites = activeWebsiteAddonQuantity
  const selectedWebsiteAddonRecurringAmount =
    currentWebsiteAddonPreview?.recurringAmount ??
    websiteAddonPrice *
      (selectedWebsiteAddonQuantity / websiteAddonBundle.quantity) *
      (selectedWebsiteAddonBillingInterval === 'yearly' ? 10 : 1)
  const websiteAddonStatusLabel = (() => {
    if (hasPendingWebsiteAddonChange) {
      return t('billing.websiteAddonPending')
    }

    if (isWebsiteAddonLegacy) {
      return t('billing.websiteAddonLegacy')
    }

    if (websiteAddon?.status === 'past_due') {
      return t('billing.websiteAddonPastDue')
    }

    if (activeWebsiteAddonQuantity > 0) {
      return t('billing.websiteAddonActive')
    }

    return t('billing.websiteAddonIncluded')
  })()
  const websiteAddonStatusClassName = cx(
    'shrink-0 rounded-md px-2 py-1 text-xs font-semibold',
    {
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300':
        activeWebsiteAddonQuantity > 0 &&
        !hasPendingWebsiteAddonChange &&
        !isWebsiteAddonLegacy &&
        websiteAddon?.status !== 'past_due',
      'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300':
        hasPendingWebsiteAddonChange || websiteAddon?.status === 'past_due',
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200':
        !hasPendingWebsiteAddonChange &&
        websiteAddon?.status !== 'past_due' &&
        (activeWebsiteAddonQuantity === 0 || isWebsiteAddonLegacy),
    },
  )

  const formatBillingDate = useCallback(
    (date?: string | null) => {
      if (!date) return null

      return language === 'en'
        ? dayjs(date).locale(language).format('MMMM D, YYYY')
        : dayjs(date).locale(language).format('D MMMM, YYYY')
    },
    [language],
  )

  const activeTabConfig = useMemo(
    () => _find(tabs, (tab) => tab.id === activeTab),
    [tabs, activeTab],
  )
  const activeTabLabel = activeTabConfig?.label

  useEffect(() => {
    setSelectedWebsiteAddonQuantity(activeWebsiteAddonQuantity)
    setSelectedWebsiteAddonBillingInterval(currentWebsiteAddonBillingInterval)
  }, [
    activeWebsiteAddonQuantity,
    currentWebsiteAddonBillingInterval,
    user?.id,
  ])

  useEffect(() => {
    if (
      activeTab !== TAB_MAPPING.BILLING ||
      !user?.id ||
      isWebsiteAddonDisabled
    ) {
      return
    }

    const formData = new FormData()
    formData.set('intent', 'preview-website-addon')
    formData.set('quantity', String(selectedWebsiteAddonQuantity))
    formData.set('billingInterval', selectedWebsiteAddonBillingInterval)
    websiteAddonPreviewFetcher.submit(formData, {
      method: 'POST',
      action: '/user-settings',
    })
  }, [
    activeTab,
    user?.id,
    isWebsiteAddonDisabled,
    selectedWebsiteAddonQuantity,
    selectedWebsiteAddonBillingInterval,
    websiteAddonPreviewFetcher,
  ])

  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return
    if (!shouldHandleFetcherData(fetcher.data)) return

    if (fetcher.data.success) {
      const { intent, user: updatedUser, apiKey } = fetcher.data

      if (intent === 'update-profile' && updatedUser) {
        if (pendingPasswordChangeRef.current) {
          pendingPasswordChangeRef.current = false
          passwordChangedRef.current = true
        }

        mergeUser(updatedUser)
        toast.success(t(profileUpdateToast.current))
        profileUpdateToast.current = 'profileSettings.updated'

        if (passwordChangedRef.current) {
          passwordChangedRef.current = false
          logout()
        }
      } else if (intent === 'generate-api-key' && apiKey) {
        mergeUser({ apiKey })
        toast.success(t('profileSettings.autosave.apiKeyGenerated'))
      } else if (intent === 'delete-api-key') {
        mergeUser({ apiKey: null })
        toast.success(t('profileSettings.autosave.apiKeyDeleted'))
      } else if (intent === 'toggle-live-visitors' && updatedUser) {
        pendingToggles.current.delete('live-visitors')
        mergeUser(updatedUser)
        toast.success(t('profileSettings.autosave.liveVisitors'))
      } else if (intent === 'toggle-login-notifications') {
        pendingToggles.current.delete('login-notifications')
        toast.success(t('profileSettings.autosave.loginNotifications'))
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
    } else if (fetcher.data?.error || fetcher.data?.fieldErrors) {
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
      if (pendingPasswordChangeRef.current) {
        pendingPasswordChangeRef.current = false
        passwordChangedRef.current = false
        setIsPasswordChangeModalOpened(false)
      }
      if (!fetcher.data.error) {
        const fieldError = Object.values(fetcher.data.fieldErrors || {}).find(
          Boolean,
        )
        if (fieldError) {
          toast.error(fieldError)
        }
        return
      }

      const translated = t(`apiNotifications.${fetcher.data.error}`)
      toast.error(
        translated !== `apiNotifications.${fetcher.data.error}`
          ? translated
          : fetcher.data.error,
      )
    }
  }, [
    fetcher.data,
    fetcher.state,
    mergeUser,
    t,
    logout,
    navigate,
    loadUser,
    shouldHandleFetcherData,
  ])

  useEffect(() => {
    if (
      websiteAddonFetcher.state !== 'idle' ||
      !websiteAddonFetcher.data ||
      lastHandledWebsiteAddonData.current === websiteAddonFetcher.data
    ) {
      return
    }

    lastHandledWebsiteAddonData.current = websiteAddonFetcher.data

    if (
      websiteAddonFetcher.data.success &&
      websiteAddonFetcher.data.intent === 'update-website-addon' &&
      websiteAddonFetcher.data.user
    ) {
      mergeUser(websiteAddonFetcher.data.user)
      toast.success(t('billing.websiteAddonUpdated'))
      loadUser()
      return
    }

    if (websiteAddonFetcher.data.error) {
      const translated = t(`apiNotifications.${websiteAddonFetcher.data.error}`)
      const billingTranslated = t(`billing.${websiteAddonFetcher.data.error}`)

      toast.error(
        billingTranslated !== `billing.${websiteAddonFetcher.data.error}`
          ? billingTranslated
          : translated !== `apiNotifications.${websiteAddonFetcher.data.error}`
            ? translated
            : websiteAddonFetcher.data.error,
      )
    }
  }, [
    websiteAddonFetcher.data,
    websiteAddonFetcher.state,
    mergeUser,
    t,
    loadUser,
  ])

  const flushProfileAutosave = useCallback(() => {
    const autosave = pendingProfileAutosave.current
    if (profileAutosaveFetcher.state !== 'idle' || !autosave) return

    activeProfileAutosave.current = autosave
    pendingProfileAutosave.current = null

    const formData = new FormData()
    formData.set('intent', 'update-profile')
    formData.set('email', user?.email || '')

    if (autosave.additionalData.timezone) {
      formData.set('timezone', autosave.additionalData.timezone as string)
    }

    if (autosave.additionalData.timeFormat) {
      formData.set('timeFormat', autosave.additionalData.timeFormat as string)
    }

    if (autosave.additionalData.reportFrequency) {
      formData.set(
        'reportFrequency',
        autosave.additionalData.reportFrequency as string,
      )
    }

    profileAutosaveFetcher.submit(formData, { method: 'post' })
  }, [profileAutosaveFetcher, user?.email])

  useEffect(() => {
    if (
      profileAutosaveFetcher.state === 'idle' &&
      pendingProfileAutosave.current &&
      lastHandledProfileAutosaveData.current === profileAutosaveFetcher.data
    ) {
      flushProfileAutosave()
    }
  }, [
    flushProfileAutosave,
    profileAutosaveFetcher.data,
    profileAutosaveFetcher.state,
  ])

  useEffect(() => {
    if (profileAutosaveFetcher.state !== 'idle' || !profileAutosaveFetcher.data)
      return
    if (lastHandledProfileAutosaveData.current === profileAutosaveFetcher.data)
      return
    lastHandledProfileAutosaveData.current = profileAutosaveFetcher.data

    if (profileAutosaveFetcher.data.success) {
      const { intent, user: updatedUser } = profileAutosaveFetcher.data

      if (intent === 'update-profile' && updatedUser) {
        mergeUser(updatedUser)
        toast.success(
          t(
            activeProfileAutosave.current?.toastKey ||
              'profileSettings.updated',
          ),
        )
        activeProfileAutosave.current = null
      }

      if (pendingProfileAutosave.current) {
        flushProfileAutosave()
      }
      return
    }

    activeProfileAutosave.current = null

    if (profileAutosaveFetcher.data.error) {
      const translated = t(
        `apiNotifications.${profileAutosaveFetcher.data.error}`,
      )
      toast.error(
        translated !== `apiNotifications.${profileAutosaveFetcher.data.error}`
          ? translated
          : profileAutosaveFetcher.data.error,
      )
    }
    if (pendingProfileAutosave.current) {
      flushProfileAutosave()
    }
  }, [
    flushProfileAutosave,
    profileAutosaveFetcher.data,
    profileAutosaveFetcher.state,
    mergeUser,
    t,
  ])

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

    if ((form.password || form.repeat) && !form.currentPassword) {
      allErrors.currentPassword = t('profileSettings.currentPasswordRequired')
    }

    if (form.password !== form.repeat) {
      allErrors.repeat = t('auth.common.noMatchError')
    }

    return allErrors
  }, [form.currentPassword, form.email, form.password, form.repeat, t])

  const validated = _isEmpty(_keys(errors))
  const hasPasswordUpdateInput = Boolean(form.password || form.repeat)

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event
    const value = target.type === 'checkbox' ? target.checked : target.value

    if (target.name === 'email') {
      setEmailBeenSubmitted(false)
    }

    if (
      target.name === 'currentPassword' ||
      target.name === 'password' ||
      target.name === 'repeat'
    ) {
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
    includePassword = false,
    toastKey = 'profileSettings.updated',
  ) => {
    if (!skipValidation && !validated) return

    profileUpdateToast.current = toastKey
    const formData = new FormData()
    formData.set('intent', 'update-profile')
    formData.set('email', form.email || user?.email || '')
    if (includePassword && hasPasswordUpdateInput && form.currentPassword)
      formData.set('currentPassword', form.currentPassword)
    if (includePassword && form.password)
      formData.set('password', form.password)
    if (includePassword && form.repeat) formData.set('repeat', form.repeat)
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

  const submitProfileAutosave = (
    additionalData: Record<string, unknown>,
    toastKey: string,
  ) => {
    pendingProfileAutosave.current = {
      additionalData: {
        ...pendingProfileAutosave.current?.additionalData,
        ...additionalData,
      },
      toastKey,
    }

    flushProfileAutosave()
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
    if (hasPasswordUpdateInput) setPasswordBeenSubmitted(true)

    if (validated) {
      // User is about to change their password, let's warn him if
      if (hasPasswordUpdateInput && !force) {
        setIsPasswordChangeModalOpened(true)
        return
      }

      submitProfileUpdate(
        undefined,
        false,
        hasPasswordUpdateInput,
        hasPasswordUpdateInput
          ? 'profileSettings.autosave.password'
          : 'profileSettings.updated',
      )
    }
  }

  const handleEmailSubmit = () => {
    setEmailBeenSubmitted(true)

    if (!form.email || errors.email) return

    submitProfileUpdate(
      undefined,
      true,
      false,
      'profileSettings.autosave.email',
    )
  }

  const handlePasswordSubmit = () => {
    if (hasPasswordUpdateInput) setPasswordBeenSubmitted(true)

    if (
      !hasPasswordUpdateInput ||
      errors.currentPassword ||
      errors.password ||
      errors.repeat
    )
      return

    setIsPasswordChangeModalOpened(true)
  }

  const handleTimezoneChange = (value: string) => {
    setTimezone(value)
    submitProfileAutosave(
      { timezone: value },
      'profileSettings.autosave.timezone',
    )
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

  const handleReportFrequencyChange = (frequency: string) => {
    setReportFrequency(frequency)
    submitProfileAutosave(
      { reportFrequency: frequency },
      'profileSettings.autosave.reportFrequency',
    )
  }

  const onAccountDelete = () => {
    const formData = new FormData()
    formData.set('intent', 'delete-account')
    formData.set('password', deletionPassword)
    formData.set('feedback', deletionFeedback)
    fetcher.submit(formData, { method: 'post' })
    setTimeout(() => {
      setDeletionPassword('')
    }, 300)
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

  const handleTimeFormatChange = (
    timeFormat: NonNullable<Form['timeFormat']>,
  ) => {
    setForm((prev) => ({
      ...prev,
      timeFormat,
    }))
    submitProfileAutosave({ timeFormat }, 'profileSettings.autosave.timeFormat')
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

        <hr className='mt-5 border-gray-200 dark:border-slate-700/80' />

        <div className='mt-6 flex flex-col gap-6 md:flex-row'>
          <div className='md:hidden'>
            <Select
              items={tabs}
              keyExtractor={(item) => item.id}
              labelExtractor={(item) => item.label}
              iconExtractor={(item) => {
                const Icon = item.icon
                return (
                  <Icon
                    className={cx('h-4 w-4', item.iconColor)}
                    weight='duotone'
                  />
                )
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
            <SettingsSidebar
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={(tabId) => setActiveTab(tabId)}
              groups={sidebarGroups}
              storageKey='user-settings-sidebar-groups'
            />
          </aside>

          <section className='flex-1'>
            {activeTab === TAB_MAPPING.ACCOUNT && activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />

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
                        <Button size='lg' onClick={handleEmailSubmit}>
                          {t('profileSettings.update')}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </SettingsSection>

                <SettingsSection
                  title={t('profileSettings.apiKey')}
                  description={t('profileSettings.apiKeyDesc')}
                >
                  {user?.apiKey ? (
                    <>
                      <Alert variant='warning' className='mb-3'>
                        {t('profileSettings.apiKeyWarning')}
                      </Alert>
                      <div className='max-w-md'>
                        <Input
                          label={t('profileSettings.apiKey')}
                          name='apiKey'
                          type='password'
                          value={user.apiKey}
                          readOnly
                        />
                      </div>
                      <Button
                        variant='danger'
                        size='lg'
                        className='mt-4'
                        onClick={() => setShowAPIDeleteModal(true)}
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
                      <Button size='lg' onClick={onApiKeyGenerate}>
                        {t('profileSettings.addApiKeyBtn')}
                      </Button>
                    </>
                  )}
                </SettingsSection>

                {isSelfhosted ? (
                  <>
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
                                <th
                                  scope='col'
                                  aria-label={t('ariaLabels.actions')}
                                />
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
                    <SettingsSection
                      title={t('profileSettings.socialisations')}
                      description={t('profileSettings.socialisationsDesc')}
                    >
                      <div id='socialisations'>
                        <Socialisations />
                      </div>
                    </SettingsSection>

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
                                <th
                                  scope='col'
                                  aria-label={t('ariaLabels.actions')}
                                />
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
                                <th
                                  scope='col'
                                  aria-label={t('ariaLabels.actions')}
                                />
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
              </>
            ) : null}

            {activeTab === TAB_MAPPING.DANGER && activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />

                <SettingsSection
                  title={t('project.settings.destructiveActions')}
                  description={t('profileSettings.dangerZoneDesc')}
                >
                  <Button
                    variant='danger'
                    size='sm'
                    type='button'
                    onClick={() => setShowModal(true)}
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
                  iconColorClass={activeTabConfig.iconColor}
                />

                <SettingsSection
                  title={t('profileSettings.changePassword')}
                  description={t('profileSettings.changePasswordDesc')}
                >
                  <div className='max-w-md space-y-4'>
                    <Input
                      name='currentPassword'
                      type='password'
                      label={t('profileSettings.currentPassword')}
                      value={form.currentPassword}
                      placeholder={t('auth.common.password')}
                      onChange={handleInput}
                      error={
                        passwordBeenSubmitted ? errors.currentPassword : null
                      }
                    />
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
                      size='lg'
                      onClick={handlePasswordSubmit}
                      disabled={
                        !form.currentPassword || !form.password || !form.repeat
                      }
                    >
                      {t('profileSettings.updatePassword')}
                    </Button>
                  </div>
                </SettingsSection>

                <SettingsSection
                  title={t('profileSettings.2fa')}
                  description={t('profileSettings.2faSectionDesc')}
                >
                  <TwoFA />
                </SettingsSection>

                <SettingsSection
                  title={t('profileSettings.logoutAllTitle')}
                  description={t('profileSettings.logoutAllDesc')}
                >
                  <Alert variant='warning' className='mb-4'>
                    {t('profileSettings.logoutAllWarning')}
                  </Alert>
                  <Button
                    variant='danger-outline'
                    size='lg'
                    onClick={() => {
                      logout(true)
                    }}
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
                  iconColorClass={activeTabConfig.iconColor}
                />

                <SettingsSection
                  title={t('profileSettings.timezone')}
                  description={t('profileSettings.timezoneDesc')}
                >
                  <div className='max-w-md'>
                    <TimezonePicker
                      value={timezone}
                      onChange={handleTimezoneChange}
                    />
                  </div>
                </SettingsSection>

                <SettingsSection
                  title={t('profileSettings.timeFormat')}
                  description={t('profileSettings.selectTimeFormat')}
                >
                  <div className='max-w-md'>
                    <Select
                      title={t(`profileSettings.${form.timeFormat}`)}
                      className='w-full'
                      items={translatedTimeFormat}
                      onSelect={(f) => {
                        const nextTimeFormat = timeFormatArray[
                          _findIndex(translatedTimeFormat, (freq) => freq === f)
                        ] as NonNullable<Form['timeFormat']> | undefined

                        if (!nextTimeFormat) return

                        handleTimeFormatChange(nextTimeFormat)
                      }}
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
                  </div>
                </SettingsSection>

                <SettingsSection
                  title={t('profileSettings.uiSettings')}
                  description={t('profileSettings.uiSettingsDesc')}
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
                  iconColorClass={activeTabConfig.iconColor}
                />

                {isBillingLoading || authLoading ? (
                  <div className='flex justify-center py-12'>
                    <Loader />
                  </div>
                ) : (
                  <>
                    {isTrial &&
                    trialEndsOnMessage &&
                    !cancellationEffectiveDate ? (
                      <Alert
                        variant='info'
                        title={t('profileSettings.trialActive')}
                        className='mb-6'
                      >
                        {trialEndsOnMessage} {t('billing.trialChargeWarning')}
                      </Alert>
                    ) : null}

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

                    {isNoSub ? (
                      <Alert
                        variant='error'
                        title={t('billing.noActiveSubscription')}
                        className='mb-6'
                      >
                        {t('billing.noActiveSubscriptionDescription')}
                      </Alert>
                    ) : null}

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

                      <div className='grid grid-cols-2 gap-x-6 gap-y-3'>
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

                      <div className='mt-5'>
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
                      </div>

                      <div className='mt-6 grid gap-5 border-t border-gray-200 pt-5 sm:grid-cols-3 dark:border-slate-800'>
                        <div>
                          <div className='flex items-center gap-1.5'>
                            <Text as='p' size='xs' colour='muted'>
                              {t('billing.websites')}
                            </Text>
                            <Tooltip
                              ariaLabel={t('billing.websitesAddonTooltip')}
                              text={t('billing.websitesAddonTooltip')}
                            />
                          </div>
                          <Text
                            as='p'
                            size='sm'
                            weight='semibold'
                            className='mt-1'
                          >
                            {(usageInfo.projects || 0).toLocaleString()} /{' '}
                            {(maxProjects || 0).toLocaleString()}
                          </Text>
                          {purchasedWebsiteAddons ? (
                            <Text
                              as='p'
                              size='xs'
                              colour='muted'
                              className='mt-1'
                            >
                              {t('billing.addedWebsites', {
                                amount: purchasedWebsiteAddons.toLocaleString(),
                              })}
                            </Text>
                          ) : null}
                          <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800'>
                            <div
                              className='h-full rounded-full bg-slate-900 dark:bg-slate-100'
                              style={{ width: `${projectsUsage}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className='flex items-center gap-1.5'>
                            <Text as='p' size='xs' colour='muted'>
                              {t('billing.sessionReplays')}
                            </Text>
                            <Tooltip
                              ariaLabel={t(
                                'billing.sessionReplaysAddonTooltip',
                              )}
                              text={t('billing.sessionReplaysAddonTooltip')}
                            />
                          </div>
                          <Text
                            as='p'
                            size='sm'
                            weight='semibold'
                            className='mt-1'
                          >
                            {t('billing.perMonthQuota', {
                              amount: replayLimitLabel,
                            })}
                          </Text>
                          <Text
                            as='p'
                            size='xs'
                            colour='muted'
                            className='mt-1'
                          >
                            {t('billing.recordedSessionsQuota')}
                          </Text>
                        </div>

                        <div>
                          <Text as='p' size='xs' colour='muted'>
                            {t('billing.api')}
                          </Text>
                          <Text
                            as='p'
                            size='sm'
                            weight='semibold'
                            className='mt-1'
                          >
                            {t('billing.perHourQuota', {
                              amount: (
                                maxApiKeyRequestsPerHour || 0
                              ).toLocaleString(),
                            })}
                          </Text>
                          <Text
                            as='p'
                            size='xs'
                            colour='muted'
                            className='mt-1'
                          >
                            {t('billing.currentRateLimit')}
                          </Text>
                        </div>
                      </div>

                      <Text
                        as='p'
                        size='sm'
                        colour='secondary'
                        className='mt-4'
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
                    </SettingsSection>

                    <SettingsSection
                      title={t('billing.subscription')}
                      description={
                        isSubscriber
                          ? t('billing.changePlan')
                          : t('billing.selectPlan')
                      }
                    >
                      <div className='flex flex-col gap-4 border-t border-gray-200 pt-4 md:flex-row md:items-start md:justify-between dark:border-slate-800'>
                        <div className='max-w-2xl'>
                          <Text as='p' size='base' weight='semibold'>
                            {isSubscriber
                              ? t('billing.currentPlanTitle', {
                                  plan: currentPlanName,
                                })
                              : t('billing.noPlanSelected')}
                          </Text>
                          <Text
                            as='p'
                            size='sm'
                            colour='secondary'
                            className='mt-1'
                          >
                            {isSubscriber
                              ? t('billing.currentPlanDescription', {
                                  events: (
                                    maxEventsCount || 0
                                  ).toLocaleString(),
                                })
                              : t('billing.noPlanDescription')}
                          </Text>
                          <Text
                            as='p'
                            size='sm'
                            colour='secondary'
                            className='mt-3'
                          >
                            {t('billing.membersNotification')}
                          </Text>
                        </div>

                        <div className='flex shrink-0 flex-wrap gap-3'>
                          <Button
                            to={routes.billing_choose_plan}
                            size='lg'
                            className='gap-1'
                          >
                            {isSubscriber
                              ? t('billing.managePlan')
                              : t('billing.choosePlan')}
                            <ArrowRightIcon className='size-4' />
                          </Button>
                          {subUpdateURL && !cancellationEffectiveDate ? (
                            <Button
                              variant='secondary'
                              size='lg'
                              onClick={onUpdatePaymentDetails}
                              type='button'
                            >
                              {t('billing.update')}
                            </Button>
                          ) : null}
                          {subCancelURL && !cancellationEffectiveDate ? (
                            <Button
                              variant='danger-outline'
                              size='lg'
                              onClick={() => setIsCancelSubModalOpened(true)}
                              type='button'
                            >
                              {t('billing.cancelSub')}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </SettingsSection>

                    <SettingsSection
                      title={t('billing.addonsTitle')}
                      description={t('billing.addonsDesc')}
                    >
                      <div className='grid gap-4 border-t border-gray-200 pt-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)] dark:border-slate-800'>
                        <div className='rounded-lg border border-gray-200 p-4 dark:border-slate-800'>
                          <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                            <div>
                              <Text as='h4' size='base' weight='semibold'>
                                {t('billing.websiteAddonTitle')}
                              </Text>
                              <Text
                                as='p'
                                size='sm'
                                colour='secondary'
                                className='mt-1'
                              >
                                {t('billing.websiteAddonDescription', {
                                  amount: websiteAddonBundle.quantity,
                                  unitPrice: `${currency.symbol}${formatBillingPrice(
                                    websiteAddonPrice /
                                      websiteAddonBundle.quantity,
                                  )}`,
                                })}
                              </Text>
                            </div>
                            <Text as='span' className={websiteAddonStatusClassName}>
                              {websiteAddonStatusLabel}
                            </Text>
                          </div>

                          <div className='mt-4 border-y border-gray-200 py-3 dark:border-slate-800'>
                            <div className='grid gap-3 sm:grid-cols-3 sm:divide-x sm:divide-gray-200 dark:sm:divide-slate-800'>
                              <div className='sm:pr-4'>
                                <Text as='p' size='xs' colour='muted'>
                                  {t('billing.websiteAddonUsage')}
                                </Text>
                                <Text
                                  as='p'
                                  size='sm'
                                  weight='semibold'
                                  className='mt-1'
                                >
                                  {t('billing.xofy', {
                                    x: (usageInfo.projects || 0).toLocaleString(),
                                    y: (
                                      displayedWebsiteLimit || 0
                                    ).toLocaleString(),
                                  })}
                                </Text>
                              </div>
                              <div className='sm:px-4'>
                                <Text as='p' size='xs' colour='muted'>
                                  {t('billing.websiteAddonIncluded')}
                                </Text>
                                <Text
                                  as='p'
                                  size='sm'
                                  weight='semibold'
                                  className='mt-1'
                                >
                                  {t('pricing.websiteCount', {
                                    count: includedWebsiteLimit,
                                  })}
                                </Text>
                              </div>
                              <div className='sm:pl-4'>
                                <Text as='p' size='xs' colour='muted'>
                                  {t('billing.websiteAddonPurchased')}
                                </Text>
                                <Text
                                  as='p'
                                  size='sm'
                                  weight='semibold'
                                  className='mt-1'
                                >
                                  {displayedPurchasedWebsites
                                    ? t('billing.addedWebsites', {
                                        amount:
                                          displayedPurchasedWebsites.toLocaleString(),
                                      })
                                    : t('billing.noAdditionalWebsites')}
                                </Text>
                              </div>
                            </div>
                            <div className='mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800'>
                              <div
                                className='h-full rounded-full bg-slate-900 dark:bg-slate-100'
                                style={{ width: `${displayedProjectsUsage}%` }}
                              />
                            </div>
                          </div>

                          <div className='mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]'>
                            <div>
                              <Text as='label' size='sm' weight='medium'>
                                {t('billing.websiteAddonQuantity')}
                              </Text>
                              <div className='mt-1.5 flex items-center gap-2'>
                                <Button
                                  variant='icon'
                                  aria-label={t(
                                    'billing.websiteAddonDecreaseQuantity',
                                  )}
                                  title={t(
                                    'billing.websiteAddonDecreaseQuantity',
                                  )}
                                  disabled={
                                    isWebsiteAddonDisabled ||
                                    selectedWebsiteAddonQuantity <= 0
                                  }
                                  onClick={() => onWebsiteAddonQuantityStep(-1)}
                                >
                                  <MinusIcon className='size-4' />
                                </Button>
                                <Select<number>
                                  selectedItem={selectedWebsiteAddonQuantity}
                                  items={WEBSITE_ADDON_QUANTITY_OPTIONS}
                                  onSelect={setSelectedWebsiteAddonQuantity}
                                  disabled={isWebsiteAddonDisabled}
                                  className='min-w-44 flex-1'
                                  title={
                                    selectedWebsiteAddonQuantity
                                      ? t('billing.extraWebsitesAmount', {
                                          amount:
                                            selectedWebsiteAddonQuantity.toLocaleString(),
                                        })
                                      : t('billing.noAdditionalWebsites')
                                  }
                                  labelExtractor={(amount) =>
                                    amount
                                      ? t('billing.extraWebsitesAmount', {
                                          amount: amount.toLocaleString(),
                                        })
                                      : t('billing.noAdditionalWebsites')
                                  }
                                  keyExtractor={(amount) => String(amount)}
                                />
                                <Button
                                  variant='icon'
                                  aria-label={t(
                                    'billing.websiteAddonIncreaseQuantity',
                                  )}
                                  title={t(
                                    'billing.websiteAddonIncreaseQuantity',
                                  )}
                                  disabled={
                                    isWebsiteAddonDisabled ||
                                    selectedWebsiteAddonQuantity >= 1000
                                  }
                                  onClick={() => onWebsiteAddonQuantityStep(1)}
                                >
                                  <PlusIcon className='size-4' />
                                </Button>
                              </div>
                            </div>

                            <div>
                              <Text as='p' size='sm' weight='medium'>
                                {t('billing.websiteAddonBillingInterval')}
                              </Text>
                              <div className='mt-1.5 grid grid-cols-2 rounded-md border border-gray-300 bg-gray-50 p-1 dark:border-slate-700/80 dark:bg-slate-950'>
                                {(['monthly', 'yearly'] as BillingInterval[]).map(
                                  (interval) => (
                                    <button
                                      key={interval}
                                      type='button'
                                      disabled={isWebsiteAddonDisabled}
                                      onClick={() =>
                                        setSelectedWebsiteAddonBillingInterval(
                                          interval,
                                        )
                                      }
                                      className={cx(
                                        'rounded-sm px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                                        selectedWebsiteAddonBillingInterval ===
                                          interval
                                          ? 'bg-white text-slate-900 ring-1 ring-gray-200 dark:bg-slate-900 dark:text-gray-50 dark:ring-slate-700'
                                          : 'text-gray-600 hover:text-slate-900 dark:text-gray-300 dark:hover:text-gray-50',
                                      )}
                                    >
                                      {interval === 'monthly'
                                        ? t('billing.websiteAddonMonthly')
                                        : t('billing.websiteAddonYearly')}
                                    </button>
                                  ),
                                )}
                              </div>
                              <Text
                                as='p'
                                size='xs'
                                colour='muted'
                                className='mt-1'
                              >
                                {t('billing.websiteAddonYearlyDiscount')}
                              </Text>
                            </div>
                          </div>

                          {websiteAddonDisabledReason ? (
                            <Alert variant='info' className='mt-4'>
                              {websiteAddonDisabledReason}
                            </Alert>
                          ) : null}
                          {hasPendingWebsiteAddonChange &&
                          !websiteAddonDisabledReason ? (
                            <Alert variant='warning' className='mt-4'>
                              {t('billing.websiteAddonPendingChange', {
                                date:
                                  formatBillingDate(
                                    websiteAddon?.nextChargeDate ||
                                      websiteAddon?.periodEnd,
                                  ) || t('billing.websiteAddonNextRenewal'),
                              })}
                            </Alert>
                          ) : null}
                          {websiteAddonPreviewErrorMessage ? (
                            <Alert variant='error' className='mt-4'>
                              {websiteAddonPreviewErrorMessage}
                            </Alert>
                          ) : null}

                          {currentWebsiteAddonPreview &&
                          hasWebsiteAddonChanges ? (
                            <div className='mt-4 border-t border-gray-200 pt-4 dark:border-slate-800'>
                              <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                                <div>
                                  <Text as='p' size='xs' colour='muted'>
                                    {t('billing.websiteAddonDueNow')}
                                  </Text>
                                  <Text
                                    as='p'
                                    size='sm'
                                    weight='semibold'
                                    className='mt-1'
                                  >
                                    {currentWebsiteAddonPreview.dueNow > 0
                                      ? `${currency.symbol}${formatBillingPrice(
                                          currentWebsiteAddonPreview.dueNow,
                                        )}`
                                      : t('billing.websiteAddonNoImmediateCharge')}
                                  </Text>
                                </div>
                                <div>
                                  <Text as='p' size='xs' colour='muted'>
                                    {t('billing.websiteAddonRecurring')}
                                  </Text>
                                  <Text
                                    as='p'
                                    size='sm'
                                    weight='semibold'
                                    className='mt-1'
                                  >
                                    {currentWebsiteAddonPreview.quantity > 0
                                      ? `${currency.symbol}${formatBillingPrice(
                                          selectedWebsiteAddonRecurringAmount,
                                        )}/${t(
                                          selectedWebsiteAddonBillingInterval ===
                                            'yearly'
                                            ? 'pricing.intervals.year'
                                            : 'pricing.intervals.month',
                                        )}`
                                      : t('billing.websiteAddonNoNextCharge')}
                                  </Text>
                                </div>
                                <div>
                                  <Text as='p' size='xs' colour='muted'>
                                    {t('billing.websiteAddonNextCharge')}
                                  </Text>
                                  <Text
                                    as='p'
                                    size='sm'
                                    weight='semibold'
                                    className='mt-1'
                                  >
                                    {formatBillingDate(
                                      currentWebsiteAddonPreview.nextChargeDate,
                                    ) || t('billing.websiteAddonNoNextCharge')}
                                  </Text>
                                </div>
                                {currentWebsiteAddonPreview.effectiveDate ? (
                                  <div>
                                    <Text as='p' size='xs' colour='muted'>
                                      {t('billing.websiteAddonEffectiveOn')}
                                    </Text>
                                    <Text
                                      as='p'
                                      size='sm'
                                      weight='semibold'
                                      className='mt-1'
                                    >
                                      {formatBillingDate(
                                        currentWebsiteAddonPreview.effectiveDate,
                                      )}
                                    </Text>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ) : null}

                          <div className='mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                            <Text as='p' size='xs' colour='muted'>
                              {t('billing.websiteAddonMaxSelfServe')}
                            </Text>
                            <Button
                              size='lg'
                              onClick={onWebsiteAddonUpdate}
                              loading={isWebsiteAddonSubmitting}
                              disabled={
                                isWebsiteAddonDisabled ||
                                !hasWebsiteAddonChanges ||
                                isWebsiteAddonPreviewLoading ||
                                !!websiteAddonPreviewError
                              }
                            >
                              {t('billing.websiteAddonSave')}
                            </Button>
                          </div>
                        </div>

                        <div className='rounded-lg border border-gray-200 p-4 dark:border-slate-800'>
                          <div className='flex items-start justify-between gap-3'>
                            <div>
                              <Text as='h4' size='base' weight='semibold'>
                                {t('billing.sessionReplayAddonTitle')}
                              </Text>
                              <Text
                                as='p'
                                size='sm'
                                colour='secondary'
                                className='mt-1'
                              >
                                {t('billing.sessionReplayAddonDescription', {
                                  amount:
                                    sessionReplayAddon.quantity.toLocaleString(),
                                })}
                              </Text>
                            </div>
                            <Text
                              as='span'
                              size='xs'
                              weight='semibold'
                              className='shrink-0 rounded-md bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                            >
                              {t('billing.comingSoon')}
                            </Text>
                          </div>
                          <Text
                            as='p'
                            size='lg'
                            weight='bold'
                            className='mt-4'
                          >
                            {currency.symbol}
                            {formatBillingPrice(sessionReplayAddonPrice)}
                            <Text
                              as='span'
                              size='sm'
                              weight='medium'
                              colour='secondary'
                            >
                              /{t('pricing.intervals.month')}
                            </Text>
                          </Text>
                          <Text
                            as='p'
                            size='sm'
                            colour='secondary'
                            className='mt-3'
                          >
                            {t('billing.sessionReplayAddonComingSoon')}
                          </Text>
                        </div>
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
                  iconColorClass={activeTabConfig.iconColor}
                />

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
                      onSelect={(f) => {
                        const nextFrequency =
                          reportFrequencies[
                            _findIndex(
                              translatedFrequencies,
                              (freq) => freq === f,
                            )
                          ]

                        handleReportFrequencyChange(nextFrequency)
                      }}
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
                  </div>
                </SettingsSection>

                <SettingsSection>
                  <div id='notification-channels'>
                    <div id='integrations'>
                      <NotificationChannels scope='user' />
                    </div>
                  </div>
                </SettingsSection>

                {user?.isTelegramChatIdConfirmed ? (
                  <SettingsSection
                    title={t('profileSettings.notifications')}
                    description={t('profileSettings.notificationsDesc')}
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
                  iconColorClass={activeTabConfig.iconColor}
                />

                <SettingsSection title={t('profileSettings.changeLanguage')}>
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
          setDeletionPassword('')
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
        submitDisabled={!deletionPassword}
        message={
          <>
            {t('profileSettings.deactivateConfirmation')}
            <div className='mt-4'>
              <Input
                name='deletePassword'
                type='password'
                label={t('profileSettings.enterPasswordToDelete')}
                value={deletionPassword}
                placeholder={t('auth.common.password')}
                onChange={(e) => setDeletionPassword(e.target.value)}
              />
            </div>
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
          pendingPasswordChangeRef.current = hasPasswordUpdateInput
          passwordChangedRef.current = false
          submitProfileUpdate(
            undefined,
            true,
            hasPasswordUpdateInput,
            'profileSettings.autosave.password',
          )
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
            <Text as='p'>
              <Trans
                t={t}
                i18nKey='pricing.cancelDesc'
                values={{
                  email: CONTACT_EMAIL,
                }}
              />
            </Text>
            <Textarea
              id='cancellation-feedback'
              label={t('billing.cancellationFeedbackLabel')}
              rows={3}
              placeholder={t('billing.cancellationFeedbackPlaceholder')}
              value={cancellationFeedback}
              onChange={(e) => setCancellationFeedback(e.target.value)}
              disabled={isCancellingSubscription}
            />
          </div>
        }
        isOpened={isCancelSubModalOpened}
      />
    </div>
  )
}

export default memo(UserSettings)
