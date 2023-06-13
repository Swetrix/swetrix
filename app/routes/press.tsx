import Press from 'pages/Press'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [{ title: 'Press' }, { name: 'description', content: 'Press' }]
}

export default function Index() {
  return <Press />
}
