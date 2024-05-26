import type { LoaderFunction, LinksFunction, MetaFunction } from '@remix-run/node'
import { redirect, json } from '@remix-run/node'
import singlePostCss from 'css/mdfile.css'
import { getPost } from 'utils/getPosts'
import { isSelfhosted, TITLE_SUFFIX, getOgImageUrl } from 'redux/constants'
import Post from 'pages/Blog/Post'

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: singlePostCss }]
}

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
  if (isSelfhosted) {
    return redirect('/dashboard', 302)
  }

  const { slug, category } = params

  if (!slug || !category) {
    return json(null, {
      status: 404,
    })
  }

  const post = await getPost(slug, category)

  if (!post) {
    return json(null, {
      status: 404,
    })
  }

  return post
}

export default Post
