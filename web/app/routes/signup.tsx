import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from 'react-router'
import { redirect, data } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { getAuthenticatedUser, registerUser } from '~/api/api.server'
import { isSelfhosted } from '~/lib/constants'
import Signup from '~/pages/Auth/Signup'
import { createHeadersWithCookies } from '~/utils/session.server'

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
  exclude: isSelfhosted,
})

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

export interface SignupActionData {
  error?: string | string[]
  fieldErrors?: {
    email?: string
    password?: string
    repeat?: string
    tos?: string
  }
  timestamp?: number
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()

  const email = formData.get('email')?.toString() || ''
  const password = formData.get('password')?.toString() || ''
  const repeat = formData.get('repeat')?.toString() || ''
  const tos = formData.get('tos') === 'true'
  const checkIfLeaked = formData.get('checkIfLeaked') === 'true'

  const fieldErrors: SignupActionData['fieldErrors'] = {}

  if (!email || !email.includes('@')) {
    fieldErrors.email = 'Please enter a valid email address'
  }

  if (!password || password.length < 8) {
    fieldErrors.password = 'Password must be at least 8 characters'
  }

  if (password.length > 50) {
    fieldErrors.password = 'Password must be at most 50 characters'
  }

  if (password !== repeat) {
    fieldErrors.repeat = 'Passwords do not match'
  }

  if (!tos && !isSelfhosted) {
    fieldErrors.tos = 'You must accept the Terms of Service'
  }

  if (fieldErrors.email || fieldErrors.password || fieldErrors.repeat || fieldErrors.tos) {
    return data({ fieldErrors, timestamp: Date.now() }, { status: 400 })
  }

  const result = await registerUser(request, { email, password, checkIfLeaked }, true)

  if (!result.success) {
    return data({ error: result.error, timestamp: Date.now() }, { status: 400 })
  }

  return redirect('/onboarding', {
    headers: createHeadersWithCookies(result.cookies),
  })
}

export default function SignupPage() {
  return <Signup />
}
