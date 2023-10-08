import type { SitemapFunction } from 'remix-sitemap'
import type { LoaderFunction, LinksFunction } from '@remix-run/node'
import { redirect, json } from '@remix-run/node'
import _map from 'lodash/map'
import _replace from 'lodash/replace'
import _last from 'lodash/last'
import _join from 'lodash/join'
import _isString from 'lodash/isString'
import singlePostCss from 'css/mdfile.css'
import {
  getPost, getSlugFromFilename, getDateFromFilename, getSitemapFileNames,
} from 'utils/getPosts'
import { isSelfhosted } from 'redux/constants'
import Post from 'pages/Blog/Post'

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: singlePostCss }]
}

export const sitemap: SitemapFunction = async () => {
  const files = await getSitemapFileNames(undefined, true)

  return _map(files, file => {
    let handle: string
    let date: string

    if (_isString(file)) {
      handle = _replace(getSlugFromFilename(file), /\.md$/, '')
      date = getDateFromFilename(file)
    } else {
      const _file = _last(file) as string
      handle = _join([...file.slice(0, -1), _replace(getSlugFromFilename(_file), /\.md$/, '')], '/')
      date = getDateFromFilename(_file)
    }

    return {
      loc: `/blog/${handle}`, 
      lastmod: date,
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
