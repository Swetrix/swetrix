import ViewProject from '~/pages/Project/View'
import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from '@remix-run/node'
import _split from 'lodash/split'

import { API_URL } from '~/lib/constants'
import { detectTheme, isEmbedded, isAuthenticated, getProjectPassword, getProjectTabs } from '~/utils/server'
import ProjectViewStyle from '~/styles/ProjectViewStyle.css'

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: ProjectViewStyle }]

export const meta: MetaFunction = ({ location }) => {
  const { pathname } = location
  const pid = _split(pathname, '/')[2]
  const previewURL = `${API_URL}project/ogimage/${pid}`

  return [
    { property: 'og:image', content: previewURL },
    { property: 'twitter:image', content: previewURL },
  ]
}

export async function loader({ request }: LoaderFunctionArgs) {
  const embedded = isEmbedded(request)
  const queryPassword = getProjectPassword(request)
  const [theme] = detectTheme(request)
  const isAuth = isAuthenticated(request)
  const tabs = getProjectTabs(request)

  return {
    theme,
    embedded,
    isAuth,
    queryPassword,
    tabs,
  }
}

export default function Index() {
  return <ViewProject />
}
