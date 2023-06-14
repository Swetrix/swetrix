import ConfirmShare from 'pages/Project/ConfirmShare'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [
    {
      title: 'ConfirmShare',
      description: 'ConfirmShare',
    },
  ]
}

export default function Index() {
  return <ConfirmShare />
}
