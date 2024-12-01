import React from 'react'
import { Outlet } from '@remix-run/react'
import { MarketplaceProvider } from './MarketplaceContext'

const MarketplaceLayout: React.FC = () => {
  return (
    <MarketplaceProvider>
      <Outlet />
    </MarketplaceProvider>
  )
}

export default MarketplaceLayout
