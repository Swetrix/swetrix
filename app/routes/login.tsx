import Signin from 'pages/Auth/Signin'
import type { HeadersFunction } from '@remix-run/node'

export const headers: HeadersFunction = () => {
  return {
    'X-Frame-Options': 'DENY',
  }
}

export default function Index() {
  return <Signin />
}
