import React, { memo, useState, useEffect, useMemo } from 'react'
import { Link } from '@remix-run/react'
import { toast } from 'sonner'
import { ClientOnly } from 'remix-utils/client-only'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _isNumber from 'lodash/isNumber'
import _replace from 'lodash/replace'
import _map from 'lodash/map'
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
import { withAuthentication, auth } from 'hoc/protected'
import Loader from 'ui/Loader'
import { Badge, BadgeProps } from 'ui/Badge'
import routes from 'utils/routes'
import { nFormatter, calculateRelativePercentage } from 'utils/generic'
import { isSelfhosted, ENTRIES_PER_PAGE_DASHBOARD, roleViewer } from 'redux/constants'
import EventsRunningOutBanner from 'components/EventsRunningOutBanner'
import DashboardLockedBanner from 'components/DashboardLockedBanner'
import useDebounce from 'hooks/useDebounce'

import { acceptShareProject } from 'api'

import Pagination from 'ui/Pagination'
import { ISharedProject } from 'redux/models/ISharedProject'
import { IProject, ILiveStats, IOverall } from 'redux/models/IProject'
import { IUser } from 'redux/models/IUser'

interface ProjectCardProps {
  birdseye: IOverall
  live?: string | number
  sharedProjects: ISharedProject[]
  setProjectsShareData: (data: Partial<IProject>, id: string) => void
  setUserShareData: (data: Partial<IProject>, id: string) => void
  getRole?: (id: string) => string | null
  project: IProject
}

interface MiniCardProps {
  labelTKey: string
  total?: number | string
  percChange?: number
}

