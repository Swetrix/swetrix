import _isString from 'lodash/isString'
import _join from 'lodash/join'
import _last from 'lodash/last'
import _map from 'lodash/map'
import { redirect, data } from 'react-router'
import type { LoaderFunction, MetaFunction } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { getSitemap } from '~/api'
import { isSelfhosted, getOgImageUrl, isDisableMarketingPages } from '~/lib/constants'
import Post from '~/pages/Blog/Post'
import { getPost, getSlugFromFilename, getDateFromFilename } from '~/utils/getPosts'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = (loaderData: any) => {
  const ogImageUrl = getOgImageUrl(loaderData?.data?.title)

  return [
    ...getTitle(loaderData?.data?.title || 'Blog'),
    ...getDescription(loaderData?.data?.intro || ''),
    ...getPreviewImage(ogImageUrl),
  ]
}

// @ts-expect-error SitemapFunction does not support async, investigate it later
export const sitemap: SitemapFunction = async () => {
  const files = await getSitemap()

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
      handle = _join([...file.slice(0, -1), getSlugFromFilename(_file)], '/')
      date = getDateFromFilename(_file)
    }

    return {
      loc: `/blog/${handle}`,
      lastmod: date,
      changefreq: 'weekly',
    }
  })
}

export const loader: LoaderFunction = async ({ params }) => {
  if (isSelfhosted || isDisableMarketingPages) {
    return redirect('/dashboard', 302)
  }

  if (!params.slug) {
    return data(null, {
      status: 404,
    })
  }

  const post = await getPost(params.slug)

  if (!post) {
    return data(null, {
      status: 404,
    })
  }

  return post
}

export default Post
