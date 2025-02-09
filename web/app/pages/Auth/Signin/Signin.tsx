import React, { useState, useEffect, memo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useTranslation, Trans } from 'react-i18next'
import _keys from 'lodash/keys'
import _omit from 'lodash/omit'
import _isEmpty from 'lodash/isEmpty'
import _isString from 'lodash/isString'
import { toast } from 'sonner'

import GoogleAuth from '~/components/GoogleAuth'
import GithubAuth from '~/components/GithubAuth'
import { withAuthentication, auth } from '~/hoc/protected'
import routes from '~/utils/routes'
import Input from '~/ui/Input'
import Button from '~/ui/Button'
import Checkbox from '~/ui/Checkbox'
import { isValidEmail, isValidPassword, MIN_PASSWORD_CHARS } from '~/utils/validator'
import { isSelfhosted, REFERRAL_COOKIE, TRIAL_DAYS } from '~/lib/constants'
import { generateSSOAuthURL, getInstalledExtensions, getJWTBySSOHash, login, submit2FA } from '~/api'
import { setAccessToken, removeAccessToken } from '~/utils/accessToken'
import { setRefreshToken, removeRefreshToken } from '~/utils/refreshToken'
import { useAppDispatch } from '~/lib/store'
import { authActions } from '~/lib/reducers/auth'
import { delay, openBrowserWindow } from '~/utils/generic'
import { deleteCookie, getCookie } from '~/utils/cookie'
import { shouldShowLowEventsBanner } from '~/utils/auth'
import UIActions from '~/lib/reducers/ui'
import { SSOProvider } from '~/lib/models/Auth'

interface SigninForm {
  email: string
  password: string
  dontRemember: boolean
}

interface SigninProps {
  ssrTheme: string
}

const HASH_CHECK_FREQUENCY = 1000

