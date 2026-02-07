import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _size from 'lodash/size'
import {
  FolderSimpleIcon,
  SlidersHorizontalIcon,
  TrashIcon,
  UserCircleIcon,
  WarningOctagonIcon,
} from '@phosphor-icons/react'
import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Link,
  useNavigate,
  useFetcher,
  useLoaderData,
  useSearchParams,
  useRevalidator,
} from 'react-router'
import { toast } from 'sonner'

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
import StatusPage from '~/ui/StatusPage'
import { TabHeader } from '~/ui/TabHeader'
import Select from '~/ui/Select'
import routes from '~/utils/routes'

import People from './People'
import { Projects } from './Projects'

const MAX_NAME_LENGTH = 50

type SettingsTab = 'general' | 'people' | 'projects' | 'danger'

const OrganisationSettings = () => {
  const { t } = useTranslation('common')
  const loaderData = useLoaderData<OrganisationLoaderData>()
  const navigate = useNavigate()
  const fetcher = useFetcher<OrganisationSettingsActionData>()
  const revalidator = useRevalidator()
  const [searchParams, setSearchParams] = useSearchParams()

  const { user } = useAuth()

  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [isFormDirty, setIsFormDirty] = useState(false)

  const organisation = loaderData?.organisation || null
  const error = loaderData?.error

  const [form, setForm] = useState<Pick<DetailedOrganisation, 'name'>>(() => ({
    name: organisation?.name || '',
  }))

  useEffect(() => {
    if (organisation && !isFormDirty) {
      // eslint-disable-next-line
      setForm({ name: organisation.name || '' })
    }
  }, [organisation, isFormDirty])

  const isSaving =
    fetcher.state === 'submitting' &&
    fetcher.formData?.get('intent') === 'update-organisation'
  const isDeleting =
    fetcher.state === 'submitting' &&
    fetcher.formData?.get('intent') === 'delete-organisation'

  useEffect(() => {
    if (fetcher.data?.success) {
      const { intent } = fetcher.data

      if (intent === 'update-organisation') {
        toast.success(t('apiNotifications.orgSettingsUpdated'))
        // eslint-disable-next-line
        setIsFormDirty(false)
        revalidator.revalidate()
      } else if (intent === 'delete-organisation') {
        toast.success(t('apiNotifications.organisationDeleted'))
        setShowDelete(false)
        navigate(routes.organisations)
      } else if (
        intent === 'invite-member' ||
        intent === 'remove-member' ||
        intent === 'update-member-role' ||
        intent === 'add-project' ||
        intent === 'remove-project'
      ) {
        revalidator.revalidate()
      }
    } else if (fetcher.data?.error) {
      toast.error(fetcher.data.error)
      setShowDelete(false)
    }
  }, [fetcher.data, t, navigate, revalidator])

  const isOrganisationOwner = useMemo(() => {
    if (!organisation) {
      return false
    }

    const owner = organisation.members.find((member) => member.role === 'owner')

    return owner?.user?.email === user?.email
  }, [organisation, user])

  const tabs = useMemo(
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
          id: 'danger',
          label: t('organisations.settings.tabs.danger'),
          description: t('organisations.settings.tabs.dangerDesc'),
          icon: WarningOctagonIcon,
          iconColor: 'text-red-500',
          visible: isOrganisationOwner,
        },
      ].filter((tab) => tab.visible),
    [t, isOrganisationOwner],
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

  const onSubmit = (formData: Pick<DetailedOrganisation, 'name'>) => {
    if (fetcher.state === 'submitting') return

    const fd = new FormData()
    fd.set('intent', 'update-organisation')
    fd.set('name', formData.name)
    fetcher.submit(fd, { method: 'post' })
  }

  const onDelete = () => {
    if (fetcher.state === 'submitting') return

    const fd = new FormData()
    fd.set('intent', 'delete-organisation')
    fetcher.submit(fd, { method: 'post' })
  }

  const validate = () => {
    const allErrors: {
      name?: string
      origins?: string
      ipBlacklist?: string
      password?: string
    } = {}

    if (_isEmpty(form.name)) {
      allErrors.name = t('project.settings.noNameError')
    }

    if (_size(form.name) > MAX_NAME_LENGTH) {
      allErrors.name = t('project.settings.pxCharsError', {
        amount: MAX_NAME_LENGTH,
      })
    }

    const valid = _isEmpty(_keys(allErrors))

    setErrors(allErrors)
    setValidated(valid)
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event
    const value = target.type === 'checkbox' ? target.checked : target.value

    setIsFormDirty(true)
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
        <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>
          {title}
        </h2>
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
                return <Icon className='h-4 w-4' />
              }}
              onSelect={(item: any) =>
                setActiveTab(item.id as typeof activeTab)
              }
              selectedItem={tabs.find((tab) => tab.id === activeTab)}
            />
          </div>
          <aside className='hidden w-56 shrink-0 md:block'>
            <nav className='flex flex-col space-y-0.5' aria-label='Sidebar'>
              {tabs.map((tab) => {
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
                  label={t('common.name')}
                  value={form.name}
                  className='mt-2'
                  onChange={handleInput}
                  error={beenSubmitted ? errors.name : null}
                />
                <div className='mt-8 flex flex-wrap justify-center gap-2 sm:justify-between'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Button
                      className='border-indigo-100 dark:border-slate-700/50 dark:bg-slate-900 dark:text-gray-50 dark:hover:bg-slate-700'
                      as={Link}
                      // @ts-expect-error
                      to={routes.organisations}
                      secondary
                      regular
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button type='submit' loading={isSaving} primary regular>
                      {t('common.save')}
                    </Button>
                  </div>
                </div>
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
            {activeTab === 'danger' && activeTabConfig ? (
              <>
                <TabHeader
                  icon={activeTabConfig.icon}
                  label={activeTabConfig.label}
                  description={activeTabConfig.description}
                  iconColorClass={activeTabConfig.iconColor}
                />
                <div className='rounded-lg border border-gray-200 p-5 dark:border-slate-800'>
                  <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-50'>
                    {t('organisations.delete')}
                  </h3>
                  <p className='mt-2 text-sm text-gray-600 dark:text-gray-300'>
                    {t('organisations.modals.delete.message')}
                  </p>
                  <Button
                    className='mt-4'
                    onClick={() => setShowDelete(true)}
                    disabled={isDeleting}
                    danger
                    regular
                  >
                    <TrashIcon className='mr-1 h-5 w-5' />
                    {t('organisations.delete')}
                  </Button>
                </div>
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
