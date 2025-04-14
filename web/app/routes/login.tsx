import type { HeadersFunction } from 'react-router'

import Signin from '~/pages/Auth/Signin'

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export default function SigninRoute() {
  return <Signin />
}
