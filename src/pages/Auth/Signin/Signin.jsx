import React, { useState, useEffect, memo } from 'react'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import { useTranslation, Trans } from 'react-i18next'
import _keys from 'lodash/keys'
import _isEmpty from 'lodash/isEmpty'
import _isString from 'lodash/isString'

import Title from 'components/Title'
import { withAuthentication, auth } from 'hoc/protected'
import routes from 'routes'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Checkbox from 'ui/Checkbox'
import {
  isValidEmail, isValidPassword, MIN_PASSWORD_CHARS,
} from 'utils/validator'
import { isSelfhosted } from 'redux/constants'
import { submit2FA, authMe } from 'api'
import { setAccessToken } from 'utils/accessToken'
import { setRefreshToken } from 'utils/refreshToken'

const Signin = ({ login, loginSuccess, loginFailed }) => {
  const { t } = useTranslation('common')
  const [form, setForm] = useState({
    email: '',
    password: '',
    dontRemember: false,
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isTwoFARequired, setIsTwoFARequired] = useState(false)
  const [twoFACode, setTwoFACode] = useState('')
  const [twoFACodeError, setTwoFACodeError] = useState(null)

  const validate = () => {
    const allErrors = {}

    if (!isValidEmail(form.email)) {
      allErrors.email = t('auth.common.badEmailError')
    }

    if (!isValidPassword(form.password)) {
      allErrors.password = t('auth.common.xCharsError', { amount: MIN_PASSWORD_CHARS })
    }

    const valid = _isEmpty(_keys(allErrors))

    setErrors(allErrors)
    setValidated(valid)
  }

  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line

  const handle2FAInput = event => {
    const { target: { value } } = event
    setTwoFACode(value)
    setTwoFACodeError(null)
  }

  const onSubmit = data => {
    if (!isLoading) {
      setIsLoading(true)
      login(data, (result, twoFARequired) => {
        if (!result) {
          setIsLoading(false)
          setIsTwoFARequired(twoFARequired)
        }
      })
    }
  }

  const _submit2FA = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isLoading) {
      setIsLoading(true)

      try {
        const { accessToken, refreshToken, user } = await submit2FA(twoFACode)
        setAccessToken(accessToken)
        setRefreshToken(refreshToken)
        loginSuccess(user)
      } catch (err) {
        if (_isString(err)) {
          loginFailed(err)
        }
        console.error(`[ERROR] Failed to authenticate with 2FA: ${err}`)
        setTwoFACodeError(t('profileSettings.invalid2fa'))
      }

      setTwoFACode('')
      setIsLoading(false)
    }
  }

  const handleInput = ({ target }) => {
    const value = target.type === 'checkbox' ? target.checked : target.value

    setForm(oldForm => ({
      ...oldForm,
      [target.name]: value,
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

  if (isTwoFARequired) {
    return (
      <Title title={t('titles.signin')}>
        <div className='min-h-page bg-gray-50 dark:bg-gray-800 flex flex-col py-6 px-4 sm:px-6 lg:px-8'>
          <form className='max-w-prose mx-auto' onSubmit={_submit2FA}>
            <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>
              {t('auth.signin.2fa')}
            </h2>
            <p className='mt-4 text-base whitespace-pre-line text-gray-900 dark:text-gray-50'>
              {t('auth.signin.2faDesc')}
            </p>
            <Input
              type='text'
              label={t('profileSettings.enter2faToDisable')}
              value={twoFACode}
              placeholder={t('auth.signin.6digitCode')}
              className='mt-4'
              onChange={handle2FAInput}
              disabled={isLoading}
              error={twoFACodeError}
            />
            <div className='flex justify-between mt-3'>
              <div className='whitespace-pre-line text-sm text-gray-600 dark:text-gray-400'>
                {!isSelfhosted && (
                  <Trans
                    t={t}
                    i18nKey='auth.signin.2faUnavailable'
                    components={{
                      ctl: <Link to={routes.contact} className='underline hover:text-gray-900 dark:hover:text-gray-200' />,
                    }}
                  />
                )}
              </div>
              <Button type='submit' loading={isLoading} primary large>
                {t('common.continue')}
              </Button>
            </div>
          </form>
        </div>
      </Title>
    )
  }

  return (
    <Title title={t('titles.signin')}>
      <div className='min-h-page bg-gray-50 dark:bg-gray-800 flex flex-col py-6 px-4 sm:px-6 lg:px-8'>
        <form className='max-w-7xl w-full mx-auto' onSubmit={handleSubmit}>
          <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>
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
            checked={form.dontRemember}
            onChange={handleInput}
            name='dontRemember'
            id='dontRemember'
            className='mt-4'
            label={t('auth.common.noRemember')}
          />
          <div className='flex justify-between mt-3'>
            <div className='pt-1'>
              {!isSelfhosted && (
                <>
                  <Link to={routes.reset_password} className='underline text-blue-600 hover:text-indigo-800 dark:text-blue-400 dark:hover:text-blue-500'>
                    {t('auth.signin.forgot')}
                  </Link>
                  <span className='text-gray-900 dark:text-gray-50'>&nbsp;|&nbsp;</span>
                  <Link to={routes.signup} className='underline text-blue-600 hover:text-indigo-800 dark:text-blue-400 dark:hover:text-blue-500'>
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
  loginSuccess: PropTypes.func.isRequired,
  loginFailed: PropTypes.func.isRequired,
}

export default memo(withAuthentication(Signin, auth.notAuthenticated))
