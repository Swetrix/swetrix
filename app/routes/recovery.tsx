import ForgotPassword from 'pages/Auth/ForgotPassword'
import type { HeadersFunction } from '@remix-run/node'

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export default function Index() {
  return <ForgotPassword />
}
