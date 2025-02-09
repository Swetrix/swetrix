import _isString from 'lodash/isString'
import _join from 'lodash/join'
import _last from 'lodash/last'
import _map from 'lodash/map'
import { redirect, data } from 'react-router'
import type { LoaderFunction, MetaFunction } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { getSitemap } from '~/api'
import { isSelfhosted, TITLE_SUFFIX, getOgImageUrl, isDisableMarketingPages } from '~/lib/constants'
import Post from '~/pages/Blog/Post'
import { getPost, getSlugFromFilename, getDateFromFilename } from '~/utils/getPosts'

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
