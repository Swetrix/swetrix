import type { HeadersFunction, LoaderFunctionArgs } from 'react-router'
import { useLoaderData, redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { isSelfhosted } from '~/lib/constants'
import Singup from '~/pages/Auth/Signup'
import { detectTheme } from '~/utils/server'

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const [theme] = detectTheme(request)

  return { theme }
}

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
  exclude: isSelfhosted,
})

export default function Index() {
  const { theme } = useLoaderData<typeof loader>()

  return <Singup ssrTheme={theme} />
}
