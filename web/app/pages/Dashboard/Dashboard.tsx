import { FolderPlusIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { XCircleIcon } from '@heroicons/react/24/solid'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _size from 'lodash/size'
import { StretchHorizontal as StretchHorizontalIcon, LayoutGrid as LayoutGridIcon } from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLoaderData, useSearchParams } from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'

import { getProjects, getLiveVisitors, getOverallStats, getOverallStatsCaptcha } from '~/api'
import DashboardLockedBanner from '~/components/DashboardLockedBanner'
import EventsRunningOutBanner from '~/components/EventsRunningOutBanner'
import { withAuthentication, auth } from '~/hoc/protected'
import useBreakpoint from '~/hooks/useBreakpoint'
import useDebounce from '~/hooks/useDebounce'
import useFeatureFlag from '~/hooks/useFeatureFlag'
import { isSelfhosted, LIVE_VISITORS_UPDATE_INTERVAL } from '~/lib/constants'
import { Overall, Project } from '~/lib/models/Project'
import { FeatureFlag } from '~/lib/models/User'
import { useAuth } from '~/providers/AuthProvider'
import Modal from '~/ui/Modal'
import Pagination from '~/ui/Pagination'
import { setCookie } from '~/utils/cookie'
import routes from '~/utils/routes'

import { AddProject } from './AddProject'
import { NoProjects } from './NoProjects'
import { PeriodSelector } from './PeriodSelector'
import { ProjectCard, ProjectCardSkeleton } from './ProjectCard'
import { SortSelector, SORT_OPTIONS } from './SortSelector'
import { DASHBOARD_TABS, Tabs } from './Tabs'

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96]

const DASHBOARD_VIEW = {
  GRID: 'grid',
  LIST: 'list',
} as const

