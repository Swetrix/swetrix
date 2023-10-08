import type { LoaderFunction, LinksFunction } from '@remix-run/node'
import { redirect, json } from '@remix-run/node'
import singlePostCss from 'css/mdfile.css'
import { getPost } from 'utils/getPosts'
import { isSelfhosted } from 'redux/constants'
import Post from 'pages/Blog/Post'

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: singlePostCss }]
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
