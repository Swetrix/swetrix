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
} from '@phosphor-icons/react'
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  useLoaderData,
  useNavigate,
  Link,
  useSearchParams,
  useFetcher,
} from 'react-router'
import { toast } from 'sonner'

import { useFiltersProxy } from '~/hooks/useAnalyticsProxy'
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
// Select is used inside tab components
import countries from '~/utils/isoCountries'
import routes from '~/utils/routes'

import CCRow from '../View/components/CCRow'

import Annotations from './Annotations'
import Emails from './Emails'
import People from './People'
import AccessSettings from './tabs/AccessSettings'
import DangerZone from './tabs/DangerZone'
import General from './tabs/General'
import Revenue from './tabs/Revenue'
import Shields from './tabs/Shields'

const MAX_NAME_LENGTH = 50
const MAX_ORIGINS_LENGTH = 300
const MAX_IPBLACKLIST_LENGTH = 300

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
      <p className='mt-1 mb-4 text-sm text-gray-500 italic dark:text-gray-300'>
        {t('project.settings.resetHint')}
      </p>
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
          <p className='mt-4 mb-2 text-sm text-gray-500 dark:text-gray-300'>
            {t('project.settings.reseted.partiallyDesc')}
          </p>
          <p className='mt-1 mb-2 text-sm text-gray-500 italic dark:text-gray-300'>
            {t('project.settings.reseted.partiallyHint')}
          </p>
          <input
            type='text'
            className='m-0 h-0 w-0 border-0 p-0 focus:border-transparent focus:text-transparent focus:shadow-none focus:ring-transparent'
          />
          <DatePicker
            className='!mx-0 w-0'
            onChange={(date) => setDateRange(date)}
            options={{
              altInputClass:
                ' focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:text-gray-50 dark:placeholder-gray-400 dark:border-gray-800 dark:bg-slate-800 rounded-md',
            }}
            value={dateRange}
          />
        </>
      ) : null}
      {tab === DELETE_DATA_MODAL_TABS[0].name ? (
        <p className='mt-4 mb-4 text-sm text-gray-500 italic dark:text-gray-300'>
          {t('project.settings.reseted.allHint')}
        </p>
      ) : null}
      {tab === DELETE_DATA_MODAL_TABS[2].name ? (
        <div className='min-h-[410px]'>
          <p className='mt-4 mb-4 text-sm text-gray-500 italic dark:text-gray-300'>
            {t('project.settings.reseted.viaFiltersHint')}
          </p>
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
              <p className='mt-4 mb-4 text-sm text-gray-500 italic dark:text-gray-300'>
                {t('project.settings.reseted.noFilters')}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}

interface Form extends Partial<Project> {
  origins: string | null
  ipBlacklist: string | null
  countryBlacklist: string[]
  websiteUrl?: string | null
}

const DEFAULT_PROJECT_NAME = 'Untitled Project'

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
  const gscFetcher = useFetcher<ProjectSettingsActionData>()
  const { fetchFilters } = useFiltersProxy()

  const [project, setProject] = useState<Project>(initialProject)
  const [form, setForm] = useState<Form>(() => ({
    name: initialProject.name || '',
    id: initialProject.id,
    public: initialProject.public || false,
    isPasswordProtected: initialProject.isPasswordProtected || false,
    origins: _isString(initialProject.origins)
      ? initialProject.origins
      : _join(initialProject.origins, ', '),
    ipBlacklist: _isString(initialProject.ipBlacklist)
      ? initialProject.ipBlacklist
      : _join(initialProject.ipBlacklist, ', '),
    countryBlacklist: initialProject.countryBlacklist || [],
    botsProtectionLevel:
      (initialProject.botsProtectionLevel as 'off' | 'basic') || 'basic',
    gscPropertyUri: initialProject.gscPropertyUri || null,
    websiteUrl: initialProject.websiteUrl || null,
  }))
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    origins?: string
    ipBlacklist?: string
    password?: string
    websiteUrl?: string
    transferEmail?: string
    email?: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferEmail, setTransferEmail] = useState('')
  const [dateRange, setDateRange] = useState<Date[]>([])
  const [tab, setTab] = useState(DELETE_DATA_MODAL_TABS[0].name)
  const [showProtected, setShowProtected] = useState(false)

  const [searchParams, setSearchParams] = useSearchParams()

  type SettingsTab =
    | 'general'
    | 'shields'
    | 'access'
    | 'captcha'
    | 'integrations'
    | 'revenue'
    | 'emails'
    | 'people'
    | 'annotations'
    | 'danger'

  const tabs = useMemo(
    () =>
      [
        {
          id: 'general',
          label: t('project.settings.tabs.general'),
          icon: SlidersHorizontalIcon,
          visible: true,
        },
        {
          id: 'access',
          label: t('project.settings.tabs.access'),
          icon: LockIcon,
          visible: true,
        },
        {
          id: 'shields',
          label: t('project.settings.tabs.shields'),
          icon: ShieldIcon,
          visible: true,
        },
        {
          id: 'captcha',
          label: t('project.settings.tabs.captcha'),
          icon: ShieldCheckIcon,
          visible: true,
        },
        {
          id: 'integrations',
          label: t('project.settings.tabs.integrations'),
          icon: PuzzlePieceIcon,
          visible: !isSelfhosted,
        },
        {
          id: 'revenue',
          label: t('project.settings.tabs.revenue'),
          icon: CurrencyDollarIcon,
          visible: !isSelfhosted,
        },
        {
          id: 'emails',
          label: t('project.settings.tabs.emails'),
          icon: EnvelopeIcon,
          visible: !isSelfhosted,
        },
        {
          id: 'people',
          label: t('project.settings.tabs.people'),
          icon: UserCircleIcon,
          visible: true,
        },
        {
          id: 'annotations',
          label: t('project.settings.tabs.annotations'),
          icon: NoteIcon,
          visible: true,
        },
        {
          id: 'danger',
          label: t('project.settings.tabs.danger'),
          icon: WarningOctagonIcon,
          visible: project?.role === 'owner',
        },
      ].filter((tab) => tab.visible),
    [t, project?.role],
  )

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

  // Google Search Console integration state
  const [gscConnected, setGscConnected] = useState<boolean | null>(null)
  const [gscProperties, setGscProperties] = useState<
    { siteUrl: string; permissionLevel?: string }[]
  >([])
  const [gscEmail, setGscEmail] = useState<string | null>(null)

  // CAPTCHA state
  const [captchaSecretKey, setCaptchaSecretKey] = useState<string | null>(
    () => initialProject.captchaSecretKey || null,
  )
  const [captchaDifficulty, setCaptchaDifficulty] = useState<number>(4)
  const [showRegenerateSecret, setShowRegenerateSecret] = useState(false)

  // for reset data via filters
  const [activeFilter, setActiveFilter] = useState<string[]>([])
  const [filterType, setFilterType] = useState('')

  const botsProtectionLevels = useMemo(() => {
    return [
      {
        name: 'off',
        title: t('project.settings.botsProtectionLevel.levels.off'),
      },
      {
        name: 'basic',
        title: t('project.settings.botsProtectionLevel.levels.basic'),
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
  const lastHandledGscData = useRef<ProjectSettingsActionData | null>(null)
  const gscInitialized = useRef(false)

  // Handle GSC fetcher responses
  useEffect(() => {
    if (gscFetcher.state !== 'idle' || !gscFetcher.data) return

    // Prevent handling the same response twice
    if (lastHandledGscData.current === gscFetcher.data) return
    lastHandledGscData.current = gscFetcher.data

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
        setForm((prevForm) => ({
          ...prevForm,
          gscPropertyUri: null,
        }))
        toast.success(t('project.settings.gsc.disconnected'))
      } else if (intent === 'gsc-set-property') {
        toast.success(t('project.settings.gsc.propertyConnected'))
      }
    } else if (gscError) {
      toast.error(
        typeof gscError === 'string'
          ? gscError
          : t('apiNotifications.somethingWentWrong'),
      )
      setGscPropertiesPending(false)
    }
  }, [gscFetcher.state, gscFetcher.data, t])

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
    if (isSelfhosted || gscInitialized.current) return
    gscInitialized.current = true
    gscFetcher.submit({ intent: 'gsc-status' }, { method: 'post' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle fetcher responses
  useEffect(() => {
    if (fetcher.data?.success) {
      const { intent, project: updatedProject } = fetcher.data

      setErrors({})

      if (intent === 'update-project') {
        if (updatedProject) {
          // Merge with existing project to preserve fields like 'role' that aren't returned from update
          setProject((prev) =>
            prev ? { ...prev, ...updatedProject } : updatedProject,
          )
        }
        setBeenSubmitted(false)
        toast.success(t('project.settings.updated'))
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
        toast.success(t('project.settings.updated'))
      } else if (intent === 'assign-organisation') {
        toast.success(t('apiNotifications.projectAssigned'))
      }

      setIsSaving(false)
      setIsDeleting(false)
      setIsResetting(false)
    } else if (fetcher.data?.fieldErrors) {
      setErrors(fetcher.data.fieldErrors)
      setIsSaving(false)
      setIsDeleting(false)
      setIsResetting(false)
    } else if (fetcher.data?.error) {
      toast.error(fetcher.data.error)
      setIsSaving(false)
      setIsDeleting(false)
      setIsResetting(false)
    }
  }, [fetcher.data, t, navigate])

  const onSubmit = (data: Form) => {
    if (fetcher.state === 'submitting') return

    setIsSaving(true)
    const formData = new FormData()
    formData.set('intent', 'update-project')
    if (data.name) formData.set('name', data.name)
    formData.set('public', data.public ? 'true' : 'false')
    formData.set(
      'isPasswordProtected',
      data.isPasswordProtected ? 'true' : 'false',
    )
    if (data.password) formData.set('password', data.password)
    if (data.origins !== null) formData.set('origins', data.origins)
    if (data.ipBlacklist !== null) formData.set('ipBlacklist', data.ipBlacklist)
    if (data.botsProtectionLevel)
      formData.set('botsProtectionLevel', data.botsProtectionLevel)
    if (data.countryBlacklist)
      formData.set('countryBlacklist', JSON.stringify(data.countryBlacklist))
    if (data.websiteUrl !== undefined)
      formData.set('websiteUrl', data.websiteUrl || '')

    fetcher.submit(formData, { method: 'post' })
  }

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

    const formData = new FormData()
    formData.set('intent', 'regenerate-captcha-key')
    fetcher.submit(formData, { method: 'post' })
  }

  // Wrapper for reset that handles tab logic
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

  const validate = () => {
    const allErrors: {
      name?: string
      origins?: string
      ipBlacklist?: string
      password?: string
      websiteUrl?: string
    } = {}

    if (_isEmpty(form.name)) {
      allErrors.name = t('project.settings.noNameError')
    }

    if (_size(form.name) > MAX_NAME_LENGTH) {
      allErrors.name = t('project.settings.pxCharsError', {
        amount: MAX_NAME_LENGTH,
      })
    }

    if (_size(form.origins) > MAX_ORIGINS_LENGTH) {
      allErrors.origins = t('project.settings.oxCharsError', {
        amount: MAX_ORIGINS_LENGTH,
      })
    }

    if (_size(form.ipBlacklist) > MAX_IPBLACKLIST_LENGTH) {
      allErrors.ipBlacklist = t('project.settings.oxCharsError', {
        amount: MAX_IPBLACKLIST_LENGTH,
      })
    }

    // Validate websiteUrl if provided
    if (form.websiteUrl && form.websiteUrl.trim()) {
      try {
        const url = new URL(form.websiteUrl.trim())
        if (!['http:', 'https:'].includes(url.protocol)) {
          allErrors.websiteUrl = t('project.settings.invalidUrl')
        }
      } catch {
        allErrors.websiteUrl = t('project.settings.invalidUrl')
      }
    }

    const valid = _isEmpty(_keys(allErrors))

    setErrors(allErrors)
    setValidated(valid)
  }

  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event
    const value = target.type === 'checkbox' ? target.checked : target.value

    setForm((oldForm) => ({
      ...oldForm,
      [target.name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setBeenSubmitted(true)

    if (validated) {
      onSubmit(form)
    }
  }

  const onProtected = async () => {
    setBeenSubmitted(true)

    if (validated) {
      await onSubmit({
        ...form,
        isPasswordProtected: true,
      })

      setForm((prev) => ({
        ...prev,
        isPasswordProtected: true,
      }))

      setShowProtected(false)
    }
  }

  const title = `${t('project.settings.settings')} ${form.name}`

  const currentTabLabel = useMemo(() => {
    return (tabs.find((t) => t.id === activeTab)?.label as string) || ''
  }, [tabs, activeTab])

  return (
    <div className='flex min-h-min-footer flex-col bg-gray-50 pb-40 dark:bg-slate-900'>
      <div className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
        <Link
          to={_replace(routes.project, ':id', id)}
          className='flex max-w-max items-center text-sm text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-100'
        >
          <CaretLeftIcon className='mr-1 size-3' />
          {t('project.backToStats')}
        </Link>
        <h2 className='mt-1 text-3xl font-bold text-gray-900 dark:text-gray-50'>
          {title}
        </h2>

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
            <nav className='flex flex-col space-y-1' aria-label='Sidebar'>
              {_map(tabs, (tab) => {
                const isCurrent = tab.id === activeTab
                const Icon = tab.icon

                return (
                  <button
                    key={tab.id}
                    type='button'
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
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
            {['general', 'shields', 'access'].includes(activeTab) ? (
              <form onSubmit={handleSubmit}>
                {activeTab === 'general' ? (
                  <General
                    form={form}
                    errors={errors}
                    beenSubmitted={beenSubmitted}
                    handleInput={handleInput}
                    sharableLink={sharableLink}
                  />
                ) : null}

                {activeTab === 'shields' ? (
                  <Shields
                    form={form}
                    errors={errors}
                    beenSubmitted={beenSubmitted}
                    handleInput={handleInput}
                    botsProtectionLevels={botsProtectionLevels}
                    setBotsLevel={(name) =>
                      setForm((prevForm) => ({
                        ...prevForm,
                        // cast to maintain allowed literal types
                        botsProtectionLevel: name as any,
                      }))
                    }
                    countryBlacklist={form.countryBlacklist || []}
                    setCountryBlacklist={(countries) =>
                      setForm((prevForm) => ({
                        ...prevForm,
                        countryBlacklist: countries,
                      }))
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
                  />
                ) : null}

                <div className='mt-4 flex flex-wrap justify-center gap-2 sm:justify-between'>
                  <Button type='submit' loading={isSaving} primary regular>
                    {t('common.save')}
                  </Button>
                </div>
              </form>
            ) : null}

            {activeTab === 'emails' && !isSelfhosted ? (
              <Emails projectId={id} />
            ) : null}
            {activeTab === 'people' ? <People project={project} /> : null}
            {activeTab === 'annotations' ? (
              <Annotations
                projectId={id}
                allowedToManage={
                  project?.role === 'owner' || project?.role === 'admin'
                }
              />
            ) : null}

            {activeTab === 'integrations' ? (
              <div>
                <div className='rounded-lg border border-gray-200 p-4 dark:border-slate-800'>
                  <h3 className='mb-2 flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-gray-50'>
                    <GoogleSearchConsoleSVG className='size-6' />
                    Google Search Console
                  </h3>
                  {gscConnected === null ? (
                    <Loader />
                  ) : !gscConnected ? (
                    <div className='flex flex-col items-center justify-between gap-4 md:flex-row'>
                      <p className='text-sm text-gray-800 dark:text-gray-200'>
                        {t('project.settings.gsc.connect')}
                      </p>
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
                            ? gscFetcher.formData?.get('intent') ===
                              'gsc-connect'
                            : undefined
                        }
                        primary
                        regular
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
                        type='button'
                        className='max-w-max'
                        semiDanger
                        regular
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
                          setForm((prevForm) => ({
                            ...prevForm,
                            gscPropertyUri: item.key,
                          }))
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

                      <Button
                        type='button'
                        className='max-w-max'
                        onClick={() => {
                          if (!form.gscPropertyUri) return
                          gscFetcher.submit(
                            {
                              intent: 'gsc-set-property',
                              propertyUri: form.gscPropertyUri,
                            },
                            { method: 'post' },
                          )
                        }}
                        loading={
                          gscFetcher.state !== 'idle'
                            ? gscFetcher.formData?.get('intent') ===
                              'gsc-set-property'
                            : undefined
                        }
                        primary
                        regular
                      >
                        {t('common.save')}
                      </Button>
                    </div>
                  )}

                  {gscConnected ? null : (
                    <>
                      <hr className='-mx-4 mt-4 mb-4 border-gray-200 dark:border-slate-800' />

                      <p className='text-sm text-gray-800 dark:text-gray-200'>
                        <Trans
                          t={t}
                          i18nKey='project.settings.gsc.connectDisclamer'
                          components={{
                            url: (
                              <a
                                href='https://search.google.com/search-console/about'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                              />
                            ),
                          }}
                        />
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === 'captcha' ? (
              <div>
                <div className='rounded-lg border border-gray-200 p-4 dark:border-slate-800'>
                  <h3 className='mb-2 text-lg font-medium text-gray-900 dark:text-gray-50'>
                    {t('project.settings.captcha.title')}
                  </h3>
                  <p className='mb-4 text-sm text-gray-600 dark:text-gray-300'>
                    {t('project.settings.captcha.description')}
                  </p>

                  {captchaSecretKey ? (
                    <>
                      <Input
                        label={t('project.settings.captcha.secretKey')}
                        hint={t('project.settings.captcha.learnMore')}
                        name='captchaSecretKey'
                        className='mt-4 lg:w-1/2'
                        value={captchaSecretKey}
                        disabled
                      />
                      <div className='mt-4 flex gap-2'>
                        <Button
                          type='button'
                          onClick={() => setShowRegenerateSecret(true)}
                          danger
                          regular
                        >
                          {t('project.settings.captcha.regenerateKey')}
                        </Button>
                      </div>

                      <div className='mt-6'>
                        <Select
                          label={t('project.settings.captcha.difficulty')}
                          hint={t('project.settings.captcha.difficultyHint')}
                          className='lg:w-1/2'
                          hintClassName='lg:w-2/3'
                          items={[
                            {
                              value: 2,
                              label: t(
                                'project.settings.captcha.difficultyLevels.veryEasy',
                              ),
                            },
                            {
                              value: 3,
                              label: t(
                                'project.settings.captcha.difficultyLevels.easy',
                              ),
                            },
                            {
                              value: 4,
                              label: t(
                                'project.settings.captcha.difficultyLevels.medium',
                              ),
                            },
                            {
                              value: 5,
                              label: t(
                                'project.settings.captcha.difficultyLevels.hard',
                              ),
                            },
                            {
                              value: 6,
                              label: t(
                                'project.settings.captcha.difficultyLevels.veryHard',
                              ),
                            },
                          ]}
                          keyExtractor={(item) => String(item.value)}
                          labelExtractor={(item) => item.label}
                          selectedItem={{ value: captchaDifficulty, label: '' }}
                          onSelect={(item: {
                            value: number
                            label: string
                          }) => {
                            setCaptchaDifficulty(item.value)
                          }}
                          title={
                            captchaDifficulty === 2
                              ? t(
                                  'project.settings.captcha.difficultyLevels.veryEasy',
                                )
                              : captchaDifficulty === 3
                                ? t(
                                    'project.settings.captcha.difficultyLevels.easy',
                                  )
                                : captchaDifficulty === 4
                                  ? t(
                                      'project.settings.captcha.difficultyLevels.medium',
                                    )
                                  : captchaDifficulty === 5
                                    ? t(
                                        'project.settings.captcha.difficultyLevels.hard',
                                      )
                                    : t(
                                        'project.settings.captcha.difficultyLevels.veryHard',
                                      )
                          }
                        />
                        <Button
                          type='button'
                          className='mt-4'
                          loading={fetcher.state === 'submitting'}
                          onClick={() => {
                            const formData = new FormData()
                            formData.set('intent', 'update-project')
                            formData.set(
                              'captchaDifficulty',
                              captchaDifficulty.toString(),
                            )
                            fetcher.submit(formData, { method: 'post' })
                          }}
                          primary
                          regular
                        >
                          {t('common.save')}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className='mb-4 text-sm text-gray-600 dark:text-gray-300'>
                        {t('project.settings.captcha.noKeyGenerated')}
                      </p>
                      <Button
                        type='button'
                        onClick={onRegenerateCaptchaKey}
                        primary
                        regular
                      >
                        {t('project.settings.captcha.generateKey')}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === 'revenue' ? <Revenue projectId={id} /> : null}

            {activeTab === 'danger' ? (
              <DangerZone
                setShowTransfer={setShowTransfer}
                setShowReset={setShowReset}
                setShowDelete={setShowDelete}
                isDeleting={isDeleting}
                setResetting={isResetting}
              />
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
            <p className='mt-1 mb-4 text-sm text-gray-500 dark:text-gray-300'>
              {t('project.settings.protectedHint')}
            </p>
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
            <h2 className='text-xl font-bold text-gray-700 dark:text-gray-200'>
              {t('project.settings.transferTo')}
            </h2>
            <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>
              {t('project.settings.transferHint', {
                name: form.name || DEFAULT_PROJECT_NAME,
              })}
            </p>
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
