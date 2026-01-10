import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect, data } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import { isSelfhosted } from '~/lib/constants'
import { Metainfo } from '~/lib/models/Metainfo'
import { UsageInfo } from '~/lib/models/Usageinfo'
import Billing from '~/pages/Billing'
import { redirectIfNotAuthenticated, createHeadersWithCookies } from '~/utils/session.server'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export interface BillingLoaderData {
  metainfo: Metainfo | null
  usageInfo: UsageInfo | null
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  redirectIfNotAuthenticated(request)

  const [metainfoResult, usageInfoResult] = await Promise.all([
    serverFetch<Metainfo>(request, 'user/metainfo'),
    serverFetch<UsageInfo>(request, 'user/usageinfo'),
  ])

  const cookies = [...metainfoResult.cookies, ...usageInfoResult.cookies]

  return data<BillingLoaderData>(
    {
      metainfo: metainfoResult.data,
      usageInfo: usageInfoResult.data,
    },
    { headers: createHeadersWithCookies(cookies) },
  )
}

export interface BillingActionData {
  success?: boolean
  intent?: string
  error?: string
  data?: unknown
}

export async function action({ request }: ActionFunctionArgs) {
  redirectIfNotAuthenticated(request)

  const formData = await request.formData()
  const intent = formData.get('intent')?.toString()

  switch (intent) {
    case 'preview-subscription-update': {
      const planId = Number(formData.get('planId'))

      const result = await serverFetch(request, 'user/preview-plan', {
        method: 'POST',
        body: { planId },
      })

      if (result.error) {
        return data<BillingActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<BillingActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'change-subscription-plan': {
      const planId = Number(formData.get('planId'))

      const result = await serverFetch(request, 'user/change-plan', {
        method: 'POST',
        body: { planId },
      })

      if (result.error) {
        return data<BillingActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<BillingActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-metainfo': {
      const result = await serverFetch<Metainfo>(request, 'user/metainfo')

      if (result.error) {
        return data<BillingActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<BillingActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    default:
      return data<BillingActionData>({ error: 'Unknown action' }, { status: 400 })
  }
}

export default function BillingRoute() {
  return <Billing />
}
