import ForgotPassword from 'pages/Auth/ForgotPassword'
import type { V2_MetaFunction } from '@remix-run/node'

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
