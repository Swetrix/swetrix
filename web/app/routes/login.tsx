import { useTranslation } from 'react-i18next'
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from 'react-router'
import { redirect, data } from 'react-router'

import { getAuthenticatedUser, loginUser, serverFetch } from '~/api/api.server'
import Signin from '~/pages/Auth/Signin'
import { decidePostAuthRedirect } from '~/utils/auth'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'
import {
  createHeadersWithCookies,
  createAuthCookies,
} from '~/utils/session.server'

export const meta: MetaFunction = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  return [
    ...getTitle(t('titles.signin')),
    ...getDescription(t('description.login')),
    ...getPreviewImage(),
  ]
}

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export async function loader({ request }: LoaderFunctionArgs) {
  const authResult = await getAuthenticatedUser(request)

  if (authResult) {
    return redirect(decidePostAuthRedirect(authResult.user.user))
  }

  return null
}

export interface LoginActionData {
  error?: string | string[]
  requires2FA?: boolean
  twoFASuccess?: boolean
  fieldErrors?: {
    email?: string
    password?: string
    twoFACode?: string
  }
  timestamp?: number
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent')?.toString()

  // Handle 2FA submission
  if (intent === 'submit-2fa') {
    const twoFactorAuthenticationCode =
      formData.get('twoFACode')?.toString() || ''
    const dontRemember = formData.get('dontRemember') === 'true'

    if (
      !twoFactorAuthenticationCode ||
      twoFactorAuthenticationCode.length !== 6
    ) {
      return data<LoginActionData>(
        {
          fieldErrors: { twoFACode: 'Please enter a valid 6-digit code' },
          timestamp: Date.now(),
        },
        { status: 400 },
      )
    }

    const result = await serverFetch<{
      accessToken: string
      refreshToken: string
      user: { hasCompletedOnboarding: boolean; planCode?: string }
    }>(request, '2fa/authenticate', {
      method: 'POST',
      body: { twoFactorAuthenticationCode },
    })

    if (result.error) {
      return data<LoginActionData>(
        {
          fieldErrors: { twoFACode: 'Invalid 2FA code' },
          timestamp: Date.now(),
        },
        { status: 400 },
      )
    }

    const { accessToken, refreshToken, user } = result.data!
    const cookies = createAuthCookies(
      { accessToken, refreshToken },
      !dontRemember,
    )

    return redirect(user ? decidePostAuthRedirect(user) : '/dashboard', {
      headers: createHeadersWithCookies(cookies),
    })
  }

  // Handle regular login
  const email = formData.get('email')?.toString() || ''
  const password = formData.get('password')?.toString() || ''
  const dontRemember = formData.get('dontRemember') === 'true'

  const fieldErrors: LoginActionData['fieldErrors'] = {}

  if (!email || !email.includes('@')) {
    fieldErrors.email = 'Please enter a valid email address'
  }

  if (!password || password.length < 8) {
    fieldErrors.password = 'Password must be at least 8 characters'
  }

  if (fieldErrors.email || fieldErrors.password) {
    return data({ fieldErrors, timestamp: Date.now() }, { status: 400 })
  }

  const result = await loginUser(request, { email, password }, !dontRemember)

  if (!result.success) {
    return data({ error: result.error, timestamp: Date.now() }, { status: 400 })
  }

  if (result.requires2FA) {
    return data(
      { requires2FA: true },
      {
        status: 200,
        headers: createHeadersWithCookies(result.cookies),
      },
    )
  }

  return redirect(
    result.data?.user ? decidePostAuthRedirect(result.data.user) : '/dashboard',
    { headers: createHeadersWithCookies(result.cookies) },
  )
}

export default function SigninRoute() {
  return <Signin />
}
