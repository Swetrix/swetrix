import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'
import { getTitle } from '~/utils/seo'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const meta: MetaFunction = () => [
  ...getTitle('Unsubscribe from notifications'),
  { name: 'robots', content: 'noindex' },
]

export async function loader({
  request,
  params,
}: LoaderFunctionArgs): Promise<Response | null> {
  const { token } = params

  if (!token) return null

  const result = await serverFetch<{ success: boolean }>(
    request,
    `notification-channel/unsubscribe/${encodeURIComponent(token)}`,
    { method: 'POST', skipAuth: true },
  )

  if (!result.error && result.data?.success === true) {
    return redirect('/notification-channel-status?result=unsubscribed', 302)
  }

  return null
}

export default function NotificationChannelUnsubscribeRoute() {
  return (
    <StatusPage
      type='error'
      title='This unsubscribe link is invalid'
      actions={[
        { label: 'Sign In', to: routes.signin, primary: true },
        { label: 'Support', to: routes.contact },
      ]}
    />
  )
}
