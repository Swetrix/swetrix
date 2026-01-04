import type { LoaderFunctionArgs } from 'react-router'
import { useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export interface SubscriberInviteLoaderData {
  success: boolean
  error?: string
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<SubscriberInviteLoaderData> {
  const { id } = params
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!id || !token) {
    return { success: false, error: 'Invalid invitation link' }
  }

  const result = await serverFetch(request, `project/${id}/subscribers/invite?token=${token}`, {
    skipAuth: true,
  })

  if (result.error) {
    const errorMessage = typeof result.error === 'string' ? result.error : 'Invalid or expired token'
    return { success: false, error: errorMessage }
  }

  return { success: true }
}

export default function SubscriberInviteRoute() {
  const data = useLoaderData<SubscriberInviteLoaderData>()

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
      title='Invitation accepted'
      actions={[{ label: 'Dashboard', to: routes.dashboard, primary: true }]}
    />
  )
}
