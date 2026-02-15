import { useTranslation } from 'react-i18next'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { redirect, data } from 'react-router'

import {
  isSelfhosted,
  getOgImageUrl,
  isDisableMarketingPages,
} from '~/lib/constants'
import Post from '~/pages/Blog/Post'
import { getPost } from '~/utils/getPosts.server'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  const title = data?.title || 'Blog'
  const intro = data?.intro || t('description.blog')
  const ogImageUrl = getOgImageUrl(title)

  return [
    ...getTitle(title),
    ...getDescription(intro),
    ...getPreviewImage(ogImageUrl),
  ]
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  if (isSelfhosted || isDisableMarketingPages) {
    return redirect('/dashboard', 302)
  }

  const { slug, category } = params

  if (!slug || !category) {
    return data(null, {
      status: 404,
    })
  }

  const post = await getPost(request, slug, category)

  if (!post) {
    return data(null, {
      status: 404,
    })
  }

  return post
}

export default Post
