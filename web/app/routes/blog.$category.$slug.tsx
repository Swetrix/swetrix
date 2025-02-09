import type { LoaderFunction, MetaFunction } from 'react-router'
import { redirect, data } from 'react-router'

import { isSelfhosted, TITLE_SUFFIX, getOgImageUrl, isDisableMarketingPages } from '~/lib/constants'
import Post from '~/pages/Blog/Post'
import { getPost } from '~/utils/getPosts'

export const meta: MetaFunction = (loaderData: any) => {
  const ogImageUrl = getOgImageUrl(loaderData?.data?.title)

  return [
    {
      title: `${loaderData?.data?.title || 'Blog'} ${TITLE_SUFFIX}`,
    },
    {
      property: 'og:title',
      content: `${loaderData?.data?.title || 'Blog'} ${TITLE_SUFFIX}`,
    },
    {
      property: 'twitter:title',
      content: `${loaderData?.data?.title || 'Blog'} ${TITLE_SUFFIX}`,
    },
    {
      property: 'og:description',
      content: loaderData?.data?.intro || '',
    },
    {
      property: 'twitter:description',
      content: loaderData?.data?.intro || '',
    },
    {
      property: 'description',
      content: loaderData?.data?.intro || '',
    },
    {
      property: 'og:image',
      content: ogImageUrl,
    },
    {
      property: 'twitter:image',
      content: ogImageUrl,
    },
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
