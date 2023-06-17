import VerifyEmail from 'pages/Auth/VerifyEmail'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export default function Index() {
  return <VerifyEmail />
}
