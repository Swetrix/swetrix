import React, { useState, useEffect, memo } from 'react'
import { useSelector } from 'react-redux'
import _size from 'lodash/size'
import _isEmpty from 'lodash/isEmpty'
import { MailIcon } from '@heroicons/react/outline'

import Title from 'components/Title'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Modal from 'ui/Modal'
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
  const [error, setError] = useState(null)

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

    if (!isValidEmail(form.email)) {
      allErrors.email = 'Please provide a valid email.'
    }

    if (_size(form.password) > 0 && !isValidPassword(form.password)) {
      allErrors.password = 'The entered password is incorrect.'
    }

    if (form.password !== form.repeat) {
      allErrors.repeat = 'Passwords have to match.'
    }

    const valid = _isEmpty(Object.keys(allErrors))

    setErrors(allErrors)
    setValidated(valid)
  }

  return (
    <Title title='Profile settings'>
      <div className='min-h-page bg-gray-50 flex flex-col py-6 px-4 sm:px-6 lg:px-8'>
        <form className='max-w-7xl w-full mx-auto' onSubmit={handleSubmit}>
          <h2 className='mt-2 text-3xl font-extrabold text-gray-900'>
            Profile settings
        </h2>
          <Input
            name='email'
            id='email'
            type='email'
            label='Email'
            value={form.email}
            placeholder='you@example.com'
            className='mt-4'
            onChange={handleInput}
            error={beenSubmitted ? errors.email : null}
          />
          <div className='grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6 mt-4'>
            <Input
              name='password'
              id='password'
              type='password'
              label='Password'
              hint='Longer than 8 chars'
              value={form.password}
              placeholder='Password'
              className='sm:col-span-3'
              onChange={handleInput}
              error={beenSubmitted ? errors.password : null}
            />
            <Input
              name='repeat'
              id='repeat'
              type='password'
              label='Repeat password'
              value={form.repeat}
              placeholder='Repeat password'
              className='sm:col-span-3'
              onChange={handleInput}
              error={beenSubmitted ? errors.repeat : null}
            />
          </div>
          <Button className='mt-4' type='submit' primary large>
            Update profile
          </Button>
          <hr className='mt-3' />
          {!user?.isActive && (
            <div href='#' className='flex cursor-pointer mt-4 pl-0 underline text-blue-600 hover:text-indigo-800' onClick={() => onEmailConfirm(setError)}>
              <MailIcon className='mt-0.5 mr-2 w-6 h-6 text-blue-500' />
            Didn't receive a link to confirm the email address? Request a new one!
            </div>
          )}
          <div className='flex justify-between mt-4'>
            <Button
              onClick={() => setShowExportModal(true)}
              regular
              primary
            >
              Request data export
          </Button>
            <Button
              className='ml-3'
              onClick={() => setShowModal(true)}
              regular
              danger
            >
              Delete account
          </Button>
          </div>
        </form>

        <Modal
          onClose={() => setShowExportModal(false)}
          onSubmit={() => { setShowExportModal(false); onExport() }}
          submitText='Continue'
          closeText='Close'
          title='Data export'
          type='info'
          message={'As requested by Art. 20 of General Data Protection Regulation (GDPR) the you have the right to receive your personal data that we store. This report does not include events data per project.\nThe data report will be sent to your email address.\nNote: you can request the data export only once per two weeks.'}
          isOpened={showExportModal}
        />
        <Modal
          onClose={() => setShowModal(false)}
          onSubmit={() => { setShowModal(false); onDelete() }}
          submitText='Delete my account'
          closeText='Close'
          title='Delete your account?'
          submitType='danger'
          type='error'
          message={'Are you sure you want to deactivate your account?\nAll of your data will be permanently removed from our servers forever.\nThis action cannot be undone. '}
          isOpened={showModal}
        />
        <Modal
          onClose={() => { setError('') }}
          closeText='Got it'
          type='error'
          title='Error'
          message={error}
          isOpened={Boolean(error)}
        />
      </div>
    </Title>
  )
}

export default memo(UserSettings)
