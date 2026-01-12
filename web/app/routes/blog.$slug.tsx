import _isString from 'lodash/isString'
import _last from 'lodash/last'
import _map from 'lodash/map'
import { redirect, data } from 'react-router'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import {
  isSelfhosted,
  getOgImageUrl,
  isDisableMarketingPages,
  API_URL,
} from '~/lib/constants'
import Post from '~/pages/Blog/Post'
import { getSlugFromFilename, getDateFromFilename } from '~/utils/blog'
import { getPost } from '~/utils/getPosts.server'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = (loaderData: any) => {
  const ogImageUrl = getOgImageUrl(loaderData?.data?.title)

  return [
    ...getTitle(loaderData?.data?.title || 'Blog'),
    ...getDescription(loaderData?.data?.intro || ''),
    ...getPreviewImage(ogImageUrl),
  ]
}

// @ts-expect-error
export const sitemap: SitemapFunction = async () => {
  const response = await fetch(`${API_URL}v1/blog/sitemap`)
  const files = await response.json()

  if (isSelfhosted || isDisableMarketingPages) {
    return {
      exclude: true,
    }
  }

  return _map(files, (file) => {
    let handle: string
    let date: string

    if (_isString(file)) {
      handle = getSlugFromFilename(file)
      date = getDateFromFilename(file)
    } else {
      const _file = _last(file) as string
      const firstElement = file[0]

      if (firstElement === 'blog') {
        if (file.length === 2) {
          handle = `blog/${getSlugFromFilename(_file)}`
        } else {
          const category = file[1]
          handle = `blog/${category}/${getSlugFromFilename(_file)}`
        }
      } else {
        handle = `${firstElement}/${getSlugFromFilename(_file)}`
      }

      date = getDateFromFilename(_file)
    }

    return {
      loc: `/${handle}`,
      lastmod: date,
      changefreq: 'weekly',
    }
  })
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  if (isSelfhosted || isDisableMarketingPages) {
    return redirect('/dashboard', 302)
  }

  if (!params.slug) {
    return data(null, {
      status: 404,
    })
  }

  const post = await getPost(request, params.slug)

  if (!post) {
    return data(null, {
      status: 404,
    })
  }

  return post
}

export default Post
