import type { SitemapFunction } from 'remix-sitemap'
import type { LoaderFunction, LinksFunction, V2_MetaFunction } from '@remix-run/node'
import { redirect, json } from '@remix-run/node'
import _map from 'lodash/map'
import _last from 'lodash/last'
import _join from 'lodash/join'
import _isString from 'lodash/isString'
import singlePostCss from 'css/mdfile.css'
import { getPost, getSlugFromFilename, getDateFromFilename } from 'utils/getPosts'
import { getSitemap } from 'api'
import { isSelfhosted, TITLE_SUFFIX, getOgImageUrl } from 'redux/constants'
import Post from 'pages/Blog/Post'

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: singlePostCss }]
}

export const meta: V2_MetaFunction = (loaderData: any) => {
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

export const sitemap: SitemapFunction = async () => {
  const files = await getSitemap()

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
  if (isSelfhosted) {
    return redirect('/dashboard', 302)
  }

  if (!params.slug) {
    return json(null, {
      status: 404,
    })
  }

  const post = await getPost(params.slug)

  if (!post) {
    return json(null, {
      status: 404,
    })
  }

  return post
}

export default Post
