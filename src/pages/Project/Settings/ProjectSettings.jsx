import React, { useState, useEffect } from 'react'
import { useLocation, useHistory, useParams, Link } from 'react-router-dom'
import Form from 'react-bootstrap/Form'
import _isEmpty from 'lodash/isEmpty'
import _replace from 'lodash/replace'
import PropTypes from 'prop-types'

import { createProject, updateProject, deleteProject } from 'api'
import { nanoid } from 'utils/random'
import routes from 'routes'
import Modal from 'components/Modal'

const ProjectSettings = ({
  updateProjectFailed, createNewProjectFailed, newProject, projectDeleted, deleteProjectFailed,
}) => {
  const { pathname } = useLocation()
  const { id } = useParams()
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

  const onSubmit = async (data) => {
    try {
      if (isSettings) {
        await updateProject(id, data)
        newProject('The project\'s settings were updated')
      } else {
        await createProject(data)
        newProject('The project has been created')
      }

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

  return (
    <div className='container'>
      <h4 className='mb-3'>{isSettings ? `${form.name} settings` : 'Create a new project'}</h4>
      <Form validated={validated} onSubmit={handleSubmit} noValidate>
        <Form.Group className='mb-3 has-validation'>
          <Form.Label htmlFor='name'>Project name</Form.Label>
          <Form.Control
            type='text'
            value={form.name}
            placeholder='My awesome project'
            id='name'
            className='form-control'
            name='name'
            onChange={handleInput}
            isValid={!errors.hasOwnProperty('name')}
            isInvalid={beenSubmitted && errors.hasOwnProperty('name')}
            required
          />
          <Form.Control.Feedback type='invalid'>
            {errors.name}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group className='mb-3'>
          <Form.Label htmlFor='id'>Project ID</Form.Label>
          <Form.Control
            type='text'
            value={form.id}
            id='id'
            className='form-control'
            name='id'
            onChange={handleInput}
            isInvalid={beenSubmitted && errors.hasOwnProperty('id')}
            disabled
            required
          />
        </Form.Group>
        {isSettings && (
          <Form.Group className='mb-3'>
            <Form.Label htmlFor='origins'>Allowed origins</Form.Label>
            <Form.Control
              type='text'
              value={form.origins}
              id='origins'
              className='form-control'
              name='origins'
              onChange={handleInput}
            />
          </Form.Group>
        )}
        <div className='d-flex justify-content-between'>
          <div>
            <Link
              to={isSettings ? _replace(routes.project, ':id', id) : routes.dashboard}
              className='btn btn-outline-secondary'>
              Cancel
            </Link>
            <button type='submit' className='btn btn-primary ml-2'>
              Save
            </button>
          </div>
          {isSettings && (
            <button type='button' onClick={() => setShowDelete(true)} className='btn btn-danger'>
              Delete project
            </button>
          )}
        </div>
      </Form>
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
}

export default ProjectSettings