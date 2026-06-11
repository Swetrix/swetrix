import { redirect, type LoaderFunctionArgs } from 'react-router'
import { SitemapFunction } from 'remix-sitemap'

import {
  getLangFromPath,
  LIVE_DEMO_URL,
  localisePath,
  MAIN_URL,
} from '~/lib/constants'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const loader = async ({ url }: LoaderFunctionArgs) => {
  const lang = getLangFromPath(url.pathname)
  const demoPath = lang ? localisePath(LIVE_DEMO_URL, lang) : LIVE_DEMO_URL

  return redirect(`${MAIN_URL}${demoPath}`)
}
