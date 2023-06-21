import ViewProject from 'pages/Project/View'
import type { LinksFunction, LoaderArgs, V2_MetaFunction } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { json } from '@remix-run/node'
import _split from 'lodash/split'

import { API_URL } from 'redux/constants'
import { detectTheme } from 'utils/server'
import ProjectViewStyle from 'styles/ProjectViewStyle.css'

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: ProjectViewStyle },
]

export const meta: V2_MetaFunction = ({ location }) => {
  const { pathname } = location
  const pid = _split(pathname, '/')[2]
  const previewURL = `${API_URL}project/ogimage/${pid}`

  return [
    { property: 'og:image', content: previewURL },
    { property: 'twitter:image', content: previewURL },
  ]
}

export async function loader({ request }: LoaderArgs) {
  const theme = detectTheme(request)

  return json({ theme })
}

export default function Index() {
  const {
    theme,
  } = useLoaderData<typeof loader>()

  return <ViewProject ssrTheme={theme} />
}
