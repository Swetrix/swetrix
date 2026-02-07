import {
  InfoIcon,
  MagnifyingGlassIcon,
  FolderPlusIcon,
  XIcon,
} from '@phosphor-icons/react'
import _filter from 'lodash/filter'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _replace from 'lodash/replace'
import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useFetcher } from 'react-router'
import { toast } from 'sonner'

import useDebounce from '~/hooks/useDebounce'
import { DetailedOrganisation } from '~/lib/models/Organisation'
import { Project } from '~/lib/models/Project'
import { useAuth } from '~/providers/AuthProvider'
import type { OrganisationSettingsActionData } from '~/routes/organisations.$id'
import Button from '~/ui/Button'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import Pagination from '~/ui/Pagination'
import Tooltip from '~/ui/Tooltip'
import routes from '~/utils/routes'

interface SelectAProjectProps {
  onSelect: (project: Project) => void
}

const PROJECT_SELECT_PAGE_SIZE = 5
const PROJECT_LIST_PAGE_SIZE = 20

const SelectAProject = ({ onSelect }: SelectAProjectProps) => {
  const { t } = useTranslation('common')
  const fetcher = useFetcher<OrganisationSettingsActionData>()

  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [total, setTotal] = useState(0)

  const debouncedSearch = useDebounce(search, 500)
  const pageAmount = Math.ceil(total / PROJECT_SELECT_PAGE_SIZE)
  const isLoading =
    fetcher.state === 'submitting' || fetcher.state === 'loading'

  // Fetch projects when page or search changes
  useEffect(() => {
    const formData = new FormData()
    formData.set('intent', 'get-available-projects')
    formData.set('take', String(PROJECT_SELECT_PAGE_SIZE))
    formData.set('skip', String((currentPage - 1) * PROJECT_SELECT_PAGE_SIZE))
    formData.set('search', debouncedSearch)
    fetcher.submit(formData, { method: 'post' })
  }, [currentPage, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update local state when fetcher returns data
  useEffect(() => {
    if (
      fetcher.data?.intent === 'get-available-projects' &&
      fetcher.data?.availableProjects
    ) {
      setTimeout(() => {
        setProjects(fetcher.data!.availableProjects!.results as Project[])
        setTotal(fetcher.data!.availableProjects!.total)
      }, 0)
    }
  }, [fetcher.data])

  useEffect(() => {
    setTimeout(() => setCurrentPage(1), 0)
  }, [debouncedSearch])

  return (
    <div className='mt-4 flex flex-col'>
      <div className='mb-4'>
        <div className='relative'>
          <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3'>
            <MagnifyingGlassIcon className='h-5 w-5 text-gray-400' />
          </div>
          <input
            type='text'
            className='block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 focus:ring-inset sm:text-sm sm:leading-6 dark:bg-slate-800 dark:text-white dark:ring-slate-600 dark:focus:ring-slate-400'
            placeholder={t('project.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <div className='overflow-hidden rounded-lg border border-gray-200 dark:border-slate-600'>
          <ul className='divide-y divide-gray-200 dark:divide-slate-600'>
            {_map(
              _filter(projects, ({ uiHidden }) => !uiHidden),
              (project) => (
                <li
                  key={project.id}
                  className='cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700'
                  onClick={() => onSelect(project)}
                >
                  <div className='flex items-center px-4 py-4 sm:px-6'>
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm font-medium text-gray-900 dark:text-white'>
                        {project.name}
                      </p>
                    </div>
                  </div>
                </li>
              ),
            )}
          </ul>
        </div>
      )}

      {pageAmount > 1 ? (
        <Pagination
          className='mt-4'
          page={currentPage}
          pageAmount={pageAmount}
          setPage={setCurrentPage}
          total={total}
          pageSize={PROJECT_SELECT_PAGE_SIZE}
        />
      ) : null}
    </div>
  )
}

const NoProjects = () => {
  const { t } = useTranslation('common')

  return (
    <div className='flex flex-col py-6 sm:px-6 lg:px-8'>
      <div className='mx-auto w-full max-w-7xl text-gray-900 dark:text-gray-50'>
        <h2 className='mb-8 px-4 text-center text-xl leading-snug'>
          {t('organisations.noProjectsFound')}
        </h2>
      </div>
    </div>
  )
}

interface ProjectListProps {
  projects: DetailedOrganisation['projects']
  onRemove: (project: DetailedOrganisation['projects'][number]) => void
}

const ProjectList = ({ projects, onRemove }: ProjectListProps) => {
  const { t } = useTranslation('common')
  const { user } = useAuth()

  return projects.map((project) => (
    <tr key={project.id} className='dark:bg-slate-800'>
      <td className='py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6 dark:text-white'>
        <Link
          to={_replace(routes.project, ':id', project.id)}
          className='hover:underline'
        >
          {project.name}
        </Link>
      </td>
      <td className='relative py-4 pr-2 text-sm font-medium whitespace-nowrap'>
        <div className='flex items-center justify-end'>
          {project.admin.email !== user?.email ? (
            <Tooltip
              className='mr-2'
              text={t('organisations.projectOwnedBy', {
                email: project.admin.email,
              })}
              tooltipNode={<InfoIcon className='size-5 text-gray-400' />}
            />
          ) : null}

          <Button onClick={() => onRemove(project)} danger small>
            {t('common.remove')}
          </Button>
        </div>
      </td>
    </tr>
  ))
}

interface ProjectsProps {
  organisation: DetailedOrganisation
}

export const Projects = ({ organisation }: ProjectsProps) => {
  const { t } = useTranslation('common')
  const fetcher = useFetcher<OrganisationSettingsActionData>()

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAddProjectModal, setShowAddProjectModal] = useState(false)
  const [projectToRemove, setProjectToRemove] = useState<
    DetailedOrganisation['projects'][number] | null
  >(null)
  const [selectedProject, setSelectedProject] = useState<any>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  const [isSearchActive, setIsSearchActive] = useState(false)
  const { projects } = organisation

  const isSubmitting = fetcher.state === 'submitting'
  const isAddingProject =
    isSubmitting && fetcher.formData?.get('intent') === 'add-project'
  const isRemovingProject =
    isSubmitting && fetcher.formData?.get('intent') === 'remove-project'

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (fetcher.data?.success) {
      const { intent } = fetcher.data
      if (intent === 'add-project') {
        toast.success(t('apiNotifications.projectAddedToOrganisation'))
        setShowAddProjectModal(false)
        setSelectedProject(null)
      } else if (intent === 'remove-project') {
        toast.success(t('apiNotifications.projectRemovedFromOrganisation'))
        setShowDeleteModal(false)
        setProjectToRemove(null)
      }
    } else if (fetcher.data?.error) {
      toast.error(fetcher.data.error)
    }
  }, [fetcher.data, t])
  /* eslint-enable react-hooks/set-state-in-effect */

  const filteredProjects = useMemo(() => {
    if (!search) {
      return projects
    }

    return projects.filter((project) =>
      project.name.toLowerCase().includes(search),
    )
  }, [projects, search])

  const pageAmount = Math.ceil(filteredProjects.length / PROJECT_LIST_PAGE_SIZE)

  const removeProject = (projectId: string) => {
    const formData = new FormData()
    formData.set('intent', 'remove-project')
    formData.set('projectId', projectId)
    fetcher.submit(formData, { method: 'post' })
  }

  const onAddProject = () => {
    if (!selectedProject) return

    const formData = new FormData()
    formData.set('intent', 'add-project')
    formData.set('projectId', selectedProject.id)
    fetcher.submit(formData, { method: 'post' })
  }

  return (
    <div className='mt-6 mb-6'>
      <div className='mb-3 flex items-center justify-between'>
        <h3 className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
          {t('organisations.projects')}
          {isSearchActive ? (
            <XIcon
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
        </h3>
        <Button
          className='h-8 pl-2'
          primary
          regular
          type='button'
          onClick={() => {
            setShowAddProjectModal(true)
          }}
        >
          <>
            <FolderPlusIcon className='mr-1 h-5 w-5' />
            {t('organisations.addProject')}
          </>
        </Button>
      </div>
      {isSearchActive ? (
        <div className='relative w-full'>
          <div className='pointer-events-none absolute inset-y-0 left-0 hidden items-center sm:flex'>
            <MagnifyingGlassIcon className='ml-2 h-5 w-5 cursor-pointer text-gray-900 hover:opacity-80 dark:text-gray-50' />
          </div>
          <input
            type='text'
            onChange={(e) => {
              setSearch(e.target.value.toLowerCase())
              setCurrentPage(1)
            }}
            value={search}
            className='block h-8 w-full rounded-lg border-none bg-gray-50 p-2.5 text-sm text-gray-900 ring-1 ring-gray-300 focus:ring-gray-500 sm:pl-10 dark:bg-slate-950 dark:text-white dark:placeholder-gray-400 dark:ring-slate-600 dark:focus:ring-slate-200'
            placeholder={t('project.search')}
          />
        </div>
      ) : null}
      <div>
        {_isEmpty(filteredProjects) ? (
          <NoProjects />
        ) : (
          <div className='mt-3 flex flex-col'>
            <div className='-mx-4 -my-2 overflow-x-auto sm:-mx-6 md:overflow-x-visible lg:-mx-8'>
              <div className='inline-block min-w-full py-2 align-middle md:px-6 lg:px-8'>
                <div className='ring-1 ring-black/10 md:rounded-lg'>
                  <table className='min-w-full divide-y divide-gray-300 dark:divide-gray-600'>
                    <thead>
                      <tr className='dark:bg-slate-800'>
                        <th
                          scope='col'
                          className='py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6 dark:text-white'
                        >
                          {t('common.name')}
                        </th>
                        <th scope='col' />
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-300 dark:divide-gray-600'>
                      <ProjectList
                        projects={filteredProjects.slice(
                          (currentPage - 1) * PROJECT_LIST_PAGE_SIZE,
                          currentPage * PROJECT_LIST_PAGE_SIZE,
                        )}
                        onRemove={(project) => {
                          setProjectToRemove(project)
                          setShowDeleteModal(true)
                        }}
                      />
                    </tbody>
                  </table>
                </div>
                {pageAmount > 1 ? (
                  <Pagination
                    className='mt-4 px-2'
                    page={currentPage}
                    pageAmount={pageAmount}
                    setPage={setCurrentPage}
                    total={projects.length}
                    pageSize={PROJECT_LIST_PAGE_SIZE}
                  />
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        onClose={() => {
          setShowAddProjectModal(false)
          setSelectedProject(null)
        }}
        customButtons={
          <button
            type='button'
            className='inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm'
            onClick={onAddProject}
            disabled={!selectedProject || isAddingProject}
          >
            {t('organisations.addProject')}
          </button>
        }
        closeText={t('common.cancel')}
        title={t('organisations.modals.addProject.title', {
          organisation: organisation.name,
        })}
        message={
          <div>
            <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>
              {t('organisations.modals.addProject.message')}
            </p>

            {selectedProject ? (
              <div className='mt-4 flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-slate-600'>
                <span className='text-sm font-medium text-gray-900 dark:text-white'>
                  {selectedProject.name}
                </span>
                <button
                  type='button'
                  onClick={() => setSelectedProject(null)}
                  className='text-sm text-red-600 hover:text-red-500'
                >
                  {t('common.remove')}
                </button>
              </div>
            ) : (
              <SelectAProject onSelect={setSelectedProject} />
            )}
          </div>
        }
        isOpened={showAddProjectModal}
        isLoading={isAddingProject}
      />

      <Modal
        onClose={() => {
          setShowDeleteModal(false)
          setProjectToRemove(null)
        }}
        onSubmit={() => {
          removeProject(projectToRemove!.id)
        }}
        submitText={t('common.yes')}
        closeText={t('common.no')}
        title={t('organisations.modals.remove.title', {
          project: projectToRemove?.name,
        })}
        message={t('organisations.modals.remove.message')}
        isOpened={showDeleteModal}
        type='warning'
        isLoading={isRemovingProject}
      />
    </div>
  )
}
