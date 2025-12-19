import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _size from 'lodash/size'
import { BarChart3Icon, MousePointerClickIcon, ShieldCheckIcon, SparklesIcon } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { generateSSOAuthURL, getJWTBySSOHash, signup } from '~/api'
import GithubAuth from '~/components/GithubAuth'
import GoogleAuth from '~/components/GoogleAuth'
import OIDCAuth from '~/components/OIDCAuth'
import { HAVE_I_BEEN_PWNED_URL, isSelfhosted, REFERRAL_COOKIE, TRIAL_DAYS } from '~/lib/constants'
import { SSOProvider } from '~/lib/models/Auth'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import Button from '~/ui/Button'
import Checkbox from '~/ui/Checkbox'
import Input from '~/ui/Input'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { setAccessToken } from '~/utils/accessToken'
import { deleteCookie, getCookie } from '~/utils/cookie'
import { cn, delay, openBrowserWindow } from '~/utils/generic'
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

const HASH_CHECK_FREQUENCY = 1000

const featureIcons = [BarChart3Icon, MousePointerClickIcon, ShieldCheckIcon, SparklesIcon]

const featureKeys = ['realTimeAnalytics', 'eventTracking', 'privacyFirst', 'intuitive'] as const

const Signup = () => {
  const { t } = useTranslation('common')
  const { theme } = useTheme()
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
  const { isAuthenticated, setUser, setTotalMonthlyEvents, setIsAuthenticated } = useAuth()

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

    if (!form.tos && !isSelfhosted) {
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
    if (isAuthenticated && !beenSubmitted) {
      navigate(routes.dashboard)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, beenSubmitted])

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

      setUser(user)
      setIsAuthenticated(true)
      setAccessToken(accessToken, dontRemember)
      setRefreshToken(refreshToken)
      setIsLoading(false)

      navigate(routes.onboarding)
    } catch (reason) {
      toast.error((reason as { message?: string })?.message || t('apiNotifications.somethingWentWrong'))
      setIsLoading(false)
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
            navigate(`${routes.signin}?show_2fa_screen=true`)
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
      toast.error((reason as { message?: string })?.message || t('apiNotifications.socialisationGenericError'))
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
    <div className='flex min-h-min-footer bg-gray-50 dark:bg-slate-900'>
      {/* Left side - Form */}
      <div className='flex w-full flex-col justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:w-3/5 lg:px-12 xl:px-24 dark:bg-slate-900'>
        <div className='mx-auto w-full max-w-md'>
          {/* Header */}
          <div className='mb-8'>
            <Text as='h1' size='3xl' weight='bold' className='tracking-tight'>
              {isSelfhosted
                ? t('auth.signup.createAnAccount')
                : t('auth.signup.trial', {
                    amount: TRIAL_DAYS,
                  })}
            </Text>
            {isSelfhosted ? null : (
              <Text as='p' colour='muted' className='mt-2'>
                {t('auth.signup.noCC')}
              </Text>
            )}
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
            <Input
              name='repeat'
              type='password'
              label={t('auth.common.repeat')}
              value={form.repeat}
              onChange={handleInput}
              error={beenSubmitted ? errors.repeat : ''}
            />

            {isSelfhosted ? null : (
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
                  <Text as='span' size='sm'>
                    <Trans
                      t={t}
                      i18nKey='auth.signup.tos'
                      components={{
                        tos: (
                          <Link
                            to={routes.terms}
                            className='font-medium text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-300'
                            aria-label={t('footer.tos')}
                          />
                        ),

                        pp: (
                          <Link
                            to={routes.privacy}
                            className='font-medium text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-300'
                            aria-label={t('footer.pp')}
                          />
                        ),
                      }}
                    />
                  </Text>
                }
                classes={{
                  hint: '!text-red-600 dark:!text-red-500',
                }}
                hint={beenSubmitted ? errors.tos : ''}
              />
            )}

            <div className='flex items-center'>
              <Checkbox
                checked={form.checkIfLeaked}
                onChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    checkIfLeaked: checked,
                  }))
                }
                name='checkIfLeaked'
                label={<Text size='sm'>{t('auth.common.checkLeakedPassword')}</Text>}
              />
              <Tooltip
                className='ml-2'
                text={
                  <Trans
                    t={t}
                    i18nKey='auth.common.checkLeakedPasswordDesc'
                    components={{
                      db: (
                        <a
                          href={HAVE_I_BEEN_PWNED_URL}
                          className='font-medium underline decoration-dashed hover:decoration-solid'
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

            <Button className='mt-6 w-full justify-center' type='submit' loading={isLoading} primary giant>
              {t('auth.signup.button')}
            </Button>
          </form>

          {/* Sign in link */}
          <Text as='p' size='sm' colour='muted' className='mt-6 text-center'>
            <Trans
              t={t}
              i18nKey='auth.signup.alreadyAMember'
              components={{
                url: (
                  <Link
                    to={routes.signin}
                    className='font-medium text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-300'
                    aria-label={t('titles.signin')}
                  />
                ),
              }}
            />
          </Text>
        </div>
      </div>

      {/* Right side - Visual showcase */}
      <div className='relative hidden overflow-hidden bg-linear-to-br from-slate-800 via-slate-900 to-slate-950 lg:flex lg:w-2/5 lg:flex-col lg:justify-between dark:from-slate-900 dark:via-slate-950 dark:to-black'>
        {/* Decorative gradient orbs */}
        <div className='absolute -top-24 -right-24 size-96 rounded-full bg-indigo-500/20 blur-3xl' />
        <div className='absolute -bottom-24 -left-24 size-96 rounded-full bg-slate-500/20 blur-3xl' />

        <div className='relative z-10 flex flex-1 flex-col justify-center px-10 py-10'>
          {/* Features list */}
          <div className='mb-8'>
            <Text as='h2' size='xl' weight='bold' className='mb-4 text-white'>
              {t('auth.signup.insightsInMinutes')}
            </Text>
            <div className='space-y-3'>
              {featureKeys.map((key, index) => {
                const Icon = featureIcons[index]
                return (
                  <div key={key} className='flex items-center gap-3'>
                    <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10'>
                      <Icon className='size-4 text-white' />
                    </div>
                    <div>
                      <Text as='span' size='sm' weight='semibold' className='text-white'>
                        {t(`auth.signup.features.${key}`)}
                      </Text>
                      <Text as='span' size='sm' className='ml-1 text-slate-400'>
                        — {t(`auth.signup.features.${key}Desc`)}
                      </Text>
                    </div>
                  </div>
                )
              })}
            </div>
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
              {t('auth.signup.testimonial')}
            </Text>
            <footer className='mt-3 flex items-center gap-3'>
              <img
                src='/assets/users/alper-phalcode.jpg'
                alt='Alper Alkan'
                className='size-8 rounded-full ring-2 ring-white/20'
              />
              <div>
                <Text as='p' size='sm' weight='medium' className='text-white'>
                  Alper Alkan
                </Text>
                <Text as='p' size='xs' className='text-slate-400'>
                  Co-founder of Phalcode
                </Text>
              </div>
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  )
}

export default Signup
