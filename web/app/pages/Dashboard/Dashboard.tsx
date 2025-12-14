import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _size from 'lodash/size'
import { StretchHorizontalIcon, LayoutGridIcon, SearchIcon, XIcon, FolderPlusIcon, CircleXIcon } from 'lucide-react'
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLoaderData, useNavigate, useSearchParams } from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'
import { toast } from 'sonner'

import { getProjects, getLiveVisitors, getOverallStats, createProject } from '~/api'
import DashboardLockedBanner from '~/components/DashboardLockedBanner'
import EventsRunningOutBanner from '~/components/EventsRunningOutBanner'
import { withAuthentication, auth } from '~/hoc/protected'
import useBreakpoint from '~/hooks/useBreakpoint'
import useDebounce from '~/hooks/useDebounce'
import { isSelfhosted, LIVE_VISITORS_UPDATE_INTERVAL, tbPeriodPairs } from '~/lib/constants'
import { Overall, Project } from '~/lib/models/Project'
import { useAuth } from '~/providers/AuthProvider'
import Input from '~/ui/Input'
import Modal from '~/ui/Modal'
import Pagination from '~/ui/Pagination'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import { trackCustom } from '~/utils/analytics'
import { setCookie } from '~/utils/cookie'
import routes from '~/utils/routes'

import { AddProject } from './AddProject'
import { NoProjects } from './NoProjects'
import { PeriodSelector } from './PeriodSelector'
import { ProjectCard, ProjectCardSkeleton } from './ProjectCard'
import { SortSelector, SORT_OPTIONS } from './SortSelector'

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96]

const DASHBOARD_VIEW = {
  GRID: 'grid',
  LIST: 'list',
} as const

const MAX_PROJECT_NAME_LENGTH = 50
const DEFAULT_PROJECT_NAME = 'Untitled Project'

