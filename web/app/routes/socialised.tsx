import Socialised from 'pages/Auth/Socialised'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export default function Index() {
  return <Socialised />
}
