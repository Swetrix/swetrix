import _split from 'lodash/split'
import { type LinksFunction, type LoaderFunctionArgs, type MetaFunction } from 'react-router'

import { useRequiredParams } from '~/hooks/useRequiredParams'
import { API_URL } from '~/lib/constants'
import { CurrentProjectProvider } from '~/pages/Project/providers/CurrentProjectProvider'
import ViewProject from '~/pages/Project/View'
import ProjectViewStyle from '~/styles/ProjectViewStyle.css?url'
import { detectTheme, isEmbedded, isAuthenticated, getProjectTabs } from '~/utils/server'

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
  const [theme] = detectTheme(request)
  const isAuth = isAuthenticated(request)
  const tabs = getProjectTabs(request)

  return {
    theme,
    embedded,
    isAuth,
    tabs,
  }
}

export default function Index() {
  const { id } = useRequiredParams<{ id: string }>()

  return (
    <CurrentProjectProvider id={id}>
      <ViewProject />
    </CurrentProjectProvider>
  )
}
