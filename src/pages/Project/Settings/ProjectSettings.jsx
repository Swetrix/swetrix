import React, { useState, useEffect, useMemo } from 'react'
import { useLocation, useHistory, useParams } from 'react-router-dom'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _replace from 'lodash/replace'
import _find from 'lodash/find'
import _join from 'lodash/join'
import _split from 'lodash/split'
import PropTypes from 'prop-types'

import Title from 'components/Title'
import { createProject, updateProject, deleteProject } from 'api'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Checkbox from 'ui/Checkbox'
import Modal from 'ui/Modal'
import { nanoid } from 'utils/random'
import routes from 'routes'

const ProjectSettings = ({
  updateProjectFailed, createNewProjectFailed, newProject, projectDeleted, deleteProjectFailed,
  loadProjects, isLoading, projects, showError, removeProject,
}) => {
  const { pathname } = useLocation()
  const { id } = useParams()
  const project = useMemo(() => _find(projects, p => p.id === id) || {}, [projects, id])
  const isSettings = !_isEmpty(id) && (_replace(routes.project_settings, ':id', id) === pathname)
  const history = useHistory()
  const [form, setForm] = useState({
    name: '',
    id: id || nanoid(),
    origins: '', // origins string, ',' is used as a separator. converted to an array on the backend side.
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [projectDeleting, setProjectDeleting] = useState(false)
  const [projectSaving, setProjectSaving] = useState(false)

  useEffect(() => {
    if (!isLoading && isSettings && !projectDeleting) {
      if (_isEmpty(project)) {
        showError('The selected project does not exist')
        history.push(routes.dashboard)
      } else {
        setForm({
          ...project,
          origins: _join(project.origins, ', '),
        })
      }
    }
  }, [project, isLoading, isSettings, history, showError, projectDeleting])

  const onSubmit = async (data) => {
    if (!projectSaving) {
      setProjectSaving(true)
      try {
        const formalisedData = {
          ...data,
          origins: _split(data.origins, ','),
        }

        if (isSettings) {
          await updateProject(id, formalisedData)
          newProject('The project\'s settings were updated')
        } else {
          await createProject(formalisedData)
          newProject('The project has been created')
        }

        loadProjects()
        history.push(routes.dashboard)
      } catch (e) {
        if (isSettings) {
          updateProjectFailed(e.message)
        } else {
          createNewProjectFailed(e.message)
        }
      } finally {
        setProjectSaving(false)
      }
    }
  }

  const onDelete = async () => {
    setShowDelete(false)
    if (!projectDeleting) {
      setProjectDeleting(true)
      try {
        await deleteProject(id)
        removeProject(id)
        projectDeleted()
        history.push(routes.dashboard)
      } catch (e) {
        deleteProjectFailed(e.message)
      } finally {
        setProjectDeleting(false)
      }
    }
  }

  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line

  const handleInput = event => {
    const t = event.target
    const value = t.type === 'checkbox' ? t.checked : t.value

    setForm(form => ({
      ...form,
      [t.name]: value,
    }))
  }

  const handleSubmit = e => {
    e.preventDefault()
    e.stopPropagation()
    setBeenSubmitted(true)

    if (validated) {
      onSubmit(form)
    }
  }

  const validate = () => {
    const allErrors = {}

    if (_isEmpty(form.name)) {
      allErrors.name = 'Please enter a project name.'
    }

    if (_size(form.name) > 50) {
      allErrors.name = 'Project name cannot be longer than 50 characters.'
    }

    if (_size(form.origins) > 300) {
      allErrors.origins = 'A list of allowed origins has to be smaller than 300 symbols'
    }

    const valid = Object.keys(allErrors).length === 0

    setErrors(allErrors)
    setValidated(valid)
  }

  const onCancel = () => {
    history.push(isSettings ? _replace(routes.project, ':id', id) : routes.dashboard)
  }

  const title = isSettings ? `${form.name} settings` : 'Create a new project'

  return (
    <Title title={title}>
      <div className='min-h-min-footer bg-gray-50 flex flex-col py-6 px-4 sm:px-6 lg:px-8'>
        <form className='max-w-7xl w-full mx-auto' onSubmit={handleSubmit}>
          <h2 className='mt-2 text-3xl font-extrabold text-gray-900'>
            {title}
          </h2>
          <Input
            name='name'
            id='name'
            type='text'
            label='Project name'
            value={form.name}
            placeholder='My awesome project'
            className='mt-4'
            onChange={handleInput}
            error={beenSubmitted ? errors.name : null}
          />
          <Input
            name='id'
            id='id'
            type='text'
            label='Project ID'
            value={form.id}
            className='mt-4'
            onChange={handleInput}
            error={beenSubmitted ? errors.id : null}
            disabled
          />
          {isSettings ? (
            <>
              <Input
                name='origins'
                id='origins'
                type='text'
                label='Allowed origins'
                hint={'A list of allowed origins (domains) which are allowed to use script with your ProjectID, separated by commas.\nLeave it empty to allow all origins (default setting).\nExample: cornell.edu, app.example.com, ssu.gov.ua'}
                value={form.origins}
                className='mt-4'
                onChange={handleInput}
                error={beenSubmitted ? errors.origins : null}
              />
              <Checkbox
                checked={Boolean(form.active)}
                onChange={handleInput}
                name='active'
                id='active'
                className='mt-4'
                label='Is project enabled'
                hint={'Disabled projects will not count any newly incoming events or pageviews.\nYou will still be able to access the project\'s analytics in dashboard.'}
              />
            </>
          ) : (
            <p className='text-gray-500 italic mt-2 text-sm'>*you will be able to set up your project more thoroughly after you have created it</p>
          )}
          <div className='flex justify-between mt-4'>
            <div>
              <Button className='mr-2' onClick={onCancel} secondary regular>
                Cancel
          </Button>
              <Button type='submit' loading={projectSaving} primary regular>
                Save
          </Button>
            </div>
            {isSettings && (
              <Button onClick={() => !projectDeleting && setShowDelete(true)} loading={projectDeleting} danger large>
                Delete project
              </Button>
            )}
          </div>
        </form>

        <Modal
          onClose={() => setShowDelete(false)}
          onSubmit={onDelete}
          submitText='Delete project'
          closeText='Close'
          title={`Delete ${form.name || 'the project'}?`}
          message={'By pressing \'Delete project\' you understand, that this action is irreversible.\nThe project and all the data related to it will be deleted from our servers.'}
          submitType='danger'
          type='error'
          isOpened={showDelete}
        />
      </div>
    </Title>
  )
}

ProjectSettings.propTypes = {
  updateProjectFailed: PropTypes.func.isRequired,
  createNewProjectFailed: PropTypes.func.isRequired,
  newProject: PropTypes.func.isRequired,
  projectDeleted: PropTypes.func.isRequired,
  deleteProjectFailed: PropTypes.func.isRequired,
  loadProjects: PropTypes.func.isRequired,
  projects: PropTypes.arrayOf(PropTypes.object).isRequired,
  showError: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
}

export default ProjectSettings
