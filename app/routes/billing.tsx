import Billing from 'pages/Billing'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [{ title: 'Billing' }, { name: 'description', content: 'Billing' }]
}

export default function Index() {
  return <Billing />
}
