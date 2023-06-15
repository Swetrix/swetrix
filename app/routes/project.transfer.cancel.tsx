import TransferProjectConfirm from 'pages/Project/Settings/TransferProject/TransferProjectConfirm'
import type { V2_MetaFunction } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

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
