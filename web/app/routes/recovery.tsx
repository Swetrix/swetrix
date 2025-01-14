import ForgotPassword from '~/pages/Auth/ForgotPassword'
import type { HeadersFunction } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { isSelfhosted } from '~/lib/constants'

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export async function loader() {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  return null
}

export default function Index() {
  return <ForgotPassword />
}
