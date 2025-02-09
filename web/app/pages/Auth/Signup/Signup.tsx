import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _size from 'lodash/size'
import React, { useState, useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { generateSSOAuthURL, getJWTBySSOHash, signup } from '~/api'
import GithubAuth from '~/components/GithubAuth'
import GoogleAuth from '~/components/GoogleAuth'
import { HAVE_I_BEEN_PWNED_URL, REFERRAL_COOKIE, TRIAL_DAYS } from '~/lib/constants'
import { SSOProvider } from '~/lib/models/Auth'
import { authActions } from '~/lib/reducers/auth'
import UIActions from '~/lib/reducers/ui'
import { StateType, useAppDispatch } from '~/lib/store'
import Button from '~/ui/Button'
import Checkbox from '~/ui/Checkbox'
import Input from '~/ui/Input'
import Tooltip from '~/ui/Tooltip'
import { getAccessToken, setAccessToken } from '~/utils/accessToken'
import { trackCustom } from '~/utils/analytics'
import { shouldShowLowEventsBanner } from '~/utils/auth'
import { deleteCookie, getCookie } from '~/utils/cookie'
import { delay, openBrowserWindow } from '~/utils/generic'
import { setRefreshToken } from '~/utils/refreshToken'
import routes from '~/utils/routes'
import { isValidEmail, isValidPassword, MIN_PASSWORD_CHARS, MAX_PASSWORD_CHARS } from '~/utils/validator'

interface SignupForm {
  email: string
  password: string
  repeat: string
  tos: boolean
  dontRemember: boolean
  checkIfLeaked: boolean
}

interface SignupProps {
  ssrTheme: string
}

const HASH_CHECK_FREQUENCY = 1000

const Signup = ({ ssrTheme }: SignupProps) => {
  const dispatch = useAppDispatch()
  const { authenticated: reduxAuthenticated, loading } = useSelector((state: StateType) => state.auth)
  const { t } = useTranslation('common')
  const [form, setForm] = useState<SignupForm>({
    email: '',
    password: '',
    repeat: '',
    tos: false,
    dontRemember: false,
    checkIfLeaked: true,
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    repeat?: string
    tos?: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const accessToken = getAccessToken()
  const authenticated = loading ? !!accessToken : reduxAuthenticated

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

  useEffect(() => {
    if (authenticated && !beenSubmitted) {
      navigate(routes.dashboard)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, beenSubmitted])

  const onSubmit = async (data: SignupForm) => {
    if (isLoading) {
      return
    }

    setIsLoading(true)

    try {
      const { dontRemember } = data

      const refCode = getCookie(REFERRAL_COOKIE)

      const { user, accessToken, refreshToken } = await signup({
        email: data.email,
        password: data.password,
        checkIfLeaked: data.checkIfLeaked,
        refCode: refCode || undefined,
      })

      if (refCode) {
        deleteCookie(REFERRAL_COOKIE)
      }

      dispatch(authActions.authSuccessful(user))
      dispatch(authActions.setDontRemember(dontRemember))
      setAccessToken(accessToken, dontRemember)
      setRefreshToken(refreshToken)
      setIsLoading(false)

      trackCustom('SIGNUP', {
        from: 'Signup page',
      })
      navigate(routes.confirm_email)
    } catch (reason) {
      toast.error(typeof reason === 'string' ? reason : t('apiNotifications.somethingWentWrong'))
      setIsLoading(false)
    } finally {
      dispatch(authActions.finishLoading())
    }
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
            navigate(`${routes.signin}?show_2fa_screen=true`)
            setIsLoading(false)
            return
          }

          dispatch(authActions.authSuccessful(user))
          setAccessToken(accessToken, false)
          setRefreshToken(refreshToken)

          if (shouldShowLowEventsBanner(totalMonthlyEvents, user.maxEventsCount)) {
            dispatch(UIActions.setShowNoEventsLeftBanner(true))
          }

          dispatch(authActions.finishLoading())

          navigate(routes.dashboard)

          return
        } catch {
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

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event

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

  return (
    <div>
      <div className='min-h-min-footer flex flex-col bg-gray-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-900'>
        <div className='flex min-h-full flex-1 flex-col justify-center py-6 sm:px-6 lg:px-8'>
          <div className='sm:mx-auto sm:w-full sm:max-w-md'>
            <h2 className='text-center text-2xl leading-9 font-bold tracking-tight text-gray-900 dark:text-gray-50'>
              {t('auth.signup.trial', {
                amount: TRIAL_DAYS,
              })}
            </h2>
            <p className='text-center font-mono text-base text-gray-900 dark:text-gray-50'>{t('auth.signup.noCC')}</p>
          </div>
          <div className='mt-10 font-mono sm:mx-auto sm:w-full sm:max-w-[480px]'>
            <div className='bg-white px-6 py-12 ring-1 ring-gray-200 sm:rounded-lg sm:px-12 dark:bg-slate-800/20 dark:ring-slate-800'>
              <form className='space-y-6' onSubmit={handleSubmit}>
                <Input
                  name='email'
                  type='email'
                  label={t('auth.common.email')}
                  value={form.email}
                  onChange={handleInput}
                  error={beenSubmitted ? errors.email : ''}
                />
                <Input
                  name='password'
                  type='password'
                  label={t('auth.common.password')}
                  hint={t('auth.common.hint', { amount: MIN_PASSWORD_CHARS })}
                  value={form.password}
                  onChange={handleInput}
                  error={beenSubmitted ? errors.password : ''}
                />
                <Input
                  name='repeat'
                  type='password'
                  label={t('auth.common.repeat')}
                  value={form.repeat}
                  onChange={handleInput}
                  error={beenSubmitted ? errors.repeat : ''}
                />
                <Checkbox
                  checked={form.tos}
                  onChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      tos: checked,
                    }))
                  }
                  name='tos'
                  label={
                    <span>
                      <Trans
                        t={t}
                        i18nKey='auth.signup.tos'
                        components={{
                          // eslint-disable-next-line jsx-a11y/anchor-has-content
                          tos: (
                            <Link
                              to={routes.terms}
                              className='font-medium text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-300'
                              aria-label={t('footer.tos')}
                            />
                          ),
                          // eslint-disable-next-line jsx-a11y/anchor-has-content
                          pp: (
                            <Link
                              to={routes.privacy}
                              className='font-medium text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-300'
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
                    onChange={(checked) =>
                      setForm((prev) => ({
                        ...prev,
                        checkIfLeaked: checked,
                      }))
                    }
                    name='checkIfLeaked'
                    label={t('auth.common.checkLeakedPassword')}
                  />
                  <Tooltip
                    className='ml-2'
                    text={
                      <Trans
                        t={t}
                        i18nKey='auth.common.checkLeakedPasswordDesc'
                        components={{
                          // eslint-disable-next-line jsx-a11y/anchor-has-content
                          db: (
                            <a
                              href={HAVE_I_BEEN_PWNED_URL}
                              className='font-medium text-indigo-400 hover:text-indigo-500 hover:underline dark:text-indigo-400 dark:hover:text-indigo-500'
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
            </div>

            <p className='mt-10 text-center text-sm text-gray-500 dark:text-gray-200'>
              <Trans
                t={t}
                i18nKey='auth.signup.alreadyAMember'
                components={{
                  // eslint-disable-next-line jsx-a11y/anchor-has-content
                  url: (
                    <Link
                      to={routes.signin}
                      className='leading-6 font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
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

export default Signup
