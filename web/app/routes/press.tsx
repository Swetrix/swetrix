import { redirect } from '@remix-run/node'
import { SitemapFunction } from 'remix-sitemap'
import { isDisableMarketingPages, isSelfhosted } from '~/lib/constants'
import Press from '~/pages/Press'

export const sitemap: SitemapFunction = () => ({
  priority: 1,
  exclude: isSelfhosted || isDisableMarketingPages,
})

export async function loader() {
  if (isSelfhosted || isDisableMarketingPages) {
    return redirect('/login', 302)
  }

  return null
}

export default function Index() {
  return <Press />
}
