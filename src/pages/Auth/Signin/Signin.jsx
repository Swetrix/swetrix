import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Form from 'react-bootstrap/Form'

import routes from 'routes'
import { isValidEmail, isValidPassword } from 'utils/validator'

export default ({ onSubmit }) => {
  const [form, setForm] = useState({
    email: '',
    password: '',
    keep_signedin: false
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

    if (!isValidEmail(form.email)) {
      allErrors.email = 'Please provide a valid email.'
    }

    const valid = Object.keys(allErrors).length === 0

    setErrors(allErrors)
    setValidated(valid)
  }

  return (
    <div className="container">
      <h4 className="mb-3">Sign in</h4>
      <Form validated={validated} onSubmit={handleSubmit} noValidate>
        <Form.Group className="mb-3 has-validation">
          <Form.Label htmlFor="email">Email</Form.Label>
          <Form.Control
            type="email"
            value={form.email}
            placeholder="you@email.com"
            id="email"
            className="form-control"
            name="email"
            onChange={handleInput}
            isValid={!errors.hasOwnProperty('email')}
            isInvalid={beenSubmitted && errors.hasOwnProperty('email')}
            required
          />
          <Form.Control.Feedback type="invalid">
            {errors.email}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label htmlFor="password">Password</Form.Label>
          <Form.Control
            type="password"
            value={form.password}
            placeholder="Password"
            id="password"
            className="form-control"
            name="password"
            onChange={handleInput}
            required
          />
        </Form.Group>
      </Form>
      <Form.Group className="custom-control custom-checkbox">
        <Form.Control
          type="checkbox"
          checked={form.keep_signedin}
          id="keep_signedin"
          className="custom-control-input"
          name="keep_signedin"
          onChange={handleInput}
        />
        <Form.Label htmlFor="keep_signedin" className="custom-control-label">
          Don't remember me.
        </Form.Label>
      </Form.Group>
      <div className="d-flex align-items-center mb-3">
        <Link to={routes.signup} className="btn btn-link">
          Sign up instead
        </Link>
        <button type="submit" className="btn btn-primary ml-auto">
          Sign in
        </button>
      </div>
    </div>
  )
}