import type { HeadersFunction, LoaderFunctionArgs } from 'react-router'
import { redirect, useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import { isSelfhosted } from '~/lib/constants'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export interface ChangeEmailLoaderData {
  success: boolean
  error?: string
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<ChangeEmailLoaderData | Response> {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const { id } = params

  if (!id) {
    return { success: false, error: 'Invalid verification link' }
  }

  const result = await serverFetch(request, `v1/auth/change-email/confirm/${id}`, {
    skipAuth: true,
  })

  if (result.error) {
    const errorMessage = typeof result.error === 'string' ? result.error : 'Verification failed'
    return { success: false, error: errorMessage }
  }

  return { success: true }
}

export default function ChangeEmailRoute() {
  const data = useLoaderData<ChangeEmailLoaderData>()

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
      title='Email changed successfully'
      actions={[{ label: 'Dashboard', to: routes.dashboard, primary: true }]}
    />
  )
}
