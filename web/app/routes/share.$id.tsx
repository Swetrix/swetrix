import type { LoaderFunctionArgs } from 'react-router'
import { useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export interface ShareLoaderData {
  success: boolean
  error?: string
}

export async function loader({
  request,
  params,
}: LoaderFunctionArgs): Promise<ShareLoaderData> {
  const { id } = params

  if (!id) {
    return { success: false, error: 'Invalid share link' }
  }

  const result = await serverFetch(request, `/project/share/${id}`)

  if (result.error) {
    const errorMessage =
      typeof result.error === 'string'
        ? result.error
        : 'Failed to accept invitation'
    return { success: false, error: errorMessage }
  }

  return { success: true }
}

export default function ShareRoute() {
  const data = useLoaderData<ShareLoaderData>()

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
