import React, { useState } from 'react'
import { toast } from 'sonner'
import { InformationCircleIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import _isEmpty from 'lodash/isEmpty'
import _replace from 'lodash/replace'

import Button from 'ui/Button'
import Modal from 'ui/Modal'
import { DetailedOrganisation } from 'redux/models/Organisation'
import { useSelector } from 'react-redux'
import { StateType } from 'redux/store'
import Tooltip from 'ui/Tooltip'
import { removeProjectFromOrganisation } from 'api'
import { Link } from '@remix-run/react'
import routes from 'utils/routes'

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
}

export const Projects = ({ organisation }: ProjectsProps): JSX.Element => {
  const { t } = useTranslation('common')

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [projectToRemove, setProjectToRemove] = useState<DetailedOrganisation['projects'][number] | null>(null)
  const [removingProject, setRemovingProject] = useState(false)

  const { projects } = organisation

  const removeProject = async (projectId: string) => {
    if (removingProject) {
      return
    }

    setRemovingProject(true)

    try {
      await removeProjectFromOrganisation(organisation.id, projectId)
      toast.success(t('apiNotifications.projectRemovedFromOrganisation'))
    } catch (reason) {
      console.error(`[ERROR] Error while deleting a project: ${reason}`)
      toast.error(t('apiNotifications.projectRemoveError'))
    } finally {
      setProjectToRemove(null)
      setRemovingProject(false)
    }
  }

  return (
    <div className='mb-6 mt-6'>
      <div className='mb-3 flex items-center justify-between'>
        <h3 className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
          {t('organisations.projects')}
        </h3>
        <Button className='h-8 pl-2' primary regular type='button' onClick={() => {}}>
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
        isLoading={removingProject}
      />
    </div>
  )
}
