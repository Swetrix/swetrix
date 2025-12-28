import { redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { isDisableMarketingPages, isSelfhosted } from '~/lib/constants'
import CaptchaDemo from '~/pages/Captcha/CaptchaDemo'

export const sitemap: SitemapFunction = () => ({
  priority: 0.8,
  exclude: isSelfhosted || isDisableMarketingPages,
})

export async function loader() {
  if (isSelfhosted || isDisableMarketingPages) {
    return redirect('/login', 302)
  }

  return null
}

export default function CaptchaDemoRoute() {
  return <CaptchaDemo />
}
