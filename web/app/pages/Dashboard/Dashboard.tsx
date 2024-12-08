import React, { useState, useEffect } from 'react'
import { Link } from '@remix-run/react'
import { ClientOnly } from 'remix-utils/client-only'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _isNumber from 'lodash/isNumber'
import _map from 'lodash/map'
import _filter from 'lodash/filter'
import { useTranslation } from 'react-i18next'
import { FolderPlusIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { XCircleIcon } from '@heroicons/react/24/solid'

import Modal from 'ui/Modal'
import { withAuthentication, auth } from 'hoc/protected'
import Loader from 'ui/Loader'
import routes from 'utils/routes'
import { isSelfhosted, ENTRIES_PER_PAGE_DASHBOARD } from 'redux/constants'
import EventsRunningOutBanner from 'components/EventsRunningOutBanner'
import DashboardLockedBanner from 'components/DashboardLockedBanner'
import useDebounce from 'hooks/useDebounce'

import Pagination from 'ui/Pagination'
import { useSelector } from 'react-redux'
import { StateType, useAppDispatch } from 'redux/store'
import UIActions from 'redux/reducers/ui'
import sagaActions from 'redux/sagas/actions'
import { ProjectCard } from './ProjectCard'
import { NoProjects } from './NoProjects'
import { AddProject } from './AddProject'

const Dashboard = () => {
  const { projects, isLoading, error, total, dashboardPaginationPage, liveStats } = useSelector(
    (state: StateType) => state.ui.projects,
  )
  const { user } = useSelector((state: StateType) => state.auth)

  const { t } = useTranslation('common')
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false)
  const [showActivateEmailModal, setShowActivateEmailModal] = useState<boolean>(false)
  const pageAmount = Math.ceil(total / ENTRIES_PER_PAGE_DASHBOARD)

  // This search represents what's inside the search input
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)

  const dispatch = useAppDispatch()

  const setDashboardPaginationPage = (page: number) => {
    dispatch(UIActions.setDashboardPaginationPage(page))
  }

  const onNewProject = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (user.isActive || isSelfhosted) {
      return
    }

    e.preventDefault()
    setShowActivateEmailModal(true)
  }

  useEffect(() => {
    dispatch(
      sagaActions.loadProjects(
        ENTRIES_PER_PAGE_DASHBOARD,
        (dashboardPaginationPage - 1) * ENTRIES_PER_PAGE_DASHBOARD,
        debouncedSearch,
      ),
    )
  }, [dispatch, dashboardPaginationPage, debouncedSearch])

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
                              live={_isNumber(liveStats[project.id]) ? liveStats[project.id] : 'N/A'}
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

export default withAuthentication(Dashboard, auth.authenticated)
