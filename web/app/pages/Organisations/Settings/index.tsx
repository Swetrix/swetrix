import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _size from 'lodash/size'
import {
  BellRingingIcon,
  CaretLeftIcon,
  FolderSimpleIcon,
  SlidersHorizontalIcon,
  UserCircleIcon,
  WarningOctagonIcon,
} from '@phosphor-icons/react'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '~/ui/Link'
import {
  useNavigate,
  useFetcher,
  useLoaderData,
  useSearchParams,
} from 'react-router'
import { toast } from 'sonner'

import { useDeduplicateFetcherResponse } from '~/hooks/useDeduplicateFetcherResponse'
import { DetailedOrganisation } from '~/lib/models/Organisation'
import { useAuth } from '~/providers/AuthProvider'
import type {
  OrganisationSettingsActionData,
  OrganisationLoaderData,
} from '~/routes/organisations.$id'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import Select from '~/ui/Select'
import StatusPage from '~/ui/StatusPage'
import { TabHeader } from '~/ui/TabHeader'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

import NotificationChannels from '~/components/NotificationChannels/NotificationChannels'

import SettingsSidebar, {
  SettingsTabConfig,
  SettingsTabGroup,
} from '../../Project/Settings/SettingsSidebar'
import People from './People'
import { Projects } from './Projects'

const MAX_NAME_LENGTH = 50
const AUTOSAVE_DEBOUNCE_MS = 700

type OrganisationForm = Pick<DetailedOrganisation, 'name'>

const ORGANISATION_TEXT_AUTOSAVE_TOASTS = {
  name: 'apiNotifications.orgSettingsUpdated',
} as const

type OrganisationTextAutosaveField =
  keyof typeof ORGANISATION_TEXT_AUTOSAVE_TOASTS

const isOrganisationTextAutosaveField = (
  field: string,
): field is OrganisationTextAutosaveField =>
  Object.prototype.hasOwnProperty.call(ORGANISATION_TEXT_AUTOSAVE_TOASTS, field)

const getFormFromOrganisation = (
  organisation: DetailedOrganisation | null,
): OrganisationForm => ({
  name: organisation?.name || '',
})

const normaliseOrganisationAutosaveValue = (value: unknown) =>
  JSON.stringify(value ?? null)

const buildOrganisationAutosaveFormData = (
  updates: Partial<OrganisationForm>,
) => {
  const formData = new FormData()
  formData.set('intent', 'update-organisation')

  if (updates.name !== undefined) {
    formData.set('name', updates.name)
  }

  return formData
}

interface DangerActionProps {
  title: string
  description: string
  action: React.ReactNode
}

const DangerAction = ({ title, description, action }: DangerActionProps) => (
  <div className='flex flex-col items-start gap-4 py-5 sm:flex-row sm:items-center sm:justify-between'>
    <div>
      <Text as='h4' size='sm' weight='medium'>
        {title}
      </Text>
      <Text as='p' size='sm' colour='secondary' className='mt-1'>
        {description}
      </Text>
    </div>
    <div className='shrink-0'>{action}</div>
  </div>
)

type SettingsTab = 'general' | 'people' | 'projects' | 'channels' | 'danger'

