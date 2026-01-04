import type { LoaderFunctionArgs } from 'react-router'
import { redirect, useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import { isSelfhosted } from '~/lib/constants'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export interface VerifyEmailLoaderData {
  success: boolean
  error?: string
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<VerifyEmailLoaderData | Response> {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const { id } = params

  if (!id) {
    return { success: false, error: 'Invalid verification link' }
  }

  const result = await serverFetch(request, `v1/auth/verify-email/${id}`, {
    skipAuth: true,
  })

  if (result.error) {
    const errorMessage = typeof result.error === 'string' ? result.error : 'Verification failed'
    return { success: false, error: errorMessage }
  }

  return { success: true }
}

export default function VerifyEmailRoute() {
  const data = useLoaderData<VerifyEmailLoaderData>()

  if (data.error) {
    return (
      <StatusPage
        type='error'
        title={data.error}
        actions={[
          { label: 'Dashboard', to: routes.dashboard, primary: true },
          { label: 'Support', to: routes.contact },
        ]}
      />
    )
  }

  return (
    <StatusPage
      type='success'
      title='Email verified successfully'
      actions={[{ label: 'Continue to Onboarding', to: routes.onboarding, primary: true }]}
    />
  )
}
