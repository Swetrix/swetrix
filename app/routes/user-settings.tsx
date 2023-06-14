import UserSettings from 'pages/UserSettings'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [
    {
      title: 'UserSettings',
      description: 'UserSettings',
    },
  ]
}

export default function Index() {
  return <UserSettings />
}
