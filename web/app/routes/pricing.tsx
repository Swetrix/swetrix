import { redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import FAQ from '~/components/marketing/FAQ'
import MarketingPricing from '~/components/pricing/MarketingPricing'
import FeaturesTable from '~/components/pricing/FeaturesTable'
import { isSelfhosted, isDisableMarketingPages } from '~/lib/constants'

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
  exclude: isSelfhosted || isDisableMarketingPages,
})

export async function loader() {
  if (isSelfhosted || isDisableMarketingPages) {
    return redirect('/dashboard', 302)
  }

  return null
}

export default function PricingPage() {
  return (
    <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
      <MarketingPricing />

      <FeaturesTable />

      <FAQ />
    </div>
  )
}
