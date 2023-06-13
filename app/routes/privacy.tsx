import Privacy from 'pages/Privacy'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [{ title: 'Privacy Policy' }, { name: 'description', content: 'Privacy' }]
}

export default function Index() {
  return <Privacy />
}
