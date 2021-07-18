import React, { useState, useEffect, useMemo } from 'react'
import { useLocation, useHistory, useParams } from 'react-router-dom'
import _isEmpty from 'lodash/isEmpty'
import _replace from 'lodash/replace'
import _find from 'lodash/find'
import PropTypes from 'prop-types'

import { createProject, updateProject, deleteProject } from 'api'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Checkbox from 'ui/Checkbox'
import { nanoid } from 'utils/random'
import routes from 'routes'
import Modal from 'components/Modal'

const ProjectSettings = ({
  updateProjectFailed, createNewProjectFailed, newProject, projectDeleted, deleteProjectFailed,
  loadProjects, isLoading, projects, showError,
}) => {
  const { pathname } = useLocation()
  const { id } = useParams()
  const project = useMemo(() => _find(projects, p => p.id === id) || {}, [projects])
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

  useEffect(() => {
    if (!isLoading && isSettings) {
      if (_isEmpty(project)) {
        showError('The selected project does not exist')
        history.push(routes.dashboard)
      } else {
        setForm(project)
      }
    }
  }, [project, isLoading, isSettings])

  const onSubmit = async (data) => {
    try {
      if (isSettings) {
        await updateProject(id, data)
        newProject('The project\'s settings were updated')
      } else {
        await createProject(data)
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
    }
  }

  const onDelete = async () => {
    try {
      await deleteProject(id)
      projectDeleted()
      history.push(routes.dashboard)
    } catch (e) {
      deleteProjectFailed(e.message)
    }
  }

  useEffect(() => {
    validate()
  }, [form])

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

    if (!form.name) {
      allErrors.name = 'Please enter a project name.'
    }

    if (form.name.length > 80) {
      allErrors.name = 'Project name cannot be longer than 80 characters.'
    }

    const valid = Object.keys(allErrors).length === 0

    setErrors(allErrors)
    setValidated(valid)
  }

  const onCancel = () => {
    history.push(isSettings ? _replace(routes.project, ':id', id) : routes.dashboard)
  }

  return (
    <div className='min-h-page bg-gray-50 flex flex-col py-6 sm:px-6 lg:px-8'>
      <form className='max-w-7xl w-full mx-auto' onSubmit={handleSubmit}>
        <h2 className='mt-2 text-3xl font-extrabold text-gray-900'>
          {isSettings ? `${form.name} settings` : 'Create a new project'}
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
          error={beenSubmitted && errors.name}
        />
        <Input
          name='id'
          id='id'
          type='text'
          label='Project ID'
          value={form.id}
          className='mt-4'
          onChange={handleInput}
          error={beenSubmitted && errors.id}
          disabled
        />
        {isSettings && (
          <>
            <Input
              name='origins'
              id='origins'
              type='text'
              label='Allowed origins'
              value={form.origins}
              className='mt-4'
              onChange={handleInput}
              error={beenSubmitted && errors.origins}
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
        )}
        <div className='flex justify-between mt-4'>
          <div>
            <Button className='mr-2' onClick={onCancel} secondary regular>
              Cancel
            </Button>
            <Button type='submit' primary regular>
              Save
            </Button>
          </div>
          {isSettings && (
            <Button onClick={() => setShowDelete(true)} danger large>
              Delete project
            </Button>
          )}
        </div>
      </form>

      {showDelete &&
        <Modal
          onCancel={() => setShowDelete(false)}
          onSubmit={() => { setShowDelete(false); onDelete() }}
          submitText='Delete project'
          cancelText='Close'
          title={`Delete ${form.name || 'the project'}?`}
          text={'By pressing \'Delete project\' you understand, that this action is irreversible.\nThe project and all the data related to it will be deleted from our servers.'}
        />
      }
    </div>
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