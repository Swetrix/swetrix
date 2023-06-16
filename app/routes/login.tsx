import Signin from 'pages/Auth/Signin'
import type { V2_MetaFunction, HeadersFunction } from '@remix-run/node'

export const headers: HeadersFunction = () => {
  return {
    'X-Frame-Options': 'DENY',
  }
}

export const meta: V2_MetaFunction = () => {
  return [
    { title: 'Login' },
    {
      name: 'description',
      content: 'Login to your account',
    },
    {
      name: 'keywords',
      content: 'login, sign in',
    },
  ]
}

export default function Index() {
  return <Signin />
}
