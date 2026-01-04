import type { ActionFunctionArgs, HeadersFunction } from 'react-router'
import { data, redirect } from 'react-router'
import { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import ForgotPassword from '~/pages/Auth/ForgotPassword'
import { isValidEmail } from '~/utils/validator'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export interface ForgotPasswordActionData {
  success?: boolean
  error?: string
  fieldErrors?: {
    email?: string
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const email = formData.get('email')?.toString() || ''

  if (!isValidEmail(email)) {
    return data<ForgotPasswordActionData>(
      { fieldErrors: { email: 'Please enter a valid email address' } },
      { status: 400 },
    )
  }

  const result = await serverFetch(request, 'v1/auth/reset-password', {
    method: 'POST',
    body: { email },
    skipAuth: true,
  })

  if (result.error) {
    return data<ForgotPasswordActionData>({ error: result.error as string }, { status: 400 })
  }

  return redirect('/?password_reset_sent=true')
}

export default function Index() {
  return <ForgotPassword />
}
