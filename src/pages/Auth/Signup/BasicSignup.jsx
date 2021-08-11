import React, { memo, useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { authActions } from 'redux/actions/auth'

import Input from 'ui/Input'
import Button from 'ui/Button'
import { isValidEmail, isValidPassword } from 'utils/validator'

const BasicSignup = () => {
  const dispatch = useDispatch()
  const [form, setForm] = useState({
    email: '',
    password: '',
    repeat: '',
    tos: true,
    keep_signedin: true,
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const onSubmit = (data) => {
    if (!isLoading) {
      setIsLoading(true)
      dispatch(authActions.signupAsync(data, () => {
        setIsLoading(false)
      }))
    }
  }

  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line

  const handleInput = (event) => {
    const { name, value } = event.target

    setForm(form => ({
      ...form,
      [name]: value,
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

    const valid = Object.keys(allErrors).length === 0

    setErrors(allErrors)
    setValidated(valid)
  }

  return (
    <form className='space-y-6' onSubmit={handleSubmit}>
      <Input
        name='email'
        id='email'
        type='email'
        value={form.email}
        placeholder='Email address'
        onChange={handleInput}
        error={beenSubmitted && errors.email}
      />
      <Input
        name='password'
        id='password'
        type='password'
        value={form.password}
        placeholder='Password'
        className='mt-4'
        onChange={handleInput}
        error={beenSubmitted && errors.password}
      />
      <Input
        name='repeat'
        id='repeat'
        type='password'
        value={form.repeat}
        placeholder='Repeat password'
        className='mt-4'
        onChange={handleInput}
        error={beenSubmitted && errors.repeat}
      />
      <Button className='w-full flex justify-center' type='submit' loading={isLoading} primary large>
        Create your account
      </Button>
    </form>
  )
}

export default memo(BasicSignup)