const Signin = ({ ssrTheme }: SigninProps) => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation('common')
  const [form, setForm] = useState<SigninForm>({
    email: '',
    password: '',
    dontRemember: false,
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isTwoFARequired, setIsTwoFARequired] = useState(searchParams.get('show_2fa_screen') === 'true')
  const [twoFACode, setTwoFACode] = useState('')
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

  const onSsoLogin = async (provider: SSOProvider) => {
    const authWindow = openBrowserWindow('')

    if (!authWindow) {
      toast.error(t('apiNotifications.socialisationAuthGenericError'))
      setIsLoading(false)
      return
    }

    try {
      const { uuid, auth_url: authUrl, expires_in: expiresIn } = await generateSSOAuthURL(provider)

      authWindow.location = authUrl

      // Closing the authorisation window after the session expires
      setTimeout(authWindow.close, expiresIn)

      const refCode = getCookie(REFERRAL_COOKIE) as string

      // eslint-disable-next-line no-constant-condition
      while (true) {
        await delay(HASH_CHECK_FREQUENCY)

        try {
          const { accessToken, refreshToken, user, totalMonthlyEvents } = await getJWTBySSOHash(uuid, provider, refCode)
          authWindow.close()

          if (refCode) {
            deleteCookie(REFERRAL_COOKIE)
          }

          if (user.isTwoFactorAuthenticationEnabled) {
            setAccessToken(accessToken, true)
            setRefreshToken(refreshToken)
            dispatch(authActions.mergeUser(user))
            setIsTwoFARequired(true)
            setIsLoading(false)
            return
          }

          dispatch(authActions.authSuccessful(user))
          setAccessToken(accessToken, false)
          setRefreshToken(refreshToken)

          if (shouldShowLowEventsBanner(totalMonthlyEvents, user.maxEventsCount)) {
            dispatch(UIActions.setShowNoEventsLeftBanner(true))
          }

          await loadExtensions()

          dispatch(authActions.finishLoading())

          navigate(routes.dashboard)

          return
        } catch (reason) {
          // Authentication is not finished yet
        }

        if (authWindow.closed) {
          setIsLoading(false)
          return
        }
      }
    } catch (reason) {
      toast.error(typeof reason === 'string' ? reason : t('apiNotifications.socialisationGenericError'))
      setIsLoading(false)
      return
    }
  }

  const loadExtensions = async () => {
    if (isSelfhosted) {
      return
    }

    const extensions = await getInstalledExtensions()
    dispatch(UIActions.setExtensions(extensions))
  }

  const onSubmit = async (data: SigninForm) => {
    if (isLoading) {
      return
    }

    setIsLoading(true)

    try {
      const { dontRemember } = data

      const { user, accessToken, refreshToken, totalMonthlyEvents } = await login(_omit(data, ['dontRemember']))

      dispatch(authActions.setDontRemember(dontRemember))

      if (user.isTwoFactorAuthenticationEnabled) {
        setAccessToken(accessToken, true)
        setRefreshToken(refreshToken, true)
        dispatch(authActions.mergeUser(user))
        setIsTwoFARequired(true)
        setIsLoading(false)
        return
      }

      dispatch(authActions.authSuccessful(user))
      setAccessToken(accessToken, dontRemember)
      setRefreshToken(refreshToken)

      if (shouldShowLowEventsBanner(totalMonthlyEvents, user.maxEventsCount)) {
        dispatch(UIActions.setShowNoEventsLeftBanner(true))
      }

      await loadExtensions()

      setIsLoading(false)
    } catch (reason) {
      toast.error(typeof reason === 'string' ? reason : t('apiNotifications.somethingWentWrong'))
      setIsLoading(false)
    } finally {
      dispatch(authActions.finishLoading())
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
        await loadExtensions()
        dispatch(authActions.authSuccessful(user))
      } catch (reason) {
        if (_isString(reason)) {
          toast.error(reason)
        }
        console.error(`[ERROR] Failed to authenticate with 2FA: ${reason}`)
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
      <div className='min-h-page flex flex-col bg-gray-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-900'>
        <form className='mx-auto max-w-prose' onSubmit={_submit2FA}>
          <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>{t('auth.signin.2fa')}</h2>
          <p className='mt-4 font-mono text-base whitespace-pre-line text-gray-900 dark:text-gray-50'>
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
            <div className='font-mono text-sm whitespace-pre-line text-gray-600 dark:text-gray-400'>
              {!isSelfhosted && (
                <Trans
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
    <div className='min-h-min-footer flex flex-col bg-gray-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-900'>
      <div className='sm:mx-auto sm:w-full sm:max-w-md'>
        <h2 className='text-center text-2xl leading-9 font-bold tracking-tight text-gray-900 dark:text-gray-50'>
          {t('auth.signin.title')}
        </h2>
      </div>
      <div className='mt-10 font-mono sm:mx-auto sm:w-full sm:max-w-[480px]'>
        <div className='bg-white px-6 py-12 ring-1 ring-gray-200 sm:rounded-lg sm:px-12 dark:bg-slate-800/20 dark:ring-slate-800'>
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
                <div className='relative flex justify-center text-sm leading-6 font-medium'>
                  <span className='bg-white px-6 text-gray-900 dark:bg-slate-800/20 dark:text-gray-50'>
                    {t('auth.common.orContinueWith')}
                  </span>
                </div>
              </div>
              <div className='mt-6 grid grid-cols-2 gap-4'>
                <GoogleAuth onClick={() => onSsoLogin('google')} disabled={isLoading} />
                <GithubAuth onClick={() => onSsoLogin('github')} ssrTheme={ssrTheme} disabled={isLoading} />
              </div>
            </div>
          )}
        </div>

        {!isSelfhosted && (
          <p className='mt-10 mb-4 text-center text-sm text-gray-500 dark:text-gray-200'>
            <Trans
              t={t}
              i18nKey='auth.signin.notAMember'
              components={{
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                url: (
                  <Link
                    to={routes.signup}
                    className='leading-6 font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
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
