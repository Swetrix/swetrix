import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import Form from 'react-bootstrap/Form'
import { Mailbox } from 'react-bootstrap-icons'

import Modal from 'components/Modal'
import { isValidEmail, isValidPassword } from 'utils/validator'

const UserSettings = ({ onDelete, onExport, onSubmit, onEmailConfirm }) => {
  const { user } = useSelector(state => state.auth)

  const [form, setForm] = useState({
    email: user.email || '',
    password: '',
    repeat: '',
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [error, setError] = useState('')

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

    if (form.password.length > 0 && !isValidPassword(form.password)) {
      allErrors.password = 'The entered password is incorrect.'
    }

    if (form.password !== form.repeat) {
      allErrors.repeat = 'Passwords have to match.'
    }

    const valid = Object.keys(allErrors).length === 0

    setErrors(allErrors)
    setValidated(valid)
  }

  return (
    <div className="container">
      <h2>Profile settings</h2>

      <Form onSubmit={handleSubmit} noValidate>
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
              isInvalid={beenSubmitted && errors.hasOwnProperty('password')}
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
              isInvalid={beenSubmitted && errors.hasOwnProperty('repeat')}
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
          <button className="btn btn-link pl-0" onClick={() => onEmailConfirm(setError)}>
            <Mailbox color="#007bff" size="24" className="mr-2" />
            Didn't receive a link to confirm the email address? Request a new one!
          </button>
        </div>
      )}

      <div className="mt-4">
        <button
          className="btn btn-outline-primary"
          onClick={() => setShowExportModal(true)}
        >
          Request data export
        </button>
        <button
          className="btn btn-danger ml-3"
          onClick={() => setShowModal(true)}
        >
          Delete account
        </button>
      </div>

      {showExportModal && (
        <Modal
          onCancel={() => setShowExportModal(false)}
          onSubmit={() => { setShowExportModal(false); onExport() }}
          submitText="Continue"
          cancelText="Close"
          title="Data export"
          text={'As requested by Art. 20 of General Data Protection Regulation (GDPR) the you have the right to receive your personal data that we store.\nThe data export will be ready within 24 hours and sent to your email account.\nNote: you can request the data export only once per two weeks.'}
        />
      )}
      {showModal && (
        <Modal
          onCancel={() => setShowModal(false)}
          onSubmit={() => { setShowModal(false); onDelete() }}
          submitText="Delete my account"
          cancelText="Close"
          title="Delete your account?"
          text={'By pressing \'Delete my account\' you understand, that this action is irreversible.\nAll your data will be deleted from our servers.'}
        />
      )}
      {error && (
        <Modal
          onSubmit={() => { setError('') }}
          onCancel={() => { setError('') }}
          submitText="Got it"
          title="Error"
          text={error}
        />
      )}
    </div>
  )
}

export default React.memo(UserSettings)