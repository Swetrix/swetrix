import Terms from 'pages/Terms'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [{ title: 'Terms and Conditions' }, { name: 'description', content: 'Terms' }]
}

export default function Index() {
  return <Terms />
}
