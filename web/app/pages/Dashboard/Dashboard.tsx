import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _size from 'lodash/size'
import {
  RowsIcon,
  SquaresFourIcon,
  MagnifyingGlassIcon,
  XIcon,
  FolderPlusIcon,
} from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  memo,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  useLoaderData,
  useSearchParams,
  useFetcher,
  useNavigation,
  useRevalidator,
} from 'react-router'
import { toast } from 'sonner'

import {
  useLiveVisitorsProxy,
  useOverallStatsProxy,
} from '~/hooks/useAnalyticsProxy'
import useBreakpoint from '~/hooks/useBreakpoint'
import useDebounce from '~/hooks/useDebounce'
import { isSelfhosted, LIVE_VISITORS_UPDATE_INTERVAL } from '~/lib/constants'
import { Overall } from '~/lib/models/Project'
import { useAuth } from '~/providers/AuthProvider'
import type {
  DashboardLoaderData,
  DashboardActionData,
} from '~/routes/dashboard'
import Input from '~/ui/Input'
import LoadingBar from '~/ui/LoadingBar'
import Modal from '~/ui/Modal'
import Pagination from '~/ui/Pagination'
import { Text } from '~/ui/Text'
import { setCookie } from '~/utils/cookie'
import { isValidHttpUrl } from '~/utils/url'

import { AddProject } from './AddProject'
import { NoProjects } from './NoProjects'
import { PeriodSelector } from './PeriodSelector'
import { ProjectCard } from './ProjectCard'
import { SortSelector, SORT_OPTIONS } from './SortSelector'
import Button from '~/ui/Button'
import Select from '~/ui/Select'

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96]

const DASHBOARD_VIEW = {
  GRID: 'grid',
  LIST: 'list',
} as const

const MAX_PROJECT_NAME_LENGTH = 50

interface NewProjectForm {
  name: string
  websiteUrl: string
  organisationId?: string
}

interface NewProjectErrors {
  name?: string
  websiteUrl?: string
}

interface NewProjectState {
  form: NewProjectForm
  errors: NewProjectErrors
  beenSubmitted: boolean
}

const DEFAULT_NEW_PROJECT_FORM: NewProjectForm = {
  name: '',
  websiteUrl: '',
}

const DEFAULT_NEW_PROJECT_STATE: NewProjectState = {
  form: DEFAULT_NEW_PROJECT_FORM,
  errors: {},
  beenSubmitted: false,
}

