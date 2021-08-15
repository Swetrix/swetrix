import React, { useState, useEffect, memo } from 'react'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'

import Title from 'components/Title'
import routes from 'routes'
import Input from 'ui/Input'
import Checkbox from 'ui/Checkbox'
import Button from 'ui/Button'
import { isValidEmail, isValidPassword } from 'utils/validator'

const Signup = ({ signup }) => {
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
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line

  const onSubmit = data => {
    if (!isLoading) {
      setIsLoading(true)
      signup(data, () => {
        setIsLoading(false)
      })
    }
  }

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
    <Title title='Sign up'>
      <div className='min-h-page bg-gray-50 flex flex-col py-6 sm:px-6 lg:px-8'>
        <form className='max-w-7xl w-full mx-auto' onSubmit={handleSubmit}>
          <h2 className='mt-2 text-3xl font-extrabold text-gray-900'>
            Sign up
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
            error={beenSubmitted ? errors.email : ''}
          />
          <Input
            name='password'
            id='password'
            type='password'
            label='Password'
            hint='Longer than 8 chars'
            value={form.password}
            placeholder='Password'
            className='mt-4'
            onChange={handleInput}
            error={beenSubmitted ? errors.password : ''}
          />
          <Input
            name='repeat'
            id='repeat'
            type='password'
            label='Repeat password'
            value={form.repeat}
            placeholder='Repeat password'
            className='mt-4'
            onChange={handleInput}
            error={beenSubmitted ? errors.repeat : ''}
          />
          <Checkbox
            checked={form.tos}
            onChange={handleInput}
            name='tos'
            id='tos'
            className='mt-4'
            label={
              <span>
                I do accept&nbsp;
                <Link to={routes.terms} className='font-medium text-gray-900 hover:underline'>
                  Terms and Conditions
                </Link>
                &nbsp;and the&nbsp;
                <Link to={routes.privacy} className='font-medium text-gray-900 hover:underline'>
                  Privacy Policy
                </Link>
                .
              </span>
            }
            hint={beenSubmitted ? errors.tos : ''}
          />
          <Checkbox
            checked={form.keep_signedin}
            onChange={handleInput}
            name='keep_signedin'
            id='keep_signedin'
            className='mt-4'
            label={'Don\'t remember me.'}
          />
          <div className='pt-1 flex justify-between mt-3'>
            <Link to={routes.signin} className='underline text-blue-600 hover:text-indigo-800'>
              Sign in instead
            </Link>
            <Button type='submit' loading={isLoading} primary large>
              Sign up
            </Button>
          </div>
        </form>
      </div>
    </Title>
  )
}

Signup.propTypes = {
  signup: PropTypes.func.isRequired,
}

export default memo(Signup)
