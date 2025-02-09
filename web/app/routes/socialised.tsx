import type { SitemapFunction } from 'remix-sitemap'

import Socialised from '~/pages/Auth/Socialised'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export default function Index() {
  return <Socialised />
}
