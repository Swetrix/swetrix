import { useTranslation } from 'react-i18next'
import type { MetaFunction } from 'react-router'
import { redirect } from 'react-router'
import { SitemapFunction } from 'remix-sitemap'

import {
  getOgImageUrl,
  isDisableMarketingPages,
  isSelfhosted,
} from '~/lib/constants'
import BookACall from '~/pages/BookACall'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  return [
    ...getTitle(t('bookACall.title')),
    ...getDescription(t('description.bookACall')),
    ...getPreviewImage(
      getOgImageUrl(t('bookACall.title'), t('description.bookACall')),
    ),
  ]
}

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

export default function Index() {
  return <BookACall />
}
