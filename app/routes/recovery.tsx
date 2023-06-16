import ForgotPassword from 'pages/Auth/ForgotPassword'
import type { V2_MetaFunction, HeadersFunction } from '@remix-run/node'

export const headers: HeadersFunction = () => {
  return {
    'X-Frame-Options': 'DENY',
  }
}

export const meta: V2_MetaFunction = () => {
  return [
    { title: 'Forgot password' },
    {
      name: 'description',
      content: 'Forgot your password',
    },
    {
      name: 'keywords',
      content: 'reset, password, forgot, forgot password',
    },
  ]
}

export default function Index() {
  return <ForgotPassword />
}
