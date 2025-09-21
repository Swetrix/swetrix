import type { HeadersFunction } from 'react-router'
import { SitemapFunction } from 'remix-sitemap'

import ForgotPassword from '~/pages/Auth/ForgotPassword'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export default function Index() {
  return <ForgotPassword />
}
