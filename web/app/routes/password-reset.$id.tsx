import type { HeadersFunction } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import CreateNewPassword from '~/pages/Auth/CreateNewPassword'

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export default function Index() {
  return <CreateNewPassword />
}
