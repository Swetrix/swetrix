import type { HeadersFunction } from 'react-router'
import { redirect } from 'react-router'

import { isSelfhosted } from '~/lib/constants'
import ForgotPassword from '~/pages/Auth/ForgotPassword'

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
