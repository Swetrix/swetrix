import React, { useState, useEffect, memo } from 'react'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import { useTranslation, Trans } from 'react-i18next'

import Title from 'components/Title'
import { withAuthentication, auth } from 'hoc/protected'
import routes from 'routes'
import Input from 'ui/Input'
import Checkbox from 'ui/Checkbox'
import Tooltip from 'ui/Tooltip'
import Button from 'ui/Button'
import {
  isValidEmail, isValidPassword, MIN_PASSWORD_CHARS,
} from 'utils/validator'
import { HAVE_I_BEEN_PWNED_URL } from 'redux/constants'

const Signup = ({ signup }) => {
  const { t } = useTranslation('common')
  const [form, setForm] = useState({
    email: '',
    password: '',
    repeat: '',
    tos: false,
    keep_signedin: false,
    checkIfLeaked: true,
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
      signup(data, t, () => {
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

    if (form.password !== form.repeat || form.repeat === '') {
      allErrors.repeat = t('auth.common.noMatchError')
    }

    if (!form.tos) {
      allErrors.tos = t('auth.common.tosError')
    }

    const valid = Object.keys(allErrors).length === 0

    setErrors(allErrors)
    setValidated(valid)
  }

  return (
    <Title title={t('titles.signup')}>
      <div className='min-h-page bg-gray-50 dark:bg-gray-800 flex flex-col py-6 px-4 sm:px-6 lg:px-8'>
        <form className='max-w-7xl w-full mx-auto' onSubmit={handleSubmit}>
          <h2 className='mt-2 text-3xl font-extrabold text-gray-900 dark:text-gray-50'>
            {t('titles.signup')}
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
            error={beenSubmitted ? errors.email : ''}
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
            error={beenSubmitted ? errors.password : ''}
          />
          <Input
            name='repeat'
            id='repeat'
            type='password'
            label={t('auth.common.repeat')}
            value={form.repeat}
            placeholder={t('auth.common.repeat')}
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
                <Trans
                  t={t}
                  i18nKey='auth.signup.tos'
                  components={{
                    tos: <Link to={routes.terms} className='font-medium text-gray-900 dark:text-gray-300 hover:underline' />,
                    pp: <Link to={routes.privacy} className='font-medium text-gray-900 dark:text-gray-300 hover:underline' />,
                  }}
                />
              </span>
            }
            hint={beenSubmitted ? errors.tos : ''}
          />
          <div className='flex mt-4'>
            <Checkbox
              checked={form.checkIfLeaked}
              onChange={handleInput}
              name='checkIfLeaked'
              id='checkIfLeaked'
              label={t('auth.common.checkLeakedPassword')}
            />
            <Tooltip
              className='ml-2'
              text={(
                <Trans
                  t={t}
                  i18nKey='auth.common.checkLeakedPasswordDesc'
                  components={{
                    // eslint-disable-next-line jsx-a11y/anchor-has-content
                    db: <a href={HAVE_I_BEEN_PWNED_URL} className='font-medium text-indigo-400 hover:underline hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500' />,
                  }}
                  values={{
                    database: 'haveibeenpwned.com',
                  }}
                />
              )}
            />
          </div>
          <Checkbox
            checked={form.keep_signedin}
            onChange={handleInput}
            name='keep_signedin'
            id='keep_signedin'
            className='mt-4'
            label={t('auth.common.noRemember')}
          />
          <div className='pt-1 flex justify-between mt-3'>
            <Link to={routes.signin} className='underline text-blue-600 hover:text-indigo-800 dark:text-blue-400 dark:hover:text-blue-500'>
              {t('auth.common.signinInstead')}
            </Link>
            <Button type='submit' loading={isLoading} primary large>
              {t('auth.signup.button')}
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

export default memo(withAuthentication(Signup, auth.notAuthenticated))
