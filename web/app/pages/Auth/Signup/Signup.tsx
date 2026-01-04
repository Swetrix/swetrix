import { BarChart3Icon, MousePointerClickIcon, ShieldCheckIcon, SparklesIcon } from 'lucide-react'
import React, { useState, useEffect, memo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Link, useNavigate, Form, useActionData, useNavigation } from 'react-router'
import { toast } from 'sonner'

import { generateSSOAuthURL, getJWTBySSOHash } from '~/api'
import GithubAuth from '~/components/GithubAuth'
import GoogleAuth from '~/components/GoogleAuth'
import OIDCAuth from '~/components/OIDCAuth'
import { HAVE_I_BEEN_PWNED_URL, isSelfhosted, TRIAL_DAYS } from '~/lib/constants'
import { SSOProvider } from '~/lib/models/Auth'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import type { SignupActionData } from '~/routes/signup'
import Button from '~/ui/Button'
import Checkbox from '~/ui/Checkbox'
import Input from '~/ui/Input'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { setAccessToken } from '~/utils/accessToken'
import { cn, delay, openBrowserWindow } from '~/utils/generic'
import { setRefreshToken } from '~/utils/refreshToken'
import routes from '~/utils/routes'
import { MIN_PASSWORD_CHARS } from '~/utils/validator'

const HASH_CHECK_FREQUENCY = 1000

const featureIcons = [BarChart3Icon, MousePointerClickIcon, ShieldCheckIcon, SparklesIcon]

const featureKeys = ['realTimeAnalytics', 'eventTracking', 'privacyFirst', 'intuitive'] as const