const OrganisationSettings = () => {
  const { t } = useTranslation('common')
  const loaderData = useLoaderData<OrganisationLoaderData>()
  const navigate = useNavigate()
  const fetcher = useFetcher<OrganisationSettingsActionData>()
  const autosaveFetcher = useFetcher<OrganisationSettingsActionData>()
  const [searchParams, setSearchParams] = useSearchParams()

  const { user } = useAuth()

  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const shouldHandleFetcherData =
    useDeduplicateFetcherResponse<OrganisationSettingsActionData>()

  const organisation = loaderData?.organisation || null
  const error = loaderData?.error
  const lastSavedForm = useRef<OrganisationForm>(
    getFormFromOrganisation(organisation),
  )
  const lastHandledAutosaveData = useRef<OrganisationSettingsActionData | null>(
    null,
  )
  const activeAutosave = useRef<{
    updates: Partial<OrganisationForm>
    toastKey: string
  } | null>(null)
  const pendingAutosave = useRef<{
    updates: Partial<OrganisationForm>
    toastKey: string
  } | null>(null)
  const autosaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [form, setForm] = useState<OrganisationForm>(() =>
    getFormFromOrganisation(organisation),
  )

  useEffect(() => {
    if (!organisation) return

    const nextForm = getFormFromOrganisation(organisation)
    lastSavedForm.current = nextForm

    if (!activeAutosave.current && !pendingAutosave.current) {
      setForm(nextForm)
    }
  }, [organisation])

  const isDeleting =
    fetcher.state === 'submitting' &&
    fetcher.formData?.get('intent') === 'delete-organisation'

  useEffect(() => {
    if (!fetcher.data) return
    if (!shouldHandleFetcherData(fetcher.data)) return

    if (fetcher.data?.success) {
      const { intent } = fetcher.data

      if (intent === 'delete-organisation') {
        toast.success(t('apiNotifications.organisationDeleted'))
        setShowDelete(false)
        navigate(routes.organisations)
      }
    } else if (fetcher.data?.error) {
      toast.error(fetcher.data.error)
      setShowDelete(false)
    }
  }, [fetcher.data, t, navigate, shouldHandleFetcherData])

  const isOrganisationOwner = useMemo(() => {
    if (!organisation) {
      return false
    }

    const owner = organisation.members.find((member) => member.role === 'owner')

    return owner?.user?.email === user?.email
  }, [organisation, user])

  const tabs = useMemo<SettingsTabConfig<SettingsTab>[]>(
    () =>
      [
        {
          id: 'general',
          label: t('organisations.settings.tabs.general'),
          description: t('organisations.settings.tabs.generalDesc'),
          icon: SlidersHorizontalIcon,
          iconColor: 'text-blue-500',
          visible: true,
        },
        {
          id: 'people',
          label: t('organisations.settings.tabs.people'),
          description: t('organisations.settings.tabs.peopleDesc'),
          icon: UserCircleIcon,
          iconColor: 'text-indigo-500',
          visible: true,
        },
        {
          id: 'projects',
          label: t('organisations.settings.tabs.projects'),
          description: t('organisations.settings.tabs.projectsDesc'),
          icon: FolderSimpleIcon,
          iconColor: 'text-emerald-500',
          visible: true,
        },
        {
          id: 'channels',
          label: t('organisations.settings.tabs.channels'),
          description: t('organisations.settings.tabs.channelsDesc'),
          icon: BellRingingIcon,
          iconColor: 'text-pink-500',
          visible: true,
        },
        {
          id: 'danger',
          label: t('organisations.settings.tabs.danger'),
          description: t('organisations.settings.tabs.dangerDesc'),
          icon: WarningOctagonIcon,
          iconColor: 'text-red-500',
          visible: isOrganisationOwner,
        },
      ].filter((tab) => tab.visible) as SettingsTabConfig<SettingsTab>[],
    [t, isOrganisationOwner],
  )

  const sidebarGroups = useMemo<SettingsTabGroup<SettingsTab>[]>(
    () => [
      {
        id: 'general',
        label: t('project.settings.sidebarGroups.general'),
        tabIds: ['general', 'people', 'projects'],
      },
      {
        id: 'notifications',
        label: t('project.settings.sidebarGroups.notifications'),
        tabIds: ['channels'],
      },
    ],
    [t],
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

  const activeTabConfig = useMemo(
    () => tabs.find((tab) => tab.id === activeTab),
    [tabs, activeTab],
  )

  const currentTabLabel = useMemo(() => {
    return (tabs.find((tab) => tab.id === activeTab)?.label as string) || ''
  }, [tabs, activeTab])

  const onDelete = () => {
    if (fetcher.state === 'submitting') return

    const fd = new FormData()
    fd.set('intent', 'delete-organisation')
    fetcher.submit(fd, { method: 'post' })
  }

  const getValidationErrors = useCallback(
    (data: OrganisationForm) => {
      const allErrors: {
        name?: string
      } = {}

      if (_isEmpty(data.name)) {
        allErrors.name = t('project.settings.noNameError')
      }

      if (_size(data.name) > MAX_NAME_LENGTH) {
        allErrors.name = t('project.settings.pxCharsError', {
          amount: MAX_NAME_LENGTH,
        })
      }

      return allErrors
    },
    [t],
  )

  const hasOrganisationAutosaveChange = useCallback(
    (updates: Partial<OrganisationForm>) => {
      const baseline = activeAutosave.current
        ? {
            ...lastSavedForm.current,
            ...activeAutosave.current.updates,
          }
        : lastSavedForm.current

      return Object.entries(updates).some(([field, value]) => {
        return (
          normaliseOrganisationAutosaveValue(
            baseline[field as keyof OrganisationForm],
          ) !== normaliseOrganisationAutosaveValue(value)
        )
      })
    },
    [],
  )

  const clearPendingAutosave = useCallback(() => {
    pendingAutosave.current = null

    if (autosaveTimeout.current) {
      clearTimeout(autosaveTimeout.current)
      autosaveTimeout.current = null
    }
  }, [])

  const flushOrganisationAutosave = useCallback(() => {
    if (autosaveTimeout.current) {
      clearTimeout(autosaveTimeout.current)
      autosaveTimeout.current = null
    }

    const autosave = pendingAutosave.current
    if (autosaveFetcher.state !== 'idle' || !autosave) return

    activeAutosave.current = autosave
    pendingAutosave.current = null

    autosaveFetcher.submit(
      buildOrganisationAutosaveFormData(autosave.updates),
      {
        method: 'post',
      },
    )
  }, [autosaveFetcher])

  const queueOrganisationAutosave = useCallback(
    (
      updates: Partial<OrganisationForm>,
      toastKey = 'apiNotifications.orgSettingsUpdated',
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
        clearPendingAutosave()
        return
      }

      if (!hasOrganisationAutosaveChange(updates)) {
        clearPendingAutosave()
        return
      }

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
        flushOrganisationAutosave()
        return
      }

      autosaveTimeout.current = setTimeout(
        flushOrganisationAutosave,
        AUTOSAVE_DEBOUNCE_MS,
      )
    },
    [
      clearPendingAutosave,
      flushOrganisationAutosave,
      form,
      getValidationErrors,
      hasOrganisationAutosaveChange,
    ],
  )

  const validate = useCallback(() => {
    const allErrors = getValidationErrors(form)
    const valid = _isEmpty(_keys(allErrors))

    setErrors(allErrors)
    setValidated(valid)
  }, [form, getValidationErrors])

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
      flushOrganisationAutosave()
    }
  }, [autosaveFetcher.data, autosaveFetcher.state, flushOrganisationAutosave])

  useEffect(() => {
    if (autosaveFetcher.state !== 'idle' || !autosaveFetcher.data) return
    if (lastHandledAutosaveData.current === autosaveFetcher.data) return
    lastHandledAutosaveData.current = autosaveFetcher.data

    if (autosaveFetcher.data.success) {
      const autosave = activeAutosave.current

      if (autosave) {
        lastSavedForm.current = {
          ...lastSavedForm.current,
          ...autosave.updates,
        }
        toast.success(t(autosave.toastKey))
      }

      activeAutosave.current = null
      if (pendingAutosave.current) {
        flushOrganisationAutosave()
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
      flushOrganisationAutosave()
    }
  }, [
    autosaveFetcher.data,
    autosaveFetcher.state,
    flushOrganisationAutosave,
    t,
  ])

  useEffect(() => {
    validate()
  }, [validate])

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event
    const value = target.type === 'checkbox' ? target.checked : target.value

    setForm((oldForm) => ({
      ...oldForm,
      [target.name]: value,
    }))

    if (isOrganisationTextAutosaveField(target.name)) {
      queueOrganisationAutosave(
        { [target.name]: value } as Partial<OrganisationForm>,
        ORGANISATION_TEXT_AUTOSAVE_TOASTS[target.name],
      )
    }
  }

  const handleInputBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = event.currentTarget

    if (!isOrganisationTextAutosaveField(name)) return

    queueOrganisationAutosave(
      { [name]: value } as Partial<OrganisationForm>,
      ORGANISATION_TEXT_AUTOSAVE_TOASTS[name],
      true,
    )
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setBeenSubmitted(true)

    if (validated) {
      flushOrganisationAutosave()
    }
  }

  const title = `${t('project.settings.settings')} ${form.name}`

  if (error) {
    return (
      <StatusPage
        type='error'
        title={t('apiNotifications.somethingWentWrong')}
        description={t('apiNotifications.errorCode', { error })}
        actions={[
          {
            label: t('dashboard.reloadPage'),
            onClick: () => window.location.reload(),
            primary: true,
          },
          { label: t('notFoundPage.support'), to: routes.contact },
        ]}
      />
    )
  }

  if (!organisation) {
    return (
      <div className='flex min-h-min-footer flex-col bg-gray-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-950'>
        <Loader />
      </div>
    )
  }

  return (
    <div className='flex min-h-min-footer flex-col bg-gray-50 pb-40 dark:bg-slate-950'>
      <div className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
        <Link
          to={routes.organisations}
          className='flex max-w-max items-center text-sm text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-100'
        >
          <CaretLeftIcon className='mr-1 size-3' />
          {t('organisations.backToList')}
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
              id='organisation-settings-tab-select'
              title={currentTabLabel}
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
              groups={sidebarGroups}
              storageKey='organisation-settings-sidebar-groups'
            />
          </aside>
          <section className='flex-1'>
            {activeTab === 'general' && activeTabConfig ? (
              <form onSubmit={handleSubmit}>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />
                <Input
                  name='name'
                  label={t('organisations.name')}
                  hint={t('organisations.nameHint')}
                  value={form.name}
                  className='mt-2'
                  onChange={handleInput}
                  onBlur={handleInputBlur}
                  error={beenSubmitted ? errors.name : null}
                />
              </form>
            ) : null}
            {activeTab === 'people' && activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />
                <People organisation={organisation} />
              </>
            ) : null}
            {activeTab === 'projects' && activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />
                <Projects organisation={organisation} />
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
                  scope='organisation'
                  organisationId={organisation.id}
                  allowedTypes={[
                    'email',
                    'telegram',
                    'discord',
                    'slack',
                    'webhook',
                  ]}
                />
              </>
            ) : null}
            {activeTab === 'danger' && activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />
                <section>
                  <Text as='h3' size='lg' weight='bold'>
                    {t('project.settings.destructiveActions')}
                  </Text>
                  <div className='mt-2 divide-y divide-gray-200 dark:divide-gray-800'>
                    <DangerAction
                      title={t('organisations.delete')}
                      description={t('organisations.modals.delete.message')}
                      action={
                        <Button
                          variant='danger'
                          type='button'
                          onClick={() => !isDeleting && setShowDelete(true)}
                          loading={isDeleting}
                        >
                          {t('organisations.delete')}
                        </Button>
                      }
                    />
                  </div>
                </section>
              </>
            ) : null}
          </section>
        </div>
      </div>
      <Modal
        onClose={() => setShowDelete(false)}
        onSubmit={onDelete}
        submitText={t('organisations.delete')}
        closeText={t('common.close')}
        title={t('organisations.modals.delete.title', {
          organisation: form.name,
        })}
        message={t('organisations.modals.delete.message')}
        submitType='danger'
        type='error'
        isOpened={showDelete}
        isLoading={isDeleting}
      />
    </div>
  )
}

export default OrganisationSettings