const Dashboard = () => {
  const { viewMode: defaultViewMode } = useLoaderData<any>()
  const { user, isLoading: authLoading } = useAuth()
  const showPeriodSelector = useFeatureFlag(FeatureFlag['dashboard-period-selector'])
  const showTabs = useFeatureFlag(FeatureFlag['dashboard-analytics-tabs'])
  const isHostnameNavigationEnabled = useFeatureFlag(FeatureFlag['dashboard-hostname-cards'])
  const [searchParams, setSearchParams] = useSearchParams()

  const { t } = useTranslation('common')
  const [isSearchActive, setIsSearchActive] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [showActivateEmailModal, setShowActivateEmailModal] = useState(false)
  const [viewMode, setViewMode] = useState(defaultViewMode)
  const isAboveLgBreakpoint = useBreakpoint('lg')

  const [projects, setProjects] = useState<Project[]>([])
  const [paginationTotal, setPaginationTotal] = useState(0)
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get('page')
    return pageParam ? parseInt(pageParam, 10) : 1
  })
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

  const [activeTab, setActiveTab] = useState<(typeof DASHBOARD_TABS)[number]['id']>(() => {
    const tabParam = searchParams.get('tab')
    return tabParam && DASHBOARD_TABS.some((tab) => tab.id === tabParam)
      ? (tabParam as (typeof DASHBOARD_TABS)[number]['id'])
      : DASHBOARD_TABS[0].id
  })
  const [activePeriod, setActivePeriod] = useState(() => {
    const periodParam = searchParams.get('period')
    return periodParam || '7d'
  })

  const [sortBy, setSortBy] = useState(() => {
    const sortParam = searchParams.get('sort')
    return sortParam && Object.values(SORT_OPTIONS).includes(sortParam as any) ? sortParam : SORT_OPTIONS.ALPHA_ASC
  })

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

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    updateURL({ page: newPage.toString() })
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setPage(1)
    updateURL({ pageSize: size.toString(), page: '1' })
  }

  const handleTabChange = (newTab: (typeof DASHBOARD_TABS)[number]['id']) => {
    setActiveTab(newTab)
    setPage(1)
    updateURL({ tab: newTab, page: '1' })
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

  const onNewProject = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (user?.isActive || isSelfhosted) {
      return
    }

    e.preventDefault()
    setShowActivateEmailModal(true)
  }

  const loadProjects = async (
    take: number,
    skip: number,
    search?: string,
    tab?: string,
    period?: string,
    isHostnameNavigationEnabled?: boolean,
    sort?: string,
  ) => {
    if (isLoading) {
      return
    }
    setIsLoading(true)

    try {
      const result = await getProjects(take, skip, search, tab, period, isHostnameNavigationEnabled, sort)
      setProjects(result.results)
      setPaginationTotal(result.total)
    } catch (reason: any) {
      setError(reason)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) {
      return
    }

    loadProjects(
      pageSize,
      (page - 1) * pageSize,
      debouncedSearch,
      activeTab,
      activePeriod,
      isHostnameNavigationEnabled,
      sortBy,
    )

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, activeTab, activePeriod, isHostnameNavigationEnabled, authLoading, sortBy])

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
      if (!projectIds.length || isHostnameNavigationEnabled) return

      try {
        const stats = await getOverallStats(projectIds, activePeriod)
        setOverallStats((prev) => ({ ...prev, ...stats }))
      } catch (reason) {
        console.error('Failed to fetch overall stats:', reason)
      }
    }

    const updateOverallStatsCaptcha = async (projectIds: string[]) => {
      if (!projectIds.length) return

      try {
        const stats = await getOverallStatsCaptcha(projectIds, activePeriod)
        setOverallStats((prev) => ({ ...prev, ...stats }))
      } catch (reason) {
        console.error('Failed to fetch overall stats:', reason)
      }
    }

    const updateAllOverallStats = async () => {
      await Promise.all([
        updateOverallStats(projects.filter((p) => p.isAnalyticsProject).map((p) => p.id)),
        updateOverallStatsCaptcha(projects.filter((p) => p.isCaptchaProject).map((p) => p.id)),
      ])
    }

    updateLiveVisitors()
    updateAllOverallStats()

    const interval = setInterval(updateLiveVisitors, LIVE_VISITORS_UPDATE_INTERVAL)

    return () => clearInterval(interval)
  }, [projects, activePeriod, isHostnameNavigationEnabled]) // Reset interval when projects change

  if (error && isLoading === false) {
    return (
      <div className='min-h-page bg-gray-50 px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8 dark:bg-slate-900'>
        <div className='mx-auto max-w-max'>
          <main className='sm:flex'>
            <XCircleIcon className='h-12 w-12 text-red-400' aria-hidden='true' />
            <div className='sm:ml-6'>
              <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
                <h1 className='text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl dark:text-gray-50'>
                  {t('apiNotifications.somethingWentWrong')}
                </h1>
                <p className='mt-4 font-mono text-2xl font-medium tracking-tight text-gray-700 dark:text-gray-200'>
                  {t('apiNotifications.errorCode', { error })}
                </p>
              </div>
              <div className='mt-8 flex space-x-3 font-mono sm:border-l sm:border-transparent sm:pl-6'>
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
            <div className={cx('flex flex-wrap justify-between gap-2', showTabs ? 'mb-2' : 'mb-4')}>
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
                        setTimeout(() => {
                          searchInputRef.current?.focus()
                        }, 100)
                      }}
                    />
                  )}
                </h2>
                {isSearchActive ? (
                  <div className='hidden w-full max-w-md items-center px-2 pb-1 font-mono sm:ml-5 sm:flex'>
                    <label htmlFor='simple-search' className='sr-only'>
                      Search
                    </label>
                    <div className='relative w-full'>
                      <div className='pointer-events-none absolute inset-y-0 left-0 hidden items-center sm:flex'>
                        <MagnifyingGlassIcon className='ml-2 h-5 w-5 cursor-pointer text-gray-900 hover:opacity-80 dark:text-gray-50' />
                      </div>
                      <input
                        ref={searchInputRef}
                        type='text'
                        onChange={onSearch}
                        value={search}
                        className='block h-7 w-full rounded-lg border-none bg-gray-50 p-2.5 text-sm text-gray-900 ring-1 ring-gray-300 focus:ring-gray-500 sm:pl-10 dark:bg-slate-900 dark:text-white dark:placeholder-gray-400 dark:ring-slate-600 dark:focus:ring-slate-200'
                        placeholder={t('project.search')}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              <div className='flex flex-wrap items-center gap-1'>
                {activeTab === 'lost-traffic' ? null : showPeriodSelector ? (
                  <PeriodSelector
                    activePeriod={activePeriod}
                    setActivePeriod={handlePeriodChange}
                    isLoading={isLoading === null || isLoading}
                  />
                ) : null}
                {['high-traffic', 'low-traffic', 'performance'].includes(activeTab) ? null : (
                  <SortSelector
                    activeTab={activeTab}
                    activeSort={sortBy}
                    setActiveSort={handleSortChange}
                    isLoading={isLoading === null || isLoading}
                  />
                )}
                <div className='ml-1 hidden space-x-2 sm:mr-3 lg:block lg:px-3'>
                  <button
                    type='button'
                    title={t('dashboard.gridView')}
                    onClick={() => {
                      handleViewModeChange(DASHBOARD_VIEW.GRID)
                    }}
                    className={cx(
                      'rounded-md fill-gray-700 p-2 text-sm font-medium focus:z-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:fill-gray-50 focus:dark:border-gray-200 focus:dark:ring-gray-200',
                      viewMode === DASHBOARD_VIEW.GRID
                        ? 'bg-gray-100 text-gray-900 dark:bg-slate-700 dark:text-gray-50'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-slate-700',
                    )}
                  >
                    <LayoutGridIcon className='h-5 w-5 [&_path]:stroke-[3.5%]' />
                  </button>
                  <button
                    type='button'
                    title={t('dashboard.listView')}
                    onClick={() => {
                      handleViewModeChange(DASHBOARD_VIEW.LIST)
                    }}
                    className={cx(
                      'rounded-md fill-gray-700 p-2 text-sm font-medium focus:z-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:fill-gray-50 focus:dark:border-gray-200 focus:dark:ring-gray-200',
                      viewMode === DASHBOARD_VIEW.LIST
                        ? 'bg-gray-100 text-gray-900 dark:bg-slate-700 dark:text-gray-50'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-slate-700',
                    )}
                  >
                    <StretchHorizontalIcon className='h-5 w-5' />
                  </button>
                </div>
                <Link
                  to={routes.new_project}
                  onClick={onNewProject}
                  className='inline-flex cursor-pointer items-center justify-center rounded-md border border-transparent bg-slate-900 px-3 py-2 !pl-2 text-center font-mono text-sm leading-4 font-medium text-white hover:bg-slate-700 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:outline-hidden dark:border-gray-800 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
                >
                  <FolderPlusIcon className='mr-1 h-5 w-5' />
                  {t('dashboard.newProject')}
                </Link>
              </div>
            </div>
            {isSearchActive ? (
              <div className='mb-2 flex w-full items-center sm:hidden'>
                <label htmlFor='search-projects' className='sr-only'>
                  Search
                </label>
                <div className='relative w-full'>
                  <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center'>
                    <MagnifyingGlassIcon className='ml-2 h-5 w-5 cursor-pointer text-gray-900 hover:opacity-80 dark:text-gray-50' />
                  </div>
                  <input
                    id='search-projects'
                    type='text'
                    onChange={onSearch}
                    value={search}
                    className='block h-7 w-full rounded-lg border-none bg-gray-50 p-2.5 py-5 pl-10 text-sm text-gray-900 ring-1 ring-gray-300 focus:ring-gray-500 dark:bg-slate-900 dark:text-white dark:placeholder-gray-400 dark:ring-slate-600 dark:focus:ring-slate-200'
                    placeholder={t('project.search')}
                  />
                </div>
              </div>
            ) : null}
            {showTabs ? (
              <Tabs
                activeTab={activeTab}
                setActiveTab={(tab) => {
                  if (typeof tab === 'function') {
                    const newTab = tab(activeTab)
                    handleTabChange(newTab)
                  } else {
                    handleTabChange(tab)
                  }
                }}
                isLoading={isLoading === null || isLoading}
                className='mb-4'
              />
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
                      <NoProjects search={debouncedSearch} activeTab={activeTab} onClick={onNewProject} />
                    ) : (
                      <div
                        className={cx(
                          'grid gap-x-6 gap-y-3',
                          _viewMode === DASHBOARD_VIEW.GRID
                            ? 'grid-cols-1 lg:grid-cols-3 lg:gap-y-6'
                            : 'grid-cols-1 gap-y-3',
                        )}
                      >
                        {_map(projects, (project) => (
                          <ProjectCard
                            key={`${project.id}-${project.name}`}
                            project={project}
                            live={liveStats[project.id] ?? (_isEmpty(liveStats) ? null : 'N/A')}
                            overallStats={overallStats[project.id]}
                            activePeriod={activePeriod}
                            activeTab={activeTab}
                            viewMode={_viewMode}
                          />
                        ))}
                        {_size(projects) % 12 !== 0 && activeTab === 'default' ? (
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
    </>
  )
}

export default withAuthentication(Dashboard, auth.authenticated)
