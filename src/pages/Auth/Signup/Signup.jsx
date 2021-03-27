import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Form from 'react-bootstrap/Form'

import routes from 'routes'
import { isValidEmail, isValidPassword } from 'utils/validator'

export default ({ onSubmit }) => {
  const [form, setForm] = useState({
    email: '',
    password: '',
    repeat: '',
    tos: false,
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

    if (!isValidPassword(form.password)) {
      allErrors.password = 'The password has to consist of at least 8 characters.'
    }

    if (form.password !== form.repeat || form.repeat === '') {
      allErrors.repeat = 'Passwords have to match.'
    }

    if (!form.tos) {
      allErrors.tos = 'You have to accept our TOS and privacy policy in order to use our services.'
    }

    const valid = Object.keys(allErrors).length === 0

    setErrors(allErrors)
    setValidated(valid)
  }

  return (
    <div className="container">
      <h4 className="mb-3">Sign up</h4>
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
        <Form.Group className="custom-control custom-checkbox">
          <Form.Control
            type="checkbox"
            checked={form.tos}
            id="tos"
            className="custom-control-input"
            name="tos"
            onChange={handleInput}
            isInvalid={beenSubmitted && errors.hasOwnProperty('tos')}
            required
          />
          <Form.Label htmlFor="tos" className="custom-control-label">
            I do accept terms and conditions and the privacy policy.
          </Form.Label>
          <Form.Control.Feedback type="invalid">
            {errors.tos}
          </Form.Control.Feedback>
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
        <Link to={routes.signin} className="btn btn-link">
          Sign in instead
          </Link>
        <button type="submit" className="btn btn-primary ml-auto">
          Sign up
          </button>
      </div>
    </div>
  )
}