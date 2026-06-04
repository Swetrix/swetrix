import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { data, redirect, useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import BillingPricing from '~/components/pricing/BillingPricing'
import { usePaddle } from '~/hooks/usePaddle'
import { getOgImageUrl, isSelfhosted } from '~/lib/constants'
import { DEFAULT_METAINFO, Metainfo } from '~/lib/models/Metainfo'
import type { UsageInfo } from '~/lib/models/Usageinfo'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'
import {
  createHeadersWithCookies,
  redirectIfNotAuthenticated,
} from '~/utils/session.server'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const meta: MetaFunction = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  return [
    ...getTitle(t('billing.choosePlanTitle')),
    ...getDescription(t('description.checkout')),
    ...getPreviewImage(
      getOgImageUrl(t('billing.choosePlanTitle'), t('description.checkout')),
    ),
  ]
}

export interface BillingChoosePlanLoaderData {
  metainfo: Metainfo
  usageInfo: UsageInfo | null
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted) {
    return redirect('/user-settings', 302)
  }

  redirectIfNotAuthenticated(request)

  const [metainfoResult, usageInfoResult] = await Promise.all([
    serverFetch<Metainfo>(request, 'user/metainfo'),
    serverFetch<UsageInfo>(request, 'user/usageinfo'),
  ])
  const loaderData: BillingChoosePlanLoaderData = {
    metainfo: metainfoResult.data ?? DEFAULT_METAINFO,
    usageInfo: usageInfoResult.data,
  }
  const cookies = [...metainfoResult.cookies, ...usageInfoResult.cookies]

  return data(loaderData, {
    headers: createHeadersWithCookies(cookies),
  })
}

export default function BillingChoosePlanRoute() {
  const { metainfo, usageInfo } = useLoaderData<BillingChoosePlanLoaderData>()
  const [lastEvent, setLastEvent] = useState<{ event: string } | null>(null)
  const { openCheckout } = usePaddle({ onEvent: setLastEvent })

  return (
    <BillingPricing
      lastEvent={lastEvent}
      metainfo={metainfo}
      usageInfo={usageInfo}
      openCheckout={openCheckout}
    />
  )
}
