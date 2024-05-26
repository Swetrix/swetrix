import React, { memo, useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from '@remix-run/react'
import type i18next from 'i18next'
import { ClientOnly } from 'remix-utils/client-only'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _isNumber from 'lodash/isNumber'
import _replace from 'lodash/replace'
import _map from 'lodash/map'
import _isUndefined from 'lodash/isUndefined'
import _filter from 'lodash/filter'
import _find from 'lodash/find'
import { useTranslation } from 'react-i18next'
import {
  FolderPlusIcon,
  AdjustmentsVerticalIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { XCircleIcon } from '@heroicons/react/24/solid'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid'

import Modal from 'ui/Modal'
import Select from 'ui/Select'
import { withAuthentication, auth } from 'hoc/protected'
import Loader from 'ui/Loader'
import { Badge } from 'ui/Badge'
import routes from 'routesPath'
import { nFormatter, calculateRelativePercentage } from 'utils/generic'
import {
  isSelfhosted,
  ENTRIES_PER_PAGE_DASHBOARD,
  tabForOwnedProject,
  tabForSharedProject,
  tabForCaptchaProject,
  DASHBOARD_TABS,
  tabsForDashboard,
  roleViewer,
} from 'redux/constants'
import EventsRunningOutBanner from 'components/EventsRunningOutBanner'
import DashboardLockedBanner from 'components/DashboardLockedBanner'
import useDebounce from 'hooks/useDebounce'

import { acceptShareProject } from 'api'

import Pagination from 'ui/Pagination'
import { ISharedProject } from 'redux/models/ISharedProject'
import { IProject, ICaptchaProject, ILiveStats, IOverall } from 'redux/models/IProject'
import { IUser } from 'redux/models/IUser'

interface IProjectCard {
  name?: string
  active?: boolean
  birdseye: IOverall
  type: 'analytics' | 'captcha'
  t: typeof i18next.t
  live?: string | number
  isPublic?: boolean
  confirmed?: boolean
  id: string
  deleteProjectFailed: (message: string) => void
  sharedProjects: ISharedProject[]
  setProjectsShareData: (data: Partial<ISharedProject>, id: string, shared?: boolean) => void
  setUserShareData: (data: Partial<ISharedProject>, id: string) => void
  shared?: boolean
  userSharedUpdate: (message: string) => void
  sharedProjectError: (message: string) => void
  captcha?: boolean
  isTransferring?: boolean
  getRole?: (id: string) => string | null
  members?: number
}

interface IMiniCard {
  labelTKey: string
  t: typeof i18next.t
  total?: number | string
  percChange?: number
}

const MiniCard = ({ labelTKey, t, total = 0, percChange }: IMiniCard): JSX.Element => {
  const statsDidGrowUp = percChange ? percChange >= 0 : false

  return (
    <div>
      <p className='text-sm text-gray-500 dark:text-gray-300'>{t(labelTKey)}</p>

      <div className='flex font-bold'>
        <p className='text-xl text-gray-700 dark:text-gray-100'>{_isNumber(total) ? nFormatter(total) : total}</p>
        {_isNumber(percChange) && (
          <p
            className={cx('flex items-center text-xs', {
              'text-green-600': statsDidGrowUp,
              'text-red-600': !statsDidGrowUp,
            })}
          >
            {statsDidGrowUp ? (
              <>
                <ChevronUpIcon className='h-4 w-4 flex-shrink-0 self-center text-green-500' />
                <span className='sr-only'>{t('dashboard.inc')}</span>
              </>
            ) : (
              <>
                <ChevronDownIcon className='h-4 w-4 flex-shrink-0 self-center text-red-500' />
                <span className='sr-only'>{t('dashboard.dec')}</span>
              </>
            )}
            {nFormatter(percChange)}%
          </p>
        )}
      </div>
    </div>
  )
}

const ProjectCard = ({
  name,
  active,
  birdseye,
  t,
  live = 'N/A',
  isPublic,
  confirmed,
  id,
  deleteProjectFailed,
  sharedProjects,
  setProjectsShareData,
  setUserShareData,
  shared,
  userSharedUpdate,
  sharedProjectError,
  captcha,
  isTransferring,
  type,
  getRole,
  members,
}: IProjectCard): JSX.Element => {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const role = useMemo(() => getRole && getRole(id), [getRole, id])
  const navigate = useNavigate()

  const onAccept = async () => {
    // @ts-ignore
    const pid: string = _find(sharedProjects, (item: ISharedProject) => item.project && item.project.id === id)?.id

    try {
      if (!pid || !id) {
        throw new Error('Project not found')
      }
      await acceptShareProject(pid)
      setProjectsShareData({ confirmed: true }, id, true)
      setUserShareData({ confirmed: true }, pid)
      userSharedUpdate(t('apiNotifications.acceptInvitation'))
    } catch (e) {
      sharedProjectError(t('apiNotifications.acceptInvitationError'))
      // @ts-ignore
      deleteProjectFailed(e)
    }
  }

  const onElementClick = (e: React.MouseEvent<HTMLLIElement>) => {
    if (confirmed) {
      return
    }

    e.stopPropagation()
    e.preventDefault()
    setShowInviteModal(true)
  }

  return (
    <div
      onClick={() => {
        navigate(_replace(type === 'analytics' ? routes.project : routes.captcha, ':id', id))
      }}
    >
      <li
        onClick={onElementClick}
        className='cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-slate-800/25 dark:bg-slate-800 dark:hover:bg-slate-700'
      >
        <div className='px-4 py-4'>
          <div className='flex items-center justify-between'>
            <p className='truncate text-lg font-semibold text-slate-900 dark:text-gray-50'>{name}</p>

            <div className='flex items-center gap-2' onClick={(e) => e.stopPropagation()}>
              {role !== roleViewer.role && (
                <Link
                  to={_replace(type === 'analytics' ? routes.project_settings : routes.captcha_settings, ':id', id)}
                  aria-label={`${t('project.settings.settings')} ${name}`}
                >
                  <AdjustmentsVerticalIcon className='h-6 w-6 text-gray-800 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-500' />
                </Link>
              )}
              <a
                href={_replace(type === 'analytics' ? routes.project : routes.captcha, ':id', id)}
                aria-label='name (opens in a new tab)'
                target='_blank'
                rel='noopener noreferrer'
              >
                <ArrowTopRightOnSquareIcon className='h-6 w-6 text-gray-800 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-500' />
              </a>
            </div>
          </div>
          <div className='mt-1 flex flex-shrink-0 flex-wrap gap-2'>
            {active ? (
              <Badge colour='green' label={t('dashboard.active')} />
            ) : (
              <Badge colour='red' label={t('dashboard.disabled')} />
            )}
            {shared &&
              (confirmed ? (
                <Badge colour='green' label={t('dashboard.shared')} />
              ) : (
                <Badge colour='yellow' label={t('common.pending')} />
              ))}
            {isTransferring && <Badge colour='indigo' label={t('common.transferring')} />}
            {isPublic && <Badge colour='green' label={t('dashboard.public')} />}
            {!isSelfhosted && _isNumber(members) && (
              <Badge
                colour='slate'
                label={
                  members === 1
                    ? t('common.oneMember')
                    : t('common.xMembers', {
                        number: members,
                      })
                }
              />
            )}
          </div>
          <div className='mt-4 flex flex-shrink-0 gap-5'>
            {birdseye[id] && (
              <MiniCard
                labelTKey={captcha ? 'dashboard.captchaEvents' : 'dashboard.pageviews'}
                t={t}
                total={birdseye[id].current.all}
                percChange={calculateRelativePercentage(birdseye[id].previous.all, birdseye[id].current.all)}
              />
            )}
            {!captcha && <MiniCard labelTKey='dashboard.liveVisitors' t={t} total={live} />}
          </div>
        </div>
        {!confirmed && (
          <Modal
            onClose={() => {
              setShowInviteModal(false)
            }}
            onSubmit={() => {
              setShowInviteModal(false)
              onAccept()
            }}
            submitText={t('common.accept')}
            type='confirmed'
            closeText={t('common.cancel')}
            title={t('dashboard.invitationFor', { project: name })}
            message={t('dashboard.invitationDesc', { project: name })}
            isOpened={showInviteModal}
          />
        )}
      </li>
    </div>
  )
}

interface INoProjects {
  t: typeof i18next.t
  onClick: () => void
}

interface IAddProject {
  t: typeof i18next.t
  onClick: () => void
  sitesCount: number
}

const NoProjects = ({ t, onClick }: INoProjects): JSX.Element => (
  <button
    type='button'
    onClick={onClick}
    className='relative mx-auto block max-w-lg rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
  >
    <FolderPlusIcon className='mx-auto h-12 w-12 text-gray-400 dark:text-gray-200' />
    <span className='mt-2 block text-sm font-semibold text-gray-900 dark:text-gray-50'>
      {t('dashboard.createProject')}
    </span>
  </button>
)

const AddProject = ({ t, onClick, sitesCount }: IAddProject): JSX.Element => (
  <li
    onClick={onClick}
    className={cx(
      'group flex h-auto min-h-[153.1px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400',
      {
        'lg:min-h-[auto]': sitesCount % 3 !== 0,
      },
    )}
  >
    <div>
      <FolderPlusIcon className='mx-auto h-12 w-12 text-gray-400 group-hover:text-gray-500 dark:text-gray-200 group-hover:dark:text-gray-400' />
      <span className='mt-2 block text-sm font-semibold text-gray-900 dark:text-gray-50 group-hover:dark:text-gray-400'>
        {t('dashboard.newProject')}
      </span>
    </div>
  </li>
)

interface DashboardProps {
  projects: IProject[]
  isLoading: boolean
  error: string
  user: IUser
  deleteProjectFailed: (error: string) => void
  setProjectsShareData: (data: Partial<ISharedProject>) => void
  setUserShareData: (data: Partial<ISharedProject>) => void
  userSharedUpdate: (message: string) => void
  sharedProjectError: (error: string) => void
  loadProjects: (take: number, skip: number, search: string) => void
  loadSharedProjects: (take: number, skip: number, search: string) => void
  total: number
  setDashboardPaginationPage: (page: number) => void
  dashboardPaginationPage: number
  sharedProjects: ISharedProject[]
  dashboardTabs: string
  setDashboardTabs: (tab: string) => void
  sharedTotal: number
  setDashboardPaginationPageShared: (page: number) => void
  dashboardPaginationPageShared: number
  captchaProjects: ICaptchaProject[]
  captchaTotal: number
  dashboardPaginationPageCaptcha: number
  setDashboardPaginationPageCaptcha: (page: number) => void
  loadProjectsCaptcha: (take: number, skip: number, search: string) => void
  liveStats: ILiveStats
  birdseye: IOverall
}

const Dashboard = ({
  projects,
  isLoading,
  error,
  user,
  deleteProjectFailed,
  setProjectsShareData,
  setUserShareData,
  userSharedUpdate,
  sharedProjectError,
  loadProjects,
  loadSharedProjects,
  total,
  setDashboardPaginationPage,
  dashboardPaginationPage,
  sharedProjects,
  dashboardTabs,
  setDashboardTabs,
  sharedTotal,
  setDashboardPaginationPageShared,
  dashboardPaginationPageShared,
  captchaProjects,
  captchaTotal,
  dashboardPaginationPageCaptcha,
  setDashboardPaginationPageCaptcha,
  loadProjectsCaptcha,
  liveStats,
  birdseye,
}: DashboardProps): JSX.Element => {
  const { t } = useTranslation('common')
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false)
  const [showActivateEmailModal, setShowActivateEmailModal] = useState<boolean>(false)
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<string>(dashboardTabs)
  const pageAmountShared: number = Math.ceil(sharedTotal / ENTRIES_PER_PAGE_DASHBOARD)
  const pageAmount: number = Math.ceil(total / ENTRIES_PER_PAGE_DASHBOARD)
  const pageAmountCaptcha: number = Math.ceil(captchaTotal / ENTRIES_PER_PAGE_DASHBOARD)
  const getRole = (pid: string): string | null =>
    _find([..._map(sharedProjects, (item) => ({ ...item.project, role: item.role }))], (p) => p.id === pid)?.role ||
    null
  // This search represents what's inside the search input
  const [search, setSearch] = useState<string>('')
  const debouncedSearch = useDebounce<string>(search, 500)

  const onNewProject = () => {
    if (user.isActive || isSelfhosted) {
      if (dashboardTabs === tabForCaptchaProject) {
        navigate(routes.new_captcha)
      } else {
        navigate(routes.new_project)
      }
    } else {
      setShowActivateEmailModal(true)
    }
  }

  useEffect(() => {
    if (sharedTotal <= 0 && activeTab === tabForSharedProject) {
      setDashboardTabs(tabForOwnedProject)
      setActiveTab(tabForOwnedProject)
    }

    setDashboardTabs(activeTab)
  }, [activeTab, setDashboardTabs, sharedTotal])

  useEffect(() => {
    setSearch('')
  }, [activeTab])

  useEffect(() => {
    if (activeTab === tabForOwnedProject) {
      loadProjects(
        ENTRIES_PER_PAGE_DASHBOARD,
        (dashboardPaginationPage - 1) * ENTRIES_PER_PAGE_DASHBOARD,
        debouncedSearch,
      )
    }
    if (activeTab === tabForSharedProject) {
      loadSharedProjects(
        ENTRIES_PER_PAGE_DASHBOARD,
        (dashboardPaginationPageShared - 1) * ENTRIES_PER_PAGE_DASHBOARD,
        debouncedSearch,
      )
    }
    if (activeTab === tabForCaptchaProject) {
      loadProjectsCaptcha(
        ENTRIES_PER_PAGE_DASHBOARD,
        (dashboardPaginationPageCaptcha - 1) * ENTRIES_PER_PAGE_DASHBOARD,
        debouncedSearch,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardPaginationPage, dashboardPaginationPageShared, debouncedSearch])

  const dashboardLocTabs = useMemo(() => {
    if (sharedTotal <= 0) {
      return [
        {
          id: DASHBOARD_TABS.owned,
          name: tabForOwnedProject,
          label: t('profileSettings.owned'),
        },
        {
          id: DASHBOARD_TABS.captcha,
          name: tabForCaptchaProject,
          label: t('profileSettings.captcha'),
        },
      ]
    }

    return [
      {
        id: DASHBOARD_TABS.owned,
        name: tabForOwnedProject,
        label: t('profileSettings.owned'),
      },
      {
        id: DASHBOARD_TABS.shared,
        name: tabForSharedProject,
        label: t('profileSettings.shared'),
      },
      {
        id: DASHBOARD_TABS.captcha,
        name: tabForCaptchaProject,
        label: t('profileSettings.captcha'),
      },
    ]
  }, [t, sharedTotal])

  const activeTabLabel = useMemo(() => {
    return _find(dashboardLocTabs, (tab) => tab.name === activeTab)?.label
  }, [dashboardLocTabs, activeTab])

  if (error && !isLoading) {
    return (
      <div className='min-h-page bg-gray-50 px-4 py-16 dark:bg-slate-900 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
        <div className='mx-auto max-w-max'>
          <main className='sm:flex'>
            <XCircleIcon className='h-12 w-12 text-red-400' aria-hidden='true' />
            <div className='sm:ml-6'>
              <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
                <h1 className='text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl'>
                  {t('apiNotifications.somethingWentWrong')}
                </h1>
                <p className='mt-4 text-2xl font-medium tracking-tight text-gray-700 dark:text-gray-200'>
                  {t('apiNotifications.errorCode', { error })}
                </p>
              </div>
              <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
                <button
                  type='button'
                  onClick={() => window.location.reload()}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                >
                  {t('dashboard.reloadPage')}
                </button>
                <Link
                  to={routes.contact}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700 dark:focus:ring-gray-50'
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

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  return (
    <>
      <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
        <EventsRunningOutBanner />
        <DashboardLockedBanner />
        <div className='flex flex-col px-4 py-6 sm:px-6 lg:px-8'>
          <div className='mx-auto w-full max-w-7xl'>
            <div className='mb-6 flex justify-between'>
              <div className='flex items-end justify-between'>
                <h2 className='mt-2 flex items-baseline text-3xl font-bold text-gray-900 dark:text-gray-50'>
                  {t('titles.dashboard')}
                  {isSearchActive ? (
                    <XMarkIcon
                      className='ml-2 h-5 w-5 cursor-pointer text-gray-900 hover:opacity-80 dark:text-gray-50'
                      onClick={() => {
                        setSearch('')
                        setIsSearchActive(false)
                      }}
                    />
                  ) : (
                    <MagnifyingGlassIcon
                      className='ml-2 h-5 w-5 cursor-pointer text-gray-900 hover:opacity-80 dark:text-gray-50'
                      onClick={() => {
                        setIsSearchActive(true)
                      }}
                    />
                  )}
                </h2>
                {isSearchActive && (
                  <div className='hidden w-full max-w-md items-center px-2 pb-1 sm:ml-5 sm:flex'>
                    <label htmlFor='simple-search' className='sr-only'>
                      Search
                    </label>
                    <div className='relative w-full'>
                      <div className='pointer-events-none absolute inset-y-0 left-0 hidden items-center sm:flex'>
                        <MagnifyingGlassIcon className='ml-2 h-5 w-5 cursor-pointer text-gray-900 hover:opacity-80 dark:text-gray-50' />
                      </div>
                      <input
                        type='text'
                        onChange={onSearch}
                        value={search}
                        className='block h-7 w-full rounded-lg border-none bg-gray-50 p-2.5 text-sm text-gray-900 ring-1 ring-gray-300 focus:ring-gray-500 dark:bg-slate-900 dark:text-white dark:placeholder-gray-400 dark:ring-slate-600 dark:focus:ring-slate-200 sm:pl-10'
                        placeholder={t('project.search')}
                      />
                    </div>
                  </div>
                )}
              </div>
              <span
                onClick={onNewProject}
                className='inline-flex cursor-pointer items-center justify-center rounded-md border border-transparent bg-slate-900 px-3 py-2 !pl-2 text-center text-sm font-medium leading-4 text-white shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:border-gray-800 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
              >
                <FolderPlusIcon className='mr-1 h-5 w-5' />
                {activeTab === tabForCaptchaProject ? t('dashboard.newCaptchaProject') : t('dashboard.newProject')}
              </span>
            </div>
            {isSearchActive && (
              <div className='mb-2 flex w-full items-center sm:hidden'>
                <label htmlFor='simple-search' className='sr-only'>
                  Search
                </label>
                <div className='relative w-full'>
                  <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center'>
                    <MagnifyingGlassIcon className='ml-2 h-5 w-5 cursor-pointer text-gray-900 hover:opacity-80 dark:text-gray-50' />
                  </div>
                  <input
                    type='text'
                    onChange={onSearch}
                    value={search}
                    className='block h-7 w-full rounded-lg border-none bg-gray-50 p-2.5 py-5 pl-10 text-sm text-gray-900 ring-1 ring-gray-300 focus:ring-gray-500 dark:bg-slate-900 dark:text-white dark:placeholder-gray-400 dark:ring-slate-600 dark:focus:ring-slate-200'
                    placeholder={t('project.search')}
                  />
                </div>
              </div>
            )}
            {!isSelfhosted && (
              <div className='mb-2'>
                {/* Dashboard tabs selector */}
                <div>
                  <div className='mb-2 sm:hidden'>
                    <Select
                      items={dashboardLocTabs}
                      keyExtractor={(item) => item.id}
                      labelExtractor={(item) => item.label}
                      onSelect={(label) => {
                        const nameTab = _find(dashboardLocTabs, (tab) => t(tab.label) === label)?.name
                        if (nameTab) {
                          setActiveTab(nameTab)
                        }
                      }}
                      title={activeTabLabel}
                      capitalise
                    />
                  </div>
                  <div className='hidden sm:block'>
                    <nav className='-mb-px flex space-x-8'>
                      {_map(tabsForDashboard, (tab) => {
                        if (tab.name === tabForSharedProject && sharedTotal <= 0) {
                          return null
                        }

                        return (
                          <button
                            key={tab.name}
                            type='button'
                            onClick={() => setActiveTab(tab.name)}
                            className={cx('text-md whitespace-nowrap border-b-2 px-1 pb-4 font-medium', {
                              'border-slate-900 text-slate-900 dark:border-gray-50 dark:text-gray-50':
                                activeTab === tab.name,
                              'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-300 dark:hover:text-gray-300':
                                activeTab !== tab.name,
                            })}
                            aria-current={tab.name === activeTab ? 'page' : undefined}
                          >
                            {t(tab.label)}
                          </button>
                        )
                      })}
                    </nav>
                  </div>
                </div>
              </div>
            )}
            {isLoading ? (
              <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
                <Loader />
              </div>
            ) : (
              <ClientOnly
                fallback={
                  <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
                    <Loader />
                  </div>
                }
              >
                {() => (
                  <>
                    {activeTab === tabForOwnedProject && (
                      <div>
                        {_isEmpty(_filter(projects, ({ uiHidden }) => !uiHidden)) ? (
                          <NoProjects t={t} onClick={onNewProject} />
                        ) : (
                          <ul className='grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-3 lg:gap-y-6'>
                            {_map(
                              _filter(projects, ({ uiHidden }) => !uiHidden),
                              ({ name, id, active, public: isPublic, isTransferring, share }) => (
                                <ProjectCard
                                  key={id}
                                  members={1 + _size(share)}
                                  id={id}
                                  type='analytics'
                                  t={t}
                                  name={name}
                                  active={active}
                                  isPublic={isPublic}
                                  birdseye={birdseye}
                                  live={_isNumber(liveStats[id]) ? liveStats[id] : 'N/A'}
                                  setUserShareData={() => {}}
                                  deleteProjectFailed={() => {}}
                                  userSharedUpdate={() => {}}
                                  sharedProjects={[]}
                                  setProjectsShareData={() => {}}
                                  sharedProjectError={() => {}}
                                  isTransferring={isTransferring}
                                  confirmed
                                />
                              ),
                            )}
                            <AddProject
                              sitesCount={_size(_filter(projects, ({ uiHidden }) => !uiHidden))}
                              t={t}
                              onClick={onNewProject}
                            />
                          </ul>
                        )}
                      </div>
                    )}

                    {activeTab === tabForCaptchaProject && (
                      <div>
                        {_isEmpty(_filter(captchaProjects, ({ uiHidden }) => !uiHidden)) ? (
                          <NoProjects t={t} onClick={onNewProject} />
                        ) : (
                          <ul className='grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-3 lg:gap-y-6'>
                            {_map(
                              _filter(captchaProjects, ({ uiHidden }) => !uiHidden),
                              ({ name, id, active, public: isPublic }) => (
                                <ProjectCard
                                  t={t}
                                  key={id}
                                  id={id}
                                  type='captcha'
                                  name={name}
                                  captcha
                                  active={active}
                                  isPublic={isPublic}
                                  birdseye={birdseye}
                                  live={_isNumber(liveStats[id]) ? liveStats[id] : 'N/A'}
                                  deleteProjectFailed={() => {}}
                                  sharedProjects={[]}
                                  setProjectsShareData={() => {}}
                                  setUserShareData={() => {}}
                                  userSharedUpdate={() => {}}
                                  sharedProjectError={() => {}}
                                  confirmed
                                />
                              ),
                            )}
                            <AddProject
                              sitesCount={_size(_filter(captchaProjects, ({ uiHidden }) => !uiHidden))}
                              t={t}
                              onClick={onNewProject}
                            />
                          </ul>
                        )}
                      </div>
                    )}

                    {activeTab === tabForSharedProject && (
                      <div>
                        {_isEmpty(_filter(sharedProjects, ({ uiHidden }) => !uiHidden)) ? (
                          <NoProjects t={t} onClick={onNewProject} />
                        ) : (
                          <ul className='grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-3 lg:gap-y-6'>
                            {_map(
                              _filter(sharedProjects, ({ uiHidden }) => !uiHidden),
                              ({ project, confirmed }) => {
                                if (_isUndefined(confirmed) || confirmed) {
                                  return (
                                    <ProjectCard
                                      t={t}
                                      key={`${project?.id}-confirmed`}
                                      type='analytics'
                                      id={project?.id}
                                      name={project?.name}
                                      shared
                                      getRole={getRole}
                                      active={project?.active}
                                      isPublic={project?.public}
                                      confirmed={confirmed}
                                      birdseye={birdseye}
                                      live={_isNumber(liveStats[project.id]) ? liveStats[project.id] : 'N/A'}
                                      setUserShareData={() => {}}
                                      deleteProjectFailed={() => {}}
                                      sharedProjects={[]}
                                      setProjectsShareData={() => {}}
                                      userSharedUpdate={() => {}}
                                      sharedProjectError={() => {}}
                                    />
                                  )
                                }

                                return (
                                  <ProjectCard
                                    t={t}
                                    key={project?.id}
                                    id={project?.id}
                                    type='analytics'
                                    name={project?.name}
                                    shared
                                    getRole={getRole}
                                    active={project?.active}
                                    isPublic={project?.public}
                                    birdseye={birdseye}
                                    confirmed={confirmed}
                                    sharedProjects={user.sharedProjects}
                                    setProjectsShareData={setProjectsShareData}
                                    setUserShareData={setUserShareData}
                                    live={_isNumber(liveStats[project.id]) ? liveStats[project.id] : 'N/A'}
                                    userSharedUpdate={userSharedUpdate}
                                    sharedProjectError={sharedProjectError}
                                    deleteProjectFailed={deleteProjectFailed}
                                  />
                                )
                              },
                            )}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )}
              </ClientOnly>
            )}
            {activeTab === tabForOwnedProject && pageAmount > 1 && (
              <Pagination
                className='mt-2'
                page={dashboardPaginationPage}
                pageAmount={pageAmount}
                setPage={setDashboardPaginationPage}
                total={total}
              />
            )}
            {activeTab === tabForSharedProject && pageAmountShared > 1 && (
              <Pagination
                className='mt-2'
                page={dashboardPaginationPageShared}
                pageAmount={pageAmountShared}
                setPage={setDashboardPaginationPageShared}
                total={sharedTotal}
              />
            )}
            {activeTab === tabForCaptchaProject && pageAmountCaptcha > 1 && (
              <Pagination
                className='mt-2'
                page={dashboardPaginationPageCaptcha}
                pageAmount={pageAmountCaptcha}
                setPage={setDashboardPaginationPageCaptcha}
                total={captchaTotal}
              />
            )}
          </div>
        </div>
      </div>
      <Modal
        onClose={() => setShowActivateEmailModal(false)}
        onSubmit={() => setShowActivateEmailModal(false)}
        submitText={t('common.gotIt')}
        title={t('dashboard.verifyEmailTitle')}
        type='info'
        message={t('dashboard.verifyEmailDesc')}
        isOpened={showActivateEmailModal}
      />
    </>
  )
}

export default memo(withAuthentication(Dashboard, auth.authenticated))
