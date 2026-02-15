import type { ActionFunctionArgs } from 'react-router'

import { proxySwetrixAnalyticsRequest } from '~/utils/analyticsProxy.server'

export async function action({ request }: ActionFunctionArgs) {
  return proxySwetrixAnalyticsRequest(request)
}
