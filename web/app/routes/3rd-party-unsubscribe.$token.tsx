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

export interface UnsubscribeLoaderData {
  success: boolean
  error?: string
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<UnsubscribeLoaderData | Response> {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const { token } = params

  if (!token) {
    return { success: false, error: 'Invalid token' }
  }

  const result = await serverFetch(request, `project/unsubscribe/${token}`, {
    skipAuth: true,
  })

  if (result.error) {
    const errorMessage = typeof result.error === 'string' ? result.error : 'Failed to unsubscribe'
    return { success: false, error: errorMessage }
  }

  return { success: true }
}

export default function ThirdPartyUnsubscribeRoute() {
  const data = useLoaderData<UnsubscribeLoaderData>()

  if (data.error) {
    return (
      <StatusPage
        type='error'
        title={data.error}
        actions={[
          { label: 'Sign In', to: routes.signin, primary: true },
          { label: 'Support', to: routes.contact },
        ]}
      />
    )
  }

  return (
    <StatusPage
      type='success'
      title='Successfully unsubscribed from email reports'
      actions={[{ label: 'Sign In', to: routes.signin, primary: true }]}
    />
  )
}
