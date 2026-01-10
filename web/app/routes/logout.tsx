import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { redirect } from 'react-router'

import { logoutUser } from '~/api/api.server'
import { createHeadersWithCookies } from '~/utils/session.server'

function getLogoutAllParam(request: Request): boolean {
  const url = new URL(request.url)
  return url.searchParams.get('logoutAll') === 'true'
}

export async function loader({ request }: LoaderFunctionArgs) {
  const logoutAll = getLogoutAllParam(request)
  const { cookies } = await logoutUser(request, { logoutAll })

  return redirect('/login', {
    headers: createHeadersWithCookies(cookies),
  })
}

export async function action({ request }: ActionFunctionArgs) {
  const logoutAll = getLogoutAllParam(request)
  const { cookies } = await logoutUser(request, { logoutAll })

  return redirect('/login', {
    headers: createHeadersWithCookies(cookies),
  })
}

export default function LogoutRoute() {
  return null
}
