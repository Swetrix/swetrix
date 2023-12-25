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
import { isValidEmail, isValidPassword, MIN_PASSWORD_CHARS, MAX_PASSWORD_CHARS } from 'utils/validator'
import { HAVE_I_BEEN_PWNED_URL, TRIAL_DAYS } from 'redux/constants'
import { trackCustom } from 'utils/analytics'

interface ISignupForm {
  email: string
  password: string
  repeat: string
  tos: boolean
  dontRemember: boolean
  checkIfLeaked: boolean
}

interface ISignup {
  signup: (
    data: {
      email: string
      password: string
      repeat: string
      dontRemember: boolean
      checkIfLeaked: boolean
    },
    t: (
      key: string,
      options?: {
        [key: string]: string | number
      },
    ) => string,
    callback: (res: any) => void,
  ) => void
  authSSO: (provider: string, dontRemember: boolean, t: (key: string) => string, callback: (res: any) => void) => void
  ssrTheme: string
}

const Signup = ({ signup, authSSO, ssrTheme }: ISignup): JSX.Element => {
  const {
    t,
  }: {
    t: (
      key: string,
      options?: {
        [key: string]: string | number
      },
    ) => string
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
    email?: string
    password?: string
    repeat?: string
    tos?: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const validate = () => {
    const allErrors = {} as {
      email?: string
      password?: string
      repeat?: string
      tos?: string
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

    setForm((oldForm) => ({
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
      <div className='bg-gray-50 dark:bg-slate-900 flex flex-col py-6 px-4 sm:px-6 lg:px-8'>
        <div className='flex min-h-full flex-1 flex-col justify-center py-6 sm:px-6 lg:px-8'>
          <div className='sm:mx-auto sm:w-full sm:max-w-md'>
            <h2 className='text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-gray-50'>
              {t('auth.signup.trial', {
                amount: TRIAL_DAYS,
              })}
            </h2>
            <p className='text-center text-base text-gray-900 dark:text-gray-50'>{t('auth.signup.noCC')}</p>
          </div>
          <div className='mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]'>
            <div className='bg-white dark:bg-slate-800/20 dark:ring-1 dark:ring-slate-800 px-6 py-12 shadow sm:rounded-lg sm:px-12'>
              <form className='space-y-6' onSubmit={handleSubmit}>
                <Input
                  name='email'
                  id='email'
                  type='email'
                  label={t('auth.common.email')}
                  value={form.email}
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
                  onChange={handleInput}
                  error={beenSubmitted ? errors.password : ''}
                />
                <Input
                  name='repeat'
                  id='repeat'
                  type='password'
                  label={t('auth.common.repeat')}
                  value={form.repeat}
                  onChange={handleInput}
                  error={beenSubmitted ? errors.repeat : ''}
                />
                <Checkbox
                  checked={form.tos}
                  onChange={handleInput}
                  name='tos'
                  id='tos'
                  label={
                    <span>
                      <Trans
                        // @ts-ignore
                        t={t}
                        i18nKey='auth.signup.tos'
                        components={{
                          // eslint-disable-next-line jsx-a11y/anchor-has-content
                          tos: (
                            <Link
                              to={routes.terms}
                              className='font-medium text-gray-900 dark:text-gray-300 underline decoration-dashed hover:decoration-solid'
                              aria-label={t('footer.tos')}
                            />
                          ),
                          // eslint-disable-next-line jsx-a11y/anchor-has-content
                          pp: (
                            <Link
                              to={routes.privacy}
                              className='font-medium text-gray-900 dark:text-gray-300 underline decoration-dashed hover:decoration-solid'
                              aria-label={t('footer.pp')}
                            />
                          ),
                        }}
                      />
                    </span>
                  }
                  hintClassName='!text-red-600 dark:!text-red-500'
                  hint={beenSubmitted ? errors.tos : ''}
                />
                <div className='flex'>
                  <Checkbox
                    checked={form.checkIfLeaked}
                    onChange={handleInput}
                    name='checkIfLeaked'
                    id='checkIfLeaked'
                    label={t('auth.common.checkLeakedPassword')}
                  />
                  <Tooltip
                    className='ml-2'
                    text={
                      <Trans
                        // @ts-ignore
                        t={t}
                        i18nKey='auth.common.checkLeakedPasswordDesc'
                        components={{
                          // eslint-disable-next-line jsx-a11y/anchor-has-content
                          db: (
                            <a
                              href={HAVE_I_BEEN_PWNED_URL}
                              className='font-medium text-indigo-400 hover:underline hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
                              target='_blank'
                              rel='noreferrer noopener'
                            />
                          ),
                        }}
                        values={{
                          database: 'haveibeenpwned.com',
                        }}
                      />
                    }
                  />
                </div>
                <Button className='w-full justify-center' type='submit' loading={isLoading} primary giant>
                  {t('auth.signup.button')}
                </Button>
              </form>

              <div>
                <div className='relative mt-10'>
                  <div className='absolute inset-0 flex items-center' aria-hidden='true'>
                    <div className='w-full border-t border-gray-200 dark:border-gray-600' />
                  </div>
                  <div className='relative flex justify-center text-sm font-medium leading-6'>
                    <span className='bg-white dark:bg-slate-800/20 px-6 text-gray-900 dark:text-gray-50'>
                      {t('auth.common.orContinueWith')}
                    </span>
                  </div>
                </div>
                <div className='mt-6 grid grid-cols-2 gap-4'>
                  <GoogleAuth
                    setIsLoading={setIsLoading}
                    authSSO={authSSO}
                    callback={signUpCallback}
                    dontRemember={false}
                  />
                  <GithubAuth
                    setIsLoading={setIsLoading}
                    authSSO={authSSO}
                    callback={signUpCallback}
                    dontRemember={false}
                    ssrTheme={ssrTheme}
                  />
                </div>
              </div>
            </div>

            <p className='mt-10 text-center text-sm text-gray-500 dark:text-gray-200'>
              <Trans
                // @ts-ignore
                t={t}
                i18nKey='auth.signup.alreadyAMember'
                components={{
                  // eslint-disable-next-line jsx-a11y/anchor-has-content
                  url: (
                    <Link
                      to={routes.signin}
                      className='font-semibold leading-6 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
                      aria-label={t('titles.signin')}
                    />
                  ),
                }}
              />
            </p>
          </div>
        </div>
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
