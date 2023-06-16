import OpenStartup from 'pages/OpenStartup'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [{ title: 'OpenStartup' }, { name: 'description', content: 'OpenStartup' }]
}

export default function Index() {
  return <OpenStartup />
}
