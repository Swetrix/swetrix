import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'
import { getTitle } from '~/utils/seo'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const meta: MetaFunction = () => [
  ...getTitle('Notification channel'),
  { name: 'robots', content: 'noindex' },
]

interface NotificationChannelStatusLoaderData {
  result: 'confirmed' | 'unsubscribed' | null
}

export function loader({
  request,
}: LoaderFunctionArgs): NotificationChannelStatusLoaderData {
  const result = new URL(request.url).searchParams.get('result')

  return {
    result: result === 'confirmed' || result === 'unsubscribed' ? result : null,
  }
}

export default function NotificationChannelStatusRoute() {
  const { result } = useLoaderData<NotificationChannelStatusLoaderData>()

  if (result === 'confirmed') {
    return (
      <StatusPage
        type='success'
        title='Notification channel confirmed'
        actions={[
          {
            label: 'Continue to dashboard',
            to: routes.dashboard,
            primary: true,
          },
        ]}
      />
    )
  }

  if (result === 'unsubscribed') {
    return (
      <StatusPage
        type='success'
        title='Successfully unsubscribed from this notification channel'
        actions={[{ label: 'Sign In', to: routes.signin, primary: true }]}
      />
    )
  }

  return (
    <StatusPage
      type='error'
      title='Invalid notification channel status'
      actions={[
        { label: 'Dashboard', to: routes.dashboard, primary: true },
        { label: 'Support', to: routes.contact },
      ]}
    />
  )
}
