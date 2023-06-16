import Contact from 'pages/Contact'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [{ title: 'Contact' }, { name: 'description', content: 'Contact' }]
}

export default function Index() {
  return <Contact />
}
