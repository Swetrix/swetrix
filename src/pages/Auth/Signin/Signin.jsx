import React, { useState, useEffect, memo } from 'react'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import Title from 'components/Title'
import { notAuthenticated } from '../../../hoc/protected'
import routes from 'routes'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Checkbox from 'ui/Checkbox'
import {
  isValidEmail, isValidPassword, MIN_PASSWORD_CHARS,
} from 'utils/validator'
import { isSelfhosted } from 'redux/constants'

const Signin = ({ login }) => {
  const { t } = useTranslation('common')
  const [form, setForm] = useState({
    email: '',
    password: '',
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
      login(data, () => {
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
      allErrors.email = t('auth.common.badEmailError')
    }

    if (!isValidPassword(form.password)) {
      allErrors.password = t('auth.common.xCharsError', { amount: MIN_PASSWORD_CHARS })
    }

    const valid = Object.keys(allErrors).length === 0

    setErrors(allErrors)
    setValidated(valid)
  }

  return (
    <Title title={t('titles.signin')}>
      <div className='min-h-page bg-gray-50 flex flex-col py-6 px-4 sm:px-6 lg:px-8'>
        <form className='max-w-7xl w-full mx-auto' onSubmit={handleSubmit}>
          <h2 className='mt-2 text-3xl font-extrabold text-gray-900'>
            {t('auth.signin.title')}
          </h2>
          <Input
            name='email'
            id='email'
            type='email'
            label={t('auth.common.email')}
            value={form.email}
            placeholder='you@example.com'
            className='mt-4'
            onChange={handleInput}
            error={beenSubmitted && errors.email}
          />
          <Input
            name='password'
            id='password'
            type='password'
            label={t('auth.common.password')}
            hint={t('auth.common.hint', { amount: MIN_PASSWORD_CHARS })}
            value={form.password}
            placeholder={t('auth.common.password')}
            className='mt-4'
            onChange={handleInput}
            error={beenSubmitted && errors.password}
          />
          <Checkbox
            checked={form.keep_signedin}
            onChange={handleInput}
            name='keep_signedin'
            id='keep_signedin'
            className='mt-4'
            label={t('auth.common.noRemember')}
          />
          <div className='flex justify-between mt-3'>
            <div className='pt-1'>
            {!isSelfhosted && (
              <>
                <Link to={routes.reset_password} className='underline text-blue-600 hover:text-indigo-800'>
                  {t('auth.signin.forgot')}
                </Link>
                <span>&nbsp;|&nbsp;</span>
                <Link to={routes.signup} className='underline text-blue-600 hover:text-indigo-800'>
                  {t('auth.common.signupInstead')}
                </Link>
              </>
            )}
            </div>
            <Button type='submit' loading={isLoading} primary large>
              {t('auth.signin.button')}
            </Button>
          </div>
        </form>
      </div>
    </Title>
  )
}

Signin.propTypes = {
  login: PropTypes.func.isRequired,
}

export default notAuthenticated(memo(Signin))
