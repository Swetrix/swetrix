import cx from 'clsx'
import _filter from 'lodash/filter'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import _isString from 'lodash/isString'
import _join from 'lodash/join'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _replace from 'lodash/replace'
import _size from 'lodash/size'
import _toUpper from 'lodash/toUpper'
import { Link } from '~/ui/Link'
import {
  SlidersHorizontalIcon,
  ShieldIcon,
  LockIcon,
  UserCircleIcon,
  EnvelopeIcon,
  WarningOctagonIcon,
  CaretLeftIcon,
  PuzzlePieceIcon,
  NoteIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  DownloadIcon,
  BellRingingIcon,
  GlobeIcon,
  VideoCameraIcon,
} from '@phosphor-icons/react'
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  useLoaderData,
  useNavigate,
  useSearchParams,
  useFetcher,
} from 'react-router'
import { toast } from 'sonner'

import { useFiltersProxy } from '~/hooks/useAnalyticsProxy'
import { useDeduplicateFetcherResponse } from '~/hooks/useDeduplicateFetcherResponse'
import { useRequiredParams } from '~/hooks/useRequiredParams'
import { isSelfhosted, FILTERS_PANELS_ORDER, isBrowser } from '~/lib/constants'
import { Project } from '~/lib/models/Project'
import { useAuth } from '~/providers/AuthProvider'
import type { ProjectSettingsActionData } from '~/routes/projects.settings.$id'
import Button from '~/ui/Button'
import DatePicker from '~/ui/Datepicker'
import Dropdown from '~/ui/Dropdown'
import GoogleGSVG from '~/ui/icons/GoogleG'
import GoogleSearchConsoleSVG from '~/ui/icons/GoogleSearchConsole'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import MultiSelect from '~/ui/MultiSelect'
import Select from '~/ui/Select'
import { TabHeader } from '~/ui/TabHeader'
import { Text } from '~/ui/Text'
// Select is used inside tab components
import countries from '~/utils/isoCountries'
import routes from '~/utils/routes'
import { isValidHttpUrl } from '~/utils/url'

import CCRow from '../View/components/CCRow'

import Annotations from './Annotations'
import Emails from './Emails'
import People from './People'
import AccessSettings from './tabs/AccessSettings'
import DangerZone from './tabs/DangerZone'
import General from './tabs/General'
import Revenue from './tabs/Revenue'
import SessionReplays from './tabs/SessionReplays'
import Shields from './tabs/Shields'
import ProjectAlerts from './Alerts/ProjectAlertsView'
import NotificationChannels from '~/components/NotificationChannels/NotificationChannels'
import BotProtectionReport from './components/BotProtectionReport'
import DataImportTab from './components/DataImportTab'
import ProxyDomainsTab from './components/ProxyDomainsTab'
import SettingsSidebar, { SettingsTabConfig } from './SettingsSidebar'

const MAX_NAME_LENGTH = 50
const MAX_ORIGINS_LENGTH = 300
const MAX_IPBLACKLIST_LENGTH = 300
const AUTOSAVE_DEBOUNCE_MS = 700
const CAPTCHA_CLIENT_DOCS_URL =
  'https://swetrix.com/docs/captcha/client-side-usage'

const DELETE_DATA_MODAL_TABS = [
  {
    name: 'all',
    title: 'project.settings.reseted.all',
  },
  {
    name: 'partially',
    title: 'project.settings.reseted.partially',
  },
  {
    name: 'viaFilters',
    title: 'project.settings.reseted.viaFilters',
  },
]

interface ModalMessageProps {
  dateRange: Date[]
  setDateRange: (a: Date[]) => void
  setTab: (i: string) => void
  tab: string
  pid: string
  activeFilter: string[]
  setActiveFilter: any
  filterType: string
  setFilterType: (a: string) => void
  fetchFilters: (
    projectId: string,
    filterType: string,
  ) => Promise<string[] | null>
}

