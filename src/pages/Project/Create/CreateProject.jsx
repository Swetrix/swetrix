import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import Form from 'react-bootstrap/Form'
import { Link, useLocation } from 'react-router-dom'

import { nanoid } from 'utils/random'
import routes from 'routes'
import Modal from 'components/Modal'

const CreateProject = ({ onSubmit, onDelete, name, id }) => {
  const [form, setForm] = useState({
    name,
    id: id || nanoid(),
  })
  const { pathname } = useLocation()
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

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
    <div className="container">
      <h4 className="mb-3">{name ? `${name} settings` : 'Create a new project'}</h4>
      <Form validated={validated} onSubmit={handleSubmit} noValidate>
        <Form.Group className="mb-3 has-validation">
          <Form.Label htmlFor="name">Project name</Form.Label>
          <Form.Control
            type="text"
            value={form.name}
            placeholder="My awesome project"
            id="name"
            className="form-control"
            name="name"
            onChange={handleInput}
            isValid={!errors.hasOwnProperty('name')}
            isInvalid={beenSubmitted && errors.hasOwnProperty('name')}
            required
          />
          <Form.Control.Feedback type="invalid">
            {errors.name}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label htmlFor="id">Project ID</Form.Label>
          <Form.Control
            type="id"
            value={form.id}
            id="id"
            className="form-control"
            name="id"
            onChange={handleInput}
            isInvalid={beenSubmitted && errors.hasOwnProperty('id')}
            disabled
            required
          />
        </Form.Group>
        <div className="d-flex justify-content-between">
          <div>
            <Link
              to={{
                pathname: id ? routes.project.replace(':id', id) : routes.dashboard,
                state: { id, name },
              }}
              className="btn btn-outline-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary ml-2">
              Save
            </button>
          </div>
          {pathname === routes.project_settings && (
            <button type="button" onClick={() => setShowDelete(true)} className="btn btn-danger">
              Delete project
            </button>
          )}
        </div>
      </Form>

      {showDelete &&
        <Modal
          onCancel={() => setShowDelete(false)}
          onSubmit={() => { setShowDelete(false); onDelete() }}
          submitText="Delete project"
          cancelText="Close"
          title={`Delete ${form.name || 'the project'}?`}
          text={'By pressing \'Delete project\' you understand, that this action is irreversible.\nThe project and all the data related to it will be deleted from our servers.'}
          />
      }
    </div>
  )
}

CreateProject.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onDelete: PropTypes.func,
  name: PropTypes.string,
  id: PropTypes.string,
}

CreateProject.defaultProps = {
  name: '',
  id: '',
  onDelete: () => {},
}

export default CreateProject