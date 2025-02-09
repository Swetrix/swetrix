import type { LoaderFunctionArgs } from 'react-router'
import { useLoaderData, redirect } from 'react-router'

import { isSelfhosted } from '~/lib/constants'
import ReferralPage from '~/pages/ReferralPage'
import { detectTheme } from '~/utils/server'

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const [theme] = detectTheme(request)

  return { theme }
}

export default function Index() {
  const { theme } = useLoaderData<typeof loader>()

  return <ReferralPage ssrTheme={theme} />
}