const ModalMessage = ({
  dateRange,
  setDateRange,
  setTab,
  tab,
  pid,
  activeFilter,
  setActiveFilter,
  filterType,
  setFilterType,
  fetchFilters,
}: ModalMessageProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const [filterList, setFilterList] = useState<string[]>([])
  const [searchList, setSearchList] = useState<string[]>([])

  const getFiltersList = async () => {
    if (!_isEmpty(filterType)) {
      const res = await fetchFilters(pid, filterType)
      setFilterList(res || [])
      setSearchList(res || [])
      if (!_isEmpty(activeFilter)) {
        setActiveFilter([])
      }
    }
  }

  useEffect(() => {
    getFiltersList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType])

  return (
    <>
      <Text
        as='p'
        size='sm'
        className='mt-1 mb-4 text-gray-500 italic dark:text-gray-300'
      >
        {t('project.settings.resetHint')}
      </Text>
      <div className='mt-6'>
        <nav className='-mb-px flex space-x-6'>
          {_map(DELETE_DATA_MODAL_TABS, (tabDelete) => (
            <button
              key={tabDelete.name}
              type='button'
              onClick={() => setTab(tabDelete.name)}
              className={cx(
                'text-md border-b-2 px-1 pb-2 font-medium whitespace-nowrap',
                {
                  'border-indigo-500 text-indigo-600 dark:border-gray-50 dark:text-gray-50':
                    tabDelete.name === tab,
                  'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-300 dark:hover:text-gray-300':
                    tab !== tabDelete.name,
                },
              )}
            >
              {t(tabDelete.title)}
            </button>
          ))}
        </nav>
      </div>
      {tab === DELETE_DATA_MODAL_TABS[1].name ? (
        <>
          <Text
            as='p'
            size='sm'
            className='mt-4 mb-2 text-gray-500 dark:text-gray-300'
          >
            {t('project.settings.reseted.partiallyDesc')}
          </Text>
          <Text
            as='p'
            size='sm'
            className='mt-1 mb-2 text-gray-500 italic dark:text-gray-300'
          >
            {t('project.settings.reseted.partiallyHint')}
          </Text>
          <input
            type='text'
            aria-label={t('ariaLabels.dateRange')}
            className='m-0 h-0 w-0 border-0 p-0 focus:border-transparent focus:text-transparent focus:shadow-none focus:ring-transparent'
          />
          <DatePicker
            className='!mx-0 w-0'
            onChange={(date) => setDateRange(date)}
            options={{
              altInputClass:
                ' focus:ring-slate-900 dark:focus:ring-slate-300 block w-full sm:text-sm border-gray-300 dark:text-gray-50 dark:placeholder-gray-400 dark:border-gray-800 dark:bg-slate-900 rounded-md',
            }}
            value={dateRange}
          />
        </>
      ) : null}
      {tab === DELETE_DATA_MODAL_TABS[0].name ? (
        <Text
          as='p'
          size='sm'
          className='mt-4 mb-4 text-gray-500 italic dark:text-gray-300'
        >
          {t('project.settings.reseted.allHint')}
        </Text>
      ) : null}
      {tab === DELETE_DATA_MODAL_TABS[2].name ? (
        <div className='min-h-[410px]'>
          <Text
            as='p'
            size='sm'
            className='mt-4 mb-4 text-gray-500 italic dark:text-gray-300'
          >
            {t('project.settings.reseted.viaFiltersHint')}
          </Text>
          <div>
            <Dropdown
              className='min-w-[160px]'
              title={
                !_isEmpty(filterType)
                  ? t(`project.mapping.${filterType}`)
                  : t('project.settings.reseted.selectFilters')
              }
              items={FILTERS_PANELS_ORDER}
              labelExtractor={(item) => t(`project.mapping.${item}`)}
              keyExtractor={(item) => item}
              onSelect={(item) => setFilterType(item)}
            />
            <div className='h-2' />
            {filterType && !_isEmpty(filterList) ? (
              <MultiSelect
                className='max-w-96'
                items={searchList}
                labelExtractor={(item) => {
                  if (filterType === 'cc') {
                    return <CCRow cc={item} language={language} />
                  }

                  return item
                }}
                itemExtractor={(item) => {
                  if (filterType === 'cc') {
                    return <CCRow cc={item} language={language} />
                  }

                  return item
                }}
                keyExtractor={(item) => item}
                label={activeFilter}
                onSearch={(search: string) => {
                  if (search.length > 0) {
                    if (filterType === 'cc') {
                      setSearchList(
                        _filter(filterList, (item) =>
                          _includes(
                            _toUpper(countries.getName(item, language)),
                            _toUpper(search),
                          ),
                        ),
                      )
                      return
                    }

                    setSearchList(
                      _filter(filterList, (item) =>
                        _includes(_toUpper(item), _toUpper(search)),
                      ),
                    )
                  } else {
                    setSearchList(filterList)
                  }
                }}
                placeholder={t('project.settings.reseted.filtersPlaceholder')}
                onSelect={(item: string) =>
                  setActiveFilter((oldItems: string[]) => {
                    if (_includes(oldItems, item)) {
                      return _filter(oldItems, (i) => i !== item)
                    }
                    return [...oldItems, item]
                  })
                }
                onRemove={(item: string) =>
                  setActiveFilter((oldItems: string[]) =>
                    _filter(oldItems, (i) => i !== item),
                  )
                }
              />
            ) : (
              <Text
                as='p'
                size='sm'
                className='mt-4 mb-4 text-gray-500 italic dark:text-gray-300'
              >
                {t('project.settings.reseted.noFilters')}
              </Text>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}

interface Form extends Partial<Omit<Project, 'brandKeywords'>> {
  origins: string | null
  ipBlacklist: string | null
  countryBlacklist: string[]
  websiteUrl?: string | null
  brandKeywords?: string
}

const DEFAULT_PROJECT_NAME = 'Untitled Project'

const PROJECT_TEXT_AUTOSAVE_TOASTS = {
  name: 'project.settings.autosave.name',
  origins: 'project.settings.autosave.origins',
  ipBlacklist: 'project.settings.autosave.ipBlacklist',
  websiteUrl: 'project.settings.autosave.websiteUrl',
  brandKeywords: 'project.settings.autosave.brandKeywords',
} as const

type ProjectTextAutosaveField = keyof typeof PROJECT_TEXT_AUTOSAVE_TOASTS

const isProjectTextAutosaveField = (
  field: string,
): field is ProjectTextAutosaveField =>
  Object.prototype.hasOwnProperty.call(PROJECT_TEXT_AUTOSAVE_TOASTS, field)

const getFormFromProject = (project: Project): Form => ({
  name: project.name || '',
  id: project.id,
  public: project.public || false,
  isPasswordProtected: project.isPasswordProtected || false,
  origins: _isString(project.origins)
    ? project.origins
    : _join(project.origins, ', '),
  ipBlacklist: _isString(project.ipBlacklist)
    ? project.ipBlacklist
    : _join(project.ipBlacklist, ', '),
  countryBlacklist: project.countryBlacklist || [],
  active: project.active !== false,
  botsProtectionLevel:
    (project.botsProtectionLevel as 'off' | 'basic' | 'strict') || 'basic',
  gscPropertyUri: project.gscPropertyUri || null,
  websiteUrl: project.websiteUrl || null,
  brandKeywords: project.brandKeywords?.join(', ') || '',
  captchaDifficulty: project.captchaDifficulty || 4,
  captchaDifficultyMode: project.captchaDifficultyMode || 'manual',
  sessionReplayRetentionDays: project.sessionReplayRetentionDays || 30,
})

const normaliseProjectAutosaveValue = (value: unknown) =>
  JSON.stringify(value ?? null)

const buildProjectAutosaveFormData = (updates: Partial<Form>) => {
  const formData = new FormData()
  formData.set('intent', 'update-project')

  Object.entries(updates).forEach(([field, value]) => {
    if (value === undefined) return

    if (field === 'countryBlacklist') {
      formData.set(field, JSON.stringify(value || []))
      return
    }

    if (
      field === 'active' ||
      field === 'public' ||
      field === 'isPasswordProtected'
    ) {
      formData.set(field, value ? 'true' : 'false')
      return
    }

    if (
      field === 'captchaDifficulty' ||
      field === 'sessionReplayRetentionDays'
    ) {
      formData.set(field, String(value))
      return
    }

    if (field === 'password') {
      if (value) formData.set(field, String(value))
      return
    }

    formData.set(field, value === null ? '' : String(value))
  })

  return formData
}

const ProjectSettings = () => {
  const { user } = useAuth()

  const { t } = useTranslation('common')
  const { id } = useRequiredParams<{ id: string }>()
  const navigate = useNavigate()
  const { project: initialProject, requestOrigin } = useLoaderData<{
    project: Project
    requestOrigin: string | null
  }>()
  const fetcher = useFetcher<ProjectSettingsActionData>()
  const autosaveFetcher = useFetcher<ProjectSettingsActionData>()
  const gscFetcher = useFetcher<ProjectSettingsActionData>()
  const { fetchFilters } = useFiltersProxy()

  const [project, setProject] = useState<Project>(initialProject)
  const [form, setForm] = useState<Form>(() =>
    getFormFromProject(initialProject),
  )
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    origins?: string
    ipBlacklist?: string
    password?: string
    websiteUrl?: string
    transferEmail?: string
    email?: string
    sessionReplayRetentionDays?: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferEmail, setTransferEmail] = useState('')
  const [dateRange, setDateRange] = useState<Date[]>([])
  const [tab, setTab] = useState(DELETE_DATA_MODAL_TABS[0].name)
  const [showProtected, setShowProtected] = useState(false)
  const lastSavedForm = useRef<Form>(getFormFromProject(initialProject))
  const lastHandledAutosaveData = useRef<ProjectSettingsActionData | null>(null)
  const shouldHandleFetcherData =
    useDeduplicateFetcherResponse<ProjectSettingsActionData>()
  const shouldHandleGscData =
    useDeduplicateFetcherResponse<ProjectSettingsActionData>()
  const activeAutosave = useRef<{
    updates: Partial<Form>
    toastKey: string
  } | null>(null)
  const pendingAutosave = useRef<{
    updates: Partial<Form>
    toastKey: string
  } | null>(null)
  const autosaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hadCaptchaSecretBeforeRegeneration = useRef(false)

  const [searchParams, setSearchParams] = useSearchParams()

  type SettingsTab =
    | 'general'
    | 'shields'
    | 'access'
    | 'captcha'
    | 'integrations'
    | 'alerts'
    | 'channels'
    | 'revenue'
    | 'sessionReplays'
    | 'emails'
    | 'people'
    | 'annotations'
    | 'import'
    | 'proxy'
    | 'danger'

  const tabs = useMemo<SettingsTabConfig<SettingsTab>[]>(
    () =>
      (
        [
          {
            id: 'general',
            label: t('project.settings.tabs.general'),
            description: t('project.settings.tabs.generalDesc'),
            icon: SlidersHorizontalIcon,
            iconColor: 'text-blue-500',
            visible: true,
          },
          {
            id: 'access',
            label: t('project.settings.tabs.access'),
            description: t('project.settings.tabs.accessDesc'),
            icon: LockIcon,
            iconColor: 'text-amber-500',
            visible: true,
          },
          {
            id: 'shields',
            label: t('project.settings.tabs.shields'),
            description: t('project.settings.tabs.shieldsDesc'),
            icon: ShieldIcon,
            iconColor: 'text-emerald-500',
            visible: true,
          },
          {
            id: 'captcha',
            label: t('project.settings.tabs.captcha'),
            description: t('project.settings.tabs.captchaDesc'),
            icon: ShieldCheckIcon,
            iconColor: 'text-teal-500',
            visible: true,
          },
          {
            id: 'integrations',
            label: t('project.settings.tabs.integrations'),
            description: t('project.settings.tabs.integrationsDesc'),
            icon: PuzzlePieceIcon,
            iconColor: 'text-purple-500',
            visible: true,
          },
          {
            id: 'alerts',
            label: t('project.settings.tabs.alerts'),
            description: t('project.settings.tabs.alertsDesc'),
            icon: BellRingingIcon,
            iconColor: 'text-cyan-500',
            visible: !isSelfhosted && project?.role === 'owner',
          },
          {
            id: 'channels',
            label: t('project.settings.tabs.channels'),
            description: t('project.settings.tabs.channelsDesc'),
            icon: BellRingingIcon,
            iconColor: 'text-pink-500',
            visible: !isSelfhosted && project?.role === 'owner',
          },
          {
            id: 'revenue',
            label: t('project.settings.tabs.revenue'),
            description: t('project.settings.tabs.revenueDesc'),
            icon: CurrencyDollarIcon,
            iconColor: 'text-green-500',
            visible: !isSelfhosted,
          },
          {
            id: 'sessionReplays',
            label: t('project.settings.tabs.sessionReplays'),
            description: t('project.settings.tabs.sessionReplaysDesc'),
            icon: VideoCameraIcon,
            iconColor: 'text-violet-500',
            visible: !isSelfhosted,
          },
          {
            id: 'emails',
            label: t('project.settings.tabs.emails'),
            description: t('project.settings.tabs.emailsDesc'),
            icon: EnvelopeIcon,
            iconColor: 'text-sky-500',
            visible: !isSelfhosted,
          },
          {
            id: 'people',
            label: t('project.settings.tabs.people'),
            description: t('project.settings.tabs.peopleDesc'),
            icon: UserCircleIcon,
            iconColor: 'text-indigo-500',
            visible: true,
          },
          {
            id: 'import',
            label: t('project.settings.tabs.import'),
            description: t('project.settings.tabs.importDesc'),
            icon: DownloadIcon,
            iconColor: 'text-cyan-500',
            visible: true,
          },
          {
            id: 'proxy',
            label: t('project.settings.tabs.proxy'),
            description: t('project.settings.tabs.proxyDesc'),
            icon: GlobeIcon,
            iconColor: 'text-fuchsia-500',
            visible: !isSelfhosted,
          },
          {
            id: 'annotations',
            label: t('project.settings.tabs.annotations'),
            description: t('project.settings.tabs.annotationsDesc'),
            icon: NoteIcon,
            iconColor: 'text-orange-500',
            visible: true,
          },
          {
            id: 'danger',
            label: t('project.settings.tabs.danger'),
            description: t('project.settings.tabs.dangerDesc'),
            icon: WarningOctagonIcon,
            iconColor: 'text-red-500',
            visible: project?.role === 'owner',
          },
        ] as const satisfies readonly SettingsTabConfig<SettingsTab>[]
      ).filter((tab) => tab.visible) as SettingsTabConfig<SettingsTab>[],
    [t, project?.role],
  )

  const sessionReplayMaxRetentionDays = useMemo(() => {
    const override = user?.entitlementOverrides?.sessionReplayRetentionDays
    if (typeof override === 'number') {
      return override
    }
    if (user?.effectivePlanType === 'enterprise') {
      return 1825
    }
    return 30
  }, [user?.effectivePlanType, user?.entitlementOverrides])

  const activeTab = useMemo<SettingsTab>(() => {
    const tab = searchParams.get('tab') as SettingsTab
    const allowed = new Set(tabs.map((t) => t.id as SettingsTab))
    return allowed.has(tab) ? tab : 'general'
  }, [searchParams, tabs])

  const setActiveTab = (tab: SettingsTab) => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.set('tab', tab)
    setSearchParams(newSearchParams)
  }

  const activeTabConfig = useMemo(
    () => tabs.find((tab) => tab.id === activeTab),
    [tabs, activeTab],
  )

  // Google Search Console integration state
  const [gscConnected, setGscConnected] = useState<boolean | null>(null)
  const [gscProperties, setGscProperties] = useState<
    { siteUrl: string; permissionLevel?: string }[]
  >([])
  const [gscEmail, setGscEmail] = useState<string | null>(null)
  const [gscAvailable, setGscAvailable] = useState<boolean>(true)

  // CAPTCHA state
  const [captchaSecretKey, setCaptchaSecretKey] = useState<string | null>(
    () => initialProject.captchaSecretKey || null,
  )
  const [captchaDifficulty, setCaptchaDifficulty] = useState<number>(
    () => initialProject.captchaDifficulty || 4,
  )
  const [captchaDifficultyMode, setCaptchaDifficultyMode] = useState<
    'manual' | 'auto'
  >(() => initialProject.captchaDifficultyMode || 'manual')
  const [showRegenerateSecret, setShowRegenerateSecret] = useState(false)
  const captchaDifficultyItems = useMemo(
    () => [
      {
        value: 'auto' as const,
        label: t('project.settings.captcha.difficultyLevels.auto'),
      },
      {
        value: 2,
        label: t('project.settings.captcha.difficultyLevels.veryEasy'),
      },
      {
        value: 3,
        label: t('project.settings.captcha.difficultyLevels.easy'),
      },
      {
        value: 4,
        label: t('project.settings.captcha.difficultyLevels.medium'),
      },
      {
        value: 5,
        label: t('project.settings.captcha.difficultyLevels.hard'),
      },
      {
        value: 6,
        label: t('project.settings.captcha.difficultyLevels.veryHard'),
      },
    ],
    [t],
  )
  const selectedCaptchaDifficultyItem = useMemo(() => {
    if (captchaDifficultyMode === 'auto') {
      return captchaDifficultyItems[0]
    }

    return (
      captchaDifficultyItems.find((item) => item.value === captchaDifficulty) ||
      captchaDifficultyItems[3]
    )
  }, [captchaDifficulty, captchaDifficultyItems, captchaDifficultyMode])

  // for reset data via filters
  const [activeFilter, setActiveFilter] = useState<string[]>([])
  const [filterType, setFilterType] = useState('')

  const botsProtectionLevels = useMemo(() => {
    return [
      {
        name: 'off',
        title: t('project.settings.botsProtectionLevel.levels.off.title'),
        description: t(
          'project.settings.botsProtectionLevel.levels.off.description',
        ),
      },
      {
        name: 'basic',
        title: t('project.settings.botsProtectionLevel.levels.basic.title'),
        description: t(
          'project.settings.botsProtectionLevel.levels.basic.description',
        ),
      },
      {
        name: 'strict',
        title: t('project.settings.botsProtectionLevel.levels.strict.title'),
        description: t(
          'project.settings.botsProtectionLevel.levels.strict.description',
        ),
      },
    ] as const
  }, [t])

  const organisations = useMemo(
    () => [
      {
        id: undefined,
        name: t('common.notSet'),
      },
      ...(user?.organisationMemberships || [])
        .filter(
          (om) => om.confirmed && (om.role === 'admin' || om.role === 'owner'),
        )
        .map((om) => om.organisation),
    ],
    [user?.organisationMemberships, t],
  )

  const assignOrganisation = async (organisationId?: string): Promise<void> => {
    const formData = new FormData()
    formData.set('intent', 'assign-organisation')
    if (organisationId) formData.set('organisationId', organisationId)
    fetcher.submit(formData, { method: 'post' })
  }

  const sharableLink = useMemo(() => {
    const origin =
      requestOrigin ??
      (isBrowser ? window.location.origin : 'https://swetrix.com')

    return `${origin}/projects/${id}`
  }, [requestOrigin, id])

  const [gscPropertiesPending, setGscPropertiesPending] = useState(false)
  const pendingGscPropertyUri = useRef<string | null>(null)
  const gscInitialized = useRef(false)

  // Handle GSC fetcher responses
  useEffect(() => {
    if (gscFetcher.state !== 'idle' || !gscFetcher.data) return
    if (!shouldHandleGscData(gscFetcher.data)) return

    const {
      intent,
      success,
      gscStatus,
      gscProperties: properties,
      gscAuthUrl,
      error: gscError,
    } = gscFetcher.data

    if (success) {
      if (intent === 'gsc-status' && gscStatus) {
        setGscConnected(gscStatus.connected)
        setGscEmail(gscStatus.email || null)
        setGscAvailable(gscStatus.available !== false)
        if (gscStatus.connected) {
          setGscPropertiesPending(true)
        } else {
          setGscProperties([])
        }
      } else if (intent === 'gsc-properties' && properties) {
        setGscProperties(properties)
        setGscPropertiesPending(false)
      } else if (intent === 'gsc-connect' && gscAuthUrl) {
        const safeUrl = (() => {
          try {
            const parsed = new URL(gscAuthUrl)
            if (parsed.protocol !== 'https:') return null
            if (parsed.username || parsed.password) return null
            if (parsed.hostname !== 'accounts.google.com') return null
            return parsed.toString()
          } catch {
            return null
          }
        })()

        if (!safeUrl) {
          toast.error(t('apiNotifications.somethingWentWrong'))
          return
        }

        window.location.href = safeUrl
      } else if (intent === 'gsc-disconnect') {
        setGscConnected(false)
        setGscProperties([])
        setGscEmail(null)
        pendingGscPropertyUri.current = null
        setForm((prevForm) => ({
          ...prevForm,
          gscPropertyUri: null,
        }))
        toast.success(t('project.settings.gsc.disconnected'))
      } else if (intent === 'gsc-set-property') {
        const propertyUri = pendingGscPropertyUri.current
        if (propertyUri) {
          setForm((prevForm) => ({
            ...prevForm,
            gscPropertyUri: propertyUri,
          }))
          pendingGscPropertyUri.current = null
        }
        toast.success(t('project.settings.gsc.propertyConnected'))
      }
    } else if (gscError) {
      toast.error(
        typeof gscError === 'string'
          ? gscError
          : t('apiNotifications.somethingWentWrong'),
      )
      setGscPropertiesPending(false)

      if (intent === 'gsc-status') {
        setGscConnected(false)
        setGscEmail(null)
        setGscProperties([])
      } else if (intent === 'gsc-set-property') {
        pendingGscPropertyUri.current = null
      }
    }
  }, [gscFetcher.state, gscFetcher.data, t, shouldHandleGscData])

  // Fetch GSC properties after status confirms connected
  useEffect(() => {
    if (gscPropertiesPending && gscFetcher.state === 'idle') {
      setGscPropertiesPending(false)
      gscFetcher.submit({ intent: 'gsc-properties' }, { method: 'post' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gscPropertiesPending, gscFetcher.state])

  // Initial GSC status fetch
  useEffect(() => {
    if (gscInitialized.current) return
    gscInitialized.current = true
    gscFetcher.submit({ intent: 'gsc-status' }, { method: 'post' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!fetcher.data) return
    if (!shouldHandleFetcherData(fetcher.data)) return

    if (fetcher.data?.success) {
      const { intent, project: updatedProject } = fetcher.data

      setErrors({})

      if (intent === 'update-project') {
        if (updatedProject) {
          setProject((prev) =>
            prev ? { ...prev, ...updatedProject } : updatedProject,
          )
          if (updatedProject.captchaDifficulty) {
            setCaptchaDifficulty(updatedProject.captchaDifficulty)
          }
          if (updatedProject.captchaDifficultyMode) {
            setCaptchaDifficultyMode(updatedProject.captchaDifficultyMode)
          }
        }
        setBeenSubmitted(false)
        toast.success(t('project.settings.autosave.updated'))
      } else if (intent === 'delete-project') {
        toast.success(t('project.settings.deleted'))
        navigate(routes.dashboard)
      } else if (
        intent === 'reset-project' ||
        intent === 'delete-partially' ||
        intent === 'reset-filters'
      ) {
        toast.success(t('project.settings.resetSuccess'))
        setShowReset(false)
      } else if (intent === 'transfer-project') {
        toast.success(t('apiNotifications.transferRequestSent'))
        setShowTransfer(false)
        setTransferEmail('')
      } else if (
        intent === 'regenerate-captcha-key' &&
        updatedProject?.captchaSecretKey
      ) {
        setCaptchaSecretKey(updatedProject.captchaSecretKey)
        toast.success(
          t(
            hadCaptchaSecretBeforeRegeneration.current
              ? 'project.settings.captcha.keyRegenerated'
              : 'project.settings.captcha.keyGenerated',
          ),
        )
      } else if (intent === 'assign-organisation') {
        toast.success(t('project.settings.autosave.organisation'))
      }

      setIsDeleting(false)
      setIsResetting(false)
    } else if (fetcher.data?.fieldErrors) {
      setErrors(fetcher.data.fieldErrors)
      setIsDeleting(false)
      setIsResetting(false)
    } else if (fetcher.data?.error) {
      toast.error(fetcher.data.error)
      setIsDeleting(false)
      setIsResetting(false)
    }
  }, [fetcher.data, t, navigate, shouldHandleFetcherData])

  const onDelete = () => {
    setShowDelete(false)

    if (fetcher.state === 'submitting') return

    setIsDeleting(true)
    const formData = new FormData()
    formData.set('intent', 'delete-project')
    fetcher.submit(formData, { method: 'post' })
  }

  const onReset = (
    resetTab: string,
    dateRange?: Date[],
    filterType?: string,
    filterValue?: string[],
  ) => {
    if (fetcher.state === 'submitting') return

    setIsResetting(true)
    const formData = new FormData()

    if (resetTab === 'all') {
      formData.set('intent', 'reset-project')
    } else if (resetTab === 'partially' && dateRange) {
      formData.set('intent', 'delete-partially')
      formData.set('from', dateRange[0]?.toISOString() || '')
      formData.set('to', dateRange[1]?.toISOString() || '')
    } else if (
      resetTab === 'viaFilters' &&
      filterType &&
      filterValue &&
      filterValue.length > 0
    ) {
      formData.set('intent', 'reset-filters')
      formData.set('type', filterType)
      formData.set('value', JSON.stringify(filterValue))
    }

    fetcher.submit(formData, { method: 'post' })
  }

  const onTransfer = () => {
    if (fetcher.state === 'submitting') return

    const formData = new FormData()
    formData.set('intent', 'transfer-project')
    formData.set('email', transferEmail)
    fetcher.submit(formData, { method: 'post' })
  }

  const onRegenerateCaptchaKey = () => {
    if (fetcher.state === 'submitting') return

    hadCaptchaSecretBeforeRegeneration.current = Boolean(captchaSecretKey)
    const formData = new FormData()
    formData.set('intent', 'regenerate-captcha-key')
    fetcher.submit(formData, { method: 'post' })
  }

  const handleReset = () => {
    if (fetcher.state === 'submitting') return

    if (tab === DELETE_DATA_MODAL_TABS[1].name) {
      if (_isEmpty(dateRange) || !dateRange[0] || !dateRange[1]) {
        toast.error(t('project.settings.noDateRange'))
        return
      }
      setShowReset(false)
      onReset('partially', dateRange)
    } else if (tab === DELETE_DATA_MODAL_TABS[2].name) {
      if (_isEmpty(activeFilter) || _isEmpty(filterType)) {
        toast.error(t('project.settings.noFilters'))
        return
      }
      setShowReset(false)
      onReset('viaFilters', undefined, filterType, activeFilter)
    } else if (tab === DELETE_DATA_MODAL_TABS[0].name) {
      setShowReset(false)
      onReset('all')
    }
  }

  const getValidationErrors = useCallback(
    (data: Form) => {
      const allErrors: {
        name?: string
        origins?: string
        ipBlacklist?: string
        password?: string
        websiteUrl?: string
      } = {}

      if (_isEmpty(data.name)) {
        allErrors.name = t('project.settings.noNameError')
      }

      if (_size(data.name) > MAX_NAME_LENGTH) {
        allErrors.name = t('project.settings.pxCharsError', {
          amount: MAX_NAME_LENGTH,
        })
      }

      if (_size(data.origins) > MAX_ORIGINS_LENGTH) {
        allErrors.origins = t('project.settings.oxCharsError', {
          amount: MAX_ORIGINS_LENGTH,
        })
      }

      if (_size(data.ipBlacklist) > MAX_IPBLACKLIST_LENGTH) {
        allErrors.ipBlacklist = t('project.settings.oxCharsError', {
          amount: MAX_IPBLACKLIST_LENGTH,
        })
      }

      if (data.websiteUrl?.trim() && !isValidHttpUrl(data.websiteUrl)) {
        allErrors.websiteUrl = t('project.settings.invalidUrl')
      }

      return allErrors
    },
    [t],
  )

  const hasProjectAutosaveChange = useCallback((updates: Partial<Form>) => {
    return Object.entries(updates).some(([field, value]) => {
      if (field === 'password') return Boolean(value)

      return (
        normaliseProjectAutosaveValue(
          lastSavedForm.current[field as keyof Form],
        ) !== normaliseProjectAutosaveValue(value)
      )
    })
  }, [])

  const flushProjectAutosave = useCallback(() => {
    if (autosaveTimeout.current) {
      clearTimeout(autosaveTimeout.current)
      autosaveTimeout.current = null
    }

    const autosave = pendingAutosave.current
    if (autosaveFetcher.state !== 'idle' || !autosave) return

    activeAutosave.current = autosave
    pendingAutosave.current = null

    autosaveFetcher.submit(buildProjectAutosaveFormData(autosave.updates), {
      method: 'post',
    })
  }, [autosaveFetcher])

  const queueProjectAutosave = useCallback(
    (
      updates: Partial<Form>,
      toastKey = 'project.settings.autosave.updated',
      immediate = false,
    ) => {
      const nextForm = { ...form, ...updates }
      const allErrors = getValidationErrors(nextForm)
      const hasUpdatedFieldError = Object.keys(updates).some(
        (field) => allErrors[field as keyof typeof allErrors],
      )

      setErrors(allErrors)

      if (hasUpdatedFieldError) {
        setBeenSubmitted(true)
        return
      }

      if (!hasProjectAutosaveChange(updates)) return

      pendingAutosave.current = {
        updates: {
          ...pendingAutosave.current?.updates,
          ...updates,
        },
        toastKey,
      }

      if (autosaveTimeout.current) {
        clearTimeout(autosaveTimeout.current)
        autosaveTimeout.current = null
      }

      if (immediate) {
        flushProjectAutosave()
        return
      }

      autosaveTimeout.current = setTimeout(
        flushProjectAutosave,
        AUTOSAVE_DEBOUNCE_MS,
      )
    },
    [flushProjectAutosave, form, getValidationErrors, hasProjectAutosaveChange],
  )

  const validate = () => {
    const allErrors = getValidationErrors(form)
    const valid = _isEmpty(_keys(allErrors))

    setErrors(allErrors)
    setValidated(valid)
  }

  useEffect(() => {
    validate()
  }, [form, getValidationErrors]) // eslint-disable-line

  useEffect(() => {
    return () => {
      if (autosaveTimeout.current) {
        clearTimeout(autosaveTimeout.current)
      }
    }
  }, [])

  useEffect(() => {
    if (
      autosaveFetcher.state === 'idle' &&
      pendingAutosave.current &&
      lastHandledAutosaveData.current === autosaveFetcher.data
    ) {
      flushProjectAutosave()
    }
  }, [autosaveFetcher.data, autosaveFetcher.state, flushProjectAutosave])

  useEffect(() => {
    if (autosaveFetcher.state !== 'idle' || !autosaveFetcher.data) return
    if (lastHandledAutosaveData.current === autosaveFetcher.data) return
    lastHandledAutosaveData.current = autosaveFetcher.data

    if (autosaveFetcher.data.success) {
      const { project: updatedProject } = autosaveFetcher.data
      const autosave = activeAutosave.current

      if (updatedProject) {
        setProject((prev) =>
          prev ? { ...prev, ...updatedProject } : updatedProject,
        )
      }

      if (autosave) {
        const savedUpdates = { ...autosave.updates }
        delete savedUpdates.password
        lastSavedForm.current = {
          ...lastSavedForm.current,
          ...savedUpdates,
        }
        toast.success(t(autosave.toastKey))
      }

      activeAutosave.current = null
      if (pendingAutosave.current) {
        flushProjectAutosave()
      }
      return
    }

    activeAutosave.current = null

    if (autosaveFetcher.data.fieldErrors) {
      setErrors(autosaveFetcher.data.fieldErrors)
      setBeenSubmitted(true)
    } else if (autosaveFetcher.data.error) {
      toast.error(autosaveFetcher.data.error)
    }
    if (pendingAutosave.current) {
      flushProjectAutosave()
    }
  }, [autosaveFetcher.data, autosaveFetcher.state, flushProjectAutosave, t])

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event
    const value = target.type === 'checkbox' ? target.checked : target.value

    setForm((oldForm) => ({
      ...oldForm,
      [target.name]: value,
    }))

    if (isProjectTextAutosaveField(target.name)) {
      queueProjectAutosave(
        { [target.name]: value } as Partial<Form>,
        PROJECT_TEXT_AUTOSAVE_TOASTS[target.name],
      )
    }
  }

  const handleInputBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = event.currentTarget

    if (!isProjectTextAutosaveField(name)) return

    queueProjectAutosave(
      { [name]: value } as Partial<Form>,
      PROJECT_TEXT_AUTOSAVE_TOASTS[name],
      true,
    )
  }

  const handleFieldAutosave = (
    updates: Partial<Form>,
    toastKey: string,
    immediate = true,
  ) => {
    setForm((oldForm) => ({
      ...oldForm,
      ...updates,
    }))
    queueProjectAutosave(updates, toastKey, immediate)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setBeenSubmitted(true)

    if (validated) {
      flushProjectAutosave()
    }
  }

  const onProtected = () => {
    setBeenSubmitted(true)

    if (validated) {
      setForm((oldForm) => ({
        ...oldForm,
        isPasswordProtected: true,
        password: undefined,
      }))
      queueProjectAutosave(
        { isPasswordProtected: true, password: form.password },
        'project.settings.autosave.passwordProtection',
        true,
      )

      setShowProtected(false)
    }
  }

  const title = `${t('project.settings.settings')} ${form.name}`

  const currentTabLabel = useMemo(() => {
    return (tabs.find((t) => t.id === activeTab)?.label as string) || ''
  }, [tabs, activeTab])

  return (
    <div className='flex min-h-min-footer flex-col bg-gray-50 pb-40 dark:bg-slate-950'>
      <div className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
        <Link
          to={_replace(routes.project, ':id', id)}
          className='flex max-w-max items-center text-sm text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-100'
        >
          <CaretLeftIcon className='mr-1 size-3' />
          {t('project.backToStats')}
        </Link>
        <Text
          as='h2'
          size='3xl'
          weight='bold'
          tracking='tight'
          className='mt-1'
        >
          {title}
        </Text>

        <hr className='mt-5 border-gray-200 dark:border-slate-700/80' />

        <div className='mt-6 flex flex-col gap-6 md:flex-row'>
          <div className='md:hidden'>
            <Select
              id='project-settings-tab-select'
              title={currentTabLabel}
              items={tabs}
              keyExtractor={(item) => item.id}
              labelExtractor={(item) => item.label}
              iconExtractor={(item) => {
                const Icon = item.icon
                return <Icon className='h-4 w-4' />
              }}
              onSelect={(item: any) =>
                setActiveTab(item.id as typeof activeTab)
              }
              selectedItem={tabs.find((tab) => tab.id === activeTab)}
            />
          </div>

          <aside className='hidden w-56 shrink-0 md:block'>
            <SettingsSidebar
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={(tabId) => setActiveTab(tabId)}
            />
          </aside>

          <section className='flex-1'>
            {['general', 'shields', 'access'].includes(activeTab) &&
            activeTabConfig ? (
              <form onSubmit={handleSubmit}>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />
                {activeTab === 'general' ? (
                  <General
                    form={form}
                    errors={errors}
                    beenSubmitted={beenSubmitted}
                    handleInput={handleInput}
                    handleBlur={handleInputBlur}
                  />
                ) : null}

                {activeTab === 'shields' ? (
                  <Shields
                    form={form}
                    errors={errors}
                    beenSubmitted={beenSubmitted}
                    handleInput={handleInput}
                    handleBlur={handleInputBlur}
                    botsProtectionLevels={botsProtectionLevels}
                    setBotsLevel={(name) =>
                      handleFieldAutosave(
                        { botsProtectionLevel: name as any },
                        'project.settings.autosave.botsProtectionLevel',
                      )
                    }
                    countryBlacklist={form.countryBlacklist || []}
                    setCountryBlacklist={(countries) =>
                      handleFieldAutosave(
                        { countryBlacklist: countries },
                        'project.settings.autosave.countryBlacklist',
                      )
                    }
                  />
                ) : null}

                {activeTab === 'access' ? (
                  <AccessSettings
                    form={form}
                    setForm={setForm as any}
                    organisations={organisations}
                    onAssignOrganisation={assignOrganisation}
                    openPasswordModal={() => setShowProtected(true)}
                    handleInput={handleInput}
                    onPublicChange={(checked) =>
                      handleFieldAutosave(
                        { public: checked },
                        'project.settings.autosave.public',
                      )
                    }
                    onPasswordProtectionChange={(checked) =>
                      handleFieldAutosave(
                        { isPasswordProtected: checked },
                        'project.settings.autosave.passwordProtection',
                      )
                    }
                    sharableLink={sharableLink}
                  />
                ) : null}
              </form>
            ) : null}

            {activeTab === 'shields' ? (
              <div className='mt-8'>
                <Text as='h3' size='lg' weight='bold'>
                  {t('project.settings.blockedTraffic')}
                </Text>
                <Text as='p' size='sm' colour='secondary' className='mt-1'>
                  {t('project.settings.blockedTrafficHint')}
                </Text>
                <div className='mt-2'>
                  <BotProtectionReport pid={id} />
                </div>
              </div>
            ) : null}

            {activeTab === 'emails' && !isSelfhosted && activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />
                <Emails projectId={id} />
              </>
            ) : null}
            {activeTab === 'people' && activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />
                <People project={project} />
              </>
            ) : null}
            {activeTab === 'annotations' && activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />
                <Annotations
                  projectId={id}
                  allowedToManage={
                    project?.role === 'owner' || project?.role === 'admin'
                  }
                />
              </>
            ) : null}
            {activeTab === 'import' && activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />
                <DataImportTab projectId={id} />
              </>
            ) : null}
            {activeTab === 'proxy' && activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />
                <ProxyDomainsTab projectId={id} />
              </>
            ) : null}
            {activeTab === 'sessionReplays' && activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />
                <SessionReplays
                  retentionDays={form.sessionReplayRetentionDays || 30}
                  maxRetentionDays={sessionReplayMaxRetentionDays}
                  onRetentionChange={(days) =>
                    handleFieldAutosave(
                      { sessionReplayRetentionDays: days },
                      'project.settings.autosave.sessionReplayRetention',
                    )
                  }
                />
              </>
            ) : null}

            {activeTab === 'integrations' && activeTabConfig ? (
              <div>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />
                <Text
                  as='h3'
                  size='lg'
                  weight='medium'
                  className='mb-2 flex items-center gap-2'
                >
                  <GoogleSearchConsoleSVG className='size-6' />
                  Google Search Console
                </Text>
                {gscConnected === null ? (
                  <Loader />
                ) : !gscAvailable ? (
                  <div className='rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100'>
                    <Trans
                      t={t}
                      i18nKey='project.settings.gsc.notConfigured'
                      defaults='Google Search Console is not configured on this server. To enable it, set <code>GOOGLE_GSC_CLIENT_ID</code>, <code>GOOGLE_GSC_CLIENT_SECRET</code> and <code>BASE_URL</code> in your API container environment, then restart it. <url>See the self-hosting guide</url>.'
                      components={{
                        code: (
                          <code className='rounded bg-amber-100 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/60' />
                        ),
                        url: (
                          <a
                            href='https://docs.swetrix.com/selfhosting/google-search-console'
                            aria-label={t(
                              'ariaLabels.openGoogleSearchConsoleSelfHostingGuide',
                            )}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='font-medium underline decoration-dashed hover:decoration-solid'
                          />
                        ),
                      }}
                    />
                  </div>
                ) : !gscConnected ? (
                  <div className='flex flex-col items-center justify-between gap-4 md:flex-row'>
                    <Text
                      as='p'
                      size='sm'
                      className='text-gray-800 dark:text-gray-200'
                    >
                      {t('project.settings.gsc.connect')}
                    </Text>
                    <Button
                      className='flex items-center gap-2'
                      type='button'
                      onClick={() => {
                        gscFetcher.submit(
                          { intent: 'gsc-connect' },
                          { method: 'post' },
                        )
                      }}
                      loading={
                        gscFetcher.state !== 'idle'
                          ? gscFetcher.formData?.get('intent') === 'gsc-connect'
                          : undefined
                      }
                    >
                      <GoogleGSVG className='size-4' />
                      {t('common.connect')}
                    </Button>
                  </div>
                ) : (
                  <div className='flex flex-col gap-3'>
                    <Input
                      className='lg:w-1/2'
                      label={t('project.settings.gsc.linkedGoogleAccount')}
                      value={gscEmail || ''}
                      disabled
                    />

                    <Button
                      variant='danger-outline'
                      type='button'
                      className='max-w-max'
                      onClick={() => {
                        gscFetcher.submit(
                          { intent: 'gsc-disconnect' },
                          { method: 'post' },
                        )
                      }}
                      loading={
                        gscFetcher.state !== 'idle'
                          ? gscFetcher.formData?.get('intent') ===
                            'gsc-disconnect'
                          : undefined
                      }
                    >
                      {t('common.disconnect')}
                    </Button>

                    <Select
                      fieldLabelClassName='mt-4 max-w-max'
                      className='lg:w-1/2'
                      hintClassName='lg:w-2/3'
                      label={t('project.settings.gsc.websiteProperty')}
                      hint={t('project.settings.gsc.websitePropertyHint')}
                      items={_map(gscProperties, (p) => ({
                        key: p.siteUrl,
                        label: p.siteUrl,
                      }))}
                      keyExtractor={(item) => item.key}
                      labelExtractor={(item) => item.label}
                      onSelect={(item: { key: string; label: string }) => {
                        pendingGscPropertyUri.current = item.key
                        gscFetcher.submit(
                          {
                            intent: 'gsc-set-property',
                            propertyUri: item.key,
                          },
                          { method: 'post' },
                        )
                      }}
                      title={
                        form.gscPropertyUri ||
                        t('project.settings.gsc.selectProperty')
                      }
                      selectedItem={
                        form.gscPropertyUri
                          ? {
                              key: form.gscPropertyUri,
                              label: form.gscPropertyUri,
                            }
                          : undefined
                      }
                    />
                  </div>
                )}

                {gscConnected || !gscAvailable ? null : (
                  <>
                    <hr className='-mx-4 mt-4 mb-4 border-gray-200 dark:border-slate-800' />

                    <Text
                      as='p'
                      size='sm'
                      className='text-gray-800 dark:text-gray-200'
                    >
                      <Trans
                        t={t}
                        i18nKey='project.settings.gsc.connectDisclaimer'
                        components={{
                          url: (
                            <a
                              href='https://search.google.com/search-console/about'
                              aria-label={t(
                                'ariaLabels.openGoogleSearchConsole',
                              )}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='font-medium underline decoration-dashed hover:decoration-solid'
                            />
                          ),
                        }}
                      />
                    </Text>
                  </>
                )}
              </div>
            ) : null}

            {activeTab === 'alerts' && activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />
                <ProjectAlerts
                  projectId={id}
                  projectName={project?.name}
                  projectRole={project?.role}
                />
              </>
            ) : null}

            {activeTab === 'channels' && activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />
                <NotificationChannels
                  scope='project'
                  projectId={id}
                  allowedTypes={[
                    'email',
                    'telegram',
                    'discord',
                    'slack',
                    'webhook',
                    'webpush',
                  ]}
                />
              </>
            ) : null}

            {activeTab === 'captcha' && activeTabConfig ? (
              <div>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />
                {captchaSecretKey ? (
                  <>
                    <Input
                      label={t('project.settings.captcha.secretKey')}
                      hint={
                        <Trans
                          t={t}
                          i18nKey='project.settings.captcha.keyHint'
                          components={{
                            url: (
                              <a
                                href='https://swetrix.com/docs/captcha/server-side-validation'
                                aria-label={t(
                                  'ariaLabels.openCaptchaServerValidationGuide',
                                )}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='font-medium underline decoration-dashed hover:decoration-solid'
                              />
                            ),
                          }}
                        />
                      }
                      name='captchaSecretKey'
                      type='password'
                      className='mt-4 lg:w-1/2'
                      value={captchaSecretKey}
                      readOnly
                    />
                    <div className='mt-4 flex gap-2'>
                      <Button
                        variant='danger'
                        type='button'
                        onClick={() => setShowRegenerateSecret(true)}
                      >
                        {t('project.settings.captcha.regenerateKey')}
                      </Button>
                    </div>

                    <div className='mt-6'>
                      <Select
                        label={t('project.settings.captcha.difficulty')}
                        hint={
                          captchaDifficultyMode === 'auto'
                            ? t('project.settings.captcha.difficultyAutoHint')
                            : t('project.settings.captcha.difficultyHint')
                        }
                        className='lg:w-1/2'
                        hintClassName='lg:w-1/2'
                        items={captchaDifficultyItems}
                        keyExtractor={(item) => String(item.value)}
                        labelExtractor={(item) => item.label}
                        selectedItem={selectedCaptchaDifficultyItem}
                        onSelect={(item: {
                          value: number | 'auto'
                          label: string
                        }) => {
                          if (item.value === 'auto') {
                            setCaptchaDifficultyMode('auto')
                            handleFieldAutosave(
                              { captchaDifficultyMode: 'auto' },
                              'project.settings.autosave.captchaDifficulty',
                            )
                            return
                          }

                          setCaptchaDifficultyMode('manual')
                          setCaptchaDifficulty(item.value)
                          handleFieldAutosave(
                            {
                              captchaDifficulty: item.value,
                              captchaDifficultyMode: 'manual',
                            },
                            'project.settings.autosave.captchaDifficulty',
                          )
                        }}
                        title={selectedCaptchaDifficultyItem.label}
                      />
                    </div>
                  </>
                ) : (
                  <div className='mt-4 max-w-2xl'>
                    <Text
                      as='p'
                      size='sm'
                      colour='secondary'
                      className='leading-6'
                    >
                      {t('project.settings.captcha.emptyDescription')}
                    </Text>
                    <Text
                      as='p'
                      size='sm'
                      colour='secondary'
                      className='mt-2 leading-6'
                    >
                      {t('project.settings.captcha.noKeyGenerated')}
                    </Text>
                    <div className='mt-4 flex flex-wrap items-center gap-3'>
                      <Button type='button' onClick={onRegenerateCaptchaKey}>
                        {t('project.settings.captcha.generateKey')}
                      </Button>
                      <a
                        href={CAPTCHA_CLIENT_DOCS_URL}
                        aria-label={t('ariaLabels.openCaptchaDocumentation')}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-sm font-medium text-gray-700 underline decoration-dashed hover:text-gray-900 hover:decoration-solid dark:text-gray-200 dark:hover:text-white'
                      >
                        {t('project.settings.captcha.readSetupDocs')}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === 'revenue' && activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />
                <Revenue projectId={id} />
              </>
            ) : null}

            {activeTab === 'danger' && activeTabConfig ? (
              <form onSubmit={handleSubmit}>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />
                <DangerZone
                  isActive={Boolean(form.active)}
                  onToggleActive={(active) =>
                    handleFieldAutosave(
                      { active },
                      'project.settings.autosave.status',
                    )
                  }
                  setShowTransfer={setShowTransfer}
                  setShowReset={setShowReset}
                  setShowDelete={setShowDelete}
                  isDeleting={isDeleting}
                  setResetting={isResetting}
                />
              </form>
            ) : null}
          </section>
        </div>
      </div>
      <Modal
        onClose={() => setShowDelete(false)}
        onSubmit={onDelete}
        submitText={t('project.settings.delete')}
        closeText={t('common.close')}
        title={t('project.settings.qDelete')}
        message={t('project.settings.deleteHint')}
        submitType='danger'
        type='error'
        isOpened={showDelete}
      />
      <Modal
        onClose={() => setShowReset(false)}
        onSubmit={handleReset}
        size='large'
        submitText={t('project.settings.reset')}
        closeText={t('common.close')}
        title={t('project.settings.qReset')}
        message={
          <ModalMessage
            setDateRange={setDateRange}
            dateRange={dateRange}
            setTab={setTab}
            tab={tab}
            pid={id}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            filterType={filterType}
            setFilterType={setFilterType}
            fetchFilters={fetchFilters}
          />
        }
        submitType='danger'
        type='error'
        isOpened={showReset}
      />
      <Modal
        onClose={() => {
          setShowProtected(false)
          setForm((prev) => ({
            ...prev,
            password: undefined,
          }))
        }}
        onSubmit={onProtected}
        submitText={t('common.save')}
        closeText={t('common.cancel')}
        title={t('project.settings.protected')}
        message={
          <div>
            <Text
              as='p'
              size='sm'
              className='mt-1 mb-4 text-gray-500 dark:text-gray-300'
            >
              {t('project.settings.protectedHint')}
            </Text>
            <Input
              name='password'
              type='password'
              label={t('project.settings.password')}
              value={form?.password || ''}
              className='mt-4 px-4 sm:px-0'
              onChange={handleInput}
              error={beenSubmitted ? errors.password : null}
            />
          </div>
        }
        isOpened={showProtected}
      />
      <Modal
        onClose={() => {
          setShowTransfer(false)
        }}
        submitText={t('project.settings.transfer')}
        closeText={t('common.cancel')}
        message={
          <div>
            <Text as='h2' size='xl' weight='bold' colour='secondary'>
              {t('project.settings.transferTo')}
            </Text>
            <Text as='p' colour='secondary' className='mt-2'>
              {t('project.settings.transferHint', {
                name: form.name || DEFAULT_PROJECT_NAME,
              })}
            </Text>
            <Input
              name='email'
              type='email'
              label={t('project.settings.transfereeEmail')}
              value={transferEmail}
              placeholder='you@example.com'
              className='mt-4'
              onChange={(e) => setTransferEmail(e.target.value)}
            />
          </div>
        }
        isOpened={showTransfer}
        onSubmit={onTransfer}
      />
      <Modal
        onClose={() => setShowRegenerateSecret(false)}
        onSubmit={() => {
          setShowRegenerateSecret(false)
          onRegenerateCaptchaKey()
        }}
        submitText={t('project.settings.captcha.regenerateKey')}
        closeText={t('common.cancel')}
        title={t('project.settings.captcha.regenerateKeyTitle')}
        message={t('project.settings.captcha.regenerateKeyWarning')}
        submitType='danger'
        type='error'
        isOpened={showRegenerateSecret}
      />
    </div>
  )
}

export default ProjectSettings
