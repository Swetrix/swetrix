import type { LoaderFunctionArgs } from 'react-router'
import { useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export interface OrganisationInviteLoaderData {
  success: boolean
  error?: string
}

export async function loader({
  request,
  params,
}: LoaderFunctionArgs): Promise<OrganisationInviteLoaderData> {
  const { id } = params

  if (!id) {
    return { success: false, error: 'Invalid invitation link' }
  }

  const result = await serverFetch(request, `/user/organisation/${id}`, {
    method: 'POST',
  })

  if (result.error) {
    const errorMessage =
      typeof result.error === 'string'
        ? result.error
        : 'Failed to accept invitation'
    return { success: false, error: errorMessage }
  }

  return { success: true }
}

export default function OrganisationInviteRoute() {
  const data = useLoaderData<OrganisationInviteLoaderData>()

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
      title='Organisation invitation accepted'
      actions={[{ label: 'Dashboard', to: routes.dashboard, primary: true }]}
    />
  )
}
