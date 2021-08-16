import React, { useState, useEffect, memo } from 'react'
import { Link, useHistory } from 'react-router-dom'

import { forgotPassword } from 'api'
import Title from 'components/Title'
import routes from 'routes'
import Input from 'ui/Input'
import Button from 'ui/Button'
import { isValidEmail } from 'utils/validator'

const ForgotPassword = ({
  createNewPasswordFailed, newPassword,
}) => {
  const history = useHistory()
  const [form, setForm] = useState({
    email: '',
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line

  const onSubmit = async (data) => {
    if (!isLoading) {
      setIsLoading(true)

      try {
        await forgotPassword(data)
  
        newPassword('A password reset e-mail has been sent to the specified address')
        history.push(routes.main)
      } catch (e) {
        createNewPasswordFailed(e.toString())
      } finally {
        setIsLoading(false)
      }
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

    const valid = Object.keys(allErrors).length === 0

    setErrors(allErrors)
    setValidated(valid)
  }

  return (
    <Title title='Account recovery'>
      <div className='min-h-page bg-gray-50 flex flex-col py-6 px-4 sm:px-6 lg:px-8'>
        <form className='max-w-7xl w-full mx-auto' onSubmit={handleSubmit}>
          <h2 className='mt-2 text-3xl font-extrabold text-gray-900'>
            Account recovery
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
            error={beenSubmitted && errors.email}
          />
          <div className='flex justify-between mt-3'>
            <Link to={routes.signin} className='mt-1 underline text-blue-600 hover:text-indigo-800'>
              Sign in
            </Link>
            <Button type='submit' loading={isLoading} primary large>
              Reset password
            </Button>
          </div>
        </form>
      </div>
    </Title>
  )
}

export default memo(ForgotPassword)
