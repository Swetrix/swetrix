import _isString from 'lodash/isString'
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
      // Standalone post in root - just the filename (e.g., "2025-05-31-data-policy")
      handle = getSlugFromFilename(file)
      date = getDateFromFilename(file)
    } else {
      const _file = _last(file) as string
      const firstElement = file[0]

      if (firstElement === 'blog') {
        // Blog posts: ["blog", "filename"] or ["blog", "category", "filename"]
        if (file.length === 2) {
          // ["blog", "filename"] - blog post in root
          handle = `blog/${getSlugFromFilename(_file)}`
        } else {
          // ["blog", "category", "filename"] - blog post in subdirectory
          const category = file[1]
          handle = `blog/${category}/${getSlugFromFilename(_file)}`
        }
      } else {
        // Standalone post in category folder: ["category", "filename"]
        // e.g., ["comparison", "2025-11-26-plausible"] -> /comparison/plausible
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
