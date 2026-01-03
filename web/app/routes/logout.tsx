import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { redirect } from 'react-router'

import { logoutUser } from '~/api/api.server'
import { createHeadersWithCookies } from '~/utils/session.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const { cookies } = await logoutUser(request)

  return redirect('/login', {
    headers: createHeadersWithCookies(cookies),
  })
}

export async function action({ request }: ActionFunctionArgs) {
  const { cookies } = await logoutUser(request)

  return redirect('/login', {
    headers: createHeadersWithCookies(cookies),
  })
}

export default function LogoutRoute() {
  return null
}
