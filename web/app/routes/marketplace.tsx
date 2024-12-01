import React from 'react'
import MarketplaceLayout from './marketplace/_provider/MarketplaceLayout'
import { redirect } from '@remix-run/node'
import { isSelfhosted } from 'redux/constants'
import routesPath from 'utils/routes'

export async function loader() {
  if (isSelfhosted) {
    return redirect(routesPath.dashboard, 302)
  }

  return null
}

export default function Index() {
    return <MarketplaceLayout />
}
