import React, { useState, useEffect } from 'react'
import { Link } from '@remix-run/react'
import { ClientOnly } from 'remix-utils/client-only'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _map from 'lodash/map'
import { useTranslation } from 'react-i18next'
import { FolderPlusIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { XCircleIcon } from '@heroicons/react/24/solid'

import Modal from 'ui/Modal'
import { withAuthentication, auth } from 'hoc/protected'
import Loader from 'ui/Loader'
import routes from 'utils/routes'
import { isSelfhosted, ENTRIES_PER_PAGE_DASHBOARD, LIVE_VISITORS_UPDATE_INTERVAL } from 'lib/constants'
import EventsRunningOutBanner from 'components/EventsRunningOutBanner'
import DashboardLockedBanner from 'components/DashboardLockedBanner'
import useDebounce from 'hooks/useDebounce'

import Pagination from 'ui/Pagination'
import { useSelector } from 'react-redux'
import { StateType } from 'lib/store'
import { ProjectCard } from './ProjectCard'
import { NoProjects } from './NoProjects'
import { AddProject } from './AddProject'
import { Overall, Project } from 'lib/models/Project'
import { getProjects, getLiveVisitors, getOverallStats, getOverallStatsCaptcha } from 'api'

const Dashboard = () => {
  const { user } = useSelector((state: StateType) => state.auth)

  const { t } = useTranslation('common')
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [showActivateEmailModal, setShowActivateEmailModal] = useState(false)

  const [projects, setProjects] = useState<Project[]>([])
  const [paginationTotal, setPaginationTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [liveStats, setLiveStats] = useState<Record<string, number>>({})
  const [overallStats, setOverallStats] = useState<Overall>({})

  const pageAmount = Math.ceil(paginationTotal / ENTRIES_PER_PAGE_DASHBOARD)

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

  const loadProjects = async (take: number, skip: number, search?: string) => {
    if (isLoading) {
      return
    }
    setIsLoading(true)

    try {
      const result = await getProjects(take, skip, search)
      setProjects(result.results)
      setPaginationTotal(result.total)
    } catch (reason: any) {
      setError(reason)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProjects(ENTRIES_PER_PAGE_DASHBOARD, (page - 1) * ENTRIES_PER_PAGE_DASHBOARD, debouncedSearch)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch])

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
        const stats = await getOverallStats(projectIds, '7d')
        setOverallStats(stats)
      } catch (reason) {
        console.error('Failed to fetch overall stats:', reason)
      }
    }

    const updateOverallStatsCaptcha = async (projectIds: string[]) => {
      if (!projectIds.length) return

      try {
        const stats = await getOverallStatsCaptcha(projectIds, '7d')
        setOverallStats(stats)
      } catch (reason) {
        console.error('Failed to fetch overall stats:', reason)
      }
    }

    const updateAllOverallStats = async () => {
      await updateOverallStats(projects.filter((p) => p.isCaptchaProject).map((p) => p.id))
      await updateOverallStatsCaptcha(projects.filter((p) => p.isAnalyticsProject).map((p) => p.id))
    }

    updateLiveVisitors()
    updateAllOverallStats()

    const interval = setInterval(updateLiveVisitors, LIVE_VISITORS_UPDATE_INTERVAL)

    return () => clearInterval(interval)
  }, [projects]) // Reset interval when projects change

  if (error && isLoading === false) {
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
            )}
            {isLoading || isLoading === null ? (
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
                    {_isEmpty(projects) ? (
                      <NoProjects onClick={onNewProject} />
                    ) : (
                      <div className='grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-3 lg:gap-y-6'>
                        {_map(projects, (project) => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            live={liveStats[project.id] ?? 'N/A'}
                            overallStats={overallStats[project.id]}
                          />
                        ))}
                        <AddProject sitesCount={_size(projects)} onClick={onNewProject} />
                      </div>
                    )}
                  </>
                )}
              </ClientOnly>
            )}
            {pageAmount > 1 ? (
              <Pagination
                className='mt-2'
                page={page}
                pageAmount={pageAmount}
                setPage={setPage}
                total={paginationTotal}
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
