import _split from 'lodash/split'
import { type LinksFunction, type MetaFunction } from 'react-router'

import { useRequiredParams } from '~/hooks/useRequiredParams'
import { API_URL, MAIN_URL } from '~/lib/constants'
import ViewProject from '~/pages/Project/View'
import { CurrentProjectProvider } from '~/providers/CurrentProjectProvider'
import ProjectViewStyle from '~/styles/ProjectViewStyle.css?url'

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: ProjectViewStyle }]

export const meta: MetaFunction = ({ location }) => {
  const { pathname } = location
  const pid = _split(pathname, '/')[2]
  const previewURL = `${API_URL}project/ogimage/${pid}`
  const canonicalURL = `${MAIN_URL}/projects/${pid}`

  return [
    { property: 'og:image', content: previewURL },
    { property: 'twitter:image', content: previewURL },
    { tagName: 'link', rel: 'canonical', href: canonicalURL },
  ]
}

export default function Index() {
  const { id } = useRequiredParams<{ id: string }>()

  return (
    <CurrentProjectProvider id={id}>
      <ViewProject />
    </CurrentProjectProvider>
  )
}
