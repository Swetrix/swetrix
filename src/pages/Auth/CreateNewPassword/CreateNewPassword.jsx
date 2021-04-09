import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Form from 'react-bootstrap/Form'

import routes from 'routes'
import { isValidPassword } from 'utils/validator'

export default ({ onSubmit }) => {
  const [form, setForm] = useState({
    password: '',
    repeat: '',
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)

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

    if (!isValidPassword(form.password)) {
      allErrors.password = 'The password has to consist of at least 8 characters.'
    }

    if (form.password !== form.repeat || form.repeat === '') {
      allErrors.repeat = 'Passwords have to match.'
    }

    const valid = Object.keys(allErrors).length === 0

    setErrors(allErrors)
    setValidated(valid)
  }

  return (
    <div className="container">
      <h4 className="mb-3">Account recovery</h4>
      <Form validated={validated} onSubmit={handleSubmit} noValidate>
        <Form.Group className="mb-3">
          <Form.Label htmlFor="password">Your new password</Form.Label>
          <Form.Control
            type="password"
            value={form.password}
            placeholder="Password"
            id="password"
            className="form-control"
            name="password"
            onChange={handleInput}
            isValid={!errors.hasOwnProperty('password')}
            isInvalid={beenSubmitted && errors.hasOwnProperty('password')}
            required
          />
          <Form.Control.Feedback type="invalid">
            {errors.password}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label htmlFor="repeat">Repeat password</Form.Label>
          <Form.Control
            type="password"
            value={form.repeat}
            placeholder="Repeat password"
            id="repeat"
            className="form-control"
            name="repeat"
            onChange={handleInput}
            isValid={!errors.hasOwnProperty('repeat')}
            isInvalid={beenSubmitted && errors.hasOwnProperty('repeat')}
            required
          />
          <Form.Control.Feedback type="invalid">
            {errors.repeat}
          </Form.Control.Feedback>
        </Form.Group>
        <div className="d-flex align-items-center mb-3">
          <Link to={routes.signin} className="btn btn-link">
            Sign in instead
          </Link>
          <button type="submit" className="btn btn-primary ml-auto">
            Save new password
          </button>
        </div>
      </Form>
    </div>
  )
}