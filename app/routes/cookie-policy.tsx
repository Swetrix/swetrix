import CookiePolicy from 'pages/CookiePolicy'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [{ title: 'Cookie Policy' }, { name: 'description', content: 'CookiePolicy' }]
}

export default function Index() {
  return <CookiePolicy />
}
