import type { LoaderArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { json, redirect } from '@remix-run/node'
import ReferralPage from 'pages/ReferralPage'

import { isSelfhosted } from 'redux/constants'
import { detectTheme } from 'utils/server'

export async function loader({ request }: LoaderArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const [theme] = detectTheme(request)

  return json({ theme })
}

export default function Index() {
  const { theme } = useLoaderData<typeof loader>()

  return <ReferralPage ssrTheme={theme} />
}
