import Singup from 'pages/Auth/Signup'
import type { SitemapFunction } from 'remix-sitemap'
import type { HeadersFunction, LoaderArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { json, redirect } from '@remix-run/node'

import { isSelfhosted } from 'redux/constants'
import { detectTheme } from 'utils/server'

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export async function loader({ request }: LoaderArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const theme = detectTheme(request)

  return json({ theme })
}

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
  exclude: isSelfhosted,
})

export default function Index() {
  const {
    theme,
  } = useLoaderData<typeof loader>()

  return <Singup ssrTheme={theme} />
}
