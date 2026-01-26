import { useTranslation } from 'react-i18next'
import {
  redirect,
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
  LinksFunction,
} from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { getGeneralStats } from '~/api/api.server'
import { isDisableMarketingPages, isSelfhosted } from '~/lib/constants'
import OpenStartup from '~/pages/OpenStartup'
import Style from '~/styles/ProjectViewStyle.css?url'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  return [
    ...getTitle(t('titles.open')),
    ...getDescription(t('description.open')),
    ...getPreviewImage(),
  ]
}

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: Style }]
}

export const sitemap: SitemapFunction = () => ({
  priority: 0.8,
  exclude: isSelfhosted || isDisableMarketingPages,
})

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted || isDisableMarketingPages) {
    return redirect('/login', 302)
  }

  const stats = await getGeneralStats(request)

  return { stats }
}

export default function Index() {
  const { stats } = useLoaderData<typeof loader>()

  return <OpenStartup stats={stats} />
}
