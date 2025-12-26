import { XCircleIcon } from '@heroicons/react/24/outline'
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
import _split from 'lodash/split'
import _toUpper from 'lodash/toUpper'
import {
  Settings2Icon,
  ShieldIcon,
  LockIcon,
  UserRoundIcon,
  MailIcon,
  TriangleAlertIcon,
  ChevronLeftIcon,
  PuzzleIcon,
  StickyNoteIcon,
  ShieldCheckIcon,
  DollarSignIcon,
} from 'lucide-react'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useLoaderData, useNavigate, Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import {
  updateProject,
  deleteProject,
  resetProject,
  transferProject,
  deletePartially,
  getFilters,
  resetFilters,
  getProject,
  assignProjectToOrganisation,
  generateGSCAuthURL,
  getGSCStatus,
  getGSCProperties,
  setGSCProperty,
  disconnectGSC,
  reGenerateCaptchaSecretKey,
} from '~/api'
import { withAuthentication, auth } from '~/hoc/protected'
import { useRequiredParams } from '~/hooks/useRequiredParams'
import { isSelfhosted, TITLE_SUFFIX, FILTERS_PANELS_ORDER, isBrowser } from '~/lib/constants'
import { Project } from '~/lib/models/Project'
import { useAuth } from '~/providers/AuthProvider'
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
import { getFormatDate } from '../View/ViewProject.helpers'

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
}: ModalMessageProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const [filterList, setFilterList] = useState<string[]>([])
  const [searchList, setSearchList] = useState<string[]>([])

  const getFiltersList = async () => {
    if (!_isEmpty(filterType)) {
      const res = await getFilters(pid, filterType)
      setFilterList(res)
      setSearchList(res)
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
      <p className='mt-1 mb-4 text-sm text-gray-500 italic dark:text-gray-300'>{t('project.settings.resetHint')}</p>
      <div className='mt-6'>
        <nav className='-mb-px flex space-x-6'>
          {_map(DELETE_DATA_MODAL_TABS, (tabDelete) => (
            <button
              key={tabDelete.name}
              type='button'
              onClick={() => setTab(tabDelete.name)}
              className={cx('text-md border-b-2 px-1 pb-2 font-medium whitespace-nowrap', {
                'border-indigo-500 text-indigo-600 dark:border-gray-50 dark:text-gray-50': tabDelete.name === tab,
                'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-300 dark:hover:text-gray-300':
                  tab !== tabDelete.name,
              })}
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
                !_isEmpty(filterType) ? t(`project.mapping.${filterType}`) : t('project.settings.reseted.selectFilters')
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
                          _includes(_toUpper(countries.getName(item, language)), _toUpper(search)),
                        ),
                      )
                      return
                    }

                    setSearchList(_filter(filterList, (item) => _includes(_toUpper(item), _toUpper(search))))
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
                  setActiveFilter((oldItems: string[]) => _filter(oldItems, (i) => i !== item))
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
  const { user, isLoading: authLoading } = useAuth()

  const { t } = useTranslation('common')
  const { id } = useRequiredParams<{ id: string }>()
  const navigate = useNavigate()
  const { requestOrigin } = useLoaderData<{ requestOrigin: string | null }>()

  const [project, setProject] = useState<Project | null>(null)
  const [form, setForm] = useState<Form>({
    name: '',
    id,
    public: false,
    isPasswordProtected: false,
    origins: null,
    ipBlacklist: null,
    countryBlacklist: [],
    botsProtectionLevel: 'basic',
    gscPropertyUri: null,
    websiteUrl: null,
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    origins?: string
    ipBlacklist?: string
    password?: string
    websiteUrl?: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [setResetting, setIsResetting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferEmail, setTransferEmail] = useState('')
  const [dateRange, setDateRange] = useState<Date[]>([])
  const [tab, setTab] = useState(DELETE_DATA_MODAL_TABS[0].name)
  const [showProtected, setShowProtected] = useState(false)

  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
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
        { id: 'general', label: t('project.settings.tabs.general'), icon: Settings2Icon, visible: true },
        { id: 'access', label: t('project.settings.tabs.access'), icon: LockIcon, visible: true },
        { id: 'shields', label: t('project.settings.tabs.shields'), icon: ShieldIcon, visible: true },
        {
          id: 'captcha',
          label: t('project.settings.tabs.captcha'),
          icon: ShieldCheckIcon,
          visible: !isSelfhosted,
        },
        {
          id: 'integrations',
          label: t('project.settings.tabs.integrations'),
          icon: PuzzleIcon,
          visible: !isSelfhosted,
        },
        {
          id: 'revenue',
          label: t('project.settings.tabs.revenue'),
          icon: DollarSignIcon,
          visible: !isSelfhosted,
        },
        { id: 'emails', label: t('project.settings.tabs.emails'), icon: MailIcon, visible: !isSelfhosted },
        { id: 'people', label: t('project.settings.tabs.people'), icon: UserRoundIcon, visible: true },
        { id: 'annotations', label: t('project.settings.tabs.annotations'), icon: StickyNoteIcon, visible: true },
        {
          id: 'danger',
          label: t('project.settings.tabs.danger'),
          icon: TriangleAlertIcon,
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
  const [gscProperties, setGscProperties] = useState<{ siteUrl: string; permissionLevel?: string }[]>([])
  const [gscEmail, setGscEmail] = useState<string | null>(null)

  // CAPTCHA state
  const [captchaSecretKey, setCaptchaSecretKey] = useState<string | null>(null)
  const [captchaDifficulty, setCaptchaDifficulty] = useState<number>(4)
  const [showRegenerateSecret, setShowRegenerateSecret] = useState(false)
  const [isSavingDifficulty, setIsSavingDifficulty] = useState(false)

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
        .filter((om) => om.confirmed && (om.role === 'admin' || om.role === 'owner'))
        .map((om) => om.organisation),
    ],
    [user?.organisationMemberships, t],
  )

  const assignOrganisation = async (organisationId?: string) => {
    try {
      await assignProjectToOrganisation(id, organisationId)
      toast.success(t('apiNotifications.projectAssigned'))
    } catch (reason: any) {
      toast.error(typeof reason === 'string' ? reason : t('apiNotifications.projectAssignError'))
    }
  }

  const sharableLink = useMemo(() => {
    const origin = requestOrigin || isBrowser ? window.location.origin : 'https://swetrix.com'

    return `${origin}/projects/${id}`
  }, [requestOrigin, id])

  const loadProject = async (projectId: string) => {
    if (isLoading) {
      return
    }
    setIsLoading(true)

    try {
      const result = await getProject(projectId)
      setProject(result)
      setCaptchaSecretKey(result.captchaSecretKey)
      setCaptchaDifficulty(result.captchaDifficulty || 4)
      setForm({
        ...result,
        ipBlacklist: _isString(result.ipBlacklist) ? result.ipBlacklist : _join(result.ipBlacklist, ', '),
        origins: _isString(result.origins) ? result.origins : _join(result.origins, ', '),
        countryBlacklist: result.countryBlacklist || [],
        websiteUrl: result.websiteUrl || null,
      })
    } catch (reason: any) {
      setError(reason)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshGSCStatus = useCallback(async () => {
    try {
      const { connected, email } = await getGSCStatus(id)
      setGscConnected(connected)
      setGscEmail(email || null)
      if (connected) {
        try {
          const props = await getGSCProperties(id)
          setGscProperties(props)
        } catch {
          //
        }
      } else {
        setGscProperties([])
      }
    } catch {
      setGscConnected(false)
    }
  }, [id])

  useEffect(() => {
    refreshGSCStatus()
  }, [refreshGSCStatus])

  useEffect(() => {
    if (authLoading) {
      return
    }

    loadProject(id)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, id])

  const onSubmit = async (data: Form) => {
    if (!isSaving) {
      setIsSaving(true)
      try {
        const formalisedData = {
          ...data,
          origins: _isEmpty(data.origins)
            ? null
            : _map(_split(data.origins, ','), (origin) => {
                try {
                  if (_includes(origin, 'localhost')) {
                    return origin
                  }
                  return new URL(origin).host
                } catch {
                  return origin
                }
              }),
          ipBlacklist: _isEmpty(data.ipBlacklist) ? null : _split(data.ipBlacklist, ','),
          countryBlacklist: _isEmpty(data.countryBlacklist) ? null : data.countryBlacklist,
        }
        await updateProject(id, formalisedData as Partial<Project>)
        toast.success(t('project.settings.updated'))
      } catch (reason: any) {
        toast.error(reason)
      } finally {
        setIsSaving(false)
      }
    }
  }

  const onDelete = async () => {
    setShowDelete(false)

    if (isDeleting) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteProject(id)
      toast.success(t('project.settings.deleted'))
      navigate(routes.dashboard)
    } catch (reason: any) {
      toast.error(reason)
    } finally {
      setIsDeleting(false)
    }
  }

  const onReset = async () => {
    setShowReset(false)

    if (setResetting) {
      return
    }

    setIsResetting(true)

    try {
      if (tab === DELETE_DATA_MODAL_TABS[1].name) {
        if (_isEmpty(dateRange)) {
          toast.error(t('project.settings.noDateRange'))
          setIsResetting(false)
          return
        }
        await deletePartially(id, {
          from: getFormatDate(dateRange[0]),
          to: getFormatDate(dateRange[1]),
        })
      } else if (tab === DELETE_DATA_MODAL_TABS[2].name) {
        if (_isEmpty(activeFilter)) {
          toast.error(t('project.settings.noFilters'))
          setIsResetting(false)
          return
        }

        await resetFilters(id, filterType, activeFilter)
      } else {
        await resetProject(id)
      }
      toast.success(t('project.settings.projectReset'))
      navigate(routes.dashboard)
    } catch (reason: any) {
      toast.error(reason)
    } finally {
      setIsResetting(false)
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
      allErrors.name = t('project.settings.pxCharsError', { amount: MAX_NAME_LENGTH })
    }

    if (_size(form.origins) > MAX_ORIGINS_LENGTH) {
      allErrors.origins = t('project.settings.oxCharsError', { amount: MAX_ORIGINS_LENGTH })
    }

    if (_size(form.ipBlacklist) > MAX_IPBLACKLIST_LENGTH) {
      allErrors.ipBlacklist = t('project.settings.oxCharsError', { amount: MAX_IPBLACKLIST_LENGTH })
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

  const onTransfer = async () => {
    await transferProject(id, transferEmail)
      .then(() => {
        toast.success(t('apiNotifications.transferRequestSent'))
        navigate(routes.dashboard)
      })
      .catch((reason) => {
        toast.error(reason)
      })
      .finally(() => {
        setShowTransfer(false)
        setTransferEmail('')
      })
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

  const reloadProject = useCallback(async () => {
    try {
      const result = await getProject(id)
      setProject(result)
    } catch (reason: any) {
      console.error(`[ERROR] Error while reloading project: ${reason}`)
    }
  }, [id])

  const title = `${t('project.settings.settings')} ${form.name}`

  useEffect(() => {
    document.title = `${t('project.settings.settings')} ${form.name} ${TITLE_SUFFIX}`
  }, [form, t])

  const currentTabLabel = useMemo(() => {
    return (tabs.find((t) => t.id === activeTab)?.label as string) || ''
  }, [tabs, activeTab])

  if (error && !isLoading) {
    return (
      <div className='min-h-page bg-gray-50 px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8 dark:bg-slate-900'>
        <div className='mx-auto max-w-max'>
          <main className='sm:flex'>
            <XCircleIcon className='h-12 w-12 text-red-400' aria-hidden='true' />
            <div className='sm:ml-6'>
              <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
                <h1 className='text-4xl font-extrabold text-gray-900 sm:text-5xl dark:text-gray-50'>
                  {t('apiNotifications.somethingWentWrong')}
                </h1>
                <p className='mt-4 text-2xl font-medium text-gray-700 dark:text-gray-200'>
                  {t('apiNotifications.errorCode', { error })}
                </p>
              </div>
              <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
                <button
                  type='button'
                  onClick={() => window.location.reload()}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden'
                >
                  {t('dashboard.reloadPage')}
                </button>
                <Link
                  to={routes.contact}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700 dark:focus:ring-gray-50'
                >
                  {t('notFoundPage.support')}
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (isLoading || isLoading === null || !project) {
    return (
      <div className='flex min-h-min-footer flex-col bg-gray-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-900'>
        <Loader />
      </div>
    )
  }

  return (
    <div className='flex min-h-min-footer flex-col bg-gray-50 pb-40 dark:bg-slate-900'>
      <div className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
        <Link
          to={_replace(routes.project, ':id', id)}
          className='flex max-w-max items-center text-sm text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-100'
        >
          <ChevronLeftIcon className='mr-1 size-3' strokeWidth={1.5} />
          {t('project.backToStats')}
        </Link>
        <h2 className='mt-1 text-3xl font-bold text-gray-900 dark:text-gray-50'>{title}</h2>

        <hr className='mt-5 border-gray-200 dark:border-gray-600' />

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
                return <Icon className='h-4 w-4' strokeWidth={1.5} />
              }}
              onSelect={(item: any) => setActiveTab(item.id as typeof activeTab)}
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

            {activeTab === 'emails' && !isSelfhosted ? <Emails projectId={id} /> : null}
            {activeTab === 'people' ? <People project={project} reloadProject={reloadProject} /> : null}
            {activeTab === 'annotations' ? (
              <Annotations projectId={id} allowedToManage={project?.role === 'owner' || project?.role === 'admin'} />
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
                      <p className='text-sm text-gray-800 dark:text-gray-200'>{t('project.settings.gsc.connect')}</p>
                      <Button
                        className='flex items-center gap-2'
                        type='button'
                        onClick={async () => {
                          try {
                            const { url } = await generateGSCAuthURL(id)
                            const safeUrl = (() => {
                              try {
                                const parsed = new URL(url)
                                if (parsed.protocol !== 'https:') return null
                                if (parsed.username || parsed.password) return null
                                // Google OAuth consent screen
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
                          } catch (reason: any) {
                            toast.error(typeof reason === 'string' ? reason : t('apiNotifications.somethingWentWrong'))
                          }
                        }}
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
                        onClick={async () => {
                          try {
                            await disconnectGSC(id)
                            setGscConnected(false)
                            setGscProperties([])
                            setGscEmail(null)
                            setForm((prevForm) => ({
                              ...prevForm,
                              gscPropertyUri: null,
                            }))
                            toast.success(t('project.settings.gsc.disconnected'))
                          } catch (reason: any) {
                            toast.error(typeof reason === 'string' ? reason : t('apiNotifications.somethingWentWrong'))
                          }
                        }}
                      >
                        {t('common.disconnect')}
                      </Button>

                      <Select
                        fieldLabelClassName='mt-4 max-w-max'
                        className='lg:w-1/2'
                        hintClassName='lg:w-2/3'
                        label={t('project.settings.gsc.websiteProperty')}
                        hint={t('project.settings.gsc.websitePropertyHint')}
                        items={_map(gscProperties, (p) => ({ key: p.siteUrl, label: p.siteUrl }))}
                        keyExtractor={(item) => item.key}
                        labelExtractor={(item) => item.label}
                        onSelect={(item: { key: string; label: string }) => {
                          setForm((prevForm) => ({
                            ...prevForm,
                            gscPropertyUri: item.key,
                          }))
                        }}
                        title={form.gscPropertyUri || t('project.settings.gsc.selectProperty')}
                        selectedItem={
                          form.gscPropertyUri ? { key: form.gscPropertyUri, label: form.gscPropertyUri } : undefined
                        }
                      />

                      <Button
                        type='button'
                        className='max-w-max'
                        onClick={async () => {
                          if (!form.gscPropertyUri) return
                          try {
                            await setGSCProperty(id, form.gscPropertyUri)
                            toast.success(t('project.settings.gsc.propertyConnected'))
                          } catch (reason: any) {
                            toast.error(typeof reason === 'string' ? reason : t('apiNotifications.somethingWentWrong'))
                          }
                        }}
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
                        <Button type='button' onClick={() => setShowRegenerateSecret(true)} danger regular>
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
                            { value: 2, label: t('project.settings.captcha.difficultyLevels.veryEasy') },
                            { value: 3, label: t('project.settings.captcha.difficultyLevels.easy') },
                            { value: 4, label: t('project.settings.captcha.difficultyLevels.medium') },
                            { value: 5, label: t('project.settings.captcha.difficultyLevels.hard') },
                            { value: 6, label: t('project.settings.captcha.difficultyLevels.veryHard') },
                          ]}
                          keyExtractor={(item) => String(item.value)}
                          labelExtractor={(item) => item.label}
                          selectedItem={{ value: captchaDifficulty, label: '' }}
                          onSelect={(item: { value: number; label: string }) => {
                            setCaptchaDifficulty(item.value)
                          }}
                          title={
                            captchaDifficulty === 2
                              ? t('project.settings.captcha.difficultyLevels.veryEasy')
                              : captchaDifficulty === 3
                                ? t('project.settings.captcha.difficultyLevels.easy')
                                : captchaDifficulty === 4
                                  ? t('project.settings.captcha.difficultyLevels.medium')
                                  : captchaDifficulty === 5
                                    ? t('project.settings.captcha.difficultyLevels.hard')
                                    : t('project.settings.captcha.difficultyLevels.veryHard')
                          }
                        />
                        <Button
                          type='button'
                          className='mt-4'
                          loading={isSavingDifficulty}
                          onClick={async () => {
                            setIsSavingDifficulty(true)
                            try {
                              await updateProject(id, { captchaDifficulty })
                              toast.success(t('project.settings.updated'))
                            } catch (reason: any) {
                              toast.error(
                                typeof reason === 'string' ? reason : t('apiNotifications.somethingWentWrong'),
                              )
                            } finally {
                              setIsSavingDifficulty(false)
                            }
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
                        onClick={async () => {
                          try {
                            const newKey = await reGenerateCaptchaSecretKey(id)
                            setCaptchaSecretKey(newKey)
                            toast.success(t('project.settings.captcha.keyGenerated'))
                          } catch (reason: any) {
                            toast.error(typeof reason === 'string' ? reason : t('apiNotifications.somethingWentWrong'))
                          }
                        }}
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
                setResetting={setResetting}
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
        onSubmit={onReset}
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
            <p className='mt-1 mb-4 text-sm text-gray-500 dark:text-gray-300'>{t('project.settings.protectedHint')}</p>
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
            <h2 className='text-xl font-bold text-gray-700 dark:text-gray-200'>{t('project.settings.transferTo')}</h2>
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
        onSubmit={async () => {
          try {
            const newKey = await reGenerateCaptchaSecretKey(id)
            setCaptchaSecretKey(newKey)
            setShowRegenerateSecret(false)
            toast.success(t('project.settings.captcha.keyRegenerated'))
          } catch (reason: any) {
            toast.error(typeof reason === 'string' ? reason : t('apiNotifications.somethingWentWrong'))
          }
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

export default withAuthentication(ProjectSettings, auth.authenticated)
