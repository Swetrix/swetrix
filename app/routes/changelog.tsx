import Changelog from 'pages/Changelog'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [{ title: 'Changelog' }, { name: 'description', content: 'Changelog' }]
}

export default function Index() {
  return <Changelog />
}
