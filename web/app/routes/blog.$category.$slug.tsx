import type { LoaderFunction, MetaFunction } from 'react-router'
import { redirect, data } from 'react-router'

import { isSelfhosted, getOgImageUrl, isDisableMarketingPages } from '~/lib/constants'
import Post from '~/pages/Blog/Post'
import { getPost } from '~/utils/getPosts'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = (loaderData: any) => {
  const ogImageUrl = getOgImageUrl(loaderData?.data?.title)

  return [
    ...getTitle(loaderData?.data?.title || 'Blog'),
    ...getDescription(loaderData?.data?.intro || ''),
    ...getPreviewImage(ogImageUrl),
  ]
}

export const loader: LoaderFunction = async ({ params }) => {
  if (isSelfhosted || isDisableMarketingPages) {
    return redirect('/dashboard', 302)
  }

  const { slug, category } = params

  if (!slug || !category) {
    return data(null, {
      status: 404,
    })
  }

  const post = await getPost(slug, category)

  if (!post) {
    return data(null, {
      status: 404,
    })
  }

  return post
}

export default Post
