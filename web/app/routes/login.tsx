import Signin from 'pages/Auth/Signin'
import type { HeadersFunction, LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { json } from '@remix-run/node'

import { detectTheme } from 'utils/server'

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export async function loader({ request }: LoaderFunctionArgs) {
  const [theme] = detectTheme(request)

  return json({ theme })
}

export default function Index() {
  const { theme } = useLoaderData<typeof loader>()

  return <Signin ssrTheme={theme} />
}
