import { redirect } from 'react-router'
import About from '~/pages/About'
import { isDisableMarketingPages, isSelfhosted } from '~/lib/constants'
import { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  priority: 1,
  exclude: isSelfhosted || isDisableMarketingPages,
})

export async function loader() {
  if (isSelfhosted || isDisableMarketingPages) {
    return redirect('/dashboard', 302)
  }

  return null
}

export default function Index() {
  return <About />
}