const Dashboard = () => {
  const loaderData = useLoaderData<DashboardLoaderData>()
  const navigation = useNavigation()
  const revalidator = useRevalidator()
  const [searchParams, setSearchParams] = useSearchParams()
  const fetcher = useFetcher<DashboardActionData>()

  const { user } = useAuth()

  const { t } = useTranslation('common')
  const [isSearchActive, setIsSearchActive] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [showActivateEmailModal, setShowActivateEmailModal] = useState(false)
  const [viewMode, setViewMode] = useState(loaderData.viewMode)
  const isAboveLgBreakpoint = useBreakpoint('lg')

  const projects = useMemo(
    () => loaderData.projects?.results || [],
    [loaderData.projects?.results],
  )
  const paginationTotal = loaderData.projects?.total || 0

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

  const pageSize = useMemo(() => {
    const pageSizeParam = searchParams.get('pageSize')
    return pageSizeParam &&
      PAGE_SIZE_OPTIONS.includes(parseInt(pageSizeParam, 10))
      ? parseInt(pageSizeParam, 10)
      : PAGE_SIZE_OPTIONS[0]
  }, [searchParams])

  const isLoading =
    navigation.state === 'loading' || revalidator.state === 'loading'
  const [liveStats, setLiveStats] = useState<Record<string, number>>({})
  const [overallStats, setOverallStats] = useState<Overall>({})
  const { fetchLiveVisitors } = useLiveVisitorsProxy()
  const { fetchOverallStats } = useOverallStatsProxy()

  const activePeriod = useMemo(() => {
    return searchParams.get('period') || '7d'
  }, [searchParams])

  const sortBy = useMemo(() => {
    const sortParam = searchParams.get('sort')
    return sortParam && Object.values(SORT_OPTIONS).includes(sortParam as any)
      ? sortParam
      : SORT_OPTIONS.ALPHA_ASC
  }, [searchParams])

  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false)
  const [newProject, setNewProject] = useState(DEFAULT_NEW_PROJECT_STATE)
  const {
    form: newProjectForm,
    errors: newProjectErrors,
    beenSubmitted: newProjectBeenSubmitted,
  } = newProject

  const organisations = useMemo(
    () => [
      {
        id: undefined as string | undefined,
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

  const selectedNewProjectOrganisation = useMemo(
    () => organisations.find((org) => org.id === newProjectForm.organisationId),
    [organisations, newProjectForm.organisationId],
  )

  const pageAmount = Math.ceil(paginationTotal / pageSize)

  // This search represents what's inside the search input
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const debouncedSearch = useDebounce(search, 500)

  const updateURL = (params: Record<string, string>) => {
    const newSearchParams = new URLSearchParams(searchParams)
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newSearchParams.set(key, value)
      } else {
        newSearchParams.delete(key)
      }
    })
    setSearchParams(newSearchParams)
  }

  const handlePageChange = (newPage: number) => {
    updateURL({ page: newPage.toString() })
  }

  const handlePageSizeChange = (size: number) => {
    updateURL({ pageSize: size.toString(), page: '1' })
  }

  const handlePeriodChange = (period: string) => {
    updateURL({ period, page: '1' })
  }

  const handleSortChange = (sort: string) => {
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

  const updateNewProjectForm = <Field extends keyof NewProjectForm>(
    field: Field,
    value: NewProjectForm[Field],
  ) => {
    setNewProject((current) => {
      const form = {
        ...current.form,
        [field]: value,
      }

      if (field === 'organisationId') {
        return {
          ...current,
          form,
        }
      }

      const errors = { ...current.errors }
      delete errors[field as keyof NewProjectErrors]

      return {
        ...current,
        form,
        errors,
      }
    })
  }

  const getNewProjectErrors = (form: NewProjectForm) => {
    const errors: NewProjectErrors = {}
    const name = form.name.trim()
    const websiteUrl = form.websiteUrl.trim()

    if (_isEmpty(name)) {
      errors.name = t('project.settings.noNameError')
    }

    if (_size(name) > MAX_PROJECT_NAME_LENGTH) {
      errors.name = t('project.settings.pxCharsError', {
        amount: MAX_PROJECT_NAME_LENGTH,
      })
    }

    if (websiteUrl && !isValidHttpUrl(websiteUrl)) {
      errors.websiteUrl = t('project.settings.invalidUrl')
    }

    return errors
  }

  // Handle fetcher responses for create project
  useEffect(() => {
    const data = fetcher.data

    if (data?.success && data.intent === 'create-project') {
      refetchProjects()
      toast.success(t('project.settings.created'))
      closeNewProjectModal()
    } else if (data?.error && data.intent === 'create-project') {
      setNewProject((current) => ({
        ...current,
        errors: {
          ...current.errors,
          name: data.error,
        },
      }))
      toast.error(data.error)
    } else if (data?.fieldErrors && data.intent === 'create-project') {
      setNewProject((current) => ({
        ...current,
        errors: {
          ...current.errors,
          ...data.fieldErrors,
        },
      }))
    }
  }, [fetcher.data, t]) // eslint-disable-line react-hooks/exhaustive-deps

  const isNewProjectLoading = fetcher.state === 'submitting'

  const onCreateProject = () => {
    const errors = getNewProjectErrors(newProjectForm)

    setNewProject((current) => ({
      ...current,
      beenSubmitted: true,
      errors,
    }))

    if (!_isEmpty(errors)) {
      return
    }

    if (
      !isSelfhosted &&
      user?.planCode === 'none' &&
      !newProjectForm.organisationId
    ) {
      toast.error(t('project.settings.subscriptionRequired'))
      return
    }

    const formData = new FormData()
    formData.set('intent', 'create-project')
    formData.set('name', newProjectForm.name.trim())
    if (newProjectForm.websiteUrl.trim()) {
      formData.set('websiteUrl', newProjectForm.websiteUrl.trim())
    }
    if (newProjectForm.organisationId) {
      formData.set('organisationId', newProjectForm.organisationId)
    }
    fetcher.submit(formData, { method: 'post' })
  }

  const closeNewProjectModal = () => {
    if (isNewProjectLoading) {
      return
    }

    setNewProjectModalOpen(false)
    setNewProject(DEFAULT_NEW_PROJECT_STATE)
  }

  const refetchProjects = useCallback(() => {
    revalidator.revalidate()
  }, [revalidator])

  // Update URL when debounced search changes
  useEffect(() => {
    const currentSearch = searchParams.get('search') || ''
    if (debouncedSearch !== currentSearch) {
      updateURL({ search: debouncedSearch, page: '1' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  // Set up interval for live visitors
  useEffect(() => {
    const updateLiveVisitors = async () => {
      if (!projects.length) return

      try {
        const projectIds = projects.map((p) => p.id)
        const stats = await fetchLiveVisitors(projectIds)
        if (stats) {
          setLiveStats(stats)
        }
      } catch (reason) {
        console.error('Failed to fetch live visitors:', reason)
      }
    }

    updateLiveVisitors()

    const interval = setInterval(
      updateLiveVisitors,
      LIVE_VISITORS_UPDATE_INTERVAL,
    )

    return () => clearInterval(interval)
  }, [projects, fetchLiveVisitors]) // Reset interval when projects change

  // Fetch overall stats when projects or period changes
  useEffect(() => {
    const updateOverallStats = async () => {
      if (!projects.length) return

      try {
        const projectIds = projects.map((p) => p.id)
        const stats = await fetchOverallStats(projectIds, {
          period: activePeriod,
          timezone: user?.timezone || 'UTC',
        })
        if (stats) {
          setOverallStats(stats)
        }
      } catch (reason) {
        console.error('Failed to fetch overall stats:', reason)
      }
    }

    updateOverallStats()
  }, [projects, activePeriod, user?.timezone, fetchOverallStats])

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  return (
    <>
      <div className='min-h-min-footer bg-gray-50 dark:bg-slate-950'>
        <div className='flex flex-col'>
          <div className='mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8'>
            <div className='mb-4 flex flex-wrap justify-between gap-2'>
              <div className='flex items-end justify-between'>
                <Text
                  as='h1'
                  size='3xl'
                  weight='bold'
                  className='mt-2 flex items-center gap-2'
                >
                  <span>{t('titles.dashboard')}</span>
                  {isSearchActive ? (
                    <Button
                      variant='icon'
                      onClick={() => {
                        setSearch('')
                        setIsSearchActive(false)
                      }}
                      aria-label={t('common.close')}
                    >
                      <XIcon className='size-5' />
                    </Button>
                  ) : (
                    <Button
                      variant='icon'
                      onClick={() => {
                        setIsSearchActive(true)
                        setTimeout(() => {
                          searchInputRef.current?.focus()
                        }, 100)
                      }}
                      aria-label={t('project.search')}
                    >
                      <MagnifyingGlassIcon className='size-5' />
                    </Button>
                  )}
                </Text>
                {isSearchActive ? (
                  <div className='hidden w-full max-w-md items-center px-2 pb-1 sm:ml-2 sm:flex'>
                    <label htmlFor='project-search' className='sr-only'>
                      {t('project.search')}
                    </label>
                    <Input
                      ref={searchInputRef}
                      id='project-search'
                      type='search'
                      onChange={onSearch}
                      value={search}
                      className='w-full'
                      classes={{ input: 'h-7 py-1.5' }}
                      leadingIcon={<MagnifyingGlassIcon className='size-4' />}
                      placeholder={t('project.search')}
                    />
                  </div>
                ) : null}
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <PeriodSelector
                  activePeriod={activePeriod}
                  setActivePeriod={handlePeriodChange}
                  isLoading={isLoading}
                />
                <SortSelector
                  activeSort={sortBy}
                  setActiveSort={handleSortChange}
                  isLoading={isLoading}
                />
                <div className='hidden lg:block'>
                  {viewMode === DASHBOARD_VIEW.GRID ? (
                    <Button
                      variant='icon'
                      title={t('dashboard.listView')}
                      aria-label={t('dashboard.listView')}
                      onClick={() => handleViewModeChange(DASHBOARD_VIEW.LIST)}
                    >
                      <RowsIcon className='size-5' />
                    </Button>
                  ) : null}
                  {viewMode === DASHBOARD_VIEW.LIST ? (
                    <Button
                      variant='icon'
                      title={t('dashboard.gridView')}
                      aria-label={t('dashboard.gridView')}
                      onClick={() => handleViewModeChange(DASHBOARD_VIEW.GRID)}
                    >
                      <SquaresFourIcon className='size-5' />
                    </Button>
                  ) : null}
                </div>
                <Button size='lg' onClick={onNewProject}>
                  <FolderPlusIcon className='mr-1 h-5 w-5' />
                  {t('dashboard.newProject')}
                </Button>
              </div>
            </div>
            {isSearchActive ? (
              <div className='mb-2 flex w-full items-center sm:hidden'>
                <label htmlFor='project-search-mobile' className='sr-only'>
                  {t('project.search')}
                </label>
                <Input
                  id='project-search-mobile'
                  type='search'
                  onChange={onSearch}
                  value={search}
                  className='w-full'
                  leadingIcon={<MagnifyingGlassIcon className='size-4' />}
                  placeholder={t('project.search')}
                />
              </div>
            ) : null}
            {isLoading && !_isEmpty(projects) ? <LoadingBar /> : null}
            {_isEmpty(projects) ? (
              <NoProjects search={debouncedSearch} onClick={onNewProject} />
            ) : (
              <div
                className={cx(
                  'grid gap-3',
                  _viewMode === DASHBOARD_VIEW.GRID
                    ? 'grid-cols-1 lg:grid-cols-3'
                    : 'grid-cols-1',
                )}
              >
                <AnimatePresence mode='popLayout' initial={false}>
                  {_map(projects, (project) => (
                    <motion.div
                      key={`${project.id}-${project.name}`}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                      // Single-cell grid so the card stretches to fill the row
                      className='grid'
                    >
                      <ProjectCard
                        project={project}
                        live={
                          liveStats[project.id] ??
                          (_isEmpty(liveStats) ? null : 'N/A')
                        }
                        overallStats={overallStats[project.id]}
                        activePeriod={activePeriod}
                        viewMode={_viewMode}
                        refetchProjects={refetchProjects}
                      />
                    </motion.div>
                  ))}
                  {_size(projects) % 12 !== 0 ? (
                    <motion.div
                      key='add-project'
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                      className='grid'
                    >
                      <AddProject
                        sitesCount={_size(projects)}
                        onClick={onNewProject}
                        viewMode={_viewMode}
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
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
              value={newProjectForm.name}
              placeholder='My awesome website'
              onChange={(e) => updateNewProjectForm('name', e.target.value)}
              error={newProjectBeenSubmitted ? newProjectErrors.name : null}
            />
            <Input
              name='websiteUrl'
              label={t('project.settings.websiteUrl')}
              hint={t('project.settings.websiteUrlHint')}
              value={newProjectForm.websiteUrl}
              placeholder={t('project.settings.websiteUrlPlaceholder')}
              className='mt-4'
              onChange={(e) =>
                updateNewProjectForm('websiteUrl', e.target.value)
              }
              error={
                newProjectBeenSubmitted ? newProjectErrors.websiteUrl : null
              }
            />
            {organisations.length > 1 ? (
              <div className='mt-4'>
                <Select
                  items={organisations}
                  keyExtractor={(item) => item.id || 'not-set'}
                  labelExtractor={(item) => {
                    if (item.id === undefined) {
                      return (
                        <span className='italic'>{t('common.notSet')}</span>
                      )
                    }

                    return item.name
                  }}
                  onSelect={(item) => {
                    updateNewProjectForm('organisationId', item.id)
                  }}
                  label={t('project.settings.organisation')}
                  hint={t('project.settings.organisationHint')}
                  title={selectedNewProjectOrganisation?.name}
                  selectedItem={selectedNewProjectOrganisation}
                />
              </div>
            ) : null}
          </div>
        }
        title={t('project.settings.create')}
        isOpened={newProjectModalOpen}
        submitDisabled={!newProjectForm.name.trim()}
      />
    </>
  )
}

export default memo(Dashboard)
