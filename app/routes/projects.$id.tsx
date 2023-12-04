import ViewProject from 'pages/Project/View'
import type { LinksFunction, LoaderArgs, V2_MetaFunction } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { json } from '@remix-run/node'
import _split from 'lodash/split'

import { API_URL } from 'redux/constants'
import {
  detectTheme, isEmbedded, isAuthenticated, getProjectPassword, getProjectTabs,
} from 'utils/server'
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
  const embedded = isEmbedded(request)
  const queryPassword = getProjectPassword(request)
  const [theme] = detectTheme(request)
  const isAuth = isAuthenticated(request)
  const tabs = getProjectTabs(request)

  return json({
    theme, embedded, isAuth, queryPassword, tabs,
  })
}

export default function Index() {
  const {
    theme, embedded, isAuth, queryPassword, tabs,
  } = useLoaderData<typeof loader>()

  return <ViewProject ssrTheme={theme} ssrAuthenticated={isAuth} embedded={embedded} queryPassword={queryPassword} projectQueryTabs={tabs} />
}
