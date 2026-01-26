import { useTranslation } from 'react-i18next'
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from 'react-router'
import { data, redirect } from 'react-router'
import { SitemapFunction } from 'remix-sitemap'

import { getAuthenticatedUser, serverFetch } from '~/api/api.server'
import ForgotPassword from '~/pages/Auth/ForgotPassword'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'
import { isValidEmail } from '~/utils/validator'

export const meta: MetaFunction = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  return [
    ...getTitle(t('titles.recovery')),
    ...getDescription(t('description.recovery')),
    ...getPreviewImage(),
  ]
}

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export async function loader({ request }: LoaderFunctionArgs) {
  const authResult = await getAuthenticatedUser(request)

  if (authResult) {
    return redirect('/dashboard')
  }

  return null
}

export interface ForgotPasswordActionData {
  success?: boolean
  error?: string
  fieldErrors?: {
    email?: string
  }
  timestamp?: number
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const email = formData.get('email')?.toString() || ''

  if (!isValidEmail(email)) {
    return data<ForgotPasswordActionData>(
      {
        fieldErrors: { email: 'Please enter a valid email address' },
        timestamp: Date.now(),
      },
      { status: 400 },
    )
  }

  const result = await serverFetch(request, 'v1/auth/reset-password', {
    method: 'POST',
    body: { email },
    skipAuth: true,
  })

  if (result.error) {
    return data<ForgotPasswordActionData>(
      { error: result.error as string, timestamp: Date.now() },
      { status: 400 },
    )
  }

  return redirect('/?password_reset_sent=true')
}

export default function Index() {
  return <ForgotPassword />
}
