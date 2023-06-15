import TransferProjectConfirm from 'pages/Project/Settings/TransferProject/TransferProjectConfirm'
import type { V2_MetaFunction } from '@remix-run/node'

export const meta: V2_MetaFunction = () => {
  return [
    {
      title: 'Transfer Project Confirm',
      description: 'Transfer Project Confirm',
    },
  ]
}

export default function Index() {
  return <TransferProjectConfirm />
}
