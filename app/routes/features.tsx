import Features from 'pages/Features'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [{ title: 'Features' }, { name: 'description', content: 'Features' }]
}

export default function Index() {
  return <Features />
}
