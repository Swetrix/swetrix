import React, { useState, useEffect, memo } from 'react'
import { Link } from '@remix-run/react'
import PropTypes from 'prop-types'
import { useTranslation, Trans } from 'react-i18next'
import _size from 'lodash/size'
import _keys from 'lodash/keys'
import _omit from 'lodash/omit'
import _isEmpty from 'lodash/isEmpty'

import GoogleAuth from 'components/GoogleAuth'
import GithubAuth from 'components/GithubAuth'
import { withAuthentication, auth } from 'hoc/protected'
import routes from 'routesPath'
import Input from 'ui/Input'
import Checkbox from 'ui/Checkbox'
import Tooltip from 'ui/Tooltip'
import Button from 'ui/Button'
import {
  isValidEmail, isValidPassword, MIN_PASSWORD_CHARS, MAX_PASSWORD_CHARS,
} from 'utils/validator'
import { HAVE_I_BEEN_PWNED_URL, TRIAL_DAYS } from 'redux/constants'
import { trackCustom } from 'utils/analytics'

interface ISignupForm {
  email: string,
  password: string,
  repeat: string,
  tos: boolean,
  dontRemember: boolean,
  checkIfLeaked: boolean,
}

interface ISignup {
  signup: (data: {
    email: string,
    password: string,
    repeat: string,
    dontRemember: boolean,
    checkIfLeaked: boolean,
  },
    t: (key: string, options?: {
      [key: string]: string | number,
    }) => string, callback: (res: any) => void) => void,
  authSSO: (provider: string, dontRemember: boolean, t: (key: string) => string, callback: (res: any) => void) => void
  ssrTheme: string,
}

const Signup = ({ signup, authSSO, ssrTheme }: ISignup): JSX.Element => {
  const { t }: {
    t: (key: string, options?: {
      [key: string]: string | number,
    }) => string,
  } = useTranslation('common')
  const [form, setForm] = useState<ISignupForm>({
    email: '',
    password: '',
    repeat: '',
    tos: false,
    dontRemember: false,
    checkIfLeaked: true,
  })
  const [validated, setValidated] = useState<boolean>(false)
  const [errors, setErrors] = useState<{
    email?: string,
    password?: string,
    repeat?: string,
    tos?: string,
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const validate = () => {
    const allErrors = {} as {
      email?: string,
      password?: string,
      repeat?: string,
      tos?: string,
    }

    if (!isValidEmail(form.email)) {
      allErrors.email = t('auth.common.badEmailError')
    }

    if (!isValidPassword(form.password)) {
      allErrors.password = t('auth.common.xCharsError', { amount: MIN_PASSWORD_CHARS })
    }

    if (form.password !== form.repeat || form.repeat === '') {
      allErrors.repeat = t('auth.common.noMatchError')
    }

    if (_size(form.password) > 50) {
      allErrors.password = t('auth.common.passwordTooLong', { amount: MAX_PASSWORD_CHARS })
    }

    if (!form.tos) {
      allErrors.tos = t('auth.common.tosError')
    }

    const valid = _isEmpty(_keys(allErrors))

    setErrors(allErrors)
    setValidated(valid)
  }

  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line

  const signUpCallback = (result: any) => {
    if (result) {
      trackCustom('SIGNUP')
    } else {
      setIsLoading(false)
    }
  }

  const onSubmit = (data: ISignupForm) => {
    if (!isLoading) {
      setIsLoading(true)
      signup(_omit(data, 'tos'), t, signUpCallback)
    }
  }

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event
    const value = target.type === 'checkbox' ? target.checked : target.value

    setForm(oldForm => ({
      ...oldForm,
      [target.name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setBeenSubmitted(true)

    if (validated) {
      onSubmit(form)
    }
  }

  return (
    <div>
      <div className='min-h-page bg-gray-50 dark:bg-slate-900 flex flex-col py-6 px-4 sm:px-6 lg:px-8'>
        <form className='max-w-7xl w-full mx-auto' onSubmit={handleSubmit}>
          <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>
            {t('auth.signup.trial', {
              amount: TRIAL_DAYS,
            })}
          </h2>
          <p className='text-lg text-gray-900 dark:text-gray-50'>
            {t('auth.signup.noCC')}
          </p>
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
            label={(
              <span>
                <Trans
                  // @ts-ignore
                  t={t}
                  i18nKey='auth.signup.tos'
                  components={{
                    tos: <Link to={routes.terms} className='font-medium text-gray-900 dark:text-gray-300 hover:underline' aria-label={t('footer.tos')} />,
                    pp: <Link to={routes.privacy} className='font-medium text-gray-900 dark:text-gray-300 hover:underline' aria-label={t('footer.pp')} />,
                  }}
                />
              </span>
            )}
            hintClassName='!text-red-600 dark:!text-red-500'
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
                  // @ts-ignore
                  t={t}
                  i18nKey='auth.common.checkLeakedPasswordDesc'
                  components={{
                    // eslint-disable-next-line jsx-a11y/anchor-has-content
                    db: <a href={HAVE_I_BEEN_PWNED_URL} className='font-medium text-indigo-400 hover:underline hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500' target='_blank' rel='noreferrer noopener' />,
                  }}
                  values={{
                    database: 'haveibeenpwned.com',
                  }}
                />
              )}
            />
          </div>
          <Checkbox
            checked={form.dontRemember}
            onChange={handleInput}
            name='dontRemember'
            id='dontRemember'
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
          <div className='flex flex-wrap'>
            <GoogleAuth
              className='mt-4 mr-5'
              setIsLoading={setIsLoading}
              authSSO={authSSO}
              callback={signUpCallback}
              dontRemember={form.dontRemember}
            />
            <GithubAuth
              className='mt-4'
              setIsLoading={setIsLoading}
              authSSO={authSSO}
              callback={signUpCallback}
              dontRemember={form.dontRemember}
              ssrTheme={ssrTheme}
            />
          </div>
        </form>
      </div>
    </div>
  )
}

Signup.propTypes = {
  signup: PropTypes.func.isRequired,
  authSSO: PropTypes.func.isRequired,
  ssrTheme: PropTypes.string.isRequired,
}

export default memo(withAuthentication(Signup, auth.notAuthenticated))
