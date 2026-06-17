import { useTranslation } from 'react-i18next'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { redirect, useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import FAQ from '~/components/marketing/FAQ'
import MarketingPricing from '~/components/pricing/MarketingPricing'
import { PricingComparisonTable } from '~/components/pricing/PricingComparisonTable'
import { isDisableMarketingPages, isSelfhosted } from '~/lib/constants'
import { DEFAULT_METAINFO, Metainfo } from '~/lib/models/Metainfo'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  return [
    ...getTitle(t('titles.pricing')),
    ...getDescription(t('pricing.comparison.metaDescription')),
    ...getPreviewImage(),
  ]
}

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
  exclude: isSelfhosted || isDisableMarketingPages,
})

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted || isDisableMarketingPages) {
    return redirect('/login', 302)
  }

  let metainfo = DEFAULT_METAINFO

  try {
    const metainfoResult = await serverFetch<Metainfo>(
      request,
      'user/metainfo',
      {
        skipAuth: true,
      },
    )
    metainfo = metainfoResult.data ?? DEFAULT_METAINFO
  } catch (error) {
    console.error('[ERROR] Failed to fetch pricing metainfo:', error)
  }

  return {
    metainfo,
  }
}

export default function PricingRoute() {
  const { metainfo } = useLoaderData<typeof loader>()

  return (
    <div className='overflow-x-clip'>
      <main className='bg-gray-50 dark:bg-slate-950'>
        <MarketingPricing metainfo={metainfo} showVatNote />
        <PricingComparisonTable metainfo={metainfo} />
        <FAQ />
        <DitchGoogle />
      </main>
    </div>
  )
}
