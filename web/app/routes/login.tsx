import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from 'react-router'
import { redirect, data } from 'react-router'

import { getAuthenticatedUser, loginUser, serverFetch } from '~/api/api.server'
import Signin from '~/pages/Auth/Signin'
import { createHeadersWithCookies, createAuthCookies } from '~/utils/session.server'

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export async function loader({ request }: LoaderFunctionArgs) {
  const authResult = await getAuthenticatedUser(request)

  if (authResult) {
    if (!authResult.user.user.hasCompletedOnboarding) {
      return redirect('/onboarding')
    }
    return redirect('/dashboard')
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
    const twoFactorAuthenticationCode = formData.get('twoFACode')?.toString() || ''
    const dontRemember = formData.get('dontRemember') === 'true'

    if (!twoFactorAuthenticationCode || twoFactorAuthenticationCode.length !== 6) {
      return data<LoginActionData>(
        { fieldErrors: { twoFACode: 'Please enter a valid 6-digit code' }, timestamp: Date.now() },
        { status: 400 },
      )
    }

    const result = await serverFetch<{
      accessToken: string
      refreshToken: string
      user: { hasCompletedOnboarding: boolean }
    }>(request, '2fa/authenticate', {
      method: 'POST',
      body: { twoFactorAuthenticationCode },
    })

    if (result.error) {
      return data<LoginActionData>(
        { fieldErrors: { twoFACode: 'Invalid 2FA code' }, timestamp: Date.now() },
        { status: 400 },
      )
    }

    const { accessToken, refreshToken, user } = result.data!
    const cookies = createAuthCookies({ accessToken, refreshToken }, !dontRemember)

    const redirectTo = user.hasCompletedOnboarding ? '/dashboard' : '/onboarding'

    return redirect(redirectTo, {
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

  const redirectTo = result.data?.user.hasCompletedOnboarding ? '/dashboard' : '/onboarding'

  return redirect(redirectTo, {
    headers: createHeadersWithCookies(result.cookies),
  })
}

export default function SigninRoute() {
  return <Signin />
}