const MiniCard = ({ labelTKey, total = 0, percChange }: MiniCardProps) => {
  const { t } = useTranslation('common')
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
  birdseye,
  live = 'N/A',
  sharedProjects,
  setProjectsShareData,
  setUserShareData,
  getRole,
  project,
}: ProjectCardProps) => {
  const { t } = useTranslation('common')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const role = useMemo(() => getRole && getRole(project.id), [getRole, project.id])

  const { id, name, public: isPublic, active, isTransferring, share, organisation } = project

  const badges = useMemo(() => {
    const list: BadgeProps[] = []

    if (!active) {
      list.push({ colour: 'red', label: t('dashboard.disabled') })
    }

    if (!project.isOwner) {
      if (project.isShareConfirmed) {
        list.push({ colour: 'indigo', label: t('dashboard.shared') })
      } else {
        list.push({ colour: 'yellow', label: t('common.pending') })
      }
    }

    if (project.isCaptchaProject) {
      list.push({ colour: 'indigo', label: t('dashboard.captcha') })
    }

    if (isTransferring) {
      list.push({ colour: 'indigo', label: t('common.transferring') })
    }

    if (isPublic) {
      list.push({ colour: 'green', label: t('dashboard.public') })
    }

    if (organisation) {
      list.push({ colour: 'sky', label: organisation.name })
    }

    const members = _size(share)

    if (members > 0) {
      list.push({ colour: 'slate', label: t('common.xMembers', { number: members + 1 }) })
    }

    return list
  }, [
    t,
    active,
    isTransferring,
    isPublic,
    organisation,
    share,
    project.isShareConfirmed,
    project.isOwner,
    project.isCaptchaProject,
  ])

  const onAccept = async () => {
    // @ts-expect-error
    const pid: string = _find(sharedProjects, (item: ISharedProject) => item.project && item.project.id === id)?.id

    try {
      if (!pid || !id) {
        throw new Error('Project not found')
      }
      await acceptShareProject(pid)
      setProjectsShareData({ isShareConfirmed: true }, id)
      setUserShareData({ isShareConfirmed: true }, pid)
      toast.success(t('apiNotifications.acceptInvitation'))
    } catch (reason: any) {
      toast.error(t('apiNotifications.acceptInvitationError'))
    }
  }

  const onElementClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (project.isOwner || project.isShareConfirmed) {
      return
    }

    e.preventDefault()
    setShowInviteModal(true)
  }

  return (
    <Link
      to={_replace(project.isCaptchaProject ? routes.captcha : routes.project, ':id', id)}
      onClick={onElementClick}
      className='min-h-[153.1px] cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-slate-800/25 dark:bg-slate-800 dark:hover:bg-slate-700'
    >
      <div className='px-4 py-4'>
        <div className='flex items-center justify-between'>
          <p className='truncate text-lg font-semibold text-slate-900 dark:text-gray-50'>{name}</p>

          <div className='flex items-center gap-2' onClick={(e) => e.stopPropagation()}>
            {role !== roleViewer.role && (
              <Link
                to={_replace(project.isCaptchaProject ? routes.captcha_settings : routes.project_settings, ':id', id)}
                aria-label={`${t('project.settings.settings')} ${name}`}
              >
                <AdjustmentsVerticalIcon className='h-6 w-6 text-gray-800 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-500' />
              </Link>
            )}
            <a
              href={_replace(project.isCaptchaProject ? routes.captcha : routes.project, ':id', id)}
              aria-label='name (opens in a new tab)'
              target='_blank'
              rel='noopener noreferrer'
            >
              <ArrowTopRightOnSquareIcon className='h-6 w-6 text-gray-800 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-500' />
            </a>
          </div>
        </div>
        <div className='mt-1 flex flex-shrink-0 flex-wrap gap-2'>
          {badges.length > 0 ? (
            badges.map((badge) => <Badge key={badge.label} {...badge} />)
          ) : (
            <Badge label='I' colour='slate' className='invisible' />
          )}
        </div>
        <div className='mt-4 flex flex-shrink-0 gap-5'>
          {birdseye[id] && (
            <MiniCard
              labelTKey={project.isCaptchaProject ? 'dashboard.captchaEvents' : 'dashboard.pageviews'}
              total={birdseye[id].current.all}
              percChange={calculateRelativePercentage(birdseye[id].previous.all, birdseye[id].current.all)}
            />
          )}
          {project.isAnalyticsProject && <MiniCard labelTKey='dashboard.liveVisitors' total={live} />}
        </div>
      </div>
      {!project.isOwner && !project.isShareConfirmed && (
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
    </Link>
  )
}

interface NoProjectsProps {
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

interface AddProjectProps {
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void
  sitesCount: number
}

const NoProjects = ({ onClick }: NoProjectsProps) => {
  const { t } = useTranslation('common')

  return (
    <Link
      to={routes.new_project}
      onClick={onClick}
      className='relative mx-auto block max-w-lg rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
    >
      <FolderPlusIcon className='mx-auto h-12 w-12 text-gray-400 dark:text-gray-200' />
      <span className='mt-2 block text-sm font-semibold text-gray-900 dark:text-gray-50'>
        {t('dashboard.createProject')}
      </span>
    </Link>
  )
}

const AddProject = ({ onClick, sitesCount }: AddProjectProps) => {
  const { t } = useTranslation('common')

  return (
    <Link
      to={routes.new_project}
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
    </Link>
  )
}

interface DashboardProps {
  projects: IProject[]
  isLoading: boolean
  error: string
  user: IUser
  setProjectsShareData: (data: Partial<ISharedProject>) => void
  setUserShareData: (data: Partial<ISharedProject>) => void
  loadProjects: (take: number, skip: number, search: string) => void
  total: number
  setDashboardPaginationPage: (page: number) => void
  dashboardPaginationPage: number
  liveStats: ILiveStats
  birdseye: IOverall
}

const Dashboard = ({
  projects,
  isLoading,
  error,
  user,
  setProjectsShareData,
  setUserShareData,
  loadProjects,
  total,
  setDashboardPaginationPage,
  dashboardPaginationPage,
  liveStats,
  birdseye,
}: DashboardProps): JSX.Element => {
  const { t } = useTranslation('common')
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false)
  const [showActivateEmailModal, setShowActivateEmailModal] = useState<boolean>(false)
  const pageAmount: number = Math.ceil(total / ENTRIES_PER_PAGE_DASHBOARD)
  // const getRole = (pid: string): string | null =>
  //   _find([..._map(sharedProjects, (item) => ({ ...item.project, role: item.role }))], (p) => p.id === pid)?.role ||
  //   null
  // This search represents what's inside the search input
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)

  const onNewProject = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (user.isActive || isSelfhosted) {
      return
    }

    e.preventDefault()
    setShowActivateEmailModal(true)
  }

  useEffect(() => {
    loadProjects(
      ENTRIES_PER_PAGE_DASHBOARD,
      (dashboardPaginationPage - 1) * ENTRIES_PER_PAGE_DASHBOARD,
      debouncedSearch,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardPaginationPage, debouncedSearch])

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
              <Link
                to={routes.new_project}
                onClick={onNewProject}
                className='inline-flex cursor-pointer items-center justify-center rounded-md border border-transparent bg-slate-900 px-3 py-2 !pl-2 text-center text-sm font-medium leading-4 text-white shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:border-gray-800 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
              >
                <FolderPlusIcon className='mr-1 h-5 w-5' />
                {t('dashboard.newProject')}
              </Link>
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
                    {_isEmpty(_filter(projects, ({ uiHidden }) => !uiHidden)) ? (
                      <NoProjects onClick={onNewProject} />
                    ) : (
                      <div className='grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-3 lg:gap-y-6'>
                        {_map(
                          _filter(projects, ({ uiHidden }) => !uiHidden),
                          (project) => (
                            <ProjectCard
                              key={project.id}
                              project={project}
                              birdseye={birdseye}
                              live={_isNumber(liveStats[project.id]) ? liveStats[project.id] : 'N/A'}
                              setUserShareData={() => {}}
                              sharedProjects={[]}
                              setProjectsShareData={() => {}}
                            />
                          ),
                        )}
                        <AddProject
                          sitesCount={_size(_filter(projects, ({ uiHidden }) => !uiHidden))}
                          onClick={onNewProject}
                        />
                      </div>
                    )}
                  </>
                )}
              </ClientOnly>
            )}
            {pageAmount > 1 ? (
              <Pagination
                className='mt-2'
                page={dashboardPaginationPage}
                pageAmount={pageAmount}
                setPage={setDashboardPaginationPage}
                total={total}
              />
            ) : null}
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
