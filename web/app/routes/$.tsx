import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { data, useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { getOgImageUrl } from '~/lib/constants'
import Post from '~/pages/Blog/Post'
import NotFound from '~/pages/NotFound'
import { getPost } from '~/utils/getPosts.server'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = (loaderData: any) => {
  if (!loaderData?.data) {
    return [
      ...getTitle('Page Not Found'),
      ...getDescription('The page you are looking for does not exist.'),
    ]
  }

  const ogImageUrl = getOgImageUrl(loaderData?.data?.title)

  return [
    ...getTitle(loaderData?.data?.title || 'Blog'),
    ...getDescription(loaderData?.data?.intro || ''),
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
