import Socialised from 'pages/Auth/Socialised'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [{ title: 'Socialised' }, { name: 'description', content: 'Socialised' }]
}

export default function Index() {
  return <Socialised />
}
