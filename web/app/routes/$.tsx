import { useTranslation } from 'react-i18next'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { data, useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { getOgImageUrl } from '~/lib/constants'
import Post from '~/pages/Blog/Post'
import NotFound from '~/pages/NotFound'
import { getPost } from '~/utils/getPosts.server'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  if (!data) {
    return [
      ...getTitle(t('notFoundPage.title')),
      ...getDescription(t('notFoundPage.description')),
      ...getPreviewImage(),
    ]
  }

  const title = data?.title || 'Blog'
  const intro = data?.intro || t('description.blog')
  const ogImageUrl = getOgImageUrl(title)

  return [
    ...getTitle(title),
    ...getDescription(intro),
    ...getPreviewImage(ogImageUrl),
  ]
}

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export async function loader({ request, params }: LoaderFunctionArgs) {
  const catchAllPath = params['*']

  if (!catchAllPath) {
    return data(null, { status: 404 })
  }

  const post = await getPost(request, catchAllPath, undefined, true)

  if (post) {
    return post
  }

  return data(null, { status: 404 })
}

export default function CatchAll() {
  const post = useLoaderData()

  if (post) {
    return <Post />
  }

  return <NotFound />
}
