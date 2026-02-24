import React, { useState, memo, useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import {
  Link,
  useNavigate,
  useSearchParams,
  Form,
  useActionData,
  useNavigation,
  useFetcher,
} from 'react-router'
import { toast } from 'sonner'

import GithubAuth from '~/components/GithubAuth'
import GoogleAuth from '~/components/GoogleAuth'
import OIDCAuth from '~/components/OIDCAuth'
import { useAuthProxy } from '~/hooks/useAuthProxy'
import { isSelfhosted, TRIAL_DAYS } from '~/lib/constants'
import { decidePostAuthRedirect } from '~/utils/auth'
import { SSOProvider, SSOHashSuccessResponse } from '~/lib/models/Auth'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import type { LoginActionData } from '~/routes/login'
import Button from '~/ui/Button'
import Checkbox from '~/ui/Checkbox'
import Input from '~/ui/Input'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { cn, delay, openBrowserWindow } from '~/utils/generic'
import routes from '~/utils/routes'
import { MIN_PASSWORD_CHARS } from '~/utils/validator'

const HASH_CHECK_FREQUENCY = 1000

interface LinkingData {
  email: string
  provider: SSOProvider
  ssoId: string | number
  isTwoFactorAuthenticationEnabled: boolean
}

const Signin = () => {
  const navigate = useNavigate()
  const navigation = useNavigation()
  const actionData = useActionData<LoginActionData>()
  const twoFAFetcher = useFetcher<LoginActionData>()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation('common')
  const { theme } = useTheme()

  const [dontRemember, setDontRemember] = useState(false)

  const [isSsoLoading, setIsSsoLoading] = useState(false)

  const [twoFACode, setTwoFACode] = useState('')
  // State for SSO-triggered 2FA (client-side flow)
  const [sso2FARequired, setSso2FARequired] = useState(false)

  const [clearedErrors, setClearedErrors] = useState<Set<string>>(new Set())

  // State for SSO account linking flow
  const [linkingData, setLinkingData] = useState<LinkingData | null>(null)
  const [linkingPassword, setLinkingPassword] = useState('')
  const [linking2FACode, setLinking2FACode] = useState('')
  const [isLinkingLoading, setIsLinkingLoading] = useState(false)
  const [linkingError, setLinkingError] = useState<string | null>(null)

  const { setUser, setTotalMonthlyEvents, setIsAuthenticated } = useAuth()
  const { generateSSOAuthURL, getJWTBySSOHash, linkSSOWithPassword } =
    useAuthProxy()

  const isFormSubmitting = navigation.state === 'submitting'
  const is2FALoading = twoFAFetcher.state === 'submitting'
  const isLoading =
    isFormSubmitting || isSsoLoading || is2FALoading || isLinkingLoading

  // 2FA is required from URL params, action data, or SSO flow
  const isTwoFARequired =
    searchParams.get('show_2fa_screen') === 'true' ||
    actionData?.requires2FA === true ||
    sso2FARequired

  // Check if we're in the linking flow
  const isLinkingRequired = linkingData !== null

  // Derive 2FA error from fetcher data
  const twoFACodeError = twoFAFetcher.data?.fieldErrors?.twoFACode || null

  useEffect(() => {
    if (actionData?.error && !actionData?.fieldErrors) {
      const errorMessage = Array.isArray(actionData.error)
        ? actionData.error[0]
        : actionData.error
      toast.error(errorMessage)
    }
  }, [actionData?.error, actionData?.fieldErrors, actionData?.timestamp])

  const clearFieldError = (fieldName: string) => {
    if (
      actionData?.fieldErrors?.[
        fieldName as keyof typeof actionData.fieldErrors
      ]
    ) {
      setClearedErrors((prev) => new Set(prev).add(fieldName))
    }
  }

  const getFieldError = (fieldName: string) => {
    if (clearedErrors.has(fieldName)) {
      return undefined
    }
    return actionData?.fieldErrors?.[
      fieldName as keyof typeof actionData.fieldErrors
    ]
  }

  const handleFormSubmit = () => {
    setClearedErrors(new Set())
  }

  const handle2FAInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = event
    setTwoFACode(value)
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
      const {
        uuid,
        auth_url: authUrl,
        expires_in: expiresIn,
      } = await generateSSOAuthURL(
        provider,
        `${window.location.origin}${routes.socialised}`,
      )

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
              (parsed.hostname === 'localhost' ||
                parsed.hostname === '127.0.0.1' ||
                parsed.hostname === '::1')
            )
          ) {
            return null
          }

          if (
            provider === 'google' &&
            parsed.hostname !== 'accounts.google.com'
          )
            return null
          if (provider === 'github' && parsed.hostname !== 'github.com')
            return null

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
          const response = await getJWTBySSOHash(uuid, provider, !dontRemember)
          authWindow.close()

          // Check if linking is required
          if ('linkingRequired' in response && response.linkingRequired) {
            setLinkingData({
              email: response.email,
              provider: response.provider as SSOProvider,
              ssoId: response.ssoId,
              isTwoFactorAuthenticationEnabled:
                response.isTwoFactorAuthenticationEnabled,
            })
            setIsSsoLoading(false)
            return
          }

          // Normal SSO login flow - type is narrowed to SSOHashSuccessResponse
          const { user, totalMonthlyEvents } =
            response as SSOHashSuccessResponse

          if (user.isTwoFactorAuthenticationEnabled) {
            setUser(user)
            setSso2FARequired(true)
            setIsSsoLoading(false)
            return
          }

          setUser(user)
          setIsAuthenticated(true)
          setTotalMonthlyEvents(totalMonthlyEvents)

          navigate(decidePostAuthRedirect(user))

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
      toast.error(
        typeof reason === 'string'
          ? reason
          : t('apiNotifications.socialisationGenericError'),
      )
      setIsSsoLoading(false)
      return
    }
  }

  const _submit2FA = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (is2FALoading) {
      return
    }

    const formData = new FormData()
    formData.set('intent', 'submit-2fa')
    formData.set('twoFACode', twoFACode)
    formData.set('dontRemember', dontRemember.toString())

    twoFAFetcher.submit(formData, { method: 'post' })
  }

  const handleLinkAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (!linkingData || isLinkingLoading) {
      return
    }

    setIsLinkingLoading(true)
    setLinkingError(null)

    try {
      const { user, totalMonthlyEvents } = await linkSSOWithPassword(
        linkingData.email,
        linkingPassword,
        linkingData.provider,
        linkingData.ssoId,
        linkingData.isTwoFactorAuthenticationEnabled
          ? linking2FACode
          : undefined,
        !dontRemember,
      )

      setUser(user)
      setIsAuthenticated(true)
      setTotalMonthlyEvents(totalMonthlyEvents)

      toast.success(
        t('auth.linkAccount.linkSuccess', {
          provider: linkingData.provider === 'google' ? 'Google' : 'Github',
        }),
      )

      navigate(decidePostAuthRedirect(user))
    } catch (error) {
      setLinkingError(
        error instanceof Error
          ? error.message
          : t('auth.linkAccount.invalidCredentials'),
      )
    } finally {
      setIsLinkingLoading(false)
    }
  }

  const handleCancelLinking = () => {
    setLinkingData(null)
    setLinkingPassword('')
    setLinking2FACode('')
    setLinkingError(null)
  }

  const getProviderDisplayName = (provider: SSOProvider) => {
    if (provider === 'google') return 'Google'
    if (provider === 'github') return 'Github'
    return provider
  }

  return (
    <div className='flex min-h-min-footer bg-gray-50 dark:bg-slate-950'>
      <div className='flex w-full flex-col justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:w-3/5 lg:px-12 xl:px-24 dark:bg-slate-950'>
        <div className='mx-auto w-full max-w-md'>
          {isLinkingRequired && linkingData ? (
            <>
              <div className='mb-8'>
                <Text
                  as='h1'
                  size='3xl'
                  weight='bold'
                  className='tracking-tight'
                >
                  {t('auth.linkAccount.title')}
                </Text>
                <Text as='p' colour='muted' className='mt-2'>
                  {t('auth.linkAccount.description', {
                    email: linkingData.email,
                    provider: getProviderDisplayName(linkingData.provider),
                  })}
                </Text>
              </div>

              <form onSubmit={handleLinkAccount} className='space-y-4'>
                <Input
                  label={t('auth.linkAccount.enterPassword')}
                  type='password'
                  value={linkingPassword}
                  onChange={(e) => setLinkingPassword(e.target.value)}
                  disabled={isLinkingLoading}
                  error={linkingError || undefined}
                />

                {linkingData.isTwoFactorAuthenticationEnabled && (
                  <>
                    <Text as='p' colour='muted' size='sm' className='mt-2'>
                      {t('auth.linkAccount.2FARequired')}
                    </Text>
                    <Input
                      label={t('auth.linkAccount.enter2FA')}
                      value={linking2FACode}
                      placeholder={t('auth.signin.6digitCode')}
                      onChange={(e) => setLinking2FACode(e.target.value)}
                      disabled={isLinkingLoading}
                    />
                  </>
                )}

                <div className='flex flex-col gap-3 pt-2'>
                  <Button
                    type='submit'
                    loading={isLinkingLoading}
                    primary
                    giant
                    className='w-full justify-center'
                  >
                    {t('auth.linkAccount.linkButton')}
                  </Button>
                  <Button
                    type='button'
                    onClick={handleCancelLinking}
                    disabled={isLinkingLoading}
                    giant
                    className='w-full justify-center'
                  >
                    {t('auth.linkAccount.returnToSignIn')}
                  </Button>
                </div>

                <div className='mt-6 border-t border-gray-200 pt-4 dark:border-gray-700'>
                  <Text as='p' colour='muted' size='sm'>
                    {t('auth.linkAccount.unlinkHint')}
                  </Text>
                </div>
              </form>
            </>
          ) : isTwoFARequired ? (
            <>
              <div className='mb-8'>
                <Text
                  as='h1'
                  size='3xl'
                  weight='bold'
                  className='tracking-tight'
                >
                  {t('auth.signin.2fa')}
                </Text>
                <Text
                  as='p'
                  colour='muted'
                  className='mt-2 whitespace-pre-line'
                >
                  {t('auth.signin.2faDesc')}
                </Text>
              </div>

              <form onSubmit={_submit2FA}>
                <Input
                  label={t('profileSettings.enter2faToDisable')}
                  value={twoFACode}
                  placeholder={t('auth.signin.6digitCode')}
                  onChange={handle2FAInput}
                  disabled={is2FALoading}
                  error={twoFACodeError}
                />
                <div className='mt-6 flex items-center justify-between'>
                  <Text
                    as='div'
                    size='sm'
                    colour='muted'
                    className='whitespace-pre-line'
                  >
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
                  <Button type='submit' loading={is2FALoading} primary large>
                    {t('common.continue')}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className='mb-8'>
                <Text
                  as='h1'
                  size='3xl'
                  weight='bold'
                  className='tracking-tight'
                >
                  {t('auth.signin.title')}
                </Text>
                <Text as='p' colour='muted' className='mt-2'>
                  {t('auth.signin.welcomeBack')}
                </Text>
              </div>

              <div
                className={cn(
                  'grid gap-3',
                  isSelfhosted ? 'grid-cols-1' : 'grid-cols-2',
                )}
              >
                {isSelfhosted ? (
                  <OIDCAuth
                    onClick={() => onSsoLogin('openid-connect')}
                    disabled={isLoading}
                    className='w-full'
                  />
                ) : (
                  <>
                    <GoogleAuth
                      onClick={() => onSsoLogin('google')}
                      disabled={isLoading}
                    />
                    <GithubAuth
                      onClick={() => onSsoLogin('github')}
                      disabled={isLoading}
                    />
                  </>
                )}
              </div>

              <div className='relative my-6'>
                <div
                  className='absolute inset-0 flex items-center'
                  aria-hidden='true'
                >
                  <div className='w-full border-t border-gray-200 dark:border-gray-700' />
                </div>
                <div className='relative flex justify-center text-sm'>
                  <Text
                    as='span'
                    colour='muted'
                    size='sm'
                    className='bg-gray-50 px-4 dark:bg-slate-950'
                  >
                    {t('auth.common.orContinueWith')} email
                  </Text>
                </div>
              </div>

              <Form
                method='post'
                className='space-y-4'
                onSubmit={handleFormSubmit}
              >
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
                  labelCorner={
                    <Link
                      to={routes.reset_password}
                      className='text-sm font-medium text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-300'
                      tabIndex={-1}
                    >
                      {t('auth.signin.forgot')}
                    </Link>
                  }
                  hint={t('auth.common.hint', { amount: MIN_PASSWORD_CHARS })}
                  error={getFieldError('password')}
                  disabled={isLoading}
                  onChange={() => clearFieldError('password')}
                />

                {/* Hidden input for form submission since Headless UI Checkbox doesn't submit natively */}
                <input
                  type='hidden'
                  name='dontRemember'
                  value={dontRemember ? 'true' : 'false'}
                />

                <div className='flex items-center justify-between'>
                  <Checkbox
                    checked={dontRemember}
                    onChange={setDontRemember}
                    disabled={isLoading}
                    label={
                      <span className='flex items-center gap-1'>
                        <Text size='sm'>{t('auth.common.noRemember')}</Text>
                        <Tooltip
                          text={t('auth.common.noRememberHint')}
                          className='relative'
                        />
                      </span>
                    }
                  />
                </div>

                <Button
                  className='mt-6 w-full justify-center'
                  type='submit'
                  loading={isFormSubmitting}
                  primary
                  giant
                >
                  {t('auth.signin.button')}
                </Button>
              </Form>

              {/* Sign up link */}
              {!isSelfhosted ? (
                <Text
                  as='p'
                  size='sm'
                  colour='muted'
                  className='mt-6 text-center'
                >
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
            </>
          )}
        </div>
      </div>

      <div className='relative hidden overflow-hidden bg-linear-to-br from-slate-800 via-slate-900 to-slate-950 lg:flex lg:w-2/5 lg:flex-col lg:justify-between dark:from-slate-900 dark:to-slate-950'>
        <div className='absolute -top-24 -right-24 size-96 rounded-full bg-indigo-500/20 blur-3xl' />
        <div className='absolute -bottom-24 -left-24 size-96 rounded-full bg-slate-500/20 blur-3xl' />

        <div className='relative z-10 flex flex-1 flex-col justify-center px-10 py-10'>
          <div className='mb-8'>
            <Text as='h2' size='2xl' weight='bold' className='mb-2 text-white'>
              {t('auth.signin.dashboardAwaits')}
            </Text>
            <Text as='p' size='lg' className='text-slate-400'>
              {t('auth.signin.trustedByThousands')}
            </Text>
          </div>

          <div className='relative'>
            <div className='overflow-hidden rounded-xl shadow-lg ring-1 ring-white/10'>
              <img
                src={
                  theme === 'dark'
                    ? '/assets/screenshot_dark.png'
                    : '/assets/screenshot_light.png'
                }
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

export default memo(Signin)
