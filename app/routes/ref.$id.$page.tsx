import type { LoaderArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'

import { isSelfhosted, REFERRAL_COOKIE, REFERRAL_COOKIE_DAYS } from 'redux/constants'
import { generateCookieString } from 'utils/cookie'

// This route sets the affiliate cookie ($id) and redirects to page specified at $page
export async function loader({ params }: LoaderArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const { id, page } = params

  const init = {
    status: 302,
    headers: {
      'Set-Cookie': generateCookieString(REFERRAL_COOKIE, id as string, REFERRAL_COOKIE_DAYS * 24 * 60 * 60),
    },
  }

  const redirectPath = page === 'index' ? '/#core-analytics' : `/${page}`

  return redirect(redirectPath, init)
}