const Dashboard = () => {
  const { viewMode: defaultViewMode } = useLoaderData<any>()
  const { user, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const { t } = useTranslation('common')
  const [isSearchActive, setIsSearchActive] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [showActivateEmailModal, setShowActivateEmailModal] = useState(false)
  const [viewMode, setViewMode] = useState(defaultViewMode)
  const isAboveLgBreakpoint = useBreakpoint('lg')

  const [projects, setProjects] = useState<Project[]>([])
  const [paginationTotal, setPaginationTotal] = useState(0)
  const page = useMemo(() => {
    const pageParam = searchParams.get('page')

    if (!pageParam) {
      return 1
    }

    const parsedPage = parseInt(pageParam, 10)

    if (isNaN(parsedPage)) {
      return 1
    }

    return parsedPage
  }, [searchParams])

  const [pageSize, setPageSize] = useState(() => {
    const pageSizeParam = searchParams.get('pageSize')
    return pageSizeParam && PAGE_SIZE_OPTIONS.includes(parseInt(pageSizeParam, 10))
      ? parseInt(pageSizeParam, 10)
      : PAGE_SIZE_OPTIONS[0]
  })
  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [liveStats, setLiveStats] = useState<Record<string, number>>({})
  const [overallStats, setOverallStats] = useState<Overall>({})

  const [activePeriod, setActivePeriod] = useState(() => {
    const periodParam = searchParams.get('period')
    return periodParam || '7d'
  })

  const [sortBy, setSortBy] = useState(() => {
    const sortParam = searchParams.get('sort')
    return sortParam && Object.values(SORT_OPTIONS).includes(sortParam as any) ? sortParam : SORT_OPTIONS.ALPHA_ASC
  })

  // New project modal state
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectOrganisationId, setNewProjectOrganisationId] = useState<string | undefined>(undefined)
  const [isNewProjectLoading, setIsNewProjectLoading] = useState(false)
  const [newProjectError, setNewProjectError] = useState<string | null>(null)
  const [newProjectBeenSubmitted, setNewProjectBeenSubmitted] = useState(false)

  const organisations = useMemo(
    () => [
      {
        id: undefined as string | undefined,
        name: t('common.notSet'),
      },
      ...(user?.organisationMemberships || [])
        .filter((om) => om.confirmed && (om.role === 'admin' || om.role === 'owner'))
        .map((om) => om.organisation),
    ],
    [user?.organisationMemberships, t],
  )

  const pageAmount = Math.ceil(paginationTotal / pageSize)

  // This search represents what's inside the search input
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)

  // Update URL only when values are explicitly changed
  const updateURL = (params: Record<string, string>) => {
    const newSearchParams = new URLSearchParams(searchParams)
    Object.entries(params).forEach(([key, value]) => {
      newSearchParams.set(key, value)
    })
    setSearchParams(newSearchParams)
  }

  const setPage = (newPage: number) => {
    const newSearchParams = new URLSearchParams(searchParams)
    newSearchParams.set('page', newPage.toString())
    setSearchParams(newSearchParams)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    updateURL({ page: newPage.toString() })
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setPage(1)
    updateURL({ pageSize: size.toString(), page: '1' })
  }

  const handlePeriodChange = (period: string) => {
    setActivePeriod(period)
    setPage(1)
    updateURL({ period, page: '1' })
  }

  const handleSortChange = (sort: string) => {
    setSortBy(sort)
    setPage(1)
    updateURL({ sort, page: '1' })
  }

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    setCookie('dashboard_view', mode, 7884000) // 3 months
  }

  const _viewMode = isAboveLgBreakpoint ? viewMode : 'grid'

  const onNewProject = () => {
    if (!user?.isActive && !isSelfhosted) {
      setShowActivateEmailModal(true)
      return
    }

    setNewProjectModalOpen(true)
  }

  const validateProjectName = () => {
    const errors: { name?: string } = {}

    if (_isEmpty(newProjectName)) {
      errors.name = t('project.settings.noNameError')
    }

    if (_size(newProjectName) > MAX_PROJECT_NAME_LENGTH) {
      errors.name = t('project.settings.pxCharsError', { amount: MAX_PROJECT_NAME_LENGTH })
    }

    return { errors, valid: _isEmpty(_keys(errors)) }
  }

  const onCreateProject = async () => {
    if (isNewProjectLoading) {
      return
    }

    setNewProjectBeenSubmitted(true)
    const { errors, valid } = validateProjectName()

    if (!valid) {
      setNewProjectError(errors.name || null)
      return
    }

    setIsNewProjectLoading(true)

    try {
      await createProject({
        name: newProjectName || DEFAULT_PROJECT_NAME,
        organisationId: newProjectOrganisationId,
      })
      trackCustom('PROJECT_CREATED', {
        from: 'dashboard-modal',
      })

      await refetchProjects()

      toast.success(t('project.settings.created'))
      closeNewProjectModal()
    } catch (reason: unknown) {
      console.error('[ERROR] Error while creating project:', reason)

      const normalizedMessage =
        typeof reason === 'string'
          ? reason
          : (reason as any)?.response?.data?.message ||
            (reason as any)?.message ||
            t('apiNotifications.somethingWentWrong')

      setNewProjectError(normalizedMessage)
      toast.error(normalizedMessage)
    } finally {
      setIsNewProjectLoading(false)
    }
  }

  const closeNewProjectModal = () => {
    if (isNewProjectLoading) {
      return
    }

    setNewProjectModalOpen(false)
    setNewProjectError(null)
    setNewProjectName('')
    setNewProjectOrganisationId(undefined)
    setNewProjectBeenSubmitted(false)
  }

  const refetchProjects = async () => {
    await loadProjects(pageSize, (page - 1) * pageSize, debouncedSearch, activePeriod, sortBy)
  }

  const loadProjects = async (take: number, skip: number, search?: string, period?: string, sort?: string) => {
    if (isLoading) {
      return
    }
    setIsLoading(true)

    try {
      const result = await getProjects(take, skip, search, period, sort)
      setProjects(result.results)
      setPaginationTotal(result.total)
    } catch (reason: any) {
      setError(reason)
    } finally {
      setIsLoading(false)
    }
  }

  // Redirect to onboarding if user hasn't completed it
  useEffect(() => {
    if (user && !user.hasCompletedOnboarding) {
      navigate(routes.onboarding)
      return
    }
  }, [user, navigate])

  useEffect(() => {
    if (authLoading) {
      return
    }

    loadProjects(pageSize, (page - 1) * pageSize, debouncedSearch, activePeriod, sortBy)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, activePeriod, authLoading, sortBy])

  // Set up interval for live visitors
  useEffect(() => {
    const updateLiveVisitors = async () => {
      if (!projects.length) return

      try {
        const projectIds = projects.map((p) => p.id)
        const stats = await getLiveVisitors(projectIds)
        setLiveStats(stats)
      } catch (reason) {
        console.error('Failed to fetch live visitors:', reason)
      }
    }

    const updateOverallStats = async (projectIds: string[]) => {
      if (!projectIds.length) return

      try {
        const timeBucket = tbPeriodPairs(t).find((p) => p.period === activePeriod)?.tbs[0] || ''
        const stats = await getOverallStats(
          projectIds,
          timeBucket,
          activePeriod,
          '',
          '',
          'Etc/GMT',
          '',
          undefined,
          true,
        )
        setOverallStats((prev) => ({ ...prev, ...stats }))
      } catch (reason) {
        console.error('Failed to fetch overall stats:', reason)
      }
    }

    const updateAllOverallStats = async () => {
      await updateOverallStats(projects.map((p) => p.id))
    }

    updateLiveVisitors()
    updateAllOverallStats()

    const interval = setInterval(updateLiveVisitors, LIVE_VISITORS_UPDATE_INTERVAL)

    return () => clearInterval(interval)
  }, [projects, activePeriod, t]) // Reset interval when projects change

  if (error && isLoading === false) {
    return (
      <div className='min-h-page bg-gray-50 px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8 dark:bg-slate-900'>
        <div className='mx-auto max-w-max'>
          <main className='sm:flex'>
            <CircleXIcon className='h-12 w-12 text-red-400' aria-hidden='true' />
            <div className='sm:ml-6'>
              <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
                <Text as='h1' size='4xl' weight='bold' className='sm:text-5xl'>
                  {t('apiNotifications.somethingWentWrong')}
                </Text>
                <Text as='p' size='2xl' weight='medium' colour='secondary' className='mt-4'>
                  {t('apiNotifications.errorCode', { error })}
                </Text>
              </div>
              <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
                <button
                  type='button'
                  onClick={() => window.location.reload()}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700'
                >
                  {t('dashboard.reloadPage')}
                </button>
                <Link
                  to={routes.contact}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
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
        <div className='flex flex-col'>
          <div className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
            <div className='mb-4 flex flex-wrap justify-between gap-2'>
              <div className='flex items-end justify-between'>
                <Text as='h2' size='3xl' weight='bold' className='mt-2 flex items-baseline gap-2'>
                  <span>{t('titles.dashboard')}</span>
                  {isSearchActive ? (
                    <button
                      className='rounded-md border border-transparent bg-gray-50 p-2 transition-colors hover:border-gray-300 hover:bg-white dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800'
                      type='button'
                      onClick={() => {
                        setSearch('')
                        setIsSearchActive(false)
                      }}
                      aria-label={t('common.close')}
                    >
                      <XIcon
                        className='h-5 w-5 cursor-pointer rounded-md text-gray-900 dark:text-gray-50'
                        strokeWidth={1.5}
                      />
                    </button>
                  ) : (
                    <button
                      className='rounded-md border border-transparent bg-gray-50 p-2 transition-colors hover:border-gray-300 hover:bg-white dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800'
                      type='button'
                      onClick={() => {
                        setIsSearchActive(true)
                        setTimeout(() => {
                          searchInputRef.current?.focus()
                        }, 100)
                      }}
                      aria-label={t('project.search')}
                    >
                      <SearchIcon
                        className='h-5 w-5 cursor-pointer rounded-md text-gray-900 dark:text-gray-50'
                        strokeWidth={1.5}
                      />
                    </button>
                  )}
                </Text>
                {isSearchActive ? (
                  <div className='hidden w-full max-w-md items-center px-2 pb-1 sm:ml-2 sm:flex'>
                    <label htmlFor='project-search' className='sr-only'>
                      {t('project.search')}
                    </label>
                    <div className='relative w-full'>
                      <div className='pointer-events-none absolute inset-y-0 left-0 hidden items-center sm:flex'>
                        <SearchIcon
                          className='ml-2 h-5 w-5 cursor-pointer text-gray-900 hover:opacity-80 dark:text-gray-50'
                          strokeWidth={1.5}
                        />
                      </div>
                      <input
                        ref={searchInputRef}
                        type='text'
                        id='project-search'
                        onChange={onSearch}
                        value={search}
                        className='block h-7 w-full rounded-lg border-none bg-gray-50 p-2.5 text-sm text-gray-900 ring-1 ring-gray-300 focus:ring-gray-500 sm:pl-10 dark:bg-slate-900 dark:text-white dark:placeholder-gray-400 dark:ring-slate-600 dark:focus:ring-slate-200'
                        placeholder={t('project.search')}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <PeriodSelector
                  activePeriod={activePeriod}
                  setActivePeriod={handlePeriodChange}
                  isLoading={isLoading === null || isLoading}
                />
                <SortSelector
                  activeSort={sortBy}
                  setActiveSort={handleSortChange}
                  isLoading={isLoading === null || isLoading}
                />
                <div className='hidden lg:block'>
                  {viewMode === DASHBOARD_VIEW.GRID ? (
                    <button
                      type='button'
                      title={t('dashboard.listView')}
                      onClick={() => handleViewModeChange(DASHBOARD_VIEW.LIST)}
                      className='rounded-md border border-transparent bg-gray-50 p-2 transition-colors hover:border-gray-300 hover:bg-white dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800'
                    >
                      <StretchHorizontalIcon className='h-5 w-5 text-gray-700 dark:text-gray-50' />
                    </button>
                  ) : null}
                  {viewMode === DASHBOARD_VIEW.LIST ? (
                    <button
                      type='button'
                      title={t('dashboard.gridView')}
                      onClick={() => {
                        handleViewModeChange(DASHBOARD_VIEW.GRID)
                      }}
                      className='rounded-md border border-transparent bg-gray-50 p-2 transition-colors hover:border-gray-300 hover:bg-white dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800'
                    >
                      <LayoutGridIcon className='h-5 w-5 text-gray-700 dark:text-gray-50' />
                    </button>
                  ) : null}
                </div>
                <button
                  type='button'
                  onClick={onNewProject}
                  className='ml-3 inline-flex cursor-pointer items-center justify-center rounded-md border border-transparent bg-slate-900 p-2 text-center text-sm font-medium text-white transition-colors hover:bg-slate-700 dark:border-gray-800 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
                >
                  <FolderPlusIcon className='mr-1 h-5 w-5' strokeWidth={1.5} />
                  {t('dashboard.newProject')}
                </button>
              </div>
            </div>
            {isSearchActive ? (
              <div className='mb-2 flex w-full items-center sm:hidden'>
                <label htmlFor='project-search' className='sr-only'>
                  {t('project.search')}
                </label>
                <div className='relative w-full'>
                  <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center'>
                    <SearchIcon
                      className='ml-2 h-5 w-5 cursor-pointer text-gray-900 hover:opacity-80 dark:text-gray-50'
                      strokeWidth={1.5}
                    />
                  </div>
                  <input
                    id='project-search'
                    type='text'
                    onChange={onSearch}
                    value={search}
                    className='block h-7 w-full rounded-lg border-none bg-gray-50 p-2.5 py-5 pl-10 text-sm text-gray-900 ring-1 ring-gray-300 focus:ring-gray-500 dark:bg-slate-900 dark:text-white dark:placeholder-gray-400 dark:ring-slate-600 dark:focus:ring-slate-200'
                    placeholder={t('project.search')}
                  />
                </div>
              </div>
            ) : null}
            {isLoading || isLoading === null ? (
              <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
                <ProjectCardSkeleton viewMode={_viewMode} />
              </div>
            ) : (
              <ClientOnly
                fallback={
                  <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
                    <ProjectCardSkeleton viewMode={_viewMode} />
                  </div>
                }
              >
                {() => (
                  <>
                    {_isEmpty(projects) ? (
                      <NoProjects search={debouncedSearch} onClick={onNewProject} />
                    ) : (
                      <div
                        className={cx(
                          'grid gap-3',
                          _viewMode === DASHBOARD_VIEW.GRID ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1',
                        )}
                      >
                        {_map(projects, (project) => (
                          <ProjectCard
                            key={`${project.id}-${project.name}`}
                            project={project}
                            live={liveStats[project.id] ?? (_isEmpty(liveStats) ? null : 'N/A')}
                            overallStats={overallStats[project.id]}
                            activePeriod={activePeriod}
                            viewMode={_viewMode}
                            refetchProjects={refetchProjects}
                          />
                        ))}
                        {_size(projects) % 12 !== 0 ? (
                          <AddProject sitesCount={_size(projects)} onClick={onNewProject} viewMode={_viewMode} />
                        ) : null}
                      </div>
                    )}
                  </>
                )}
              </ClientOnly>
            )}
            {paginationTotal > PAGE_SIZE_OPTIONS[0] ? (
              <Pagination
                className='mt-4'
                page={page}
                pageAmount={pageAmount}
                setPage={handlePageChange}
                total={paginationTotal}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={handlePageSizeChange}
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
      <Modal
        isLoading={isNewProjectLoading}
        onClose={closeNewProjectModal}
        onSubmit={onCreateProject}
        submitText={t('common.continue')}
        overflowVisible
        message={
          <div>
            <Input
              name='project-name-input'
              label={t('project.settings.name')}
              value={newProjectName}
              placeholder='My awesome website'
              onChange={(e) => setNewProjectName(e.target.value)}
              error={newProjectBeenSubmitted ? newProjectError : null}
            />
            {organisations.length > 1 ? (
              <div className='mt-4'>
                <Select
                  items={organisations}
                  keyExtractor={(item) => item.id || 'not-set'}
                  labelExtractor={(item) => {
                    if (item.id === undefined) {
                      return <span className='italic'>{t('common.notSet')}</span>
                    }

                    return item.name
                  }}
                  onSelect={(item) => {
                    setNewProjectOrganisationId(item.id)
                  }}
                  label={t('project.settings.organisation')}
                  title={organisations.find((org) => org.id === newProjectOrganisationId)?.name}
                  selectedItem={organisations.find((org) => org.id === newProjectOrganisationId)}
                />
              </div>
            ) : null}
            <Text as='p' size='sm' colour='muted' className='mt-2 italic'>
              {t('project.settings.createHint')}
            </Text>
          </div>
        }
        title={t('project.settings.create')}
        isOpened={newProjectModalOpen}
        submitDisabled={!newProjectName}
      />
    </>
  )
}

export default withAuthentication(Dashboard, auth.authenticated)
