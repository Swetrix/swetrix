import type { LoaderFunctionArgs } from 'react-router'
import { useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export interface TransferCancelLoaderData {
  success: boolean
  error?: string
}

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<TransferCancelLoaderData> {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return { success: false, error: 'Invalid or expired token' }
  }

  const result = await serverFetch(request, `project/transfer?token=${token}`, {
    method: 'DELETE',
  })

  if (result.error) {
    const errorMessage =
      typeof result.error === 'string'
        ? result.error
        : 'Invalid or expired token'
    return { success: false, error: errorMessage }
  }

  return { success: true }
}

export default function TransferCancelRoute() {
  const data = useLoaderData<TransferCancelLoaderData>()

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
      type='info'
      title='Project transfer rejected'
      actions={[{ label: 'Dashboard', to: routes.dashboard, primary: true }]}
    />
  )
}
