import _isEmpty from 'lodash/isEmpty'
import _isString from 'lodash/isString'
import _keys from 'lodash/keys'
import _omit from 'lodash/omit'
import React, { useState, useEffect, memo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { generateSSOAuthURL, getJWTBySSOHash, login, submit2FA } from '~/api'
import GithubAuth from '~/components/GithubAuth'
import GoogleAuth from '~/components/GoogleAuth'
import OIDCAuth from '~/components/OIDCAuth'
import { withAuthentication, auth } from '~/hoc/protected'
import { isSelfhosted, REFERRAL_COOKIE, TRIAL_DAYS } from '~/lib/constants'
import { SSOProvider } from '~/lib/models/Auth'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import Button from '~/ui/Button'
import Checkbox from '~/ui/Checkbox'
import Input from '~/ui/Input'
import { Text } from '~/ui/Text'
import { setAccessToken, removeAccessToken } from '~/utils/accessToken'
import { deleteCookie, getCookie } from '~/utils/cookie'
import { cn, delay, openBrowserWindow } from '~/utils/generic'
import { setRefreshToken, removeRefreshToken } from '~/utils/refreshToken'
import routes from '~/utils/routes'
import { isValidEmail, isValidPassword, MIN_PASSWORD_CHARS } from '~/utils/validator'

interface SigninForm {
  email: string
  password: string
  dontRemember: boolean
}

const HASH_CHECK_FREQUENCY = 1000

const Signin = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation('common')
  const { theme } = useTheme()
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
  const { setUser, setTotalMonthlyEvents, setIsAuthenticated } = useAuth()

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Form validation on input change
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
      const {
        uuid,
        auth_url: authUrl,
        expires_in: expiresIn,
      } = await generateSSOAuthURL(provider, `${window.location.origin}${routes.socialised}`)

      authWindow.location = authUrl

      // Closing the authorisation window after the session expires
      setTimeout(authWindow.close, expiresIn)

      const refCode = getCookie(REFERRAL_COOKIE) as string

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
            setUser(user)
            setIsTwoFARequired(true)
            setIsLoading(false)
            return
          }

          setUser(user)
          setIsAuthenticated(true)
          setTotalMonthlyEvents(totalMonthlyEvents)
          setAccessToken(accessToken, false)
          setRefreshToken(refreshToken)

          // Redirect to onboarding if user hasn't completed it
          if (!user.hasCompletedOnboarding) {
            navigate(routes.onboarding)
          } else {
            navigate(routes.dashboard)
          }

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

  const onSubmit = async (data: SigninForm) => {
    if (isLoading) {
      return
    }

    setIsLoading(true)

    try {
      const { dontRemember } = data

      const { user, accessToken, refreshToken, totalMonthlyEvents } = await login(_omit(data, ['dontRemember']))

      if (user.isTwoFactorAuthenticationEnabled) {
        setAccessToken(accessToken, true)
        setRefreshToken(refreshToken, true)
        setUser(user)
        setIsTwoFARequired(true)
        setIsLoading(false)
        return
      }

      setUser(user)
      setIsAuthenticated(true)
      setTotalMonthlyEvents(totalMonthlyEvents)
      setAccessToken(accessToken, dontRemember)
      setRefreshToken(refreshToken)

      setIsLoading(false)

      // Redirect to onboarding if user hasn't completed it
      if (!user.hasCompletedOnboarding) {
        navigate(routes.onboarding)
      } else {
        navigate(routes.dashboard)
      }
    } catch (reason) {
      toast.error(typeof reason === 'string' ? reason : t('apiNotifications.somethingWentWrong'))
      setIsLoading(false)
    }
  }

  const _submit2FA = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (isLoading) {
      return
    }

    setIsLoading(true)

    try {
      const { accessToken, refreshToken, user } = await submit2FA(twoFACode)
      removeAccessToken()
      removeRefreshToken()
      setAccessToken(accessToken)
      setRefreshToken(refreshToken)
      setUser(user)
      setIsAuthenticated(true)
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
      <div className='flex min-h-min-footer bg-gray-50 dark:bg-slate-900'>
        {/* Left side - 2FA Form */}
        <div className='flex w-full flex-col justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:w-1/2 lg:px-12 xl:px-24 dark:bg-slate-900'>
          <div className='mx-auto w-full max-w-md'>
            <div className='mb-8'>
              <Text as='h1' size='3xl' weight='bold' className='tracking-tight'>
                {t('auth.signin.2fa')}
              </Text>
              <Text as='p' colour='muted' className='mt-2 whitespace-pre-line'>
                {t('auth.signin.2faDesc')}
              </Text>
            </div>

            <form onSubmit={_submit2FA}>
              <Input
                label={t('profileSettings.enter2faToDisable')}
                value={twoFACode}
                placeholder={t('auth.signin.6digitCode')}
                onChange={handle2FAInput}
                disabled={isLoading}
                error={twoFACodeError}
              />
              <div className='mt-6 flex items-center justify-between'>
                <Text as='div' size='sm' colour='muted' className='whitespace-pre-line'>
                  {!isSelfhosted ? (
                    <Trans
                      t={t}
                      i18nKey='auth.signin.2faUnavailable'
                      components={{
                        ctl: (
                          <Link
                            to={routes.contact}
                            className='text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300'
                          />
                        ),
                      }}
                    />
                  ) : null}
                </Text>
                <Button type='submit' loading={isLoading} primary large>
                  {t('common.continue')}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right side - Visual */}
        <div className='relative hidden overflow-hidden bg-linear-to-br from-slate-800 via-slate-900 to-slate-950 lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center dark:from-slate-900 dark:via-slate-950 dark:to-black'>
          {/* Decorative gradient orbs */}
          <div className='absolute -top-24 -right-24 size-64 rounded-full bg-indigo-500/20 blur-3xl' />
          <div className='absolute -bottom-24 -left-24 size-64 rounded-full bg-slate-500/20 blur-3xl' />
          <div className='relative z-10 px-12 text-center'>
            <div className='mx-auto mb-8 flex size-20 items-center justify-center rounded-2xl bg-indigo-600/20 ring-1 ring-indigo-500/30'>
              <svg
                className='size-10 text-indigo-400'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={1.5}
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z'
                />
              </svg>
            </div>
            <Text as='h2' size='2xl' weight='bold' className='text-white'>
              {t('auth.signin.secureAuth')}
            </Text>
            <Text as='p' className='mt-3 text-slate-400'>
              {t('auth.signin.secureAuthDesc')}
            </Text>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex min-h-min-footer bg-gray-50 dark:bg-slate-900'>
      {/* Left side - Form */}
      <div className='flex w-full flex-col justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:w-1/2 lg:px-12 xl:px-24 dark:bg-slate-900'>
        <div className='mx-auto w-full max-w-md'>
          {/* Header */}
          <div className='mb-8'>
            <Text as='h1' size='3xl' weight='bold' className='tracking-tight'>
              {t('auth.signin.title')}
            </Text>
            <Text as='p' colour='muted' className='mt-2'>
              {t('auth.signin.welcomeBack')}
            </Text>
          </div>

          {/* SSO Buttons */}
          <div className={cn('grid gap-3', isSelfhosted ? 'grid-cols-1' : 'grid-cols-2')}>
            {isSelfhosted ? (
              <OIDCAuth onClick={() => onSsoLogin('openid-connect')} disabled={isLoading} className='w-full' />
            ) : (
              <>
                <GoogleAuth onClick={() => onSsoLogin('google')} disabled={isLoading} />
                <GithubAuth onClick={() => onSsoLogin('github')} disabled={isLoading} />
              </>
            )}
          </div>

          {/* Divider */}
          <div className='relative my-6'>
            <div className='absolute inset-0 flex items-center' aria-hidden='true'>
              <div className='w-full border-t border-gray-200 dark:border-gray-700' />
            </div>
            <div className='relative flex justify-center text-sm'>
              <Text as='span' colour='muted' size='sm' className='bg-gray-50 px-4 dark:bg-slate-900'>
                {t('auth.common.orContinueWith')} email
              </Text>
            </div>
          </div>

          {/* Form */}
          <form className='space-y-4' onSubmit={handleSubmit}>
            <Input
              name='email'
              type='email'
              label={t('auth.common.email')}
              value={form.email}
              onChange={handleInput}
              error={beenSubmitted ? errors.email : ''}
              placeholder='name@company.com'
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
                label={<Text size='sm'>{t('auth.common.noRemember')}</Text>}
              />
              <Link
                to={routes.reset_password}
                className='text-sm font-medium text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-300'
              >
                {t('auth.signin.forgot')}
              </Link>
            </div>

            <Button className='mt-6 w-full justify-center' type='submit' loading={isLoading} primary giant>
              {t('auth.signin.button')}
            </Button>
          </form>

          {/* Sign up link */}
          {!isSelfhosted ? (
            <Text as='p' size='sm' colour='muted' className='mt-6 text-center'>
              <Trans
                t={t}
                i18nKey='auth.signin.notAMember'
                components={{
                  url: (
                    <Link
                      to={routes.signup}
                      className='font-medium text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-300'
                      aria-label={t('titles.signup')}
                    />
                  ),
                }}
                values={{
                  amount: TRIAL_DAYS,
                }}
              />
            </Text>
          ) : null}
        </div>
      </div>

      {/* Right side - Visual showcase */}
      <div className='relative hidden overflow-hidden bg-linear-to-br from-slate-800 via-slate-900 to-slate-950 lg:flex lg:w-1/2 lg:flex-col lg:justify-between dark:from-slate-900 dark:via-slate-950 dark:to-black'>
        {/* Decorative gradient orbs */}
        <div className='absolute -top-24 -right-24 size-96 rounded-full bg-indigo-500/20 blur-3xl' />
        <div className='absolute -bottom-24 -left-24 size-96 rounded-full bg-slate-500/20 blur-3xl' />

        <div className='relative z-10 flex flex-1 flex-col justify-center px-10 py-10'>
          {/* Welcome message */}
          <div className='mb-8'>
            <Text as='h2' size='2xl' weight='bold' className='mb-2 text-white'>
              {t('auth.signin.dashboardAwaits')}
            </Text>
            <Text as='p' size='lg' className='text-slate-400'>
              {t('auth.signin.trustedByThousands')}
            </Text>
          </div>

          {/* Dashboard preview */}
          <div className='relative'>
            <div className='overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10'>
              <img
                src={theme === 'dark' ? '/assets/screenshot_dark.png' : '/assets/screenshot_light.png'}
                alt='Swetrix Dashboard'
                className='w-full'
              />
            </div>
            <div className='pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-slate-900/80 to-transparent' />
          </div>
        </div>

        {/* Testimonial */}
        <div className='relative z-10 border-t border-white/10 bg-white/5 px-10 py-6 backdrop-blur-sm'>
          <blockquote>
            <Text as='p' size='sm' className='text-white/90'>
              {t('auth.signin.testimonial')}
            </Text>
            <footer className='mt-3 flex items-center gap-3'>
              <img
                src='/assets/users/alex-casterlabs.jpg'
                alt='Alex Bowles'
                className='size-8 rounded-full ring-2 ring-white/20'
              />
              <div>
                <Text as='p' size='sm' weight='medium' className='text-white'>
                  Alex Bowles
                </Text>
                <Text as='p' size='xs' className='text-slate-400'>
                  Co-founder of Casterlabs
                </Text>
              </div>
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  )
}

export default memo(withAuthentication(Signin, auth.notAuthenticated))
