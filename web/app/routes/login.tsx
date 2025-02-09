import type { HeadersFunction, LoaderFunctionArgs } from 'react-router'
import { useLoaderData } from 'react-router'

import Signin from '~/pages/Auth/Signin'
import { detectTheme } from '~/utils/server'

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export async function loader({ request }: LoaderFunctionArgs) {
  const [theme] = detectTheme(request)

  return { theme }
}

export default function Index() {
  const { theme } = useLoaderData<typeof loader>()

  return <Signin ssrTheme={theme} />
}
