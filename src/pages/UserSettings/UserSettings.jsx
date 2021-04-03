import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import Form from 'react-bootstrap/Form'
import { Mailbox } from 'react-bootstrap-icons'

import { isValidEmail, isValidPassword } from 'utils/validator'

export default ({ onDelete, onExport, onSubmit, onEmailConfirm }) => {
  const { user } = useSelector(state => state.auth)

  const [form, setForm] = useState({
    email: user.email,
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
      <h2>Profile settings</h2>

      <Form validated={validated} onSubmit={handleSubmit} noValidate>
        <Form.Group className="mb-3 has-validation">
          <Form.Label htmlFor="email">Email</Form.Label>
          <Form.Control
            type="email"
            value={form.email}
            placeholder="you@example.com"
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
        <Form.Row>
          <Form.Group className="col-md-6 mb-3">
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
          <Form.Group className="col-md-6 mb-3">
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
        </Form.Row>
        <button type="submit" className="btn btn-primary ml-auto">
          Update profile
        </button>
      </Form>

      {user?.isActive || (
        <div className="mt-4">
          <button className="btn btn-link" onClick={onExport}>
            <Mailbox color="#007bff" size="24" className="mr-2" />
            Didn't receive a link to confirm the email address? Request a new one!
          </button>
        </div>
      )}

      <div className="mt-4">
        <button
          className="btn btn-outline-primary"
          onClick={onExport}
        >
          Request data export
        </button>
        &nbsp;
        <button
          className="btn btn-danger"
          onClick={onDelete}
        >
          Delete account
        </button>
      </div>
    </div>
  )
}