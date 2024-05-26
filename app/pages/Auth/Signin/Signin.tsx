import React, { useState, useEffect, memo } from 'react'
import type i18next from 'i18next'
import { Link } from '@remix-run/react'
import { useTranslation, Trans } from 'react-i18next'
import _keys from 'lodash/keys'
import _isEmpty from 'lodash/isEmpty'
import _isString from 'lodash/isString'

import GoogleAuth from 'components/GoogleAuth'
import GithubAuth from 'components/GithubAuth'
import { withAuthentication, auth } from 'hoc/protected'
import routes from 'routesPath'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Checkbox from 'ui/Checkbox'
import { isValidEmail, isValidPassword, MIN_PASSWORD_CHARS } from 'utils/validator'
import { isSelfhosted, TRIAL_DAYS } from 'redux/constants'
import { IUser } from 'redux/models/IUser'
import { submit2FA } from 'api'
import { setAccessToken, removeAccessToken } from 'utils/accessToken'
import { setRefreshToken, removeRefreshToken } from 'utils/refreshToken'

interface ISigninForm {
  email: string
  password: string
  dontRemember: boolean
}

interface ISignin {
  login: (
    data: {
      email: string
      password: string
      dontRemember: boolean
    },
    callback: (result: boolean, twoFARequired: boolean) => void,
  ) => void
  loginSuccess: (user: IUser) => void
  loginFailed: (error: string) => void
  authSSO: (provider: string, dontRemember: boolean, t: typeof i18next.t, callback: (res: any) => void) => void
  ssrTheme: string
}

const Signin = ({ login, loginSuccess, loginFailed, authSSO, ssrTheme }: ISignin): JSX.Element => {
  const { t } = useTranslation('common')
  const [form, setForm] = useState<ISigninForm>({
    email: '',
    password: '',
    dontRemember: false,
  })
  const [validated, setValidated] = useState<boolean>(false)
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isTwoFARequired, setIsTwoFARequired] = useState<boolean>(false)
  const [twoFACode, setTwoFACode] = useState<string>('')
  const [twoFACodeError, setTwoFACodeError] = useState<string | null>(null)

  const validate = () => {
    const allErrors = {} as {
      email?: string
      password?: string
    }

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

  const handle2FAInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = event
    setTwoFACode(value)
    setTwoFACodeError(null)
  }

  const loginCallback = (result: boolean, twoFARequired: boolean) => {
    if (!result) {
      setIsLoading(false)
      setIsTwoFARequired(twoFARequired)
    }
  }

  const onSubmit = (data: ISigninForm) => {
    if (!isLoading) {
      setIsLoading(true)
      login(data, loginCallback)
    }
  }

  const _submit2FA = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isLoading) {
      setIsLoading(true)

      try {
        const { accessToken, refreshToken, user } = await submit2FA(twoFACode)
        removeAccessToken()
        removeRefreshToken()
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

  const handleInput = ({ target }: { target: HTMLInputElement }) => {
    setForm((oldForm) => ({
      ...oldForm,
      [target.name]: target.value,
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

  if (isTwoFARequired) {
    return (
      <div className='flex min-h-page flex-col bg-gray-50 px-4 py-6 dark:bg-slate-900 sm:px-6 lg:px-8'>
        <form className='mx-auto max-w-prose' onSubmit={_submit2FA}>
          <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>{t('auth.signin.2fa')}</h2>
          <p className='mt-4 whitespace-pre-line text-base text-gray-900 dark:text-gray-50'>
            {t('auth.signin.2faDesc')}
          </p>
          <Input
            label={t('profileSettings.enter2faToDisable')}
            value={twoFACode}
            placeholder={t('auth.signin.6digitCode')}
            className='mt-4'
            onChange={handle2FAInput}
            disabled={isLoading}
            error={twoFACodeError}
          />
          <div className='mt-3 flex justify-between'>
            <div className='whitespace-pre-line text-sm text-gray-600 dark:text-gray-400'>
              {!isSelfhosted && (
                <Trans
                  // @ts-ignore
                  t={t}
                  i18nKey='auth.signin.2faUnavailable'
                  components={{
                    // eslint-disable-next-line jsx-a11y/anchor-has-content
                    ctl: (
                      <Link to={routes.contact} className='underline hover:text-gray-900 dark:hover:text-gray-200' />
                    ),
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
    )
  }

  return (
    <div className='flex min-h-min-footer flex-col bg-gray-50 px-4 py-6 dark:bg-slate-900 sm:px-6 lg:px-8'>
      <div className='sm:mx-auto sm:w-full sm:max-w-md'>
        <h2 className='text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-gray-50'>
          {t('auth.signin.title')}
        </h2>
      </div>
      <div className='mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]'>
        <div className='bg-white px-6 py-12 shadow dark:bg-slate-800/20 dark:ring-1 dark:ring-slate-800 sm:rounded-lg sm:px-12'>
          <form className='space-y-6' onSubmit={handleSubmit}>
            <Input
              name='email'
              type='email'
              label={t('auth.common.email')}
              value={form.email}
              className='mt-4'
              onChange={handleInput}
              error={beenSubmitted ? errors.email : ''}
            />
            <Input
              name='password'
              type='password'
              label={t('auth.common.password')}
              hint={t('auth.common.hint', { amount: MIN_PASSWORD_CHARS })}
              value={form.password}
              className='mt-4'
              onChange={handleInput}
              error={beenSubmitted ? errors.password : ''}
            />
            <div className='flex items-center justify-between'>
              <Checkbox
                checked={form.dontRemember}
                onChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    dontRemember: checked,
                  }))
                }
                name='dontRemember'
                label={t('auth.common.noRemember')}
              />
              {!isSelfhosted && (
                <div className='text-sm leading-6'>
                  <Link
                    to={routes.reset_password}
                    className='font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
                  >
                    {t('auth.signin.forgot')}
                  </Link>
                </div>
              )}
            </div>

            <Button className='w-full justify-center' type='submit' loading={isLoading} primary giant>
              {t('auth.signin.button')}
            </Button>
          </form>

          {!isSelfhosted && (
            <div>
              <div className='relative mt-10'>
                <div className='absolute inset-0 flex items-center' aria-hidden='true'>
                  <div className='w-full border-t border-gray-200 dark:border-gray-600' />
                </div>
                <div className='relative flex justify-center text-sm font-medium leading-6'>
                  <span className='bg-white px-6 text-gray-900 dark:bg-slate-800/20 dark:text-gray-50'>
                    {t('auth.common.orContinueWith')}
                  </span>
                </div>
              </div>
              <div className='mt-6 grid grid-cols-2 gap-4'>
                <GoogleAuth
                  setIsLoading={setIsLoading}
                  authSSO={authSSO}
                  callback={loginCallback}
                  dontRemember={false}
                />
                <GithubAuth
                  setIsLoading={setIsLoading}
                  authSSO={authSSO}
                  callback={loginCallback}
                  dontRemember={false}
                  ssrTheme={ssrTheme}
                />
              </div>
            </div>
          )}
        </div>

        {!isSelfhosted && (
          <p className='mb-4 mt-10 text-center text-sm text-gray-500 dark:text-gray-200'>
            <Trans
              // @ts-ignore
              t={t}
              i18nKey='auth.signin.notAMember'
              components={{
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                url: (
                  <Link
                    to={routes.signup}
                    className='font-semibold leading-6 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
                    aria-label={t('titles.signup')}
                  />
                ),
              }}
              values={{
                amount: TRIAL_DAYS,
              }}
            />
          </p>
        )}
      </div>
    </div>
  )
}

export default memo(withAuthentication(Signin, auth.notAuthenticated))
