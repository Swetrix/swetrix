import CreateNewPassword from '~/pages/Auth/CreateNewPassword'
import type { SitemapFunction } from 'remix-sitemap'
import type { HeadersFunction } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { isSelfhosted } from '~/lib/constants'

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export async function loader() {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  return null
}

export default function Index() {
  return <CreateNewPassword />
}
