import { useTranslation } from 'react-i18next'
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from 'react-router'
import { redirect, data } from 'react-router'

import {
  getAuthenticatedUser,
  getInvitationDetails,
  registerViaInvitation,
  claimInvitation,
} from '~/api/api.server'
import { getOgImageUrl } from '~/lib/constants'
import InvitationSignup from '~/pages/Auth/Signup/InvitationSignup'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'
import { createHeadersWithCookies } from '~/utils/session.server'

export const meta: MetaFunction = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  return [
    ...getTitle(t('titles.signup')),
    ...getDescription(t('description.signup')),
    ...getPreviewImage(
      getOgImageUrl(t('titles.signup'), t('description.signup')),
    ),
  ]
}

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export interface InvitationDetails {
  id: string
  email: string
  type: string
  role: string
  inviterEmail: string
  targetName: string
}

export interface InvitationSignupLoaderData {
  invitation?: InvitationDetails
  error?: string
}

export interface InvitationSignupActionData {
  error?: string | string[]
  fieldErrors?: {
    email?: string
    password?: string
    tos?: string
  }
  timestamp?: number
}

export async function loader({
  request,
  params,
}: LoaderFunctionArgs): Promise<InvitationSignupLoaderData> {
  const authResult = await getAuthenticatedUser(request)

  if (authResult) {
    const { id: invId } = params

    if (invId) {
      await claimInvitation(request, invId)
    }

    const user = authResult.user.user
    const cookies = authResult.cookies || []
    const redirectHeaders = cookies.length
      ? createHeadersWithCookies(cookies)
      : undefined

    if (!user.hasCompletedOnboarding) {
      throw redirect('/onboarding', {
        headers: redirectHeaders,
      })
    }

    throw redirect('/dashboard', {
      headers: redirectHeaders,
    })
  }

  const { id } = params

  if (!id) {
    return { error: 'Invalid invitation link' }
  }

  const result = await getInvitationDetails(request, id)

  if (!result.success || !result.data) {
    return { error: result.error || 'Invitation not found or has expired' }
  }

  return { invitation: result.data }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { id } = params
  const formData = await request.formData()

  const email = formData.get('email')?.toString() || ''
  const password = formData.get('password')?.toString() || ''
  const tos = formData.get('tos') === 'true'
  const checkIfLeaked = formData.get('checkIfLeaked') === 'true'

  const fieldErrors: InvitationSignupActionData['fieldErrors'] = {}

  if (!email || !email.includes('@')) {
    fieldErrors.email = 'Please enter a valid email address'
  }

  if (!password || password.length < 8) {
    fieldErrors.password = 'Password must be at least 8 characters'
  }

  if (password.length > 50) {
    fieldErrors.password = 'Password must be at most 50 characters'
  }

  if (!tos) {
    fieldErrors.tos = 'You must accept the Terms of Service'
  }

  if (fieldErrors.email || fieldErrors.password || fieldErrors.tos) {
    return data({ fieldErrors, timestamp: Date.now() }, { status: 400 })
  }

  const result = await registerViaInvitation(request, {
    pendingInvitationId: id!,
    email,
    password,
    checkIfLeaked,
  })

  if (!result.success) {
    return data({ error: result.error, timestamp: Date.now() }, { status: 400 })
  }

  return redirect('/dashboard', {
    headers: createHeadersWithCookies(result.cookies),
  })
}

export default function InvitationSignupPage() {
  return <InvitationSignup />
}
