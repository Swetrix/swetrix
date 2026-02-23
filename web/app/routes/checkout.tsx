import { useTranslation } from 'react-i18next'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { data, redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { getAuthenticatedUser, serverFetch } from '~/api/api.server'
import { isSelfhosted } from '~/lib/constants'
import { DEFAULT_METAINFO, Metainfo } from '~/lib/models/Metainfo'
import Checkout from '~/pages/Checkout'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'
import {
  redirectIfNotAuthenticated,
  createHeadersWithCookies,
} from '~/utils/session.server'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const meta: MetaFunction = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  return [
    ...getTitle(t('titles.checkout')),
    ...getDescription(t('description.signup')),
    ...getPreviewImage(),
  ]
}

export interface CheckoutLoaderData {
  metainfo: Metainfo
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted) {
    return redirect('/onboarding', 302)
  }

  redirectIfNotAuthenticated(request)

  const authResult = await getAuthenticatedUser(request)
  const cookies: string[] = authResult?.cookies || []

  const user = authResult?.user?.user

  if (!user?.hasCompletedOnboarding) {
    if (cookies.length > 0) {
      return redirect('/onboarding', {
        headers: createHeadersWithCookies(cookies),
      })
    }
    return redirect('/onboarding')
  }

  // If the user already has a paid subscription, skip checkout
  if (
    user?.planCode &&
    user.planCode !== 'trial' &&
    user.planCode !== 'none'
  ) {
    if (cookies.length > 0) {
      return redirect('/dashboard', {
        headers: createHeadersWithCookies(cookies),
      })
    }
    return redirect('/dashboard')
  }

  const metainfoResult = await serverFetch<Metainfo>(
    request,
    'user/metainfo',
    { skipAuth: true },
  )
  const metainfo = metainfoResult.data ?? DEFAULT_METAINFO
  const allCookies = [...cookies, ...metainfoResult.cookies]

  const loaderData: CheckoutLoaderData = { metainfo }

  if (allCookies.length > 0) {
    return data(loaderData, {
      headers: createHeadersWithCookies(allCookies),
    })
  }

  return loaderData
}

export default function CheckoutRoute() {
  return <Checkout />
}