const Signup = () => {
  const { t } = useTranslation('common')
  const { theme } = useTheme()
  const navigate = useNavigate()
  const navigation = useNavigation()
  const actionData = useActionData<SignupActionData>()

  const [tos, setTos] = useState(false)
  const [checkIfLeaked, setCheckIfLeaked] = useState(true)

  const [isSsoLoading, setIsSsoLoading] = useState(false)

  const [clearedErrors, setClearedErrors] = useState<Set<string>>(new Set())

  const { setUser, setTotalMonthlyEvents, setIsAuthenticated } = useAuth()

  const isFormSubmitting = navigation.state === 'submitting'
  const isLoading = isFormSubmitting || isSsoLoading

  useEffect(() => {
    if (actionData?.error && !actionData?.fieldErrors) {
      const errorMessage = Array.isArray(actionData.error) ? actionData.error[0] : actionData.error
      toast.error(errorMessage)
    }
  }, [actionData?.error, actionData?.fieldErrors, actionData?.timestamp])

  const clearFieldError = (fieldName: string) => {
    if (actionData?.fieldErrors?.[fieldName as keyof typeof actionData.fieldErrors]) {
      setClearedErrors((prev) => new Set(prev).add(fieldName))
    }
  }

  const getFieldError = (fieldName: string) => {
    if (clearedErrors.has(fieldName)) {
      return undefined
    }
    return actionData?.fieldErrors?.[fieldName as keyof typeof actionData.fieldErrors]
  }

  const handleFormSubmit = () => {
    setClearedErrors(new Set())
  }

  const onSsoLogin = async (provider: SSOProvider) => {
    const authWindow = openBrowserWindow('')

    if (!authWindow) {
      toast.error(t('apiNotifications.socialisationAuthGenericError'))
      setIsSsoLoading(false)
      return
    }

    setIsSsoLoading(true)

    try {
      const { uuid, auth_url: authUrl, expires_in: expiresIn } = await generateSSOAuthURL(provider)

      const safeAuthUrl = (() => {
        try {
          const parsed = new URL(authUrl)
          if (parsed.username || parsed.password) return null

          // Prefer HTTPS for all providers; allow HTTP only for localhost-based OIDC in dev.
          if (
            parsed.protocol !== 'https:' &&
            !(
              provider === 'openid-connect' &&
              parsed.protocol === 'http:' &&
              (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1')
            )
          ) {
            return null
          }

          if (provider === 'google' && parsed.hostname !== 'accounts.google.com') return null
          if (provider === 'github' && parsed.hostname !== 'github.com') return null

          return parsed.toString()
        } catch {
          return null
        }
      })()

      if (!safeAuthUrl) {
        toast.error(t('apiNotifications.socialisationAuthGenericError'))
        setIsSsoLoading(false)
        authWindow.close()
        return
      }

      authWindow.location.href = safeAuthUrl

      // Closing the authorisation window after the session expires
      setTimeout(authWindow.close, expiresIn)

      while (true) {
        await delay(HASH_CHECK_FREQUENCY)

        try {
          const { accessToken, refreshToken, user, totalMonthlyEvents } = await getJWTBySSOHash(uuid, provider)
          authWindow.close()

          if (user.isTwoFactorAuthenticationEnabled) {
            setAccessToken(accessToken, true)
            setRefreshToken(refreshToken)
            setUser(user)
            navigate(`${routes.signin}?show_2fa_screen=true`)
            setIsSsoLoading(false)
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
          setIsSsoLoading(false)
          return
        }
      }
    } catch (reason) {
      toast.error((reason as { message?: string })?.message || t('apiNotifications.socialisationGenericError'))
      setIsSsoLoading(false)
      return
    }
  }

  return (
    <div className='flex min-h-min-footer bg-gray-50 dark:bg-slate-900'>
      <div className='flex w-full flex-col justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:w-3/5 lg:px-12 xl:px-24 dark:bg-slate-900'>
        <div className='mx-auto w-full max-w-md'>
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

          <Form method='post' className='space-y-4' onSubmit={handleFormSubmit}>
            <Input
              name='email'
              type='email'
              label={t('auth.common.email')}
              error={getFieldError('email')}
              placeholder='name@company.com'
              disabled={isLoading}
              onChange={() => clearFieldError('email')}
            />
            <Input
              name='password'
              type='password'
              label={t('auth.common.password')}
              hint={t('auth.common.hint', { amount: MIN_PASSWORD_CHARS })}
              error={getFieldError('password')}
              disabled={isLoading}
              onChange={() => clearFieldError('password')}
            />
            <Input
              name='repeat'
              type='password'
              label={t('auth.common.repeat')}
              error={getFieldError('repeat')}
              disabled={isLoading}
              onChange={() => clearFieldError('repeat')}
            />

            {/* Hidden fields for checkbox values since Headless UI Checkbox doesn't submit natively */}
            <input type='hidden' name='tos' value={tos ? 'true' : 'false'} />
            <input type='hidden' name='checkIfLeaked' value={checkIfLeaked ? 'true' : 'false'} />

            {isSelfhosted ? null : (
              <Checkbox
                checked={tos}
                onChange={(checked) => {
                  setTos(checked)
                  clearFieldError('tos')
                }}
                disabled={isLoading}
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
                hint={getFieldError('tos')}
              />
            )}

            <div className='flex items-center'>
              <Checkbox
                checked={checkIfLeaked}
                onChange={setCheckIfLeaked}
                disabled={isLoading}
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

            <Button className='mt-6 w-full justify-center' type='submit' loading={isFormSubmitting} primary giant>
              {t('auth.signup.button')}
            </Button>
          </Form>

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

      <div className='relative hidden overflow-hidden bg-linear-to-br from-slate-800 via-slate-900 to-slate-950 lg:flex lg:w-2/5 lg:flex-col lg:justify-between dark:from-slate-900 dark:via-slate-950 dark:to-black'>
        <div className='absolute -top-24 -right-24 size-96 rounded-full bg-indigo-500/20 blur-3xl' />
        <div className='absolute -bottom-24 -left-24 size-96 rounded-full bg-slate-500/20 blur-3xl' />

        <div className='relative z-10 flex flex-1 flex-col justify-center px-10 py-10'>
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

export default memo(Signup)
