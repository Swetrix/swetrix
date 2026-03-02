import { useTranslation } from 'react-i18next'
import type { MetaFunction } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'
import { getOgImageUrl } from '~/lib/constants'

import Socialised from '~/pages/Auth/Socialised'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  return [
    ...getTitle(t('titles.socialisation')),
    ...getDescription(t('description.default')),
    ...getPreviewImage(
      getOgImageUrl(t('titles.socialisation'), t('description.default')),
    ),
  ]
}

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export default function Index() {
  return <Socialised />
}
