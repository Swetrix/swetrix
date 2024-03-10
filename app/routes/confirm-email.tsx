import CheckYourInbox from 'pages/Auth/CheckYourInbox'
import type { SitemapFunction } from 'remix-sitemap'
import type { HeadersFunction, LoaderArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { isSelfhosted } from 'redux/constants'

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export async function loader({ request }: LoaderArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  return null
}

export default function Index() {
  return <CheckYourInbox />
}
