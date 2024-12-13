import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { InformationCircleIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import _isEmpty from 'lodash/isEmpty'
import _replace from 'lodash/replace'
import _map from 'lodash/map'
import _filter from 'lodash/filter'

import Button from '~/ui/Button'
import Modal from '~/ui/Modal'
import { DetailedOrganisation } from '~/lib/models/Organisation'
import { useSelector } from 'react-redux'
import { StateType } from '~/lib/store'
import Tooltip from '~/ui/Tooltip'
import { removeProjectFromOrganisation, getProjectsAvailableForOrganisation, addProjectToOrganisation } from '~/api'
import { Link } from '@remix-run/react'
import routes from '~/utils/routes'
import Loader from '~/ui/Loader'
import Pagination from '~/ui/Pagination'
import useDebounce from '~/hooks/useDebounce'
import { Project } from '~/lib/models/Project'

interface SelectAProjectProps {
  onSelect: (project: Project) => void
}

const PAGINATION_ENTRIES = 5

const SelectAProject = ({ onSelect }: SelectAProjectProps) => {
  const { t } = useTranslation('common')

  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [total, setTotal] = useState(0)

  const debouncedSearch = useDebounce(search, 500)
  const pageAmount = Math.ceil(total / PAGINATION_ENTRIES)

  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true)
      try {
        const { results, total: totalCount } = await getProjectsAvailableForOrganisation(
          PAGINATION_ENTRIES,
          (currentPage - 1) * PAGINATION_ENTRIES,
          debouncedSearch,
        )
        setProjects(results)
        setTotal(totalCount)
      } catch (reason) {
        console.error('Failed to load projects:', reason)
      } finally {
        setIsLoading(false)
      }
    }

    loadProjects()
  }, [currentPage, debouncedSearch])

  useEffect(() => {
    setCurrentPage(1)
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
            className='block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-slate-800 dark:text-white dark:ring-slate-600 dark:focus:ring-slate-400 sm:text-sm sm:leading-6'
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
                      <p className='truncate text-sm font-medium text-gray-900 dark:text-white'>{project.name}</p>
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
          pageSize={PAGINATION_ENTRIES}
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
        <h2 className='mb-8 px-4 text-center text-xl leading-snug'>{t('project.settings.noPeople')}</h2>
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
  const { user } = useSelector((state: StateType) => state.auth)

  return projects.map((project) => (
    <tr key={project.id} className='dark:bg-slate-800'>
      <td className='whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6'>
        <Link to={_replace(routes.project, ':id', project.id)} className='hover:underline'>
          {project.name}
        </Link>
      </td>
      <td className='relative whitespace-nowrap py-4 pr-2 text-sm font-medium'>
        <div className='flex items-center justify-end'>
          {project.admin.email !== user.email ? (
            <Tooltip
              className='mr-2'
              text={t('organisations.projectOwnedBy', { email: project.admin.email })}
              tooltipNode={<InformationCircleIcon className='size-5 text-gray-400' />}
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
  reloadOrganisation: () => Promise<void>
}

export const Projects = ({ organisation, reloadOrganisation }: ProjectsProps) => {
  const { t } = useTranslation('common')

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAddProjectModal, setShowAddProjectModal] = useState(false)
  const [projectToRemove, setProjectToRemove] = useState<DetailedOrganisation['projects'][number] | null>(null)

  const [isActionLoading, setIsActionLoading] = useState(false)
  const [selectedProject, setSelectedProject] = useState<any>(null)

  const { projects } = organisation

  const removeProject = async (projectId: string) => {
    if (isActionLoading) {
      return
    }

    setIsActionLoading(true)

    try {
      await removeProjectFromOrganisation(organisation.id, projectId)
      await reloadOrganisation()
      toast.success(t('apiNotifications.projectRemovedFromOrganisation'))
    } catch (reason) {
      console.error(`[ERROR] Error while deleting a project: ${reason}`)
      toast.error(t('apiNotifications.projectRemoveError'))
    } finally {
      setProjectToRemove(null)
      setIsActionLoading(false)
    }
  }

  const onAddProject = async () => {
    setShowAddProjectModal(false)

    if (isActionLoading) {
      return
    }

    setIsActionLoading(true)

    try {
      await addProjectToOrganisation(organisation.id, selectedProject.id)
      await reloadOrganisation()
      toast.success(t('apiNotifications.projectAddedToOrganisation'))
    } catch (reason) {
      console.error(`[ERROR] Error while adding a project: ${reason}`)
      toast.error(t('apiNotifications.projectAddError'))
    } finally {
      setSelectedProject(null)
      setIsActionLoading(false)
    }
  }

  return (
    <div className='mb-6 mt-6'>
      <div className='mb-3 flex items-center justify-between'>
        <h3 className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
          {t('organisations.projects')}
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
            <PlusIcon className='mr-1 h-5 w-5' />
            {t('organisations.addProject')}
          </>
        </Button>
      </div>
      <div>
        {_isEmpty(projects) ? (
          <NoProjects />
        ) : (
          <div className='mt-3 flex flex-col'>
            <div className='-mx-4 -my-2 overflow-x-auto sm:-mx-6 md:overflow-x-visible lg:-mx-8'>
              <div className='inline-block min-w-full py-2 md:px-6 lg:px-8'>
                <div className='shadow ring-1 ring-black ring-opacity-5 md:rounded-lg'>
                  <table className='min-w-full divide-y divide-gray-300 dark:divide-gray-600'>
                    <thead>
                      <tr className='dark:bg-slate-800'>
                        <th
                          scope='col'
                          className='py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6'
                        >
                          {t('common.name')}
                        </th>
                        <th scope='col' />
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-300 dark:divide-gray-600'>
                      <ProjectList
                        projects={projects}
                        onRemove={(project) => {
                          setProjectToRemove(project)
                          setShowDeleteModal(true)
                        }}
                      />
                    </tbody>
                  </table>
                </div>
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
            className='inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm'
            onClick={onAddProject}
            disabled={!selectedProject || isActionLoading}
          >
            {t('organisations.addProject')}
          </button>
        }
        closeText={t('common.cancel')}
        title={t('organisations.modals.addProject.title', { organisation: organisation.name })}
        message={
          <div>
            <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>
              {t('organisations.modals.addProject.message')}
            </p>

            {selectedProject ? (
              <div className='mt-4 flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-slate-600'>
                <span className='text-sm font-medium text-gray-900 dark:text-white'>{selectedProject.name}</span>
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
        isLoading={isActionLoading}
      />

      <Modal
        onClose={() => {
          setShowDeleteModal(false)
          setProjectToRemove(null)
        }}
        onSubmit={async () => {
          await removeProject(projectToRemove!.id)
          setShowDeleteModal(false)
        }}
        submitText={t('common.yes')}
        closeText={t('common.no')}
        title={t('organisations.modals.remove.title', { project: projectToRemove?.name })}
        message={t('organisations.modals.remove.message')}
        isOpened={showDeleteModal}
        type='warning'
        isLoading={isActionLoading}
      />
    </div>
  )
}
