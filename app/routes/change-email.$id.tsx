import VerifyEmail from 'pages/Auth/VerifyEmail'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [
    { title: 'Change Email' },
    { name: 'description', content: 'Change Email' },
  ]
}

export default function Index() {
  return <VerifyEmail />
}
