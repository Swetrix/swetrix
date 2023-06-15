import ConfirmReportsShare from 'pages/Project/Settings/Emails/ConfirmReportsShare'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [
    {
      title: 'Confirm Reports Share',
      description: 'Confirm Reports Share',
    },
  ]
}

export default function Index() {
  return <ConfirmReportsShare />
}
