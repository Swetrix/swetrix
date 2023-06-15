import ViewProject from 'pages/Project/View'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [
    {
      title: 'View Project',
      description: 'View Project',
    },
  ]
}

export default function Index() {
  return <ViewProject />
}
