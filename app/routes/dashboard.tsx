import Dashboard from 'pages/Dashboard'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [
    {
      title: 'Dashboard',
      description: 'Dashboard',
    },
  ]
}

export default function Index() {
  return <Dashboard />
}
